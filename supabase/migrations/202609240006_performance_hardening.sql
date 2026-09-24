-- Cover foreign keys used by joins/deletes and avoid duplicate permissive SELECT policies.
create index if not exists chunks_org_idx on public.chunks(organization_id);
create index if not exists chunks_parent_idx on public.chunks(parent_chunk_id);
create index if not exists conversations_org_idx on public.conversations(organization_id);
create index if not exists documents_owner_idx on public.documents(owner_user_id);
create index if not exists documents_source_registry_idx on public.documents(source_registry_id);
create index if not exists ingestion_jobs_version_idx on public.ingestion_jobs(document_version_id);
create index if not exists ingestion_jobs_org_idx on public.ingestion_jobs(organization_id);
create index if not exists knowledge_bases_owner_idx on public.knowledge_bases(owner_user_id);
create index if not exists organizations_created_by_idx on public.organizations(created_by);
create index if not exists portfolios_org_idx on public.portfolios(organization_id);
create index if not exists usage_events_bot_idx on public.usage_events(bot_id);
create index if not exists usage_events_org_idx on public.usage_events(organization_id);

drop policy if exists sources_manage_admin on public.source_registry;
create policy sources_insert_admin on public.source_registry for insert to authenticated
with check (
  exists(
    select 1 from public.knowledge_bases kb
    where kb.id=knowledge_base_id and kb.organization_id is not null
      and (kb.owner_user_id=(select auth.uid()) or (select private.is_org_admin(kb.organization_id)))
  )
);
create policy sources_update_admin on public.source_registry for update to authenticated
using (
  exists(
    select 1 from public.knowledge_bases kb
    where kb.id=knowledge_base_id and kb.organization_id is not null
      and (kb.owner_user_id=(select auth.uid()) or (select private.is_org_admin(kb.organization_id)))
  )
)
with check (
  exists(
    select 1 from public.knowledge_bases kb
    where kb.id=knowledge_base_id and kb.organization_id is not null
      and (kb.owner_user_id=(select auth.uid()) or (select private.is_org_admin(kb.organization_id)))
  )
);
create policy sources_delete_admin on public.source_registry for delete to authenticated
using (
  exists(
    select 1 from public.knowledge_bases kb
    where kb.id=knowledge_base_id and kb.organization_id is not null
      and (kb.owner_user_id=(select auth.uid()) or (select private.is_org_admin(kb.organization_id)))
  )
);
