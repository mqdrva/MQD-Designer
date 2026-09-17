alter table public.mqd_orders
  add column if not exists guest_checkout_token_hash text;

create index if not exists mqd_orders_guest_checkout_token_hash_idx
  on public.mqd_orders (guest_checkout_token_hash)
  where guest_checkout_token_hash is not null;
