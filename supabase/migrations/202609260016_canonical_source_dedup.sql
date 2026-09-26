-- Canonicalize curated sources globally by canonical URL.
-- A source is fetched/indexed once, then exposed to any number of knowledge packs
-- through source_knowledge_bases / knowledge_base_documents.

alter table public.source_knowledge_bases
  add column if not exists enabled boolean not null default true;

create table if not exists private.storage_cleanup_queue (
  storage_path text primary key,
  reason text not null default 'orphaned',
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on private.storage_cleanup_queue from public,anon,authenticated;
grant all on private.storage_cleanup_queue to service_role;

-- Choose exactly one registry row per canonical URL. Prefer the most recently
-- checked source, then one that has a ready/current document, then the oldest row
-- for deterministic behavior on never-fetched sources.
create temporary table source_merge_map on commit drop as
select s.id as old_source_id, keeper.id as keep_source_id
from public.source_registry s
join lateral (
  select candidate.id
  from public.source_registry candidate
  where candidate.canonical_url=s.canonical_url
  order by
    (candidate.last_checked_at is not null) desc,
    candidate.last_checked_at desc nulls last,
    exists (
      select 1
      from public.documents d
      join public.document_versions v on v.document_id=d.id and v.status='ready'
      where d.source_registry_id=candidate.id and d.is_current=true
    ) desc,
    candidate.created_at asc,
    candidate.id
  limit 1
) keeper on true
where s.id<>keeper.id;

-- Transfer every pack membership to the canonical source before repointing docs.
insert into public.source_knowledge_bases(source_registry_id,knowledge_base_id,priority,enabled)
select m.keep_source_id,skb.knowledge_base_id,max(skb.priority),bool_or(skb.enabled)
from source_merge_map m
join public.source_knowledge_bases skb on skb.source_registry_id=m.old_source_id
group by m.keep_source_id,skb.knowledge_base_id
on conflict(source_registry_id,knowledge_base_id) do update set
  priority=greatest(public.source_knowledge_bases.priority,excluded.priority),
  enabled=public.source_knowledge_bases.enabled or excluded.enabled;

-- Point all duplicate documents at the canonical registry source.
update public.documents d
set source_registry_id=m.keep_source_id
from source_merge_map m
where d.source_registry_id=m.old_source_id;

-- A canonical source can now have multiple historical duplicate documents. Keep the
-- best current/ready document and merge all retrieval memberships into it.
create temporary table document_merge_map on commit drop as
select d.id as old_document_id,keeper.id as keep_document_id
from public.documents d
join lateral (
  select candidate.id
  from public.documents candidate
  where candidate.source_registry_id=d.source_registry_id
  order by
    (candidate.status='ready') desc,
    candidate.is_current desc,
    (
      select max(v.processed_at)
      from public.document_versions v
      where v.document_id=candidate.id and v.status='ready'
    ) desc nulls last,
    candidate.created_at desc,
    candidate.id
  limit 1
) keeper on true
where d.source_registry_id is not null
  and d.id<>keeper.id;

insert into public.knowledge_base_documents(knowledge_base_id,document_id,priority)
select kbd.knowledge_base_id,m.keep_document_id,max(kbd.priority)
from document_merge_map m
join public.knowledge_base_documents kbd on kbd.document_id=m.old_document_id
group by kbd.knowledge_base_id,m.keep_document_id
on conflict(knowledge_base_id,document_id) do update set
  priority=greatest(public.knowledge_base_documents.priority,excluded.priority);

insert into public.conversation_documents(conversation_id,document_id)
select cd.conversation_id,m.keep_document_id
from document_merge_map m
join public.conversation_documents cd on cd.document_id=m.old_document_id
on conflict(conversation_id,document_id) do nothing;

-- Database cascades reclaim chunks/vector index entries. Object storage is external,
-- so preserve paths for the existing free worker to garbage-collect after commit.
insert into private.storage_cleanup_queue(storage_path,reason)
select distinct v.storage_path,'canonical-source-document-dedup'
from document_merge_map m
join public.document_versions v on v.document_id=m.old_document_id
where v.storage_path is not null
on conflict(storage_path) do nothing;

delete from public.documents d
using document_merge_map m
where d.id=m.old_document_id;

delete from public.source_registry s
using source_merge_map m
where s.id=m.old_source_id;

alter table public.source_registry
  drop constraint if exists source_registry_knowledge_base_id_canonical_url_key;

-- Canonical URL is now the registry identity independent of pack membership.
alter table public.source_registry
  add constraint source_registry_canonical_url_key unique(canonical_url);

-- Global source enabled state is derived from enabled pack memberships.
update public.source_registry s
set enabled=exists (
  select 1 from public.source_knowledge_bases skb
  where skb.source_registry_id=s.id and skb.enabled=true
);

-- Ensure every canonical current document is attached only to currently enabled
-- memberships after the merge.
delete from public.knowledge_base_documents kbd
using public.documents d,public.source_knowledge_bases skb
where kbd.document_id=d.id
  and d.source_registry_id=skb.source_registry_id
  and kbd.knowledge_base_id=skb.knowledge_base_id
  and skb.enabled=false;

insert into public.knowledge_base_documents(knowledge_base_id,document_id,priority)
select skb.knowledge_base_id,d.id,skb.priority
from public.source_knowledge_bases skb
join public.documents d on d.source_registry_id=skb.source_registry_id
where skb.enabled=true and d.is_current=true
on conflict(knowledge_base_id,document_id) do update set
  priority=excluded.priority;

create index if not exists source_knowledge_bases_enabled_source_idx
  on public.source_knowledge_bases(source_registry_id,enabled,knowledge_base_id);
