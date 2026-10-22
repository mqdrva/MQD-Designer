-- Contest videos stay private. Only the service may grant an upload or playback URL.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mqd-contest-media','mqd-contest-media',false,26214400,array['video/mp4','video/webm']);
alter table public.mqd_contest_submissions add column video_path text;
create table public.mqd_contest_video_uploads(
 path text primary key, contest_id uuid not null references public.mqd_contests(id),
 user_id uuid not null references auth.users(id), mime_type text not null check(mime_type in ('video/mp4','video/webm')),
 created_at timestamptz not null default now()
);
create index mqd_contest_video_user_round on public.mqd_contest_video_uploads(user_id,contest_id);
create index mqd_contest_video_round on public.mqd_contest_video_uploads(contest_id);
alter table public.mqd_contest_video_uploads enable row level security;
revoke all on public.mqd_contest_video_uploads from public,anon,authenticated;
grant all on public.mqd_contest_video_uploads to service_role;
create function public.mqd_monthly_video_reserve(p_contest uuid,p_user uuid,p_type text)
returns text language plpgsql set search_path='' as $$
declare result text;
begin
 if current_user!='service_role' or p_user is null then raise exception 'Service access required.'; end if;
 if p_type not in ('video/mp4','video/webm') then raise exception 'Choose an MP4 or WebM video.'; end if;
 perform 1 from public.mqd_contests where id=p_contest and round_month is not null and opens_at<=now() and closes_at>now() for update;
 if not found then raise exception 'This round is not accepting entries.'; end if;
 if exists(select 1 from public.mqd_contest_submissions where contest_id=p_contest and (user_id=p_user or lower(contact_email)=(select lower(email) from auth.users where id=p_user))) then raise exception 'You have already entered this round.'; end if;
 if (select count(*) from public.mqd_contest_submissions where contest_id=p_contest)>=500 then raise exception 'This round has reached its entry limit.'; end if;
 if (select count(*) from public.mqd_contest_video_uploads where user_id=p_user and contest_id=p_contest)>=5 then raise exception 'Video upload retry limit reached. You can still enter with your picture.'; end if;
 result:=p_user::text||'/'||p_contest::text||'/'||gen_random_uuid()::text||case when p_type='video/mp4' then '.mp4' else '.webm' end;
 insert into public.mqd_contest_video_uploads(path,contest_id,user_id,mime_type) values(result,p_contest,p_user,p_type);
 return result;
end $$;
create function public.mqd_monthly_upload_submit(p_contest uuid,p_user uuid,p_label text,p_email text,p_preview text,p_video text)
returns uuid language plpgsql set search_path='' as $$
declare sid uuid;
begin
 if current_user!='service_role' or p_user is null then raise exception 'Service access required.'; end if;
 if p_video is not null and not exists(select 1 from public.mqd_contest_video_uploads where path=p_video and user_id=p_user and contest_id=p_contest) then raise exception 'Choose your own uploaded video.'; end if;
 sid:=public.mqd_monthly_submit(p_contest,p_user,null,p_label,p_email,p_preview,null,'');
 update public.mqd_contest_submissions set video_path=p_video where id=sid;
 return sid;
end $$;
revoke all on function public.mqd_monthly_video_reserve(uuid,uuid,text),public.mqd_monthly_upload_submit(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.mqd_monthly_video_reserve(uuid,uuid,text),public.mqd_monthly_upload_submit(uuid,uuid,text,text,text,text) to service_role;
