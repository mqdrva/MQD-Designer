-- Only the authenticated Edge Function can read/write these private records.
create table public.mqd_polls (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 title text not null check(char_length(title) between 1 and 100),
 closes_at timestamptz not null, created_at timestamptz not null default now(),
 unlock_order_id uuid unique references public.mqd_orders(id)
);
create index mqd_polls_owner on public.mqd_polls(user_id,created_at desc);
create table public.mqd_poll_options (
 id uuid primary key default gen_random_uuid(), poll_id uuid not null references public.mqd_polls(id),
 design_id uuid references public.customer_designs(id) on delete set null,
 product_id text not null, design_snapshot jsonb not null,
 label text not null, preview text not null, position integer not null
);
create index mqd_poll_options_poll on public.mqd_poll_options(poll_id);
create table public.mqd_poll_votes (
 poll_id uuid not null references public.mqd_polls(id), option_id uuid not null references public.mqd_poll_options(id),
 voter_hash text not null, network_hash text not null, created_at timestamptz not null default now(),
 primary key(poll_id,voter_hash)
);
create index mqd_poll_votes_network on public.mqd_poll_votes(network_hash,created_at);
alter table public.mqd_polls enable row level security;
alter table public.mqd_poll_options enable row level security;
alter table public.mqd_poll_votes enable row level security;
revoke all on public.mqd_polls,public.mqd_poll_options,public.mqd_poll_votes from public,anon,authenticated;
grant all on public.mqd_polls,public.mqd_poll_options,public.mqd_poll_votes to service_role;

-- Strip transport-only image fields; keep all visible layout/content attributes.
create function public.mqd_poll_normalize(v jsonb) returns jsonb language plpgsql immutable
set search_path='' as $$
declare result jsonb;
begin
 if jsonb_typeof(v)='object' then
  select coalesce(jsonb_object_agg(key,public.mqd_poll_normalize(value)),'{}') into result
  from jsonb_each(v) where key not in ('src','image','originalStoragePath','backgroundOriginalSrc');
 elsif jsonb_typeof(v)='array' then
  select coalesce(jsonb_agg(public.mqd_poll_normalize(value) order by ord),'[]') into result
  from jsonb_array_elements(v) with ordinality a(value,ord);
 else result:=v; end if;
 return result;
end $$;

create function public.mqd_poll_unlock(p_user uuid,p_poll uuid) returns uuid language sql stable
set search_path='' as $$
 select o.id from public.mqd_orders o join public.mqd_polls p on p.id=p_poll
 where p.user_id=p_user and o.user_id=p_user and o.is_test is not true
 and o.stripe_payment_status='paid' and o.paid_at>=p.created_at and o.created_at>=p.created_at
 and o.status not in ('cancelled','refunded')
 and not exists(select 1 from public.mqd_polls used where used.unlock_order_id=o.id)
 and exists(select 1 from public.mqd_poll_options opt where opt.poll_id=p.id and opt.product_id=o.product_id
  and opt.design_snapshot=public.mqd_poll_normalize(o.design_json->'design'))
 order by o.paid_at limit 1
$$;

create function public.mqd_poll_create(p_user uuid,p_title text,p_closes timestamptz,p_options jsonb)
returns uuid language plpgsql set search_path='' as $$
declare last_poll uuid; unlock_order uuid; new_poll uuid; opt jsonb; idx integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,142));
 if not exists(select 1 from auth.users where id=p_user and is_anonymous is not true) then raise exception 'Sign in with Google or Email to create a vote.'; end if;
 if char_length(trim(p_title)) not between 1 and 100 or p_closes<=now() or p_closes>now()+interval '30 days' then raise exception 'Choose a title and a closing date within 30 days.'; end if;
 if jsonb_typeof(p_options)!='array' or jsonb_array_length(p_options) not between 2 and 3 then raise exception 'Choose two or three saved designs.'; end if;
 if (select count(distinct x->>'design_id') from jsonb_array_elements(p_options) x)!=jsonb_array_length(p_options) then raise exception 'Choose different designs.'; end if;
 select id into last_poll from public.mqd_polls where user_id=p_user order by created_at desc,id desc limit 1;
 if last_poll is not null then
  unlock_order:=public.mqd_poll_unlock(p_user,last_poll);
  if unlock_order is null then raise exception 'Purchase one of the designs from your last vote to unlock a new voting page.'; end if;
 end if;
 insert into public.mqd_polls(user_id,title,closes_at,unlock_order_id) values(p_user,trim(p_title),p_closes,unlock_order) returning id into new_poll;
 for opt in select * from jsonb_array_elements(p_options) loop
  if not exists(select 1 from public.customer_designs d where d.id=(opt->>'design_id')::uuid and d.user_id=p_user
   and d.product_id=opt->>'product_id' and public.mqd_poll_normalize(d.design_json->'design')=opt->'design_snapshot') then raise exception 'A selected design changed. Refresh and try again.'; end if;
  if char_length(opt->>'preview')>3000000 or opt->>'preview' !~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+$' then raise exception 'Invalid garment preview.'; end if;
  insert into public.mqd_poll_options(poll_id,design_id,product_id,design_snapshot,label,preview,position)
  values(new_poll,(opt->>'design_id')::uuid,opt->>'product_id',opt->'design_snapshot',left(opt->>'label',100),opt->>'preview',idx);
  idx:=idx+1;
 end loop;
 return new_poll;
end $$;

create function public.mqd_poll_vote(p_poll uuid,p_option uuid,p_voter text,p_network text)
returns boolean language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_network,143));
 perform 1 from public.mqd_polls where id=p_poll and closes_at>now() for update;
 if not found then raise exception 'Voting has closed or this page is unavailable.'; end if;
 if not exists(select 1 from public.mqd_poll_options where id=p_option and poll_id=p_poll) then raise exception 'Invalid option.'; end if;
 if exists(select 1 from public.mqd_poll_votes where poll_id=p_poll and voter_hash=p_voter) then return false; end if;
 if (select count(*) from public.mqd_poll_votes where network_hash=p_network and created_at>now()-interval '1 minute')>=20 then raise exception 'Too many votes. Please try again shortly.'; end if;
 insert into public.mqd_poll_votes(poll_id,option_id,voter_hash,network_hash) values(p_poll,p_option,p_voter,p_network);
 return true;
end $$;
revoke execute on function public.mqd_poll_normalize(jsonb),public.mqd_poll_unlock(uuid,uuid),public.mqd_poll_create(uuid,text,timestamptz,jsonb),public.mqd_poll_vote(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.mqd_poll_normalize(jsonb),public.mqd_poll_unlock(uuid,uuid),public.mqd_poll_create(uuid,text,timestamptz,jsonb),public.mqd_poll_vote(uuid,uuid,text,text) to service_role;

create function public.mqd_poll_public(p_poll uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('poll',jsonb_build_object('id',p.id,'title',p.title,'closes_at',p.closes_at),
 'options',(select jsonb_agg(jsonb_build_object('id',opt.id,'label',opt.label,'preview',opt.preview,
 'votes',(select count(*) from public.mqd_poll_votes v where v.poll_id=p.id and v.option_id=opt.id)) order by opt.position)
 from public.mqd_poll_options opt where opt.poll_id=p.id),
 'total',(select count(*) from public.mqd_poll_votes v where v.poll_id=p.id)) from public.mqd_polls p where p.id=p_poll
$$;
revoke execute on function public.mqd_poll_public(uuid) from public,anon,authenticated;
grant execute on function public.mqd_poll_public(uuid) to service_role;
