alter table public.applications
  add column if not exists record_type smallint check (record_type between 1 and 7),
  add column if not exists application_date date,
  add column if not exists estimated_harvest_date date;

create index if not exists applications_record_type_idx
  on public.applications (record_type, created_at desc);

create table if not exists public.register_6_applications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  created_at timestamptz not null default now(),
  application_date date not null,
  renspa text,
  lot text,
  surface_ha numeric,
  crop text,
  variety text,
  issue text,
  product_name text,
  active_ingredient text,
  applied_dose text,
  estimated_harvest_date date,
  machine text,
  responsible text,
  observations text
);

alter table public.register_6_applications enable row level security;

comment on table public.register_6_applications is
  'Filas aprobadas del Registro 6 - Aplicación de fitosanitarios del Anexo BPA SENASA.';
