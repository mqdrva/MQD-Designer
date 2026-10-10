create table public.mqd_tryon_customer_daily (
 customer_id uuid not null references auth.users(id) on delete cascade,
 usage_day date not null,
 created_at timestamptz not null default now(),
 primary key(customer_id,usage_day)
);
alter table public.mqd_tryon_customer_daily enable row level security;
revoke all on public.mqd_tryon_customer_daily from public,anon,authenticated;
grant select,insert on public.mqd_tryon_customer_daily to service_role;
create function public.mqd_reserve_customer_tryon(p_customer_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare inserted integer;
begin
 insert into public.mqd_tryon_customer_daily(customer_id,usage_day)
 values(p_customer_id,(now() at time zone 'America/New_York')::date)
 on conflict do nothing;
 get diagnostics inserted = row_count;
 return inserted=1;
end $$;
revoke all on function public.mqd_reserve_customer_tryon(uuid) from public,anon,authenticated;
grant execute on function public.mqd_reserve_customer_tryon(uuid) to service_role;
