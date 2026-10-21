-- Apply only to an isolated test project for preview. No customer-design grants change.
create table public.mqd_shirt_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  draft jsonb not null,
  published_version_id uuid,
  updated_at timestamptz not null default now()
);
create table public.mqd_shirt_template_versions (
  id uuid primary key,
  template_id uuid not null references public.mqd_shirt_templates(id),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.mqd_shirt_templates add constraint published_template_version
 foreign key(published_version_id) references public.mqd_shirt_template_versions(id);
alter table public.mqd_shirt_templates enable row level security;
alter table public.mqd_shirt_template_versions enable row level security;
revoke all on public.mqd_shirt_templates, public.mqd_shirt_template_versions from public,anon,authenticated;
grant select,insert,update on public.mqd_shirt_templates to service_role;
grant select,insert on public.mqd_shirt_template_versions to service_role;
-- No UPDATE/DELETE of versions, even through ordinary service-role queries.
create function public.mqd_immutable_template_version() returns trigger language plpgsql
 set search_path='' as $$ begin raise exception 'Published template versions are immutable'; end; $$;
revoke all on function public.mqd_immutable_template_version() from public,anon,authenticated;
create trigger immutable_template_version before update or delete on public.mqd_shirt_template_versions
 for each row execute function public.mqd_immutable_template_version();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('mqd-template-drafts','mqd-template-drafts',false,20971520,array['image/png','image/jpeg','image/webp']),
 ('mqd-template-published','mqd-template-published',true,20971520,array['image/png','image/jpeg','image/webp'])
 on conflict(id) do nothing;
-- No client storage mutation policy. Owner/MFA-checked edge function alone writes unique paths,
-- with upsert=false. Published objects remain available after unpublishing.
