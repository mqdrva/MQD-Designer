-- Isolated CI database only. No production customer or order records.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key default gen_random_uuid(),is_anonymous boolean default false);
create table public.customer_designs(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),product_id text,product_name text,name text,status text,design_json jsonb,preview_path text);
create table public.mqd_orders(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),product_id text,product_name text,design_json jsonb,status text,is_test boolean default false,stripe_payment_status text,paid_at timestamptz,created_at timestamptz default now());
grant usage on schema auth,public to service_role;
grant all on auth.users,public.customer_designs,public.mqd_orders to service_role;
