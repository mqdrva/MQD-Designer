-- Apply before releasing mqd-print-shop-pilot with customer receipts.
-- Existing requests stay NULL and are never emailed retroactively.
alter table public.mqd_print_shop_requests
  add column customer_receipt_status text check (customer_receipt_status in ('pending','sent','failed')),
  add column customer_receipt_provider_id text;
alter table public.mqd_print_shop_requests alter column customer_receipt_status set default 'pending';
-- Inherit the existing private ledger boundary; no public request lookup is added.
alter table public.mqd_print_shop_requests enable row level security;
revoke all on public.mqd_print_shop_requests from public,anon,authenticated;
grant all on public.mqd_print_shop_requests to service_role;
