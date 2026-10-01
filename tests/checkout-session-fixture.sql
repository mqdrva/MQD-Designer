-- Minimal schema reproducing the original checkout uniqueness failure in CI.
CREATE TABLE public.mqd_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('MQD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  status text NOT NULL DEFAULT 'draft',
  product_id text NOT NULL,
  product_name text NOT NULL,
  is_test boolean NOT NULL DEFAULT false,
  stripe_checkout_session_id text
);
CREATE UNIQUE INDEX mqd_orders_stripe_checkout_session_uidx
  ON public.mqd_orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
