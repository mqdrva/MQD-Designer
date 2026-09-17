create table if not exists public.mqd_email_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.mqd_orders(id) on delete cascade,
  kind text not null check (kind in ('owner_paid_order','customer_shipped')),
  recipient text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (order_id, kind, recipient)
);

alter table public.mqd_email_notifications enable row level security;
revoke all on table public.mqd_email_notifications from anon, authenticated;
grant all on table public.mqd_email_notifications to service_role;

create index if not exists mqd_email_notifications_status_created_idx
  on public.mqd_email_notifications (status, created_at);
create index if not exists mqd_email_notifications_order_idx
  on public.mqd_email_notifications (order_id, created_at desc);
