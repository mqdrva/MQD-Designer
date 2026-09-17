create or replace function public.mqd_has_google_identity()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt()->'app_metadata'->'providers') ? 'google', false)
      or coalesce(auth.jwt()->'app_metadata'->>'provider' = 'google', false);
$$;

revoke all on function public.mqd_has_google_identity() from public;
grant execute on function public.mqd_has_google_identity() to authenticated;

alter policy customer_designs_select_own on public.customer_designs
  using (public.mqd_has_google_identity() and (select auth.uid()) = user_id);

alter policy customer_designs_insert_own on public.customer_designs
  with check (public.mqd_has_google_identity() and (select auth.uid()) = user_id);

alter policy customer_designs_update_own on public.customer_designs
  using (public.mqd_has_google_identity() and (select auth.uid()) = user_id)
  with check (public.mqd_has_google_identity() and (select auth.uid()) = user_id);

alter policy customer_designs_delete_own on public.customer_designs
  using (public.mqd_has_google_identity() and (select auth.uid()) = user_id);

alter policy mqd_orders_select_own on public.mqd_orders
  using (public.mqd_has_google_identity() and (select auth.uid()) = user_id);

alter policy mqd_order_items_select_own on public.mqd_order_items
  using (
    public.mqd_has_google_identity()
    and exists (
      select 1 from public.mqd_orders o
      where o.id = mqd_order_items.order_id and o.user_id = (select auth.uid())
    )
  );

alter policy mqd_order_assets_select_own on public.mqd_order_assets
  using (
    public.mqd_has_google_identity()
    and exists (
      select 1 from public.mqd_orders o
      where o.id = mqd_order_assets.order_id and o.user_id = (select auth.uid())
    )
  );
