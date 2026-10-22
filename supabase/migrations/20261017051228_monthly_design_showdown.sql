-- Monthly rounds reuse the existing contest vote ledger; submissions remain private.
alter table public.mqd_contests add column round_month date unique;
alter table public.mqd_contests add column opens_at timestamptz;
alter table public.mqd_contests add column announces_at timestamptz;
alter table public.mqd_contest_options add column eligible boolean not null default true;
create table public.mqd_monthly_config (
 id boolean primary key default true check(id), owner_id uuid not null references auth.users(id)
);
insert into public.mqd_monthly_config(owner_id)
 select id from auth.users where raw_app_meta_data->>'role'='admin' order by created_at limit 1;
create table public.mqd_contest_submissions (
 id uuid primary key default gen_random_uuid(), contest_id uuid not null references public.mqd_contests(id),
 user_id uuid references auth.users(id), design_id uuid references public.customer_designs(id),
 label text not null check(length(trim(label)) between 1 and 100),
 contact_email text not null check(length(contact_email) between 3 and 254),
 preview text not null check(length(preview)<=2800000 and preview ~ '^data:image/(png|jpeg);base64,'),
 design_snapshot jsonb, source_url text not null default '' check(length(source_url)<=1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected','disqualified')),
 option_id uuid unique references public.mqd_contest_options(id),
 review_note text not null default '' check(length(review_note)<=500),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index mqd_monthly_one_entry on public.mqd_contest_submissions(contest_id,user_id) where user_id is not null;
create unique index mqd_monthly_email_entry on public.mqd_contest_submissions(contest_id,lower(contact_email));
create index mqd_monthly_queue on public.mqd_contest_submissions(contest_id,status,created_at);
create index mqd_monthly_submitter on public.mqd_contest_submissions(user_id,created_at);
create index mqd_monthly_design on public.mqd_contest_submissions(design_id);
create index mqd_monthly_reviewer on public.mqd_contest_submissions(reviewed_by);
alter table public.mqd_monthly_config enable row level security;
alter table public.mqd_contest_submissions enable row level security;
revoke all on public.mqd_monthly_config,public.mqd_contest_submissions from public,anon,authenticated;
grant all on public.mqd_monthly_config,public.mqd_contest_submissions to service_role;

create function public.mqd_first_friday(p_month date) returns date language sql immutable set search_path='' as $$
 select date_trunc('month',p_month::timestamp)::date + ((5-extract(dow from date_trunc('month',p_month::timestamp))::int+7)%7)
$$;
create function public.mqd_monthly_ensure() returns void language plpgsql set search_path='' as $$
declare m date; f date; previous_f date; owner_uuid uuid;
begin
 if current_user!='service_role' then raise exception 'Service access required.'; end if;
 select owner_id into owner_uuid from public.mqd_monthly_config where id;
 if owner_uuid is null then raise exception 'Monthly contest owner is not configured.'; end if;
 for i in 0..2 loop
  m:=(date_trunc('month',now() at time zone 'America/New_York')+make_interval(months=>i))::date;
  f:=public.mqd_first_friday(m);
  previous_f:=public.mqd_first_friday((m-interval '1 month')::date);
  if (f::timestamp at time zone 'America/New_York')-interval '1 minute'<=now() then continue; end if;
  insert into public.mqd_contests(user_id,title,description,closes_at,round_month,opens_at,announces_at)
  values(owner_uuid,to_char(m,'FMMonth YYYY')||' · First Friday Design Showdown',
   'Win one free short-sleeve all-over-print T-shirt with your design. One entry per person/account each monthly round. Only approved designs appear. The highest website vote total wins. One vote per browser per round; this does not verify unique people. Ties remain tied pending a runoff; no sole winner is selected from a tie. Social-media likes do not count.',
   (f::timestamp at time zone 'America/New_York')-interval '1 minute',f,
   previous_f::timestamp at time zone 'America/New_York',f::timestamp at time zone 'America/New_York')
  on conflict(round_month) do nothing;
 end loop;
end $$;

create function public.mqd_monthly_submit(p_contest uuid,p_user uuid,p_design uuid,p_label text,p_email text,p_preview text,p_snapshot jsonb,p_source text)
returns uuid language plpgsql set search_path='' as $$
declare submission uuid;
begin
 if current_user!='service_role' then raise exception 'Service access required.'; end if;
 perform 1 from public.mqd_contests where id=p_contest and round_month is not null and opens_at<=now() and closes_at>now() for update;
 if not found then raise exception 'This round is not accepting entries.'; end if;
 if (select count(*) from public.mqd_contest_submissions where contest_id=p_contest)>=500 then raise exception 'This round has reached its entry limit.'; end if;
 if p_design is not null and not exists(select 1 from public.customer_designs where id=p_design and user_id=p_user and product_id='tshirt' and status!='archived') then raise exception 'Choose your saved all-over-print short-sleeve T-shirt.'; end if;
 insert into public.mqd_contest_submissions(contest_id,user_id,design_id,label,contact_email,preview,design_snapshot,source_url)
 values(p_contest,p_user,p_design,trim(p_label),lower(trim(p_email)),p_preview,p_snapshot,coalesce(p_source,'')) returning id into submission;
 return submission;
exception when unique_violation then raise exception 'An entry has already been submitted for this account or email in this round.';
end $$;

create function public.mqd_monthly_review(p_submission uuid,p_owner uuid,p_decision text,p_note text)
returns uuid language plpgsql set search_path='' as $$
declare s public.mqd_contest_submissions; c public.mqd_contests; opt uuid; n integer;
begin
 if current_user!='service_role' or p_owner is null then raise exception 'Owner access required.'; end if;
 select * into s from public.mqd_contest_submissions where id=p_submission;
 if not found then raise exception 'Entry not found.'; end if;
 select * into c from public.mqd_contests where id=s.contest_id for update;
 select * into s from public.mqd_contest_submissions where id=p_submission for update;
 if c.closes_at<=now() then raise exception 'This round has closed. Results cannot be changed.'; end if;
 if p_decision='approve' and s.status='approved' then return s.option_id; end if;
 if p_decision in ('approve','reject') and s.status!='pending' then raise exception 'This entry has already been reviewed.'; end if;
 if p_decision='approve' then
  select coalesce(max(position)+1,0) into n from public.mqd_contest_options where contest_id=s.contest_id;
  insert into public.mqd_contest_options(contest_id,label,preview,position) values(s.contest_id,s.label,s.preview,n) returning id into opt;
  update public.mqd_contest_submissions set status='approved',option_id=opt,reviewed_by=p_owner,reviewed_at=now(),review_note=coalesce(p_note,'') where id=s.id;
 elsif p_decision='reject' then
  update public.mqd_contest_submissions set status='rejected',reviewed_by=p_owner,reviewed_at=now(),review_note=coalesce(p_note,'') where id=s.id;
 elsif p_decision='disqualify' and s.status='approved' and length(trim(p_note))>0 then
  update public.mqd_contest_options set eligible=false where id=s.option_id;
  update public.mqd_contest_submissions set status='disqualified',reviewed_by=p_owner,reviewed_at=now(),review_note=p_note where id=s.id;
 else raise exception 'Invalid review decision or missing reason.';
 end if;
 return opt;
end $$;

create or replace function public.mqd_contest_vote(p_contest uuid,p_option uuid,p_voter text,p_network text)
returns boolean language plpgsql set search_path='' as $$
begin
 if current_user!='service_role' then raise exception 'Service access required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_network,144));
 perform 1 from public.mqd_contests where id=p_contest and closes_at>now() and (opens_at is null or opens_at<=now()) for update;
 if not found then raise exception 'Voting has closed or this contest is unavailable.'; end if;
 if not exists(select 1 from public.mqd_contest_options where id=p_option and contest_id=p_contest and eligible) then raise exception 'Invalid choice.'; end if;
 if exists(select 1 from public.mqd_contest_votes where contest_id=p_contest and voter_hash=p_voter) then return false; end if;
 if (select count(*) from public.mqd_contest_votes where network_hash=p_network and created_at>now()-interval '1 minute')>=20 then raise exception 'Too many votes. Try again shortly.'; end if;
 insert into public.mqd_contest_votes(contest_id,option_id,voter_hash,network_hash) values(p_contest,p_option,p_voter,p_network);
 return true;
end $$;

create or replace function public.mqd_contest_public(p_contest uuid,p_previews boolean default true)
returns jsonb language sql stable set search_path='' as $$
 with entries as (
  select o.*, (select count(*) from public.mqd_contest_votes v where v.contest_id=p_contest and v.option_id=o.id) votes
  from public.mqd_contest_options o where o.contest_id=p_contest and o.eligible
 ), scores as (select coalesce(max(votes),0) top_votes,coalesce(sum(votes),0) total from entries)
 select jsonb_build_object('contest',jsonb_build_object('id',c.id,'title',c.title,'description',c.description,'closes_at',c.closes_at,'round_month',c.round_month,'opens_at',c.opens_at,'announces_at',c.announces_at),
 'server_now',now(),'options',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'votes',o.votes)||case when p_previews then jsonb_build_object('preview',o.preview) else '{}'::jsonb end order by o.position) from entries o),'[]'::jsonb),
 'total',scores.total,
 'outcome',case when c.round_month is null then null
  when now()<c.closes_at then jsonb_build_object('status','open')
  when now()<c.announces_at then jsonb_build_object('status','awaiting_reveal')
  when scores.top_votes=0 then jsonb_build_object('status','no_winner')
  else jsonb_build_object('status',case when (select count(*) from entries where votes=scores.top_votes)>1 then 'tie' else 'winner' end,
   'designs',(select jsonb_agg(jsonb_build_object('id',id,'label',label,'votes',votes)) from entries where votes=scores.top_votes)) end)
 from public.mqd_contests c cross join scores where c.id=p_contest
$$;

revoke execute on function public.mqd_first_friday(date),public.mqd_monthly_ensure(),public.mqd_monthly_submit(uuid,uuid,uuid,text,text,text,jsonb,text),public.mqd_monthly_review(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.mqd_first_friday(date),public.mqd_monthly_ensure(),public.mqd_monthly_submit(uuid,uuid,uuid,text,text,text,jsonb,text),public.mqd_monthly_review(uuid,uuid,text,text) to service_role;

