-- Short pilot inquiries are separate from verified business setups and entitlements.
create table public.mqd_print_shop_interest (
 id uuid primary key,
 contact_name text not null check(length(contact_name) between 1 and 100),
 contact_email text not null check(length(contact_email) between 3 and 254),
 shop_name text not null check(length(shop_name) between 1 and 100),
 phone text not null default '' check(length(phone)<=40),
 payload_hash text not null,
 ip_hash text not null,
 admin_email_sent boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.mqd_print_shop_interest enable row level security;
revoke all on public.mqd_print_shop_interest from public,anon,authenticated;
grant all on public.mqd_print_shop_interest to service_role;
create index mqd_shop_interest_ip on public.mqd_print_shop_interest(ip_hash,created_at);
create index mqd_shop_interest_email on public.mqd_print_shop_interest(contact_email,created_at);
create function public.mqd_claim_print_shop_interest(p_row jsonb)
returns setof public.mqd_print_shop_interest language plpgsql set search_path=public as $$
declare existing public.mqd_print_shop_interest;
begin
 perform pg_advisory_xact_lock(hashtextextended('shop-interest-ip:'||(p_row->>'ip_hash'),0));
 perform pg_advisory_xact_lock(hashtextextended('shop-interest-email:'||(p_row->>'contact_email'),0));
 select * into existing from public.mqd_print_shop_interest where id=(p_row->>'id')::uuid for update;
 if found then
  if existing.payload_hash<>p_row->>'payload_hash' then raise exception 'Submission content changed'; end if;
  return next existing;return;
 end if;
 if (select count(*) from public.mqd_print_shop_interest where ip_hash=p_row->>'ip_hash' and created_at>now()-interval '1 hour')>=3
 or (select count(*) from public.mqd_print_shop_interest where contact_email=p_row->>'contact_email' and created_at>now()-interval '1 day')>=3 then raise exception 'Pilot request limit reached'; end if;
 return query insert into public.mqd_print_shop_interest(id,contact_name,contact_email,shop_name,phone,payload_hash,ip_hash)
 values((p_row->>'id')::uuid,p_row->>'contact_name',p_row->>'contact_email',p_row->>'shop_name',p_row->>'phone',p_row->>'payload_hash',p_row->>'ip_hash') returning *;
end $$;
revoke all on function public.mqd_claim_print_shop_interest(jsonb) from public,anon,authenticated;
grant execute on function public.mqd_claim_print_shop_interest(jsonb) to service_role;
