-- Add feedback mode without changing existing comparison polls or vote protection.
alter table public.mqd_polls add column mode text not null default 'comparison' check(mode in ('comparison','feedback'));

create or replace function public.mqd_poll_create(p_user uuid,p_title text,p_closes timestamptz,p_options jsonb)
returns uuid language plpgsql set search_path='' as $$
declare last_poll uuid; unlock_order uuid; new_poll uuid; opt jsonb; idx integer:=0; single_design boolean:=false;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,142));
 -- Permanent-account identity is verified by getUser in the service-only Edge endpoint.
 if p_user is null then raise exception 'Sign in to create a vote.'; end if;
 if char_length(trim(p_title)) not between 1 and 100 or p_closes<=now() or p_closes>now()+interval '30 days' then raise exception 'Choose a title and a closing date within 30 days.'; end if;
 if jsonb_typeof(p_options)!='array' or jsonb_array_length(p_options) not between 2 and 3 then raise exception 'Choose two or three saved designs.'; end if;
 single_design:=jsonb_array_length(p_options)=2 and (select count(distinct x->>'design_id') from jsonb_array_elements(p_options) x)=1;
 if single_design then
  if p_options->0->>'label' is distinct from 'Thumbs up' or p_options->1->>'label' is distinct from 'Thumbs down' or ((p_options->0)-'label') is distinct from ((p_options->1)-'label') then raise exception 'A single-design vote must use matching thumbs-up and thumbs-down options.'; end if;
 elsif (select count(distinct x->>'design_id') from jsonb_array_elements(p_options) x)!=jsonb_array_length(p_options) then raise exception 'Choose different designs.'; end if;
 select id into last_poll from public.mqd_polls where user_id=p_user order by created_at desc,id desc limit 1;
 if last_poll is not null then
  unlock_order:=public.mqd_poll_unlock(p_user,last_poll);
  if unlock_order is null then raise exception 'Purchase one of the designs from your last vote to unlock a new voting page.'; end if;
 end if;
 insert into public.mqd_polls(user_id,title,closes_at,unlock_order_id,mode) values(p_user,trim(p_title),p_closes,unlock_order,case when single_design then 'feedback' else 'comparison' end) returning id into new_poll;
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

create or replace function public.mqd_poll_public(p_poll uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('poll',jsonb_build_object('id',p.id,'title',p.title,'closes_at',p.closes_at,'mode',p.mode),
 'options',(select jsonb_agg(jsonb_build_object('id',opt.id,'label',opt.label,'preview',opt.preview,
 'votes',(select count(*) from public.mqd_poll_votes v where v.poll_id=p.id and v.option_id=opt.id)) order by opt.position)
 from public.mqd_poll_options opt where opt.poll_id=p.id),
 'total',(select count(*) from public.mqd_poll_votes v where v.poll_id=p.id)) from public.mqd_polls p where p.id=p_poll
$$;
revoke execute on function public.mqd_poll_public(uuid) from public,anon,authenticated;
grant execute on function public.mqd_poll_public(uuid) to service_role;

create or replace function public.mqd_poll_results(p_poll uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('poll',jsonb_build_object('id',p.id,'title',p.title,'closes_at',p.closes_at,'mode',p.mode),
 'options',(select jsonb_agg(jsonb_build_object('id',opt.id,'label',opt.label,
 'votes',(select count(*) from public.mqd_poll_votes v where v.poll_id=p.id and v.option_id=opt.id)) order by opt.position)
 from public.mqd_poll_options opt where opt.poll_id=p.id),
 'total',(select count(*) from public.mqd_poll_votes v where v.poll_id=p.id)) from public.mqd_polls p where p.id=p_poll
$$;
revoke execute on function public.mqd_poll_results(uuid) from public,anon,authenticated;
grant execute on function public.mqd_poll_results(uuid) to service_role;

revoke execute on function public.mqd_poll_create(uuid,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.mqd_poll_create(uuid,text,timestamptz,jsonb) to service_role;
