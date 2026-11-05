-- Review-only migration; apply during the separately authorized release.
create table public.mqd_print_shop_designs (
 id uuid primary key,
 business_id uuid not null references public.mqd_print_shop_businesses(id),
 created_by uuid not null references auth.users(id),
 title text not null check(length(title) between 1 and 100),
 engine text not null check(engine in ('2d','3d')),
 product_id text not null,
 locked boolean not null default true,
 revision integer not null default 1 check(revision>0),
 package_path text not null unique,
 appearance jsonb not null,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 token_cipher jsonb not null,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create index mqd_print_shop_designs_business_updated on public.mqd_print_shop_designs(business_id,updated_at desc);
alter table public.mqd_print_shop_designs enable row level security;
revoke all on public.mqd_print_shop_designs from public,anon,authenticated;
grant select,insert,update,delete on public.mqd_print_shop_designs to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('print-shop-designs','print-shop-designs',false,8388608,array['application/zip']);
-- No client Storage policies: the authenticated service checks exact business
-- ownership or a single-design read capability before accessing originals.
