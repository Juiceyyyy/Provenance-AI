create table if not exists public.daily_usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (now() at time zone 'utc')::date,
  chat_count integer not null default 0 check (chat_count >= 0),
  updated_at timestamptz not null default now(),
  primary key(user_id, usage_date)
);
alter table public.daily_usage_counters enable row level security;
create policy usage_counter_select_self on public.daily_usage_counters for select to authenticated using (user_id=(select auth.uid()));
create policy usage_counter_insert_self on public.daily_usage_counters for insert to authenticated with check (user_id=(select auth.uid()));
create policy usage_counter_update_self on public.daily_usage_counters for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
grant select,insert,update on public.daily_usage_counters to authenticated;

create or replace function public.reserve_chat_quota(p_limit integer)
returns integer
language plpgsql
security invoker
set search_path=''
as $$
declare v_count integer; v_day date := (now() at time zone 'utc')::date;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_limit < 1 or p_limit > 100000 then raise exception 'Invalid quota'; end if;
  insert into public.daily_usage_counters(user_id,usage_date,chat_count,updated_at)
  values(auth.uid(),v_day,1,now())
  on conflict(user_id,usage_date) do update
    set chat_count=public.daily_usage_counters.chat_count+1,updated_at=now()
    where public.daily_usage_counters.chat_count < p_limit
  returning chat_count into v_count;
  if v_count is null then raise exception 'Daily message limit reached'; end if;
  return v_count;
end;
$$;
revoke all on function public.reserve_chat_quota(integer) from public, anon;
grant execute on function public.reserve_chat_quota(integer) to authenticated;
