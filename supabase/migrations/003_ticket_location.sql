-- Migrasi 003: lokasi tiket (Office / Production / Outdoor)
do $$ begin
  create type public.ticket_location as enum ('office','production','outdoor');
exception when duplicate_object then null; end $$;
alter table public.tickets add column if not exists location public.ticket_location not null default 'office';
