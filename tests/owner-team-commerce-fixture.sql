-- Isolated PostgreSQL fixture only; existing master fixtures create the parent tables.
alter table mqd_print_shop_businesses add column status text default 'awaiting_review',add column revision integer default 1,add column updated_at timestamptz;
alter table mqd_team_accounts add column livemode boolean default false,add column billing_status text,add column period_end timestamptz,add column stripe_subscription_id text;
grant select,update on mqd_print_shop_businesses to service_role;
create table mqd_team_batches(id uuid,team_id uuid,status text,shipping_paid_at timestamptz,shipping_refunded boolean,approved_at timestamptz,cutoff_at timestamptz,opens_at timestamptz,max_quantity integer);
create table mqd_team_orders(id uuid primary key,team_id uuid,batch_id uuid,request_hash text,ip_hash text,guest_token_hash text,customer jsonb,summary jsonb,delivery text,quantity integer,garment_cents integer,shipping_cents integer,package_path text,livemode boolean,reserved_until timestamptz,payment_status text default 'pending');
grant select,insert on mqd_team_orders to service_role;
grant select on mqd_team_batches to service_role;
