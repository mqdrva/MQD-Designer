BEGIN;
DO $$
DECLARE
  first_id uuid;
  second_id uuid;
  test_session text := 'cs_test_regression_' || replace(gen_random_uuid()::text,'-','');
  matches integer;
BEGIN
  INSERT INTO public.mqd_orders (product_id,product_name,is_test,status) VALUES ('tshirt','Checkout schema regression A',true,'submitted') RETURNING id INTO first_id;
  INSERT INTO public.mqd_orders (product_id,product_name,is_test,status) VALUES ('tshirt','Checkout schema regression B',true,'submitted') RETURNING id INTO second_id;
  UPDATE public.mqd_orders SET stripe_checkout_session_id=test_session WHERE id IN (first_id,second_id);
  SELECT count(*) INTO matches FROM public.mqd_orders WHERE stripe_checkout_session_id=test_session;
  IF matches<>2 THEN RAISE EXCEPTION 'Multi-order checkout regression: expected 2 orders, got %',matches; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.mqd_orders'::regclass AND conname='mqd_orders_order_number_key' AND contype='u') THEN RAISE EXCEPTION 'Order numbers must remain unique'; END IF;
END $$;
ROLLBACK;