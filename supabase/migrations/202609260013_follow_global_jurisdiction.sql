-- Built-in location-aware assistants follow the explicitly saved profile jurisdiction
-- unless the user deliberately overrides that assistant.
alter table public.bots
  add column if not exists follow_profile_jurisdiction boolean not null default true;

-- Custom/non-location-aware assistants do not participate in profile jurisdiction inheritance.
update public.bots
set follow_profile_jurisdiction=false
where not (is_builtin=true and bot_type in ('legal','accounting','health'));

-- Preserve an existing per-assistant override when it does not match the saved profile.
update public.bots b
set follow_profile_jurisdiction=false
from public.profiles p
where b.owner_user_id=p.id
  and b.is_builtin=true
  and b.bot_type in ('legal','accounting','health')
  and b.jurisdiction_country is not null
  and (
    p.default_country is null
    or lower(b.jurisdiction_country) <> lower(p.default_country)
    or coalesce(lower(b.jurisdiction_region),'') <> coalesce(lower(p.default_region),'')
  );

create index if not exists bots_follow_profile_jurisdiction_idx
  on public.bots(owner_user_id,follow_profile_jurisdiction)
  where is_builtin=true and bot_type in ('legal','accounting','health');
