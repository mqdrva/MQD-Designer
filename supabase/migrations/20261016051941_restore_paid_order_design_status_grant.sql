-- The verified live payment webhook marks only these saved-design fields after payment.
-- Keep customer authorization and all other table privileges unchanged.
GRANT UPDATE (status, updated_at) ON public.customer_designs TO service_role;
