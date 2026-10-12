create table public.mqd_print_shop_billing_accounts (
 business_id uuid primary key references public.mqd_print_shop_businesses(id),
 stripe_customer_id text unique,
 stripe_subscription_id text unique,
 stripe_checkout_id text,
 status text not null default 'not_started',
 period_end timestamptz,
 cancel_at_period_end boolean not null default false,
 lease_id uuid,
 lease_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.mqd_print_shop_billing_accounts enable row level security;
revoke all on public.mqd_print_shop_billing_accounts from public,anon,authenticated;
grant all on public.mqd_print_shop_billing_accounts to service_role;
create table public.mqd_print_shop_billing_events (
 event_id text primary key,
 event_type text not null,
 status text not null default 'pending',
 received_at timestamptz not null default now(),
 processed_at timestamptz
);
alter table public.mqd_print_shop_billing_events enable row level security;
revoke all on public.mqd_print_shop_billing_events from public,anon,authenticated;
grant all on public.mqd_print_shop_billing_events to service_role;
create function public.mqd_claim_print_shop_billing(p_business uuid,p_lease uuid)
returns setof public.mqd_print_shop_billing_accounts language plpgsql set search_path=public as $$
declare row public.mqd_print_shop_billing_accounts;
begin
 insert into public.mqd_print_shop_billing_accounts(business_id) values(p_business) on conflict do nothing;
 select * into row from public.mqd_print_shop_billing_accounts where business_id=p_business for update;
 if row.lease_until>now() then raise exception 'Billing is already opening. Try again shortly.'; end if;
 return query update public.mqd_print_shop_billing_accounts set lease_id=p_lease,lease_until=now()+interval '60 seconds' where business_id=p_business returning *;
end $$;
revoke all on function public.mqd_claim_print_shop_billing(uuid,uuid) from public,anon,authenticated;
grant execute on function public.mqd_claim_print_shop_billing(uuid,uuid) to service_role;
