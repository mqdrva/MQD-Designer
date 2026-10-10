create table public.mqd_tryon_credit_budget(
 period text primary key,
 credit_limit integer not null check(credit_limit>=0),
 credits_reserved integer not null default 0 check(credits_reserved>=0),
 busy_until timestamptz
);
alter table public.mqd_tryon_credit_budget enable row level security;
revoke all on public.mqd_tryon_credit_budget from public,anon,authenticated;
grant select,insert,update on public.mqd_tryon_credit_budget to service_role;
create function public.mqd_reserve_tryon_credits(p_period text,p_available integer,p_units integer) returns boolean
language plpgsql security invoker set search_path='' as $$
declare reserved boolean; safety integer;
begin
 if p_units not in (1,5) or p_period is null or length(p_period)>40 then return false; end if;
 safety:=p_units*2;
 insert into public.mqd_tryon_credit_budget(period,credit_limit)
 values(p_period,greatest(p_available-safety,0)) on conflict do nothing;
 update public.mqd_tryon_credit_budget set credits_reserved=credits_reserved+p_units,busy_until=now()+interval '3 minutes'
 where period=p_period and credits_reserved+p_units<=credit_limit and p_available>=p_units+safety
 and (busy_until is null or busy_until<now()) returning true into reserved;
 return coalesce(reserved,false);
end $$;
create function public.mqd_release_tryon_credits(p_period text) returns void
language sql security invoker set search_path='' as $$update public.mqd_tryon_credit_budget set busy_until=null where period=p_period$$;
revoke all on function public.mqd_reserve_tryon_credits(text,integer,integer) from public,anon,authenticated;
revoke all on function public.mqd_release_tryon_credits(text) from public,anon,authenticated;
grant execute on function public.mqd_reserve_tryon_credits(text,integer,integer) to service_role;
grant execute on function public.mqd_release_tryon_credits(text) to service_role;