create table public.email_events (
  id          uuid primary key default uuid_generate_v4(),
  message_id  text not null,
  note_id     uuid references public.notes(id) on delete set null,
  recipient   text not null,
  event_type  text not null,
  created_at  timestamptz not null default now()
);

create index email_events_message_id_idx on public.email_events (message_id);
create index email_events_note_id_idx    on public.email_events (note_id);

alter table public.email_events enable row level security;

create policy "anyone can read email events"
  on public.email_events for select
  using (true);

create policy "anyone can insert email events"
  on public.email_events for insert
  with check (true);
