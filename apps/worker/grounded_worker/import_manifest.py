from __future__ import annotations

import json
from argparse import ArgumentParser
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from .config import Settings

_ALLOWED_KINDS = {"curated", "jurisdiction", "system"}
_ALLOWED_BOT_TYPES = {"general", "study", "legal", "accounting", "health", "portfolio"}


def import_manifest(path: str) -> None:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    pack = payload["pack"]
    kind = str(pack.get("kind", "jurisdiction"))
    if kind not in _ALLOWED_KINDS:
        raise ValueError(f"Unsupported public knowledge-pack kind: {kind}")

    domain = str(pack["slug"]).split("-", 1)[0]
    bot_types = [str(item) for item in pack.get("bot_types", [])]
    if not bot_types and domain in _ALLOWED_BOT_TYPES:
        bot_types = [domain]
    invalid_types = [item for item in bot_types if item not in _ALLOWED_BOT_TYPES]
    if invalid_types:
        raise ValueError(f"Unsupported bot types in manifest: {', '.join(invalid_types)}")

    settings = Settings.from_env()
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn, conn.transaction():
        kb = conn.execute(
            """
            insert into public.knowledge_bases(
              name,slug,description,kind,visibility,jurisdiction_country,jurisdiction_region,version,last_verified_at
            )
            values(%s,%s,%s,%s,'public',%s,%s,%s,now())
            on conflict(slug) do update set
              name=excluded.name,
              description=excluded.description,
              kind=excluded.kind,
              jurisdiction_country=excluded.jurisdiction_country,
              jurisdiction_region=excluded.jurisdiction_region,
              version=excluded.version,
              last_verified_at=now()
            returning id
            """,
            (
                pack["name"],
                pack["slug"],
                pack.get("description", ""),
                kind,
                pack.get("jurisdiction_country"),
                pack.get("jurisdiction_region"),
                pack.get("version"),
            ),
        ).fetchone()

        for source in payload.get("sources", []):
            conn.execute(
                """
                insert into public.source_registry(
                  knowledge_base_id,title,canonical_url,publisher,authority_level,
                  jurisdiction_country,jurisdiction_region,license_type,refresh_interval_hours,enabled
                )
                values(%s,%s,%s,%s,%s,%s,%s,%s,%s,true)
                on conflict(knowledge_base_id,canonical_url) do update set
                  title=excluded.title,
                  publisher=excluded.publisher,
                  authority_level=excluded.authority_level,
                  jurisdiction_country=excluded.jurisdiction_country,
                  jurisdiction_region=excluded.jurisdiction_region,
                  license_type=excluded.license_type,
                  refresh_interval_hours=excluded.refresh_interval_hours,
                  enabled=true
                """,
                (
                    kb["id"],
                    source["title"],
                    source["canonical_url"],
                    source.get("publisher"),
                    source.get("authority_level", "reference"),
                    pack.get("jurisdiction_country"),
                    pack.get("jurisdiction_region"),
                    source.get("license_type"),
                    source.get("refresh_interval_hours", 24),
                ),
            )

        for bot_type in bot_types:
            country = pack.get("jurisdiction_country")
            region = pack.get("jurisdiction_region")
            if country:
                conn.execute(
                    """
                    insert into public.bot_knowledge_bases(bot_id,knowledge_base_id,priority)
                    select b.id,%s,case when %s is null then 80 else 90 end
                    from public.bots b
                    where b.bot_type=%s
                      and b.jurisdiction_country=%s
                      and (%s is null or b.jurisdiction_region=%s)
                    on conflict(bot_id,knowledge_base_id) do update set priority=excluded.priority
                    """,
                    (kb["id"], region, bot_type, country, region, region),
                )
            else:
                conn.execute(
                    """
                    insert into public.bot_knowledge_bases(bot_id,knowledge_base_id,priority)
                    select b.id,%s,60
                    from public.bots b
                    where b.bot_type=%s
                    on conflict(bot_id,knowledge_base_id) do update set priority=excluded.priority
                    """,
                    (kb["id"], bot_type),
                )

    print(f"Imported {pack['slug']} with {len(payload.get('sources', []))} sources")


def main() -> None:
    parser = ArgumentParser(description="Register a curated Provenance knowledge-pack manifest")
    parser.add_argument("manifest")
    import_manifest(parser.parse_args().manifest)


if __name__ == "__main__":
    main()
