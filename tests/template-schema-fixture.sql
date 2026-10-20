-- Isolated CI PostgreSQL only. Minimal Supabase auth/storage metadata schemas.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key default gen_random_uuid());
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
grant usage on schema public,auth,storage to service_role,anon,authenticated;
create table public.customer_designs(id uuid primary key,user_id uuid,design_json jsonb);
alter table public.customer_designs enable row level security;
grant select on public.customer_designs to authenticated;
create policy own_design on public.customer_designs for select to authenticated
 using(user_id::text=current_setting('request.jwt.claim.sub',true));
insert into auth.users values('00000000-0000-4000-8000-000000000001');
insert into public.customer_designs values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','{"private":"owner source"}');
