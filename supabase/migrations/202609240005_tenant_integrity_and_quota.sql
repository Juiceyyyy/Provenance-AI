-- Defense in depth for client-writable rows.
-- RLS controls which rows can be touched; this trigger additionally prevents authenticated clients
-- from reassigning tenant/owner/linkage identity after creation. Server-side worker connections do not
-- carry auth.uid() and are intentionally exempt for maintenance/versioning flows.

create or replace function private.reject_authenticated_identity_reassignment()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
  field_name text;
begin
  if auth.uid() is null then
    return new;
  end if;

  foreach field_name in array tg_argv loop
    if (old_row -> field_name) is distinct from (new_row -> field_name) then
      raise exception 'Immutable identity field cannot be changed: %', field_name using errcode='42501';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.reject_authenticated_identity_reassignment() from public, anon, authenticated;

create trigger bots_identity_immutable
before update on public.bots
for each row execute function private.reject_authenticated_identity_reassignment('organization_id','owner_user_id','bot_type');

create trigger kb_identity_immutable
before update on public.knowledge_bases
for each row execute function private.reject_authenticated_identity_reassignment('organization_id','owner_user_id','kind','visibility');

create trigger documents_identity_immutable
before update on public.documents
for each row execute function private.reject_authenticated_identity_reassignment('organization_id','owner_user_id','knowledge_base_id','source_registry_id');

create trigger versions_identity_immutable
before update on public.document_versions
for each row execute function private.reject_authenticated_identity_reassignment('document_id','version_number','storage_path');

create trigger jobs_identity_immutable
before update on public.ingestion_jobs
for each row execute function private.reject_authenticated_identity_reassignment('organization_id','document_version_id','job_type');

create trigger conversations_identity_immutable
before update on public.conversations
for each row execute function private.reject_authenticated_identity_reassignment('organization_id','owner_user_id','bot_id');

create trigger portfolios_identity_immutable
before update on public.portfolios
for each row execute function private.reject_authenticated_identity_reassignment('organization_id','owner_user_id');

create trigger source_registry_identity_immutable
before update on public.source_registry
for each row execute function private.reject_authenticated_identity_reassignment('knowledge_base_id');

-- Chat quotas must not be directly reset by a client. The mutable counter is private to a
-- security-definer helper in a non-exposed schema; the public wrapper remains security-invoker.
drop policy if exists usage_counter_insert_self on public.daily_usage_counters;
drop policy if exists usage_counter_update_self on public.daily_usage_counters;
revoke insert, update, delete on public.daily_usage_counters from authenticated;

create or replace function private.consume_chat_quota(p_limit integer)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
  v_day date := (now() at time zone 'utc')::date;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_limit < 1 or p_limit > 100000 then raise exception 'Invalid quota'; end if;

  insert into public.daily_usage_counters(user_id,usage_date,chat_count,updated_at)
  values(v_uid,v_day,1,now())
  on conflict(user_id,usage_date) do update
    set chat_count=public.daily_usage_counters.chat_count+1,updated_at=now()
    where public.daily_usage_counters.chat_count < p_limit
  returning chat_count into v_count;

  if v_count is null then raise exception 'Daily message limit reached'; end if;
  return v_count;
end;
$$;
revoke all on function private.consume_chat_quota(integer) from public, anon;
grant execute on function private.consume_chat_quota(integer) to authenticated;

create or replace function public.reserve_chat_quota(p_limit integer)
returns integer
language sql
security invoker
set search_path=''
as $$
  select private.consume_chat_quota(p_limit);
$$;
revoke all on function public.reserve_chat_quota(integer) from public, anon;
grant execute on function public.reserve_chat_quota(integer) to authenticated;
