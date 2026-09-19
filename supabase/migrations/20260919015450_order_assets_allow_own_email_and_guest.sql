-- All supported sign-in methods may read their own order assets.
-- Parent order ownership remains mandatory; no client writes are granted.
alter policy mqd_order_assets_select_own
on public.mqd_order_assets
to authenticated
using (
  exists (
    select 1 from public.mqd_orders o
    where o.id = mqd_order_assets.order_id
      and o.user_id = (select auth.uid())
  )
);
