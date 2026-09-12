create extension if not exists pgcrypto;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  status text not null default 'recibido' check (status in ('recibido','procesando','pendiente_revision','aprobado','rechazado')),
  source_phone text not null,
  message_sid text not null unique,
  media_type text,
  media_path text,
  transcript text,
  operator_name text,
  farm_name text,
  renspa text,
  rfd_number text,
  lot text,
  surface_ha numeric,
  crop text,
  variety text,
  issue text,
  product_name text,
  active_ingredient text,
  recommended_dose text,
  applied_dose text,
  total_volume text,
  days_to_harvest integer,
  machine text,
  weather text,
  observations text,
  confidence numeric check (confidence between 0 and 1)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  application_id uuid not null references public.applications(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb
);

alter table public.applications enable row level security;
alter table public.audit_events enable row level security;

insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', false)
on conflict (id) do nothing;

