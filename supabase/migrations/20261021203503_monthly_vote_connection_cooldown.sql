-- Monthly contests: retain browser deduplication and throttle fresh browser IDs
-- from the same connection inside the existing vote transaction.
-- Existing votes are preserved. Personal Help Me Choose polls are separate.
create or replace function public.mqd_contest_vote(p_contest uuid,p_option uuid,p_voter text,p_network text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
 monthly_round date;
 last_network_vote timestamptz;
 wait_seconds integer;
begin
 if current_user!='service_role' then raise exception 'Service access required.'; end if;
 if p_voter is null or btrim(p_voter)='' or p_network is null or btrim(p_network)='' then
  raise exception 'Invalid vote.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_network,144));
 select round_month into monthly_round from public.mqd_contests
  where id=p_contest and closes_at>now() and (opens_at is null or opens_at<=now()) for update;
 if not found then raise exception 'Voting has closed or this contest is unavailable.'; end if;
 if not exists(select 1 from public.mqd_contest_options where id=p_option and contest_id=p_contest and eligible) then raise exception 'Invalid choice.'; end if;
 -- Retry of a recorded vote is harmless, even while the connection is cooling down.
 if exists(select 1 from public.mqd_contest_votes where contest_id=p_contest and voter_hash=p_voter) then return false; end if;
 if monthly_round is not null then
  select max(created_at) into last_network_vote from public.mqd_contest_votes
   where contest_id=p_contest and network_hash=p_network and created_at>now()-interval '5 minutes';
  if last_network_vote is not null then
   wait_seconds:=greatest(1,ceil(extract(epoch from last_network_vote+interval '5 minutes'-now()))::integer);
   raise exception 'A vote was recently recorded from this internet connection. Please try again in % seconds. People sharing Wi-Fi must wait between votes.',wait_seconds;
  end if;
 end if;
 -- Preserve the existing cross-contest burst guard.
 if (select count(*) from public.mqd_contest_votes where network_hash=p_network and created_at>now()-interval '1 minute')>=20 then raise exception 'Too many votes. Try again shortly.'; end if;
 insert into public.mqd_contest_votes(contest_id,option_id,voter_hash,network_hash) values(p_contest,p_option,p_voter,p_network);
 return true;
end $$;
revoke execute on function public.mqd_contest_vote(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.mqd_contest_vote(uuid,uuid,text,text) to service_role;
