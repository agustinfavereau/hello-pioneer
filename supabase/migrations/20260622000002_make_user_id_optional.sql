alter table public.notes
  drop constraint notes_user_id_fkey,
  alter column user_id drop not null;
