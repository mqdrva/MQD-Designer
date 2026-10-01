-- A Checkout Session pays for a cart, which can contain several mqd_orders.
-- Preserve fast session lookups while allowing each cart order to share it.
CREATE INDEX IF NOT EXISTS mqd_orders_stripe_checkout_session_idx
  ON public.mqd_orders (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
DROP INDEX IF EXISTS public.mqd_orders_stripe_checkout_session_uidx;
