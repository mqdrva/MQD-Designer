-- Private, additive human-support storage. Only the authenticated Edge service
-- can execute these operations; customer capability and owner MFA checks occur there.
create table public.mqd_support_conversations (
 id uuid primary key,
 token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '30 days',
 updated_at timestamptz not null default now(),
 customer_seen bigint not null default 0,
 owner_seen bigint not null default 0
);
create table public.mqd_support_messages (
 seq bigint generated always as identity primary key,
 conversation_id uuid not null references public.mqd_support_conversations(id),
 request_id uuid not null,
 sender text not null check(sender in ('customer','owner')),
 body text not null check(length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now(),
 unique(conversation_id,request_id)
);
create index on public.mqd_support_messages(conversation_id,seq);
create index on public.mqd_support_conversations(updated_at desc,id);
create table public.mqd_support_notifications (
 message_seq bigint primary key references public.mqd_support_messages(seq),
 conversation_id uuid not null references public.mqd_support_conversations(id),
 status text not null default 'pending' check(status in ('pending','sending','sent','review')),
 attempts integer not null default 0,
 first_attempt_at timestamptz,
 next_attempt_at timestamptz not null default now(),
 lease_until timestamptz,
 provider_id text,
 last_error text
);
alter table public.mqd_support_conversations enable row level security;
alter table public.mqd_support_messages enable row level security;
alter table public.mqd_support_notifications enable row level security;
revoke all on public.mqd_support_conversations,public.mqd_support_messages,public.mqd_support_notifications from public,anon,authenticated;
grant all on public.mqd_support_conversations,public.mqd_support_messages,public.mqd_support_notifications to service_role;
grant usage,select on sequence public.mqd_support_messages_seq_seq to service_role;

create function public.mqd_support_send(p_id uuid,p_hash text,p_request uuid,p_body text,p_owner boolean default false,p_create boolean default false)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare c public.mqd_support_conversations; m public.mqd_support_messages;
begin
 if length(btrim(p_body)) not between 1 and 2000 then raise exception 'invalid message'; end if;
 if p_create and not p_owner then
  insert into public.mqd_support_conversations(id,token_hash) values(p_id,p_hash) on conflict do nothing;
 end if;
 select * into c from public.mqd_support_conversations where id=p_id for update;
 if c.id is null or (not p_owner and c.expires_at<=now()) or (not p_owner and c.token_hash is distinct from p_hash) then raise exception 'unavailable'; end if;
 select * into m from public.mqd_support_messages where conversation_id=p_id and request_id=p_request;
 if m.seq is not null then
  if m.body<>p_body or m.sender<>(case when p_owner then 'owner' else 'customer' end) then raise exception 'conflict'; end if;
  return to_jsonb(m);
 end if;
 if (select count(*) from public.mqd_support_messages where conversation_id=p_id)>=500 then raise exception 'conversation limit'; end if;
 insert into public.mqd_support_messages(conversation_id,request_id,sender,body)
 values(p_id,p_request,case when p_owner then 'owner' else 'customer' end,p_body) returning * into m;
 update public.mqd_support_conversations set updated_at=now() where id=p_id;
 if not p_owner then
  insert into public.mqd_support_notifications(message_seq,conversation_id) values(m.seq,p_id);
 end if;
 return to_jsonb(m);
end $$;
revoke all on function public.mqd_support_send(uuid,text,uuid,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.mqd_support_send(uuid,text,uuid,text,boolean,boolean) to service_role;

create function public.mqd_support_seen(p_id uuid,p_seq bigint,p_owner boolean)
returns void language sql security invoker set search_path=public as $$
 update public.mqd_support_conversations set
 customer_seen=case when not p_owner then greatest(customer_seen,least(p_seq,coalesce((select max(seq) from public.mqd_support_messages where conversation_id=p_id),0))) else customer_seen end,
 owner_seen=case when p_owner then greatest(owner_seen,least(p_seq,coalesce((select max(seq) from public.mqd_support_messages where conversation_id=p_id),0))) else owner_seen end
 where id=p_id;
$$;
revoke all on function public.mqd_support_seen(uuid,bigint,boolean) from public,anon,authenticated;
grant execute on function public.mqd_support_seen(uuid,bigint,boolean) to service_role;

create function public.mqd_support_claim(p_id uuid)
returns setof public.mqd_support_notifications language plpgsql security invoker set search_path=public as $$
begin
 update public.mqd_support_notifications set status='review',last_error='Retry window expired; review provider records before any manual resend.'
 where conversation_id=p_id and status in ('pending','sending') and (attempts>=5 or first_attempt_at<now()-interval '23 hours');
 return query
 with candidate as (
  select message_seq from public.mqd_support_notifications where conversation_id=p_id
  and status in ('pending','sending') and next_attempt_at<=now() and (lease_until is null or lease_until<now())
  order by message_seq for update skip locked limit 1
 ) update public.mqd_support_notifications n set status='sending',attempts=n.attempts+1,
 first_attempt_at=coalesce(n.first_attempt_at,now()),lease_until=now()+interval '45 seconds'
 from candidate c where n.message_seq=c.message_seq returning n.*;
end $$;
revoke all on function public.mqd_support_claim(uuid) from public,anon,authenticated;
grant execute on function public.mqd_support_claim(uuid) to service_role;
