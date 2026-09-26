-- Cover foreign keys used by profile-global knowledge and the canonical source
-- registry. These are intentionally small btree indexes; unlike the new database's
-- zero-scan indexes, these are backed by explicit FK advisor findings.

create index if not exists profiles_global_knowledge_base_idx
  on public.profiles(global_knowledge_base_id)
  where global_knowledge_base_id is not null;

create index if not exists source_registry_knowledge_base_idx
  on public.source_registry(knowledge_base_id);
