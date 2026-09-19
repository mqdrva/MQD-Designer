-- Private counters: no customer can read, reset, or call the budget RPC.
create schema if not exists mqd_private;
revoke all on schema mqd_private from public, anon, authenticated;
grant usage on schema mqd_private to service_role;
create table mqd_private.upload_budget (
  budget_key text not null,
  usage_day date not null default current_date,
  requests integer not null default 0,
  bytes bigint not null default 0,
  primary key (budget_key, usage_day)
);
alter table mqd_private.upload_budget enable row level security;
revoke all on mqd_private.upload_budget from public, anon, authenticated;
grant select, insert, update, delete on mqd_private.upload_budget to service_role;

create function public.mqd_consume_upload_budget(p_key text, p_request_limit integer, p_bytes bigint, p_byte_limit bigint)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_key is null or length(p_key) > 120 or p_request_limit < 1 or p_bytes < 0
     or p_byte_limit < 1 or p_request_limit is null or p_bytes is null or p_byte_limit is null then
    raise exception 'Invalid upload budget';
  end if;
  if p_bytes > p_byte_limit then return false; end if;
  delete from mqd_private.upload_budget where usage_day < current_date - 2;
  insert into mqd_private.upload_budget (budget_key, usage_day, requests, bytes)
  values (p_key, current_date, 1, p_bytes)
  on conflict (budget_key, usage_day) do update
    set requests = mqd_private.upload_budget.requests + 1,
        bytes = mqd_private.upload_budget.bytes + excluded.bytes
    where mqd_private.upload_budget.requests < p_request_limit
      and mqd_private.upload_budget.bytes <= p_byte_limit - excluded.bytes;
  return found;
end;
$$;
revoke all on function public.mqd_consume_upload_budget(text, integer, bigint, bigint) from public, anon, authenticated;
grant execute on function public.mqd_consume_upload_budget(text, integer, bigint, bigint) to service_role;

-- Enforce fulfillment preservation atomically, including a concurrent owner update.
create function public.mqd_preserve_fulfillment_status()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'paid' and old.status in ('production', 'shipped', 'completed', 'cancelled') then
    new.status := old.status;
  end if;
  return new;
end;
$$;
revoke all on function public.mqd_preserve_fulfillment_status() from public, anon, authenticated;
create trigger mqd_preserve_fulfillment_status
before update on public.mqd_orders
for each row execute function public.mqd_preserve_fulfillment_status();
