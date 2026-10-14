begin;
create table if not exists public.mqd_team_accounts (
 team_id uuid primary key references public.mqd_print_shop_businesses(id),
 status text not null default 'awaiting_review' check(status in ('awaiting_review','ready','active','paused','closed')),
 billing_status text not null default 'not_configured',
 shop_config jsonb not null,
 stripe_customer_id text unique,stripe_subscription_id text unique,stripe_checkout_id text unique,
 period_start timestamptz,period_end timestamptz,cancel_at_period_end boolean not null default false,
 policy_version text,policy_accepted_at timestamptz,approved_at timestamptz,
 lease_id uuid,lease_until timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.mqd_team_batches (
 id uuid primary key,team_id uuid not null references public.mqd_team_accounts(team_id),
 status text not null default 'awaiting_review' check(status in ('awaiting_review','approved','open','closed','in_production','shipped','canceled')),
 days integer not null check(days between 7 and 14),expected_quantity integer not null check(expected_quantity between 1 and 500),
 max_quantity integer check(max_quantity between 1 and 500),shipping_address jsonb not null,
 shipping_cents integer not null default 2500 check(shipping_cents=2500),
 shipping_checkout_id text unique,shipping_payment_intent text unique,shipping_paid_at timestamptz,shipping_refunded boolean not null default false,
 approved_at timestamptz,opens_at timestamptz,cutoff_at timestamptz,tracking text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((opens_at is null and cutoff_at is null) or (cutoff_at>=opens_at+interval '7 days' and cutoff_at<=opens_at+interval '14 days'))
);
create unique index if not exists mqd_team_one_open_batch on public.mqd_team_batches(team_id) where status='open';
create table if not exists public.mqd_team_orders (
 id uuid primary key,team_id uuid not null references public.mqd_team_accounts(team_id),batch_id uuid references public.mqd_team_batches(id),
 request_hash text not null,ip_hash text not null,guest_token_hash text not null,customer jsonb not null,summary jsonb not null,
 delivery text not null check(delivery in ('individual','team')),quantity integer not null check(quantity between 1 and 500),
 garment_cents integer not null check(garment_cents>=50),shipping_cents integer not null check(shipping_cents>=0),package_path text not null,
 checkout_id text unique,payment_intent text unique,payment_status text not null default 'unpaid' check(payment_status in ('unpaid','pending','paid','failed','refunded')),
 production_status text not null default 'awaiting_payment' check(production_status in ('awaiting_payment','ready','batch_waiting','late_review','in_production','shipped','canceled')),
 shipping_address jsonb,tracking text,paid_at timestamptz,refunded_quantity integer not null default 0,refunded_cents integer not null default 0,disputed boolean not null default false,
 reserved_until timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(refunded_quantity between 0 and quantity),check((delivery='team' and batch_id is not null and shipping_cents=0) or (delivery='individual' and batch_id is null))
);
create index if not exists mqd_team_orders_period on public.mqd_team_orders(team_id,paid_at) where payment_status='paid';
create index if not exists mqd_team_orders_batch on public.mqd_team_orders(batch_id);
create table if not exists public.mqd_team_periods (
 team_id uuid not null references public.mqd_team_accounts(team_id),period_start timestamptz not null,period_end timestamptz not null,invoice_id text not null unique,
 primary key(team_id,period_start),check(period_end>period_start)
);
create table if not exists public.mqd_team_rewards (
 invoice_id text primary key,team_id uuid not null references public.mqd_team_accounts(team_id),
 period_start timestamptz not null,period_end timestamptz not null,quantity integer not null,
 credit_cents integer not null check(credit_cents=2000),invoice_item_id text unique,status text not null default 'pending',
 created_at timestamptz not null default now(),unique(team_id,period_start)
);
create table if not exists public.mqd_team_events (event_id text primary key,event_type text not null,status text not null default 'pending',created_at timestamptz not null default now(),processed_at timestamptz);
create table if not exists public.mqd_team_actions (id uuid primary key,team_id uuid references public.mqd_team_accounts(team_id),actor_id uuid,action text not null,details jsonb not null default '{}',created_at timestamptz not null default now());
do $$ declare t text; begin foreach t in array array['mqd_team_accounts','mqd_team_batches','mqd_team_orders','mqd_team_periods','mqd_team_rewards','mqd_team_events','mqd_team_actions'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end $$;
create or replace function public.mqd_reserve_team_order(p_order jsonb) returns public.mqd_team_orders language plpgsql security invoker set search_path=public as $$
declare b public.mqd_team_batches;r public.mqd_team_orders;q integer;used integer;
begin
 select * into r from public.mqd_team_orders where id=(p_order->>'id')::uuid;
 if found then if r.request_hash<>p_order->>'request_hash' or r.guest_token_hash<>p_order->>'guest_token_hash' then raise exception 'Order retry does not match';end if;return r;end if;
 perform 1 from public.mqd_team_accounts where team_id=(p_order->>'team_id')::uuid and status='active' and billing_status='active' and period_end>now() for update;if not found then raise exception 'Team subscription is inactive';end if;
 q:=(p_order->>'quantity')::integer;
 if p_order->>'delivery'='team' then
  select * into b from public.mqd_team_batches where id=(p_order->>'batch_id')::uuid and team_id=(p_order->>'team_id')::uuid for update;
  if not found or b.status<>'open' or b.shipping_paid_at is null or b.shipping_refunded or b.approved_at is null or b.cutoff_at<=now() or b.opens_at>now() then raise exception 'Team batch is closed';end if;
  select coalesce(sum(quantity),0) into used from public.mqd_team_orders where batch_id=b.id and (payment_status in ('paid','pending') or reserved_until>now());
  if used+q>b.max_quantity then raise exception 'This batch is full. Choose individual shipping or a new batch.';end if;
 end if;
 insert into public.mqd_team_orders(id,team_id,batch_id,request_hash,ip_hash,guest_token_hash,customer,summary,delivery,quantity,garment_cents,shipping_cents,package_path,reserved_until)
 values((p_order->>'id')::uuid,(p_order->>'team_id')::uuid,(p_order->>'batch_id')::uuid,p_order->>'request_hash',p_order->>'ip_hash',p_order->>'guest_token_hash',p_order->'customer',p_order->'summary',p_order->>'delivery',(p_order->>'quantity')::integer,(p_order->>'garment_cents')::integer,(p_order->>'shipping_cents')::integer,p_order->>'package_path',now()+interval '40 minutes') returning * into r;return r;
end $$;
create or replace function public.mqd_close_team_batches() returns integer language plpgsql security invoker set search_path=public as $$declare n integer;begin
 update public.mqd_team_batches set status='closed',updated_at=now() where status='open' and cutoff_at<=now();get diagnostics n=row_count;
 update public.mqd_team_orders o set production_status='ready',updated_at=now() from public.mqd_team_batches b where o.batch_id=b.id and b.status='closed' and o.payment_status='paid' and not o.disputed and o.production_status='batch_waiting';return n;end $$;
revoke all on function public.mqd_reserve_team_order(jsonb),public.mqd_close_team_batches() from public,anon,authenticated;
grant execute on function public.mqd_reserve_team_order(jsonb),public.mqd_close_team_batches() to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('mqd-team-production','mqd-team-production',false,8388608,array['application/zip']) on conflict(id) do nothing;
commit;
-- Configure pg_cron after verification: run mqd_close_team_batches() each minute.
-- No guest or authenticated role can read production packages; signed downloads are admin-only.
begin;
alter table public.mqd_team_events add column if not exists lease_id uuid;
alter table public.mqd_team_events add column if not exists lease_until timestamptz;
create or replace function public.mqd_claim_team_event(p_event text,p_type text,p_lease uuid) returns boolean language plpgsql security invoker set search_path=public as $$
declare r public.mqd_team_events;begin
 insert into public.mqd_team_events(event_id,event_type) values(p_event,p_type) on conflict do nothing;
 select * into r from public.mqd_team_events where event_id=p_event for update;
 if r.status in ('processed','ignored') then return false;end if;
 if r.lease_until>now() then raise exception 'Event is already processing';end if;
 update public.mqd_team_events set lease_id=p_lease,lease_until=now()+interval '60 seconds' where event_id=p_event;return true;end $$;
revoke all on function public.mqd_claim_team_event(text,text,uuid) from public,anon,authenticated;
grant execute on function public.mqd_claim_team_event(text,text,uuid) to service_role;
commit;
begin;
create or replace function public.mqd_approve_team(p_team uuid,p_revision integer,p_config jsonb) returns public.mqd_team_accounts language plpgsql security invoker set search_path=public as $$
declare b public.mqd_print_shop_businesses;a public.mqd_team_accounts;begin
 select * into b from public.mqd_print_shop_businesses where id=p_team for update;
 if not found or b.revision<>p_revision or b.email_verified_at is null or p_config->>'organizationType'<>'team' or p_config->>'fulfillmentMode'<>'mymerchnow' then raise exception 'Verified team and current revision required';end if;
 insert into public.mqd_team_accounts(team_id,status,shop_config,approved_at) values(p_team,'ready',p_config,now()) on conflict(team_id) do update set shop_config=excluded.shop_config,approved_at=now(),updated_at=now() returning * into a;
 update public.mqd_print_shop_businesses set shop_config=p_config,pending_config=null,pending_plan=null,revision=revision+1,updated_at=now() where id=p_team;return a;
end $$;
revoke all on function public.mqd_approve_team(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.mqd_approve_team(uuid,integer,jsonb) to service_role;
commit;

-- Separate product cutoff scheduler; does not touch normal apparel orders.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('mqd-team-batch-cutoff','* * * * *','select public.mqd_close_team_batches();');
begin;
create or replace function public.mqd_open_team_batch(p_team uuid,p_batch uuid,p_intent text,p_paid_at timestamptz) returns public.mqd_team_batches language plpgsql security invoker set search_path=public as $$
declare a public.mqd_team_accounts;b public.mqd_team_batches;begin
 select * into a from public.mqd_team_accounts where team_id=p_team for update;
 select * into b from public.mqd_team_batches where id=p_batch and team_id=p_team for update;
 if not found or b.status not in ('approved','open') or b.approved_at is null or b.max_quantity is null or b.shipping_refunded then raise exception 'Approved batch required';end if;
 if b.shipping_payment_intent is not null and b.shipping_payment_intent<>p_intent then raise exception 'Shipping ownership mismatch';end if;
 update public.mqd_team_batches set shipping_payment_intent=p_intent,shipping_paid_at=coalesce(shipping_paid_at,p_paid_at),updated_at=now() where id=p_batch;
 if b.status='approved' and a.status='active' and a.billing_status='active' and a.period_end>now() and not exists(select 1 from public.mqd_team_batches where team_id=p_team and status='open') then
  update public.mqd_team_batches set status='open',opens_at=now(),cutoff_at=now()+make_interval(days=>b.days) where id=p_batch;
 end if;
 select * into b from public.mqd_team_batches where id=p_batch;return b;
end $$;
revoke all on function public.mqd_open_team_batch(uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.mqd_open_team_batch(uuid,uuid,text,timestamptz) to service_role;
commit;

begin;
alter table public.mqd_team_accounts add column if not exists livemode boolean not null default false;
alter table public.mqd_team_batches add column if not exists livemode boolean not null default false;
alter table public.mqd_team_orders add column if not exists livemode boolean not null default false;
create or replace function public.mqd_approve_team(p_team uuid,p_revision integer,p_config jsonb) returns public.mqd_team_accounts language plpgsql security invoker set search_path=public as $$
declare b public.mqd_print_shop_businesses;a public.mqd_team_accounts;begin
 select * into b from public.mqd_print_shop_businesses where id=p_team for update;
 if not found or b.revision<>p_revision or b.email_verified_at is null or p_config->>'organizationType'<>'team' or p_config->>'fulfillmentMode'<>'mymerchnow' then raise exception 'Verified team and current revision required';end if;
 if exists(select 1 from public.mqd_team_accounts where team_id=p_team and livemode<>coalesce((p_config->>'teamEnvironment')='live',false)) then raise exception 'Team environment mismatch';end if;
 insert into public.mqd_team_accounts(team_id,status,shop_config,approved_at,livemode) values(p_team,'ready',p_config,now(),coalesce((p_config->>'teamEnvironment')='live',false)) on conflict(team_id) do update set shop_config=excluded.shop_config,approved_at=now(),updated_at=now() returning * into a;
 update public.mqd_print_shop_businesses set shop_config=p_config,pending_config=null,pending_plan=null,revision=revision+1,updated_at=now() where id=p_team;return a;
end $$;
create or replace function public.mqd_reserve_team_order(p_order jsonb) returns public.mqd_team_orders language plpgsql security invoker set search_path=public as $$
declare b public.mqd_team_batches;r public.mqd_team_orders;q integer;used integer;
begin
 select * into r from public.mqd_team_orders where id=(p_order->>'id')::uuid;
 if found then if r.request_hash<>p_order->>'request_hash' or r.guest_token_hash<>p_order->>'guest_token_hash' then raise exception 'Order retry does not match';end if;return r;end if;
 perform 1 from public.mqd_team_accounts where team_id=(p_order->>'team_id')::uuid and livemode=coalesce((p_order->>'livemode')::boolean,false) and status='active' and billing_status='active' and period_end>now() for update;if not found then raise exception 'Team subscription is inactive';end if;
 q:=(p_order->>'quantity')::integer;
 if p_order->>'delivery'='team' then
  select * into b from public.mqd_team_batches where id=(p_order->>'batch_id')::uuid and team_id=(p_order->>'team_id')::uuid for update;
  if not found or b.status<>'open' or b.shipping_paid_at is null or b.shipping_refunded or b.approved_at is null or b.cutoff_at<=now() or b.opens_at>now() then raise exception 'Team batch is closed';end if;
  select coalesce(sum(quantity),0) into used from public.mqd_team_orders where batch_id=b.id and (payment_status in ('paid','pending') or reserved_until>now());
  if used+q>b.max_quantity then raise exception 'This batch is full. Choose individual shipping or a new batch.';end if;
 end if;
 insert into public.mqd_team_orders(id,team_id,batch_id,request_hash,ip_hash,guest_token_hash,customer,summary,delivery,quantity,garment_cents,shipping_cents,package_path,livemode,reserved_until)
 values((p_order->>'id')::uuid,(p_order->>'team_id')::uuid,(p_order->>'batch_id')::uuid,p_order->>'request_hash',p_order->>'ip_hash',p_order->>'guest_token_hash',p_order->'customer',p_order->'summary',p_order->>'delivery',(p_order->>'quantity')::integer,(p_order->>'garment_cents')::integer,(p_order->>'shipping_cents')::integer,p_order->>'package_path',coalesce((p_order->>'livemode')::boolean,false),now()+interval '40 minutes') returning * into r;return r;
end $$;
commit;
alter table public.mqd_team_accounts add column if not exists access_paused boolean not null default false;
create or replace function public.mqd_sync_team_subscription(p_team uuid,p_customer text,p_subscription text,p_live boolean,p_status text,p_start timestamptz,p_end timestamptz,p_cancel boolean) returns boolean language plpgsql security invoker set search_path=public as $$
declare a public.mqd_team_accounts;begin
 select * into a from public.mqd_team_accounts where team_id=p_team for update;
 if not found or p_customer is null or p_subscription is null or a.stripe_customer_id is distinct from p_customer or a.stripe_subscription_id is distinct from p_subscription or a.livemode is distinct from p_live then raise exception 'Team subscription ownership mismatch';end if;
 update public.mqd_team_accounts set billing_status=p_status,period_start=p_start,period_end=p_end,cancel_at_period_end=p_cancel,status=case when status='closed' then 'closed' when access_paused then 'paused' when p_status='active' then 'active' when p_status='canceled' then 'paused' else status end,updated_at=now() where team_id=p_team;return true;
end $$;
revoke all on function public.mqd_sync_team_subscription(uuid,text,text,boolean,text,timestamptz,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.mqd_sync_team_subscription(uuid,text,text,boolean,text,timestamptz,timestamptz,boolean) to service_role;
create unique index if not exists mqd_team_unique_link on public.mqd_team_accounts(livemode,(shop_config->>'slug')) where status<>'closed';
create or replace function public.mqd_team_pending_metadata() returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(x),'[]'::jsonb) from (select id,preferred_slug,shop_config->>'name' as name,(pending_config is not null) as "hasPending",revision,email_verified_at from public.mqd_print_shop_businesses where shop_config->>'organizationType'='team' order by created_at desc limit 100) x
$$;
revoke all on function public.mqd_team_pending_metadata() from public,anon,authenticated;
grant execute on function public.mqd_team_pending_metadata() to service_role;

-- Private maintenance authorization is generated in Vault, never written in source.
do $job$ begin if not exists(select 1 from vault.secrets where name='mqd_team_job_secret') then perform vault.create_secret(encode(sha256((gen_random_uuid()::text||gen_random_uuid()::text)::bytea),'hex'),'mqd_team_job_secret');end if;end $job$;
select cron.schedule('mqd-team-maintenance','*/10 * * * *',$job$select net.http_post(url:='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-team-maintenance',headers:=jsonb_build_object('Content-Type','application/json','x-team-job',(select decrypted_secret from vault.decrypted_secrets where name='mqd_team_job_secret')),body:='{}'::jsonb);$job$);
