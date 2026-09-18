create table if not exists public.mqd_background_removal_usage(
  ip_hash text not null,
  usage_day date not null default current_date,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key(ip_hash,usage_day)
);

alter table public.mqd_background_removal_usage enable row level security;

create or replace function public.mqd_consume_background_removal(p_ip_hash text,p_limit integer default 20)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  next_count integer;
begin
  insert into public.mqd_background_removal_usage(ip_hash,usage_day,request_count,updated_at)
  values(p_ip_hash,current_date,1,now())
  on conflict(ip_hash,usage_day)
  do update set request_count=public.mqd_background_removal_usage.request_count+1,updated_at=now()
  returning request_count into next_count;
  return next_count<=greatest(1,p_limit);
end;
$$;

revoke all on public.mqd_background_removal_usage from anon,authenticated;
revoke all on function public.mqd_consume_background_removal(text,integer) from public,anon,authenticated;
grant execute on function public.mqd_consume_background_removal(text,integer) to service_role;

drop policy if exists "No client access to background removal usage" on public.mqd_background_removal_usage;
create policy "No client access to background removal usage"
on public.mqd_background_removal_usage
for all
to anon, authenticated
using (false)
with check (false);
