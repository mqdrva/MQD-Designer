-- Owner contests are separate from customer polling allowances.
create table public.mqd_contests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 title text not null check (length(title) between 1 and 100),
 description text not null default '' check(length(description)<=1000),
 closes_at timestamptz not null, created_at timestamptz not null default now()
);
create table public.mqd_contest_options (
 id uuid primary key default gen_random_uuid(), contest_id uuid not null references public.mqd_contests(id),
 label text not null check(length(label) between 1 and 100), preview text not null,
 position integer not null, unique(contest_id,id)
);
create table public.mqd_contest_votes (
 contest_id uuid not null references public.mqd_contests(id), option_id uuid not null,
 voter_hash text not null, network_hash text not null, created_at timestamptz not null default now(),
 primary key(contest_id,voter_hash),
 foreign key(contest_id,option_id) references public.mqd_contest_options(contest_id,id)
);
create index mqd_contest_options_lookup on public.mqd_contest_options(contest_id,position);
create index mqd_contest_votes_network on public.mqd_contest_votes(network_hash,created_at);
create index mqd_contests_dates on public.mqd_contests(created_at desc);
alter table public.mqd_contests enable row level security;
alter table public.mqd_contest_options enable row level security;
alter table public.mqd_contest_votes enable row level security;
revoke all on public.mqd_contests,public.mqd_contest_options,public.mqd_contest_votes from public,anon,authenticated;
grant all on public.mqd_contests,public.mqd_contest_options,public.mqd_contest_votes to service_role;
create function public.mqd_contest_create(p_user uuid,p_title text,p_description text,p_closes timestamptz,p_options jsonb)
returns uuid language plpgsql set search_path='' as $$
declare cid uuid; opt jsonb; idx integer:=0;
begin
 if not exists(select 1 from auth.users where id=p_user and raw_app_meta_data->>'role'='admin') then raise exception 'Owner access required.'; end if;
 if p_closes is null or p_closes<=now() or p_closes>now()+interval '90 days' then raise exception 'Choose a closing date within 90 days.'; end if;
 if jsonb_typeof(p_options)!='array' or jsonb_array_length(p_options)<2 or jsonb_array_length(p_options)>12 then raise exception 'Choose 2–12 designs.'; end if;
 insert into public.mqd_contests(user_id,title,description,closes_at) values(p_user,trim(p_title),coalesce(p_description,''),p_closes) returning id into cid;
 for opt in select * from jsonb_array_elements(p_options) loop
  if opt->>'preview' !~ '^data:image/(png|jpeg);base64,' or length(opt->>'preview')>2800000 then raise exception 'Invalid preview.'; end if;
  insert into public.mqd_contest_options(contest_id,label,preview,position) values(cid,opt->>'label',opt->>'preview',idx);idx:=idx+1;
 end loop;
 return cid;
end $$;
create function public.mqd_contest_vote(p_contest uuid,p_option uuid,p_voter text,p_network text)
returns boolean language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_network,144));
 perform 1 from public.mqd_contests where id=p_contest and closes_at>now() for update;
 if not found then raise exception 'Voting has closed or this contest is unavailable.'; end if;
 if not exists(select 1 from public.mqd_contest_options where id=p_option and contest_id=p_contest) then raise exception 'Invalid choice.'; end if;
 if exists(select 1 from public.mqd_contest_votes where contest_id=p_contest and voter_hash=p_voter) then return false; end if;
 if (select count(*) from public.mqd_contest_votes where network_hash=p_network and created_at>now()-interval '1 minute')>=20 then raise exception 'Too many votes. Try again shortly.'; end if;
 insert into public.mqd_contest_votes(contest_id,option_id,voter_hash,network_hash) values(p_contest,p_option,p_voter,p_network);
 return true;
end $$;
create function public.mqd_contest_public(p_contest uuid,p_previews boolean default true)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('contest',jsonb_build_object('id',c.id,'title',c.title,'description',c.description,'closes_at',c.closes_at),
 'options',(select jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'votes',(select count(*) from public.mqd_contest_votes v where v.contest_id=c.id and v.option_id=o.id))||case when p_previews then jsonb_build_object('preview',o.preview) else '{}'::jsonb end order by o.position) from public.mqd_contest_options o where o.contest_id=c.id),
 'total',(select count(*) from public.mqd_contest_votes v where v.contest_id=c.id)) from public.mqd_contests c where c.id=p_contest
$$;
revoke execute on function public.mqd_contest_create(uuid,text,text,timestamptz,jsonb),public.mqd_contest_vote(uuid,uuid,text,text),public.mqd_contest_public(uuid,boolean) from public,anon,authenticated;
grant execute on function public.mqd_contest_create(uuid,text,text,timestamptz,jsonb),public.mqd_contest_vote(uuid,uuid,text,text),public.mqd_contest_public(uuid,boolean) to service_role;
