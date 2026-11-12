-- Isolated transaction; never add synthetic requests to production.
begin;
\ir ../docs/print-shop-schema.sql
insert into public.mqd_print_shop_requests(id,shop_slug,ip_hash,payload_hash,reference,status)
values('60000000-0000-4000-8000-000000000001','receipt-test','private','original','OLD','sent');
\ir ../docs/print-shop-receipts-schema.sql
do $$ declare r public.mqd_print_shop_requests; begin
 if (select customer_receipt_status is not null from public.mqd_print_shop_requests where reference='OLD') then raise exception 'Historical request must not receive a receipt'; end if;
 select * into r from public.mqd_claim_print_shop_request('60000000-0000-4000-8000-000000000002','receipt-test','private','new');
 if r.customer_receipt_status is distinct from 'pending' then raise exception 'New request receipt default missing'; end if;
 if has_table_privilege('anon','public.mqd_print_shop_requests','select') or has_table_privilege('authenticated','public.mqd_print_shop_requests','select,update') then raise exception 'Request ledger must stay private'; end if;
end $$;
rollback;
