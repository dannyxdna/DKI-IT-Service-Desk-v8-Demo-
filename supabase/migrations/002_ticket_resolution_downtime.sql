-- Migrasi 002: waktu penyelesaian (menit) & downtime (menit) pada tiket.
-- Aman dijalankan pada database yang sudah memakai schema.sql versi sebelumnya.
alter table public.tickets
  add column if not exists resolution_minutes integer check (resolution_minutes is null or resolution_minutes >= 0),
  add column if not exists downtime_minutes   integer not null default 0 check (downtime_minutes >= 0);

-- Tiket berstatus resolved/closed wajib punya waktu penyelesaian.
-- NOT VALID: data lama tidak diperiksa ulang; baris baru/yang diubah tetap divalidasi.
alter table public.tickets drop constraint if exists resolved_requires_minutes;
alter table public.tickets add constraint resolved_requires_minutes
  check (status not in ('resolved','closed') or resolution_minutes is not null) not valid;

create index if not exists tickets_resolved_at_idx on public.tickets(plant_id, resolved_at);

-- Rekap per hari / minggu untuk grafik. Rentang & plant dipilih dari UI.
-- p_plant null = semua plant; p_bucket: 'day' atau 'week'.
-- Berjalan sebagai pemanggil (security invoker) sehingga RLS tetap berlaku.
create or replace function public.ticket_time_report(p_from date, p_to date, p_plant uuid default null, p_bucket text default 'day')
returns table(bucket_start date, tickets_resolved bigint, total_resolution_minutes bigint, total_downtime_minutes bigint)
language sql stable security invoker set search_path = public as $$
  select date_trunc(case when p_bucket = 'week' then 'week' else 'day' end, t.resolved_at)::date,
         count(*), coalesce(sum(t.resolution_minutes),0), coalesce(sum(t.downtime_minutes),0)
  from public.tickets t
  where t.status in ('resolved','closed')
    and t.resolved_at >= p_from and t.resolved_at < p_to + 1
    and (p_plant is null or t.plant_id = p_plant)
  group by 1 order by 1
$$;
