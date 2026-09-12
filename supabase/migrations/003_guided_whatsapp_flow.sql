create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  renspa text not null unique,
  locality text,
  province text,
  active boolean not null default true
);

create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null unique,
  active boolean not null default true
);

create table if not exists public.whatsapp_sessions (
  phone text primary key,
  step text not null default 'inactive' check (step in ('inactive', 'selecting_establishment', 'selecting_register', 'awaiting_evidence', 'awaiting_missing_data')),
  establishment_id uuid references public.establishments(id) on delete set null,
  register_number smallint check (register_number between 1 and 7),
  application_id uuid references public.applications(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.applications
  add column if not exists establishment_id uuid references public.establishments(id) on delete set null,
  add column if not exists operator_id uuid references public.operators(id) on delete set null;

alter table public.whatsapp_sessions
  add column if not exists application_id uuid references public.applications(id) on delete set null;

alter table public.whatsapp_sessions drop constraint if exists whatsapp_sessions_step_check;
alter table public.whatsapp_sessions add constraint whatsapp_sessions_step_check
  check (step in ('inactive', 'selecting_establishment', 'selecting_register', 'awaiting_evidence', 'awaiting_missing_data'));

alter table public.register_6_applications
  add column if not exists establishment_name text;

create index if not exists applications_renspa_idx on public.applications (renspa, created_at desc);
create index if not exists applications_operator_idx on public.applications (operator_id, created_at desc);

alter table public.establishments enable row level security;
alter table public.operators enable row level security;
alter table public.whatsapp_sessions enable row level security;

comment on table public.establishments is 'Establecimientos seleccionables en WhatsApp; cada nombre resuelve un RENSPA.';
comment on table public.operators is 'Operarios identificados automáticamente por su número de WhatsApp.';
comment on table public.whatsapp_sessions is 'Estado del flujo guiado AgroVoz por teléfono.';

-- Reemplazar estos ejemplos por los establecimientos reales. No se insertan
-- teléfonos de operarios porque el nombre real debe configurarse explícitamente.
insert into public.establishments (name, renspa, locality, province)
values
  ('La Esperanza (demo)', '04.001.0.01234/00', 'Colonia Caroya', 'Córdoba'),
  ('El Ombú (demo)', '04.001.0.05678/00', 'Jesús María', 'Córdoba')
on conflict (renspa) do nothing;
