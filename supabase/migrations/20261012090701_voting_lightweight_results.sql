create function public.mqd_poll_results(p_poll uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('poll',jsonb_build_object('id',p.id,'title',p.title,'closes_at',p.closes_at),
 'options',(select jsonb_agg(jsonb_build_object('id',opt.id,'label',opt.label,
 'votes',(select count(*) from public.mqd_poll_votes v where v.poll_id=p.id and v.option_id=opt.id)) order by opt.position)
 from public.mqd_poll_options opt where opt.poll_id=p.id),
 'total',(select count(*) from public.mqd_poll_votes v where v.poll_id=p.id)) from public.mqd_polls p where p.id=p_poll
$$;
revoke execute on function public.mqd_poll_results(uuid) from public,anon,authenticated;
grant execute on function public.mqd_poll_results(uuid) to service_role;
