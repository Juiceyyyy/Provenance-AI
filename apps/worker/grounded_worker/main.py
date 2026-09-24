from __future__ import annotations

from contextlib import contextmanager
from hashlib import sha256
import json
import logging
from pathlib import Path
import signal
import tempfile
import time
from typing import Any, Iterator

from docling.document_converter import DocumentConverter
from openai import OpenAI
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from supabase import Client, create_client

from .chunking import ParsedChunk, chunk_document
from .config import Settings
from .security import scan_with_clamav

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
LOG = logging.getLogger("grounded.worker")
STOP = False


def _stop(*_: Any) -> None:
    global STOP
    STOP = True


signal.signal(signal.SIGTERM, _stop)
signal.signal(signal.SIGINT, _stop)


@contextmanager
def db(settings: Settings) -> Iterator[psycopg.Connection[Any]]:
    with psycopg.connect(settings.database_url, row_factory=dict_row, autocommit=False) as conn:
        yield conn


def claim_job(conn: psycopg.Connection[Any], worker_id: str) -> dict[str, Any] | None:
    with conn.transaction():
        row = conn.execute(
            """
            select j.id, j.document_version_id, j.attempts, j.max_attempts,
                   v.document_id, v.storage_path, d.knowledge_base_id, d.organization_id,
                   d.title, d.mime_type
            from public.ingestion_jobs j
            join public.document_versions v on v.id=j.document_version_id
            join public.documents d on d.id=v.document_id
            where (
                    j.status='queued'
                    or (j.status='processing' and j.locked_at < now() - interval '20 minutes')
                  )
              and j.attempts < j.max_attempts
            order by j.created_at
            for update skip locked
            limit 1
            """
        ).fetchone()
        if not row:
            return None
        conn.execute(
            """
            update public.ingestion_jobs
            set status='processing', attempts=attempts+1, locked_at=now(), locked_by=%s,
                started_at=coalesce(started_at,now()), error_message=null
            where id=%s
            """,
            (worker_id, row["id"]),
        )
        conn.execute("update public.document_versions set status='processing', error_message=null where id=%s", (row["document_version_id"],))
        conn.execute("update public.documents set status='processing' where id=%s", (row["document_id"],))
        return dict(row)


def embed_chunks(client: OpenAI, model: str, dimensions: int, chunks: list[ParsedChunk]) -> list[list[float]]:
    result: list[list[float]] = []
    for start in range(0, len(chunks), 96):
        batch = chunks[start : start + 96]
        response = client.embeddings.create(
            model=model,
            input=[chunk.embedding_text for chunk in batch],
            dimensions=dimensions,
            encoding_format="float",
        )
        ordered = sorted(response.data, key=lambda item: item.index)
        result.extend([item.embedding for item in ordered])
    return result


def vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.9g}" for value in values) + "]"


def process_job(
    settings: Settings,
    conn: psycopg.Connection[Any],
    storage: Client,
    ai: OpenAI,
    converter: DocumentConverter,
    job: dict[str, Any],
) -> None:
    storage_path = job.get("storage_path")
    if not storage_path:
        raise RuntimeError("Document version has no storage path")

    payload = storage.storage.from_("documents").download(storage_path)
    if not payload:
        raise RuntimeError("Downloaded document is empty")
    if len(payload) > 50 * 1024 * 1024:
        raise RuntimeError("Document exceeds the 50 MB ingestion limit")
    if settings.clamav_host:
        scan_with_clamav(payload, settings.clamav_host, settings.clamav_port)
    elif settings.malware_scan_required:
        raise RuntimeError("Malware scanning is required but no ClamAV service is configured")
    binary_hash = sha256(payload).hexdigest()
    suffix = Path(str(job["title"])).suffix[:12] or ".bin"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as handle:
        handle.write(payload)
        handle.flush()
        result = converter.convert(handle.name)
        document = result.document
        chunks = chunk_document(document)
        if not chunks:
            raise RuntimeError("Parser produced no indexable chunks")

    embeddings = embed_chunks(ai, settings.embedding_model, settings.embedding_dimensions, chunks)
    if len(embeddings) != len(chunks):
        raise RuntimeError("Embedding count mismatch")

    with conn.transaction():
        conn.execute("delete from public.chunks where document_version_id=%s", (job["document_version_id"],))
        for chunk, embedding in zip(chunks, embeddings, strict=True):
            conn.execute(
                """
                insert into public.chunks(
                  organization_id,knowledge_base_id,document_id,document_version_id,chunk_index,
                  content,content_hash,token_count,page_start,page_end,heading_path,embedding,metadata
                ) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::extensions.vector,%s)
                """,
                (
                    job["organization_id"], job["knowledge_base_id"], job["document_id"],
                    job["document_version_id"], chunk.index, chunk.text, chunk.content_hash,
                    chunk.token_count, chunk.page_start, chunk.page_end, chunk.headings,
                    vector_literal(embedding), Jsonb(chunk.metadata),
                ),
            )
        conn.execute(
            """
            update public.document_versions
            set status='ready', content_hash=%s, parser_version=%s,
                processed_at=now(), error_message=null
            where id=%s
            """,
            (binary_hash, "docling-2.130.0", job["document_version_id"]),
        )
        conn.execute(
            "update public.documents set status='ready', last_verified_at=coalesce(last_verified_at,now()) where id=%s",
            (job["document_id"],),
        )
        conn.execute(
            """
            update public.ingestion_jobs set status='succeeded',completed_at=now(),locked_at=null,locked_by=null,
              error_message=null, metadata=metadata || %s
            where id=%s
            """,
            (Jsonb({"chunks": len(chunks), "sha256": binary_hash}), job["id"]),
        )
    LOG.info("Indexed %s: %d chunks", job["title"], len(chunks))


def fail_job(conn: psycopg.Connection[Any], job: dict[str, Any], error: Exception) -> None:
    message = str(error)[:4000]
    with conn.transaction():
        row = conn.execute("select attempts,max_attempts from public.ingestion_jobs where id=%s", (job["id"],)).fetchone()
        terminal = row is None or row["attempts"] >= row["max_attempts"]
        next_status = "failed" if terminal else "queued"
        conn.execute(
            "update public.ingestion_jobs set status=%s,error_message=%s,locked_at=null,locked_by=null,completed_at=case when %s then now() else null end where id=%s",
            (next_status, message, terminal, job["id"]),
        )
        conn.execute("update public.document_versions set status=%s,error_message=%s where id=%s", ("failed" if terminal else "queued", message, job["document_version_id"]),)
        conn.execute("update public.documents set status=%s where id=%s", ("failed" if terminal else "queued", job["document_id"]),)
    LOG.exception("Ingestion failed for %s: %s", job.get("title"), message)


def run() -> None:
    settings = Settings.from_env()
    ai = OpenAI(api_key=settings.openai_api_key)
    storage = create_client(settings.supabase_url, settings.supabase_service_role_key)
    converter = DocumentConverter()
    LOG.info("Worker %s started", settings.worker_id)

    with db(settings) as conn:
        while not STOP:
            processed = 0
            for _ in range(settings.batch_size):
                job = claim_job(conn, settings.worker_id)
                if not job:
                    break
                try:
                    process_job(settings, conn, storage, ai, converter, job)
                except Exception as exc:  # worker boundary must trap parser/provider failures
                    fail_job(conn, job, exc)
                processed += 1
            if processed == 0:
                time.sleep(settings.poll_seconds)
    LOG.info("Worker stopped")


if __name__ == "__main__":
    run()
