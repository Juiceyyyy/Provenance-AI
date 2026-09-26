alter table public.conversations
  add column if not exists archived_at timestamptz,
  add column if not exists last_message_at timestamptz;

update public.conversations c
set last_message_at = m.last_message_at
from (
  select conversation_id, max(created_at) as last_message_at
  from public.messages
  group by conversation_id
) m
where c.id = m.conversation_id
  and c.last_message_at is null;

create index if not exists conversations_owner_archive_activity_idx
  on public.conversations(owner_user_id, archived_at, last_message_at desc)
  where last_message_at is not null;
