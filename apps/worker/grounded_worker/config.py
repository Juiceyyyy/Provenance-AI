from __future__ import annotations

import os
import re
from dataclasses import dataclass


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str
    supabase_url: str
    supabase_service_role_key: str
    gemini_api_key: str
    embedding_model: str
    embedding_dimensions: int
    poll_seconds: float
    batch_size: int
    worker_id: str
    one_shot: bool
    clamav_host: str | None
    clamav_port: int
    malware_scan_required: bool
    max_source_bytes: int

    @classmethod
    def from_env(cls) -> Settings:
        dimensions = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))
        if dimensions != 1536:
            raise RuntimeError("EMBEDDING_DIMENSIONS must remain 1536 unless the database vector schema is migrated too")
        model = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2").strip()
        if not re.fullmatch(r"[A-Za-z0-9._-]+", model):
            raise RuntimeError("GEMINI_EMBEDDING_MODEL contains invalid characters")
        clamav_host = os.getenv("CLAMAV_HOST", "").strip() or None
        malware_scan_required = env_bool("MALWARE_SCAN_REQUIRED", False)
        if malware_scan_required and not clamav_host:
            raise RuntimeError("MALWARE_SCAN_REQUIRED is enabled but CLAMAV_HOST is not configured")
        return cls(
            database_url=required("DATABASE_URL"),
            supabase_url=required("SUPABASE_URL"),
            supabase_service_role_key=required("SUPABASE_SERVICE_ROLE_KEY"),
            gemini_api_key=required("GEMINI_API_KEY"),
            embedding_model=model,
            embedding_dimensions=dimensions,
            poll_seconds=float(os.getenv("WORKER_POLL_SECONDS", "3")),
            batch_size=max(1, min(8, int(os.getenv("WORKER_BATCH_SIZE", "2")))),
            worker_id=os.getenv("WORKER_ID", f"worker-{os.getpid()}"),
            one_shot=env_bool("WORKER_ONESHOT", False),
            clamav_host=clamav_host,
            clamav_port=int(os.getenv("CLAMAV_PORT", "3310")),
            malware_scan_required=malware_scan_required,
            max_source_bytes=max(
                1_048_576,
                min(100 * 1024 * 1024, int(os.getenv("MAX_SOURCE_BYTES", str(50 * 1024 * 1024)))),
            ),
        )
