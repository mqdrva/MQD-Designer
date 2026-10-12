create table public.mqd_print_shop_subscription_accounts (
 business_id uuid primary key references public.mqd_print_shop_businesses(id),
 stripe_customer_id text unique,
 stripe_subscription_id text unique,
 stripe_checkout_id text,
 status text not null default 'not_started',
 policy_version text,
 policy_accepted_at timestamptz,
 period_end timestamptz,
 cancel_at_period_end boolean not null default false,
 lease_id uuid,
 lease_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.mqd_print_shop_subscription_accounts enable row level security;
revoke all on public.mqd_print_shop_subscription_accounts from public,anon,authenticated;
grant all on public.mqd_print_shop_subscription_accounts to service_role;
create table public.mqd_print_shop_subscription_events (
 event_id text primary key,
 event_type text not null,
 status text not null default 'pending',
 received_at timestamptz not null default now(),
 processed_at timestamptz
);
alter table public.mqd_print_shop_subscription_events enable row level security;
revoke all on public.mqd_print_shop_subscription_events from public,anon,authenticated;
grant all on public.mqd_print_shop_subscription_events to service_role;
create function public.mqd_claim_print_shop_subscription(p_business uuid,p_lease uuid)
returns setof public.mqd_print_shop_subscription_accounts language plpgsql set search_path=public as $$
declare row public.mqd_print_shop_subscription_accounts;
begin
 insert into public.mqd_print_shop_subscription_accounts(business_id) values(p_business) on conflict do nothing;
 select * into row from public.mqd_print_shop_subscription_accounts where business_id=p_business for update;
 if row.lease_until>now() then raise exception 'Billing is already opening. Try again shortly.'; end if;
 return query update public.mqd_print_shop_subscription_accounts set lease_id=p_lease,lease_until=now()+interval '60 seconds' where business_id=p_business returning *;
end $$;
revoke all on function public.mqd_claim_print_shop_subscription(uuid,uuid) from public,anon,authenticated;
grant execute on function public.mqd_claim_print_shop_subscription(uuid,uuid) to service_role;

-- Canonical subscription updates and access changes commit together.
create function public.mqd_sync_print_shop_subscription(p_business uuid,p_customer text,p_subscription text,p_status text,p_period_end timestamptz,p_cancel boolean,p_plan text,p_lease uuid)
returns void language plpgsql set search_path=public as $$
declare shop public.mqd_print_shop_businesses; account public.mqd_print_shop_subscription_accounts;
begin
 select * into shop from public.mqd_print_shop_businesses where id=p_business for update;
 select * into account from public.mqd_print_shop_subscription_accounts where business_id=p_business for update;
 if shop.id is null or account.business_id is null or account.stripe_customer_id is distinct from p_customer or account.lease_id is distinct from p_lease or account.lease_until is null or account.lease_until<=now() or p_lease is null or shop.plan is distinct from p_plan then raise exception 'Subscription ownership, lease or plan mismatch'; end if;
 if account.stripe_subscription_id is not null and account.stripe_subscription_id<>p_subscription then raise exception 'Subscription mismatch'; end if;
 update public.mqd_print_shop_subscription_accounts set stripe_subscription_id=p_subscription,status=p_status,period_end=p_period_end,cancel_at_period_end=p_cancel,updated_at=now() where business_id=p_business;
 update public.mqd_print_shop_businesses set billing_status=p_status,status=case when status in ('pilot_active','active') and approved_at is not null and email_verified_at is not null and p_status='active' and p_period_end>now() then 'active' else status end,updated_at=now() where id=p_business;
end $$;
revoke all on function public.mqd_sync_print_shop_subscription(uuid,text,text,text,timestamptz,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.mqd_sync_print_shop_subscription(uuid,text,text,text,timestamptz,boolean,text,uuid) to service_role;
