-- Owner Orders Dashboard fulfillment fields and search/filter indexes.
-- Mirrors the production migration already applied to Supabase.

alter table if exists public.mqd_orders
  add column if not exists tracking_number text,
  add column if not exists shipping_carrier text,
  add column if not exists production_started_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists mqd_orders_status_created_idx
  on public.mqd_orders (status, created_at desc);

create index if not exists mqd_orders_order_number_lower_idx
  on public.mqd_orders (lower(order_number));

create index if not exists mqd_orders_customer_email_lower_idx
  on public.mqd_orders (lower(coalesce(customer_email,'')));

create index if not exists mqd_orders_customer_name_lower_idx
  on public.mqd_orders (lower(coalesce(customer_name,'')));
