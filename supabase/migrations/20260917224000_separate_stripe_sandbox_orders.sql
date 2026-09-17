alter table public.mqd_orders
  add column if not exists is_test boolean not null default false;

update public.mqd_orders
set is_test = true
where is_test = false
  and (
    coalesce(design_json->>'mqdSandboxTest','false') = 'true'
    or coalesce(stripe_checkout_session_id,'') like 'cs_test_%'
  );

create index if not exists mqd_orders_is_test_created_at_idx
  on public.mqd_orders (is_test, created_at desc);
