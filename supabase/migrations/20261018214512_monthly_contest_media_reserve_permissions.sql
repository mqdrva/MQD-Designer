create or replace function public.mqd_monthly_video_reserve(p_contest uuid,p_user uuid,p_type text)
returns text language plpgsql set search_path='' as $$
declare result text;
begin
 if current_user!='service_role' or p_user is null then raise exception 'Service access required.'; end if;
 if p_type not in ('video/mp4','video/webm') then raise exception 'Choose an MP4 or WebM video.'; end if;
 perform 1 from public.mqd_contests where id=p_contest and round_month is not null and opens_at<=now() and closes_at>now() for update;
 if not found then raise exception 'This round is not accepting entries.'; end if;
 if exists(select 1 from public.mqd_contest_submissions where contest_id=p_contest and user_id=p_user) then raise exception 'You have already entered this round.'; end if;
 if (select count(*) from public.mqd_contest_submissions where contest_id=p_contest)>=500 then raise exception 'This round has reached its entry limit.'; end if;
 if (select count(*) from public.mqd_contest_video_uploads where user_id=p_user and contest_id=p_contest)>=5 then raise exception 'Video upload retry limit reached. You can still enter with your picture.'; end if;
 result:=p_user::text||'/'||p_contest::text||'/'||gen_random_uuid()::text||case when p_type='video/mp4' then '.mp4' else '.webm' end;
 insert into public.mqd_contest_video_uploads(path,contest_id,user_id,mime_type) values(result,p_contest,p_user,p_type);
 return result;
end $$;
