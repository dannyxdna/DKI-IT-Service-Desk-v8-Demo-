-- DKI IT SERVICE DESK — PostgreSQL / Supabase schema
-- Jalankan di Supabase SQL Editor setelah persetujuan penggunaan cloud dari perusahaan.
create extension if not exists pgcrypto;

create type public.app_role as enum ('employee','it_support','admin');
create type public.ticket_priority as enum ('low','medium','high','critical');
create type public.ticket_status as enum ('open','in_progress','pending','resolved','closed');
create type public.ticket_location as enum ('office','production','outdoor');
create type public.check_result_status as enum ('ok','ng','na');

create table public.plants (
 id uuid primary key default gen_random_uuid(),
 plant_code text not null unique,
 plant_name text not null,
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);

create table public.departments (
 id uuid primary key default gen_random_uuid(),
 department_name text not null unique,
 is_active boolean not null default true
);

-- Profiles are linked to Supabase Auth. Admin provisions accounts; do not allow users to self-assign roles.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null,
 email text not null unique,
 role public.app_role not null default 'employee',
 plant_id uuid references public.plants(id),
 department_id uuid references public.departments(id),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.ticket_categories (
 id uuid primary key default gen_random_uuid(),
 category_name text not null unique,
 is_active boolean not null default true
);
create table public.tickets (
 id uuid primary key default gen_random_uuid(),
 ticket_number text not null unique,
 title text not null,
 description text not null,
 plant_id uuid not null references public.plants(id),
 department_id uuid references public.departments(id),
 reporter_id uuid not null references public.profiles(id),
 assignee_id uuid references public.profiles(id),
 category_id uuid references public.ticket_categories(id),
 priority public.ticket_priority not null default 'medium',
 status public.ticket_status not null default 'open',
 root_cause text,
 resolution_notes text,
 created_at timestamptz not null default now(),
 first_response_at timestamptz,
 resolved_at timestamptz,
 location public.ticket_location not null default 'office',
 resolution_minutes integer check (resolution_minutes is null or resolution_minutes >= 0),
 downtime_minutes integer not null default 0 check (downtime_minutes >= 0),
 closed_at timestamptz,
 updated_at timestamptz not null default now()
);
create index tickets_plant_status_idx on public.tickets(plant_id,status,created_at desc);
create index tickets_reporter_idx on public.tickets(reporter_id,created_at desc);
create index tickets_assignee_idx on public.tickets(assignee_id,status);

create table public.ticket_comments (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.tickets(id) on delete cascade,
 author_id uuid not null references public.profiles(id),
 comment_text text not null,
 is_internal boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.ticket_history (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.tickets(id) on delete cascade,
 changed_by uuid references public.profiles(id),
 old_status public.ticket_status,
 new_status public.ticket_status,
 change_note text,
 changed_at timestamptz not null default now()
);

create table public.checklist_templates (
 id uuid primary key default gen_random_uuid(),
 template_code text not null unique,
 template_name text not null,
 standard_number text,
 revision text,
 effective_date date,
 check_frequency text not null default 'daily',
 check_timing text not null default 'Sebelum mulai bekerja',
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.checklist_items (
 id uuid primary key default gen_random_uuid(),
 template_id uuid not null references public.checklist_templates(id),
 category text not null,
 item_name text not null,
 criteria text not null,
 input_type text not null default 'status',
 unit text,
 sort_order integer not null default 0,
 is_required boolean not null default true,
 is_active boolean not null default true,
 unique(template_id,item_name)
);
-- All items initially apply to both plants; mapping table permits future plant-specific exceptions.
create table public.checklist_item_plants (
 item_id uuid not null references public.checklist_items(id) on delete cascade,
 plant_id uuid not null references public.plants(id) on delete cascade,
 primary key(item_id,plant_id)
);
create table public.daily_check_sessions (
 id uuid primary key default gen_random_uuid(),
 template_id uuid not null references public.checklist_templates(id),
 plant_id uuid not null references public.plants(id),
 checker_id uuid not null references public.profiles(id),
 check_date date not null,
 session_status text not null default 'draft' check (session_status in ('draft','submitted')),
 started_at timestamptz not null default now(),
 submitted_at timestamptz,
 unique(template_id,plant_id,check_date,checker_id)
);
create index daily_sessions_plant_date_idx on public.daily_check_sessions(plant_id,check_date desc);
create table public.daily_check_results (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.daily_check_sessions(id) on delete cascade,
 item_id uuid not null references public.checklist_items(id),
 result_status public.check_result_status,
 measured_value text,
 notes text,
 checked_by uuid references public.profiles(id),
 checked_at timestamptz,
 linked_ticket_id uuid references public.tickets(id),
 unique(session_id,item_id),
 constraint ng_requires_note check (result_status is distinct from 'ng' or nullif(trim(notes),'') is not null)
);

-- Number generation for tickets: IT-YYYY-00001
create sequence if not exists public.ticket_number_seq start 1;
create or replace function public.set_ticket_number()
returns trigger language plpgsql as $$
begin
 if new.ticket_number is null or new.ticket_number = '' then
   new.ticket_number := 'IT-' || to_char(coalesce(new.created_at,now()),'YYYY') || '-' || lpad(nextval('public.ticket_number_seq')::text,5,'0');
 end if;
 return new;
end $$;
create trigger tickets_set_number before insert on public.tickets
for each row execute function public.set_ticket_number();

-- Shared helper: role lookup from trusted profile table.
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and is_active=true $$;

create or replace function public.is_it_staff()
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.current_app_role() in ('it_support','admin'),false) $$;

alter table public.plants enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.ticket_categories enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_history enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_item_plants enable row level security;
alter table public.daily_check_sessions enable row level security;
alter table public.daily_check_results enable row level security;

-- Reference data is readable to signed-in users; only admins may maintain it.
create policy "signed in read plants" on public.plants for select to authenticated using (true);
create policy "admin manage plants" on public.plants for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');
create policy "signed in read departments" on public.departments for select to authenticated using (true);
create policy "admin manage departments" on public.departments for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');
create policy "read profiles" on public.profiles for select to authenticated using (id=auth.uid() or public.is_it_staff());
create policy "admin manage profiles" on public.profiles for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');
create policy "read ticket categories" on public.ticket_categories for select to authenticated using (true);
create policy "admin manage categories" on public.ticket_categories for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');

-- Employee can see/create own tickets; IT Support/Admin can manage all plants.
create policy "read own or staff tickets" on public.tickets for select to authenticated using (reporter_id=auth.uid() or public.is_it_staff());
create policy "create own tickets" on public.tickets for insert to authenticated with check (reporter_id=auth.uid());
create policy "staff update tickets" on public.tickets for update to authenticated using (public.is_it_staff()) with check (public.is_it_staff());
create policy "staff delete tickets" on public.tickets for delete to authenticated using (public.current_app_role()='admin');

create policy "read ticket comments" on public.ticket_comments for select to authenticated using (
 exists(select 1 from public.tickets t where t.id=ticket_id and (t.reporter_id=auth.uid() or public.is_it_staff()))
 and (not is_internal or public.is_it_staff())
);
create policy "add ticket comments" on public.ticket_comments for insert to authenticated with check (
 author_id=auth.uid() and exists(select 1 from public.tickets t where t.id=ticket_id and (t.reporter_id=auth.uid() or public.is_it_staff()))
);
create policy "read ticket history" on public.ticket_history for select to authenticated using (
 exists(select 1 from public.tickets t where t.id=ticket_id and (t.reporter_id=auth.uid() or public.is_it_staff()))
);
create policy "staff insert ticket history" on public.ticket_history for insert to authenticated with check (public.is_it_staff() and changed_by=auth.uid());

create policy "read checklist templates" on public.checklist_templates for select to authenticated using (true);
create policy "admin manage templates" on public.checklist_templates for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');
create policy "read checklist items" on public.checklist_items for select to authenticated using (true);
create policy "admin manage items" on public.checklist_items for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');
create policy "read item plant map" on public.checklist_item_plants for select to authenticated using (true);
create policy "admin manage item plant map" on public.checklist_item_plants for all to authenticated using (public.current_app_role()='admin') with check (public.current_app_role()='admin');

-- Multiple IT Support accounts can create/check sessions for either plant.
create policy "read own or staff sessions" on public.daily_check_sessions for select to authenticated using (checker_id=auth.uid() or public.is_it_staff());
create policy "it staff create sessions" on public.daily_check_sessions for insert to authenticated with check (public.is_it_staff() and checker_id=auth.uid());
create policy "it staff update sessions" on public.daily_check_sessions for update to authenticated using (public.is_it_staff()) with check (public.is_it_staff());
create policy "read own or staff results" on public.daily_check_results for select to authenticated using (
 exists(select 1 from public.daily_check_sessions s where s.id=session_id and (s.checker_id=auth.uid() or public.is_it_staff()))
);
create policy "it staff add results" on public.daily_check_results for insert to authenticated with check (
 public.is_it_staff() and exists(select 1 from public.daily_check_sessions s where s.id=session_id and s.checker_id=auth.uid())
);
create policy "it staff update results" on public.daily_check_results for update to authenticated using (public.is_it_staff()) with check (public.is_it_staff());

-- Seed plant and template. Checklist item seed data is in seed.sql.
insert into public.plants(plant_code,plant_name) values ('P1','Plant 1'),('P2','Plant 2') on conflict(plant_code) do nothing;
insert into public.checklist_templates(template_code,template_name,standard_number,revision,effective_date)
values ('DKI-DAILY-IT','Daily IT Checksheet','DKI-CS-IT-01','a2','2026-02-05')
on conflict(template_code) do nothing;

-- Waktu penyelesaian & downtime tiket (lihat juga migrations/002)
-- Tiket berstatus resolved/closed wajib punya waktu penyelesaian.
-- NOT VALID: data lama tidak diperiksa ulang; baris baru/yang diubah tetap divalidasi.
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
