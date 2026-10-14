create table public.mqd_print_shop_admin_actions (
 request_id uuid primary key,
 business_id uuid not null references public.mqd_print_shop_businesses(id),
 actor_id uuid not null,
 action text not null,
 payload_hash text not null,
 status text not null default 'pending' check(status in ('pending','processed','failed')),
 details jsonb not null default '{}'::jsonb,
 result jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.mqd_print_shop_admin_actions enable row level security;
revoke all on public.mqd_print_shop_admin_actions from public,anon,authenticated;
grant all on public.mqd_print_shop_admin_actions to service_role;
create index mqd_print_shop_admin_history on public.mqd_print_shop_admin_actions(business_id,created_at desc);
create function public.mqd_list_print_shop_admin(p_page integer default 0,p_search text default '',p_status text default 'all')
returns jsonb language sql stable set search_path=public as $$
 with businesses as (
 select b.id,b.preferred_slug,b.plan,b.owner_email,b.owner_phone,b.status,b.email_verified_at,b.approved_at,b.pilot_expires_at,b.billing_status,b.revision,b.created_at,b.pending_config is not null as changes_pending,b.shop_config->>'name' as name,
 coalesce(a.status,'not_started') as subscription_status,a.period_end,a.cancel_at_period_end,a.updated_at as billing_updated_at,a.stripe_customer_id,a.stripe_subscription_id,a.stripe_checkout_id,
 case when b.status='closed' then 'closed' when b.status='suspended' then 'paused' when b.status='pending_review' then 'needs_review' when b.status='pilot_active' and b.pilot_expires_at<=now() then 'expired' when b.status='pilot_active' then 'pilot' when a.status in ('past_due','unpaid','payment_pending','incomplete') then 'overdue' when a.status='active' and a.period_end>now() then 'paid' else 'expired' end as management_status
 from public.mqd_print_shop_businesses b left join public.mqd_print_shop_subscription_accounts a on a.business_id=b.id
 ), filtered as (select * from businesses where (p_search='' or name ilike '%'||left(p_search,100)||'%' or owner_email ilike '%'||left(p_search,100)||'%' or preferred_slug ilike '%'||left(p_search,100)||'%') and (p_status='all' or management_status=p_status)), page as (select * from filtered order by created_at desc,id limit 25 offset greatest(0,least(p_page,10000))*25)
 select jsonb_build_object('businesses',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),'total',(select count(*) from filtered),'counts',(select jsonb_object_agg(management_status,n) from (select management_status,count(*) n from businesses group by management_status) c),'page',greatest(0,least(p_page,10000)));
$$;
revoke all on function public.mqd_list_print_shop_admin(integer,text,text) from public,anon,authenticated;
grant execute on function public.mqd_list_print_shop_admin(integer,text,text) to service_role;
create function public.mqd_finish_print_shop_admin(p_request uuid,p_revision integer,p_update jsonb,p_result jsonb,p_lease uuid)
returns jsonb language plpgsql set search_path=public as $$
declare command public.mqd_print_shop_admin_actions; shop public.mqd_print_shop_businesses; account public.mqd_print_shop_subscription_accounts;
begin
 select * into command from public.mqd_print_shop_admin_actions where request_id=p_request for update;
 if command.request_id is null then raise exception 'Audit record missing'; end if;
 if command.status='processed' then return command.result; end if;
 select * into account from public.mqd_print_shop_subscription_accounts where business_id=command.business_id for update;
 if p_lease is null or account.lease_id is distinct from p_lease or account.lease_until is null or account.lease_until<=now() then raise exception 'Action lease expired'; end if;
 select * into shop from public.mqd_print_shop_businesses where id=command.business_id for update;
 if shop.revision<>p_revision then raise exception 'Business changed. Refresh before retrying.'; end if;
 if p_update<>'{}'::jsonb then
  update public.mqd_print_shop_businesses set
   status=case when p_update?'status' then p_update->>'status' else status end,
   plan=case when p_update?'plan' then p_update->>'plan' else plan end,
   shop_config=case when p_update?'shop_config' then p_update->'shop_config' else shop_config end,
   pilot_expires_at=case when p_update?'pilot_expires_at' then (p_update->>'pilot_expires_at')::timestamptz else pilot_expires_at end,
   revision=revision+1,updated_at=now() where id=shop.id;
 end if;
 update public.mqd_print_shop_admin_actions set status='processed',result=p_result,updated_at=now() where request_id=p_request;
 return p_result;
end $$;
revoke all on function public.mqd_finish_print_shop_admin(uuid,integer,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.mqd_finish_print_shop_admin(uuid,integer,jsonb,jsonb,uuid) to service_role;
