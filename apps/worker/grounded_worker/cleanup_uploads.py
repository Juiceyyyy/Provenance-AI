from __future__ import annotations

from typing import Any

import psycopg
from psycopg.rows import dict_row
from supabase import Client, create_client

from .config import Settings

_BATCH_SIZE = 100


def _cleanup_storage_queue(conn: psycopg.Connection[Any], storage: Client) -> int:
    exists = conn.execute(
        "select to_regclass('private.storage_cleanup_queue') is not null as available"
    ).fetchone()
    if not exists or not exists["available"]:
        return 0

    rows = conn.execute(
        """
        select storage_path
        from private.storage_cleanup_queue
        order by created_at
        limit %s
        """,
        (_BATCH_SIZE,),
    ).fetchall()

    cleaned = 0
    for row in rows:
        path = str(row["storage_path"])
        referenced = conn.execute(
            "select exists(select 1 from public.document_versions where storage_path=%s) as referenced",
            (path,),
        ).fetchone()
        if referenced and referenced["referenced"]:
            # A later write reused or retained the path; never delete a referenced object.
            with conn.transaction():
                conn.execute("delete from private.storage_cleanup_queue where storage_path=%s", (path,))
            continue

        try:
            storage.storage.from_("documents").remove([path])
        except Exception as exc:  # noqa: BLE001 - one orphan must not block the rest
            with conn.transaction():
                conn.execute(
                    """
                    update private.storage_cleanup_queue
                    set attempts=attempts+1,last_error=%s,updated_at=now()
                    where storage_path=%s
                    """,
                    (str(exc)[:2000], path),
                )
            print(f"Could not remove queued storage orphan {path}: {exc}")
            continue

        with conn.transaction():
            conn.execute("delete from private.storage_cleanup_queue where storage_path=%s", (path,))
        cleaned += 1

    return cleaned


def _cleanup_expired_reservations(conn: psycopg.Connection[Any], storage: Client) -> int:
    rows = conn.execute(
        """
        select id,storage_path
        from public.knowledge_upload_reservations
        where consumed_at is null and expires_at <= now()
        order by expires_at
        limit %s
        """,
        (_BATCH_SIZE,),
    ).fetchall()

    cleaned = 0
    for row in rows:
        path = str(row["storage_path"])
        try:
            storage.storage.from_("documents").remove([path])
        except Exception as exc:  # noqa: BLE001 - one bad object must not block cleanup
            print(f"Could not remove expired upload {row['id']}: {exc}")
            continue

        with conn.transaction():
            conn.execute(
                "delete from public.knowledge_upload_reservations where id=%s and consumed_at is null and expires_at <= now()",
                (row["id"],),
            )
        cleaned += 1
    return cleaned


def main() -> None:
    settings = Settings.from_env()
    storage = create_client(settings.supabase_url, settings.supabase_service_role_key)

    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        orphaned = _cleanup_storage_queue(conn, storage)
        expired = _cleanup_expired_reservations(conn, storage)

    print(f"Cleaned {expired} expired private upload reservation(s) and {orphaned} queued storage orphan(s)")


if __name__ == "__main__":
    main()
