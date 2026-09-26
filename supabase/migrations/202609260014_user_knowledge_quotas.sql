-- Quota-controlled private knowledge storage.
-- Raw uploads are transient ingestion inputs; durable user memory is measured by
-- processed bytes/chunks/documents. Limits are intentionally data-driven so they
-- can later vary by plan without changing the ingestion architecture.

alter table public.documents
  add column if not exists raw_storage_bytes bigint not null default 0 check (raw_storage_bytes >= 0),
  add column if not exists processed_byte_size bigint not null default 0 check (processed_byte_size >= 0),
  add column if not exists chunk_count integer not null default 0 check (chunk_count >= 0);

-- Existing private files still referenced by a document version count as retained raw storage.
update public.documents d
set raw_storage_bytes = coalesce(d.byte_size, 0)
where d.owner_user_id is not null
  and d.raw_storage_bytes = 0
  and exists (
    select 1 from public.document_versions v
    where v.document_id=d.id and v.storage_path is not null
  );

-- Backfill durable processed usage for already-indexed private documents.
with metrics as (
  select c.document_id,
         count(*)::integer as chunk_count,
         coalesce(sum(octet_length(c.content)),0)::bigint as processed_byte_size
  from public.chunks c
  join public.documents d on d.id=c.document_id
  where d.owner_user_id is not null
  group by c.document_id
)
update public.documents d
set chunk_count=m.chunk_count,
    processed_byte_size=m.processed_byte_size
from metrics m
where d.id=m.document_id;

create table if not exists public.user_knowledge_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  max_documents integer not null default 25 check (max_documents between 1 and 10000),
  max_raw_storage_bytes bigint not null default 52428800 check (max_raw_storage_bytes >= 1048576),
  max_processed_bytes bigint not null default 10485760 check (max_processed_bytes >= 1048576),
  max_chunks integer not null default 1500 check (max_chunks between 100 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_knowledge_usage (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  document_count integer not null default 0 check (document_count >= 0),
  raw_storage_bytes bigint not null default 0 check (raw_storage_bytes >= 0),
  processed_bytes bigint not null default 0 check (processed_bytes >= 0),
  chunk_count integer not null default 0 check (chunk_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_upload_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 52428800),
  storage_path text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  consumed_at timestamptz
);
create index if not exists knowledge_upload_reservations_user_active_idx
  on public.knowledge_upload_reservations(user_id,expires_at)
  where consumed_at is null;

insert into public.user_knowledge_limits(user_id)
select id from public.profiles
on conflict(user_id) do nothing;

insert into public.user_knowledge_usage(user_id,document_count,raw_storage_bytes,processed_bytes,chunk_count)
select p.id,
       count(d.id)::integer,
       coalesce(sum(d.raw_storage_bytes),0)::bigint,
       coalesce(sum(d.processed_byte_size),0)::bigint,
       coalesce(sum(d.chunk_count),0)::integer
from public.profiles p
left join public.documents d on d.owner_user_id=p.id
group by p.id
on conflict(user_id) do update set
  document_count=excluded.document_count,
  raw_storage_bytes=excluded.raw_storage_bytes,
  processed_bytes=excluded.processed_bytes,
  chunk_count=excluded.chunk_count,
  updated_at=now();

alter table public.user_knowledge_limits enable row level security;
alter table public.user_knowledge_usage enable row level security;
alter table public.knowledge_upload_reservations enable row level security;

grant select on public.user_knowledge_limits to authenticated;
grant select on public.user_knowledge_usage to authenticated;
grant all on public.user_knowledge_limits,public.user_knowledge_usage,public.knowledge_upload_reservations to service_role;

create policy user_knowledge_limits_select_self on public.user_knowledge_limits
for select to authenticated using (user_id=(select auth.uid()));
create policy user_knowledge_usage_select_self on public.user_knowledge_usage
for select to authenticated using (user_id=(select auth.uid()));

create or replace function private.ensure_user_knowledge_rows(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id=p_user_id) then
    raise exception 'Knowledge owner profile does not exist' using errcode='23503';
  end if;

  insert into public.user_knowledge_limits(user_id) values(p_user_id)
  on conflict(user_id) do nothing;
  insert into public.user_knowledge_usage(user_id) values(p_user_id)
  on conflict(user_id) do nothing;
end;
$$;

create or replace function private.enforce_document_knowledge_quota()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  lim public.user_knowledge_limits%rowtype;
  use_row public.user_knowledge_usage%rowtype;
  next_documents bigint;
  next_raw bigint;
  next_processed bigint;
  next_chunks bigint;
begin
  if tg_op='UPDATE' and new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'Document knowledge ownership cannot be reassigned' using errcode='23514';
  end if;
  if new.owner_user_id is null then
    return new;
  end if;

  perform private.ensure_user_knowledge_rows(new.owner_user_id);
  select * into lim from public.user_knowledge_limits where user_id=new.owner_user_id for update;
  select * into use_row from public.user_knowledge_usage where user_id=new.owner_user_id for update;

  if tg_op='INSERT' then
    next_documents := use_row.document_count + 1;
    next_raw := use_row.raw_storage_bytes + new.raw_storage_bytes;
    next_processed := use_row.processed_bytes + new.processed_byte_size;
    next_chunks := use_row.chunk_count + new.chunk_count;
  else
    next_documents := use_row.document_count;
    next_raw := use_row.raw_storage_bytes - old.raw_storage_bytes + new.raw_storage_bytes;
    next_processed := use_row.processed_bytes - old.processed_byte_size + new.processed_byte_size;
    next_chunks := use_row.chunk_count - old.chunk_count + new.chunk_count;
  end if;

  if next_documents > lim.max_documents then
    raise exception 'Private knowledge document limit reached (%).', lim.max_documents using errcode='23514';
  end if;
  if next_raw > lim.max_raw_storage_bytes then
    raise exception 'Temporary raw upload storage limit reached.' using errcode='23514';
  end if;
  if next_processed > lim.max_processed_bytes then
    raise exception 'Private processed knowledge byte limit reached.' using errcode='23514';
  end if;
  if next_chunks > lim.max_chunks then
    raise exception 'Private knowledge chunk limit reached (%).', lim.max_chunks using errcode='23514';
  end if;

  return new;
end;
$$;

create or replace function private.apply_document_knowledge_usage()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if tg_op='INSERT' and new.owner_user_id is not null then
    perform private.ensure_user_knowledge_rows(new.owner_user_id);
    update public.user_knowledge_usage set
      document_count=document_count+1,
      raw_storage_bytes=raw_storage_bytes+new.raw_storage_bytes,
      processed_bytes=processed_bytes+new.processed_byte_size,
      chunk_count=chunk_count+new.chunk_count,
      updated_at=now()
    where user_id=new.owner_user_id;
    return new;
  end if;

  if tg_op='UPDATE' and new.owner_user_id is not null then
    update public.user_knowledge_usage set
      raw_storage_bytes=greatest(0,raw_storage_bytes-old.raw_storage_bytes+new.raw_storage_bytes),
      processed_bytes=greatest(0,processed_bytes-old.processed_byte_size+new.processed_byte_size),
      chunk_count=greatest(0,chunk_count-old.chunk_count+new.chunk_count),
      updated_at=now()
    where user_id=new.owner_user_id;
    return new;
  end if;

  if tg_op='DELETE' and old.owner_user_id is not null then
    update public.user_knowledge_usage set
      document_count=greatest(0,document_count-1),
      raw_storage_bytes=greatest(0,raw_storage_bytes-old.raw_storage_bytes),
      processed_bytes=greatest(0,processed_bytes-old.processed_byte_size),
      chunk_count=greatest(0,chunk_count-old.chunk_count),
      updated_at=now()
    where user_id=old.owner_user_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists documents_knowledge_quota_before_insert on public.documents;
create trigger documents_knowledge_quota_before_insert
before insert on public.documents
for each row execute function private.enforce_document_knowledge_quota();

drop trigger if exists documents_knowledge_quota_before_update on public.documents;
create trigger documents_knowledge_quota_before_update
before update of owner_user_id,raw_storage_bytes,processed_byte_size,chunk_count on public.documents
for each row execute function private.enforce_document_knowledge_quota();

drop trigger if exists documents_knowledge_usage_after_insert on public.documents;
create trigger documents_knowledge_usage_after_insert
after insert on public.documents
for each row execute function private.apply_document_knowledge_usage();

drop trigger if exists documents_knowledge_usage_after_update on public.documents;
create trigger documents_knowledge_usage_after_update
after update of raw_storage_bytes,processed_byte_size,chunk_count on public.documents
for each row execute function private.apply_document_knowledge_usage();

drop trigger if exists documents_knowledge_usage_after_delete on public.documents;
create trigger documents_knowledge_usage_after_delete
after delete on public.documents
for each row execute function private.apply_document_knowledge_usage();

create or replace function public.reserve_knowledge_upload(p_bytes bigint,p_storage_path text)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  lim public.user_knowledge_limits%rowtype;
  use_row public.user_knowledge_usage%rowtype;
  reserved_bytes bigint;
  reserved_docs integer;
  reservation_id uuid;
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_bytes <= 0 or p_bytes > 52428800 then raise exception 'Invalid upload size' using errcode='22023'; end if;
  if p_storage_path is null or length(p_storage_path) < 10 or position(uid::text in p_storage_path)=0 then
    raise exception 'Invalid upload path' using errcode='22023';
  end if;

  perform private.ensure_user_knowledge_rows(uid);
  select * into lim from public.user_knowledge_limits where user_id=uid for update;
  select * into use_row from public.user_knowledge_usage where user_id=uid for update;
  select coalesce(sum(r.byte_size),0)::bigint,count(*)::integer
    into reserved_bytes,reserved_docs
  from public.knowledge_upload_reservations r
  where r.user_id=uid and r.consumed_at is null and r.expires_at>now();

  if use_row.document_count + reserved_docs + 1 > lim.max_documents then
    raise exception 'Private knowledge document limit reached (%).', lim.max_documents using errcode='23514';
  end if;
  if use_row.raw_storage_bytes + reserved_bytes + p_bytes > lim.max_raw_storage_bytes then
    raise exception 'Temporary raw upload storage limit reached.' using errcode='23514';
  end if;

  insert into public.knowledge_upload_reservations(user_id,byte_size,storage_path)
  values(uid,p_bytes,p_storage_path)
  returning id into reservation_id;
  return reservation_id;
end;
$$;

create or replace function public.claim_knowledge_upload_reservation(
  p_reservation_id uuid,p_bytes bigint,p_storage_path text
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  claimed uuid;
begin
  if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.knowledge_upload_reservations r
  set consumed_at=now()
  where r.id=p_reservation_id
    and r.user_id=uid
    and r.byte_size=p_bytes
    and r.storage_path=p_storage_path
    and r.consumed_at is null
    and r.expires_at>now()
  returning r.id into claimed;
  return claimed is not null;
end;
$$;

revoke all on function public.reserve_knowledge_upload(bigint,text) from public,anon;
revoke all on function public.claim_knowledge_upload_reservation(uuid,bigint,text) from public,anon;
grant execute on function public.reserve_knowledge_upload(bigint,text) to authenticated,service_role;
grant execute on function public.claim_knowledge_upload_reservation(uuid,bigint,text) to authenticated,service_role;
