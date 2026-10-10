create table if not exists public.mqd_design_requests (
 id uuid primary key,
 payload jsonb not null,
 payload_hash text not null,
 email_status text not null default 'pending' check (email_status in ('pending','sent')),
 provider_id text,
 created_at timestamptz not null default now()
);
alter table public.mqd_design_requests enable row level security;
revoke all on public.mqd_design_requests from anon, authenticated;
grant select, insert, update on public.mqd_design_requests to service_role;
create index if not exists mqd_design_requests_created_idx on public.mqd_design_requests(created_at desc);
