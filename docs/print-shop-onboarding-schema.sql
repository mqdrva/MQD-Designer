create table public.mqd_print_shop_businesses (
 id uuid primary key,
 preferred_slug text not null,
 plan text not null check(plan in ('2d','3d')),
 owner_email text not null,
 owner_phone text not null,
 shop_config jsonb not null,
 pending_config jsonb,
 pending_plan text check(pending_plan in ('2d','3d')),
 payload_hash text not null,
 ip_hash text not null,
 mail_origin text not null,
 token_hash text not null,
 token_cipher jsonb not null,
 token_expires_at timestamptz not null,
 email_verified_at timestamptz,
 status text not null default 'pending_review' check(status in ('pending_review','pilot_active','active','suspended','closed')),
 pilot_expires_at timestamptz,
 approved_at timestamptz,
 billing_status text not null default 'not_configured',
 stripe_customer_id text,
 stripe_subscription_id text,
 stripe_checkout_id text,
 revision integer not null default 1,
 owner_email_sent boolean not null default false,
 admin_email_sent boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.mqd_print_shop_businesses enable row level security;
revoke all on public.mqd_print_shop_businesses from public,anon,authenticated;
grant all on public.mqd_print_shop_businesses to service_role;
create unique index mqd_print_shop_active_slug on public.mqd_print_shop_businesses(preferred_slug) where status in ('pilot_active','active');
create index mqd_print_shop_signup_ip on public.mqd_print_shop_businesses(ip_hash,created_at);
create index mqd_print_shop_signup_email on public.mqd_print_shop_businesses(owner_email,created_at);
create function public.mqd_claim_print_shop_business(p_row jsonb)
returns setof public.mqd_print_shop_businesses language plpgsql set search_path=public as $$
declare existing public.mqd_print_shop_businesses;
begin
 perform pg_advisory_xact_lock(hashtextextended('shop-signup:'||(p_row->>'ip_hash'),0));
 perform pg_advisory_xact_lock(hashtextextended('shop-email:'||(p_row->>'owner_email'),0));
 select * into existing from public.mqd_print_shop_businesses where id=(p_row->>'id')::uuid;
 if found then
  if existing.payload_hash<>p_row->>'payload_hash' then raise exception 'Submission content changed'; end if;
  return next existing;return;
 end if;
 if (select count(*) from public.mqd_print_shop_businesses where ip_hash=p_row->>'ip_hash' and created_at>now()-interval '1 hour')>=3
 or (select count(*) from public.mqd_print_shop_businesses where owner_email=p_row->>'owner_email' and created_at>now()-interval '1 day')>=3 then raise exception 'Setup submission limit reached'; end if;
 return query insert into public.mqd_print_shop_businesses(id,preferred_slug,plan,owner_email,owner_phone,shop_config,payload_hash,ip_hash,mail_origin,token_hash,token_cipher,token_expires_at)
 values((p_row->>'id')::uuid,p_row->>'preferred_slug',p_row->>'plan',p_row->>'owner_email',p_row->>'owner_phone',p_row->'shop_config',p_row->>'payload_hash',p_row->>'ip_hash',p_row->>'mail_origin',p_row->>'token_hash',p_row->'token_cipher',now()+interval '30 days') returning *;
end $$;
revoke all on function public.mqd_claim_print_shop_business(jsonb) from public,anon,authenticated;
grant execute on function public.mqd_claim_print_shop_business(jsonb) to service_role;
