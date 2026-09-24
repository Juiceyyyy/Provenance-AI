from __future__ import annotations

import json
from argparse import ArgumentParser
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from .config import Settings


def import_manifest(path: str) -> None:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    pack = payload["pack"]
    settings = Settings.from_env()
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn, conn.transaction():
        kb = conn.execute(
            """
            insert into public.knowledge_bases(name,slug,description,kind,visibility,jurisdiction_country,jurisdiction_region,version,last_verified_at)
            values(%s,%s,%s,'jurisdiction','public',%s,%s,%s,now())
            on conflict(slug) do update set name=excluded.name,description=excluded.description,
              jurisdiction_country=excluded.jurisdiction_country,jurisdiction_region=excluded.jurisdiction_region,
              version=excluded.version,last_verified_at=now()
            returning id
            """,
            (pack["name"], pack["slug"], pack.get("description", ""), pack.get("jurisdiction_country"), pack.get("jurisdiction_region"), pack.get("version")),
        ).fetchone()
        for source in payload.get("sources", []):
            conn.execute(
                """
                insert into public.source_registry(knowledge_base_id,title,canonical_url,publisher,authority_level,jurisdiction_country,jurisdiction_region,license_type,refresh_interval_hours,enabled)
                values(%s,%s,%s,%s,%s,%s,%s,%s,%s,true)
                on conflict(knowledge_base_id,canonical_url) do update set title=excluded.title,publisher=excluded.publisher,
                  authority_level=excluded.authority_level,jurisdiction_country=excluded.jurisdiction_country,
                  jurisdiction_region=excluded.jurisdiction_region,license_type=excluded.license_type,
                  refresh_interval_hours=excluded.refresh_interval_hours,enabled=true
                """,
                (kb["id"],source["title"],source["canonical_url"],source.get("publisher"),source.get("authority_level","reference"),pack.get("jurisdiction_country"),pack.get("jurisdiction_region"),source.get("license_type"),source.get("refresh_interval_hours",24)),
            )
        domain = str(pack["slug"]).split("-", 1)[0]
        if domain in {"legal", "accounting"} and pack.get("jurisdiction_country"):
            conn.execute(
                """
                insert into public.bot_knowledge_bases(bot_id,knowledge_base_id,priority)
                select b.id,%s,case when %s is null then 80 else 90 end
                from public.bots b
                where b.bot_type=%s and b.jurisdiction_country=%s
                  and (%s is null or b.jurisdiction_region=%s)
                on conflict(bot_id,knowledge_base_id) do update set priority=excluded.priority
                """,
                (kb["id"],pack.get("jurisdiction_region"),domain,pack.get("jurisdiction_country"),pack.get("jurisdiction_region"),pack.get("jurisdiction_region")),
            )
    print(f"Imported {pack['slug']} with {len(payload.get('sources', []))} sources")


def main() -> None:
    parser=ArgumentParser(description="Register a curated jurisdiction knowledge-pack manifest")
    parser.add_argument("manifest")
    import_manifest(parser.parse_args().manifest)


if __name__ == "__main__":
    main()
