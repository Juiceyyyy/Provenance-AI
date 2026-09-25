from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed

import psycopg
from psycopg.rows import dict_row

from .config import Settings
from .source_refresh import refresh

_MAX_REFRESH_WORKERS = 4


def _refresh_one(source_id: str) -> tuple[str, str | None]:
    try:
        refresh(source_id)
        return source_id, None
    except Exception as exc:  # noqa: BLE001 - isolate each source refresh
        return source_id, str(exc)


def main() -> None:
    settings = Settings.from_env()
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        rows = conn.execute(
            """
            select id from public.source_registry
            where enabled=true and refresh_interval_hours is not null
              and (last_checked_at is null or last_checked_at <= now() - make_interval(hours => refresh_interval_hours))
            order by coalesce(last_checked_at,'epoch'::timestamptz)
            limit 100
            """
        ).fetchall()

    source_ids = [str(row["id"]) for row in rows]
    if not source_ids:
        print("No authoritative sources are due for refresh")
        return

    failures = 0
    workers = min(_MAX_REFRESH_WORKERS, len(source_ids))
    with ThreadPoolExecutor(max_workers=workers, thread_name_prefix="source-refresh") as executor:
        futures = {executor.submit(_refresh_one, source_id): source_id for source_id in source_ids}
        for future in as_completed(futures):
            source_id, error = future.result()
            if error:
                failures += 1
                print(f"Source {source_id} failed: {error}")

    if failures:
        raise SystemExit(f"{failures} source refreshes failed")


if __name__ == "__main__":
    main()
