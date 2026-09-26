-- Domain metadata and first shared cross-assistant pack.
update public.knowledge_bases set domains=array['health']::text[] where slug in ('health-global-core','health-india-core');
update public.knowledge_bases set domains=array['legal']::text[] where slug='legal-india-core';
update public.knowledge_bases set domains=array['accounting']::text[] where slug='accounting-india-core';

insert into public.knowledge_bases(name,slug,description,kind,visibility,jurisdiction_country,domains,coverage_status,version,last_verified_at)
values(
  'India Tax Core',
  'tax-india-core',
  'Shared authoritative India tax material reused by Legal and Tax & Accounting assistants without duplicating indexed documents.',
  'jurisdiction',
  'public',
  'India',
  array['accounting','legal']::text[],
  'active',
  '2026.09',
  now()
)
on conflict(slug) do update set
  description=excluded.description,
  kind=excluded.kind,
  visibility=excluded.visibility,
  jurisdiction_country=excluded.jurisdiction_country,
  domains=excluded.domains,
  coverage_status=excluded.coverage_status,
  version=excluded.version,
  last_verified_at=now();

insert into public.source_knowledge_bases(source_registry_id,knowledge_base_id,priority)
select sr.id,kb.id,85
from public.source_registry sr
join public.knowledge_bases home on home.id=sr.knowledge_base_id
cross join public.knowledge_bases kb
where home.slug='accounting-india-core'
  and kb.slug='tax-india-core'
  and (sr.title ilike '%income tax%' or sr.title ilike 'GST%')
on conflict(source_registry_id,knowledge_base_id) do update set priority=excluded.priority;

insert into public.knowledge_base_documents(knowledge_base_id,document_id,priority)
select skb.knowledge_base_id,d.id,skb.priority
from public.source_knowledge_bases skb
join public.documents d on d.source_registry_id=skb.source_registry_id
join public.knowledge_bases kb on kb.id=skb.knowledge_base_id and kb.slug='tax-india-core'
where d.is_current=true
on conflict(knowledge_base_id,document_id) do update set priority=excluded.priority;
