create table public.mqd_print_shop_requests (
 id uuid primary key,
 shop_slug text not null,
 ip_hash text not null,
 payload_hash text not null,
 reference text not null unique,
 status text not null default 'pending' check (status in ('pending','sent','failed')),
 provider_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.mqd_print_shop_requests enable row level security;
revoke all on public.mqd_print_shop_requests from public,anon,authenticated;
grant all on public.mqd_print_shop_requests to service_role;
create index mqd_print_shop_request_rate on public.mqd_print_shop_requests(ip_hash,created_at);
create index mqd_print_shop_shop_rate on public.mqd_print_shop_requests(shop_slug,created_at);
create function public.mqd_claim_print_shop_request(p_id uuid,p_shop text,p_ip text,p_hash text)
returns setof public.mqd_print_shop_requests language plpgsql set search_path=public as $$
declare existing public.mqd_print_shop_requests;
begin
 perform pg_advisory_xact_lock(hashtextextended('print-shop:'||p_shop,0));
 select * into existing from public.mqd_print_shop_requests where id=p_id;
 if found then
   if existing.shop_slug<>p_shop or existing.payload_hash<>p_hash then raise exception 'Request content changed'; end if;
   return next existing; return;
 end if;
 if (select count(*) from public.mqd_print_shop_requests where ip_hash=p_ip and created_at>now()-interval '1 hour')>=5
 or (select count(*) from public.mqd_print_shop_requests where shop_slug=p_shop and created_at>now()-interval '1 day')>=50 then
   raise exception 'Request limit reached. Please contact the shop directly.';
 end if;
 return query insert into public.mqd_print_shop_requests(id,shop_slug,ip_hash,payload_hash,reference)
 values(p_id,p_shop,p_ip,p_hash,'SHOP-'||upper(substr(replace(p_id::text,'-',''),1,12))) returning *;
end $$;
revoke all on function public.mqd_claim_print_shop_request(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.mqd_claim_print_shop_request(uuid,text,text,text) to service_role;
