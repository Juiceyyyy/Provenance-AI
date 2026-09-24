from __future__ import annotations

import psycopg
from psycopg.rows import dict_row

from .config import Settings
from .source_refresh import refresh


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
    failures = 0
    for row in rows:
        try:
            refresh(str(row["id"]))
        except Exception as exc:
            failures += 1
            print(f"Source {row['id']} failed: {exc}")
    if failures:
        raise SystemExit(f"{failures} source refreshes failed")


if __name__ == "__main__":
    main()
