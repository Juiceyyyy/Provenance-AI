-- Atomic portfolio replacement for imports/editor saves. RLS remains authoritative.
create or replace function public.replace_portfolio(
  p_name text,
  p_base_currency text,
  p_positions jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_portfolio uuid;
  item jsonb;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_positions) <> 'array' then raise exception 'Positions must be an array'; end if;
  v_count := jsonb_array_length(p_positions);
  if v_count < 1 or v_count > 500 then raise exception 'Portfolio must contain 1 to 500 positions'; end if;

  select organization_id into v_org
  from public.organization_members
  where user_id=auth.uid()
  order by created_at
  limit 1;
  if v_org is null then raise exception 'Workspace not initialized'; end if;

  select id into v_portfolio
  from public.portfolios
  where owner_user_id=auth.uid()
  order by updated_at desc
  limit 1;

  if v_portfolio is null then
    insert into public.portfolios(organization_id,owner_user_id,name,base_currency)
    values(v_org,auth.uid(),left(coalesce(nullif(btrim(p_name),''),'My Portfolio'),120),upper(left(coalesce(nullif(btrim(p_base_currency),''),'INR'),8)))
    returning id into v_portfolio;
  else
    update public.portfolios
    set name=left(coalesce(nullif(btrim(p_name),''),'My Portfolio'),120),
        base_currency=upper(left(coalesce(nullif(btrim(p_base_currency),''),'INR'),8)),updated_at=now()
    where id=v_portfolio;
    delete from public.portfolio_positions where portfolio_id=v_portfolio;
  end if;

  for item in select value from jsonb_array_elements(p_positions) loop
    if coalesce((item->>'value')::numeric,0) <= 0 then continue; end if;
    insert into public.portfolio_positions(
      portfolio_id,symbol,name,current_value,sector,industry,asset_class,region,currency,account_name
    ) values (
      v_portfolio,
      nullif(left(btrim(coalesce(item->>'symbol','')),40),''),
      left(coalesce(nullif(btrim(item->>'name'),''),nullif(btrim(item->>'symbol'),''),'Unnamed'),160),
      (item->>'value')::numeric,
      nullif(left(btrim(coalesce(item->>'sector','')),100),''),
      nullif(left(btrim(coalesce(item->>'industry','')),120),''),
      nullif(left(btrim(coalesce(item->>'assetClass','')),80),''),
      nullif(left(btrim(coalesce(item->>'region','')),80),''),
      nullif(upper(left(btrim(coalesce(item->>'currency','')),8)),''),
      nullif(left(btrim(coalesce(item->>'account','')),120),'')
    );
  end loop;
  return v_portfolio;
end;
$$;
revoke all on function public.replace_portfolio(text,text,jsonb) from public, anon;
grant execute on function public.replace_portfolio(text,text,jsonb) to authenticated;
