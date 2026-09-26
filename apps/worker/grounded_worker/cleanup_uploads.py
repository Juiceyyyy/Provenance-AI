from __future__ import annotations

import psycopg
from psycopg.rows import dict_row
from supabase import create_client

from .config import Settings

_BATCH_SIZE = 100


def main() -> None:
    settings = Settings.from_env()
    storage = create_client(settings.supabase_url, settings.supabase_service_role_key)

    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
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

    print(f"Cleaned {cleaned} expired private upload reservation(s)")


if __name__ == "__main__":
    main()
