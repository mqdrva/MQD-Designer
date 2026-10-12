create or replace function public.mqd_contest_create(p_user uuid,p_title text,p_description text,p_closes timestamptz,p_options jsonb)
returns uuid language plpgsql set search_path='' as $$
declare cid uuid; opt jsonb; idx integer:=0;
begin
 -- The service-only endpoint validates the current admin role and MFA with Auth.
 if current_user!='service_role' then raise exception 'Service access required.'; end if;
 if p_user is null then raise exception 'Owner access required.'; end if;
 if p_closes is null or p_closes<=now() or p_closes>now()+interval '90 days' then raise exception 'Choose a closing date within 90 days.'; end if;
 if jsonb_typeof(p_options)!='array' or jsonb_array_length(p_options)<2 or jsonb_array_length(p_options)>12 then raise exception 'Choose 2–12 designs.'; end if;
 insert into public.mqd_contests(user_id,title,description,closes_at) values(p_user,trim(p_title),coalesce(p_description,''),p_closes) returning id into cid;
 for opt in select * from jsonb_array_elements(p_options) loop
  if opt->>'preview' !~ '^data:image/(png|jpeg);base64,' or length(opt->>'preview')>2800000 then raise exception 'Invalid preview.'; end if;
  insert into public.mqd_contest_options(contest_id,label,preview,position) values(cid,opt->>'label',opt->>'preview',idx);idx:=idx+1;
 end loop;
 return cid;
end $$;
