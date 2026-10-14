-- Additive Shirt Games storage. Existing customer designs, orders and policies are unchanged.
create table public.mqd_shirt_games (
 id uuid primary key,
 owner_id uuid not null references auth.users(id),
 engine jsonb not null check (jsonb_typeof(engine)='object' and (engine->>'id')::uuid=id),
 version bigint not null default 1 check(version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 days'
);
create index mqd_shirt_games_owner_idx on public.mqd_shirt_games(owner_id,created_at desc);
create table public.mqd_shirt_game_assets (
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null references public.mqd_shirt_games(id) on delete cascade,
 seat integer not null check(seat between 0 and 5),
 path text not null unique,
 mime_type text not null check(mime_type in ('image/png','image/jpeg','image/webp')),
 bytes bigint not null check(bytes between 1 and 8388608),
 kind text not null check(kind in ('source','crop')),
 created_at timestamptz not null default now()
);
create index mqd_shirt_game_assets_game_idx on public.mqd_shirt_game_assets(game_id,seat);
create table public.mqd_shirt_game_drafts (
 id uuid primary key,
 game_id uuid not null references public.mqd_shirt_games(id),
 buyer_seat integer not null check(buyer_seat between 0 and 5),
 buyer_id uuid references auth.users(id),
 snapshot jsonb not null,
 order_id uuid references public.mqd_orders(id),
 created_at timestamptz not null default now()
);
create index mqd_shirt_game_drafts_game_idx on public.mqd_shirt_game_drafts(game_id,buyer_seat);
create table public.mqd_shirt_game_settings (
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 checkout_enabled boolean not null default false,
 max_games integer not null default 20 check(max_games between 0 and 10000),
 max_asset_bytes bigint not null default 26214400 check(max_asset_bytes between 0 and 1073741824),
 asset_bytes_reserved bigint not null default 0 check(asset_bytes_reserved>=0),
 menu jsonb not null default '[{"id":"pass","rank":0,"visible":true},{"id":"faces","rank":1,"visible":true},{"id":"birthday","rank":2,"visible":true},{"id":"picked","rank":3,"visible":true}]'::jsonb
);
insert into public.mqd_shirt_game_settings(id) values(true);
create table public.mqd_shirt_game_limits (
 key_hash text primary key check(length(key_hash)=64),
 window_start timestamptz not null,
 hits integer not null check(hits>0)
);
alter table public.mqd_shirt_games enable row level security;
alter table public.mqd_shirt_game_assets enable row level security;
alter table public.mqd_shirt_game_drafts enable row level security;
alter table public.mqd_shirt_game_settings enable row level security;
alter table public.mqd_shirt_game_limits enable row level security;
revoke all on public.mqd_shirt_games,public.mqd_shirt_game_assets,public.mqd_shirt_game_drafts,public.mqd_shirt_game_settings,public.mqd_shirt_game_limits from public,anon,authenticated;
grant all on public.mqd_shirt_games,public.mqd_shirt_game_assets,public.mqd_shirt_game_drafts,public.mqd_shirt_game_settings,public.mqd_shirt_game_limits to service_role;

-- The endpoint authenticates the actor, runs the tested engine, then commits by version.
-- A failed comparison causes a retry from current state, never an overwritten contribution.
create function public.mqd_shirt_game_commit(p_id uuid,p_expected bigint,p_engine jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if current_user<>'service_role' then raise exception 'Service access required'; end if;
 if (p_engine->>'id')::uuid is distinct from p_id or jsonb_typeof(p_engine)<>'object' or octet_length(p_engine::text)>262144 then raise exception 'Invalid game state';end if;
 update public.mqd_shirt_games set engine=p_engine,version=version+1,updated_at=now() where id=p_id and version=p_expected and expires_at>now();
 return found;
end $$;
create function public.mqd_shirt_game_create(p_owner uuid,p_engine jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare settings public.mqd_shirt_game_settings;
begin
 if current_user<>'service_role' or p_owner is null then raise exception 'Service access required';end if;
 select * into settings from public.mqd_shirt_game_settings where id=true for update;
 if not settings.enabled then raise exception 'Shirt Games is not open yet';end if;
 if (select count(*) from public.mqd_shirt_games)>=settings.max_games then raise exception 'Game test capacity reached';end if;
 if (select count(*) from public.mqd_shirt_games where owner_id=p_owner and created_at>now()-interval '1 day')>=5 then raise exception 'Daily game limit reached';end if;
 if jsonb_typeof(p_engine)<>'object' or octet_length(p_engine::text)>262144 then raise exception 'Invalid game';end if;
 insert into public.mqd_shirt_games(id,owner_id,engine) values((p_engine->>'id')::uuid,p_owner,p_engine);
 return true;
end $$;
create function public.mqd_shirt_game_reserve_bytes(p_bytes bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if current_user<>'service_role' then raise exception 'Service access required';end if;
 if p_bytes<1 or p_bytes>16777216 then raise exception 'Invalid upload size';end if;
 update public.mqd_shirt_game_settings set asset_bytes_reserved=asset_bytes_reserved+p_bytes where id=true and enabled and asset_bytes_reserved+p_bytes<=max_asset_bytes;
 return found;
end $$;
create function public.mqd_shirt_game_rate(p_hash text,p_limit integer default 120)
returns boolean language plpgsql security invoker set search_path='' as $$
declare count_now integer;
begin
 if current_user<>'service_role' then raise exception 'Service access required';end if;
 if length(p_hash)<>64 or p_limit<1 or p_limit>300 then raise exception 'Invalid limiter';end if;
 insert into public.mqd_shirt_game_limits(key_hash,window_start,hits) values(p_hash,date_trunc('minute',now()),1)
 on conflict(key_hash) do update set hits=case when public.mqd_shirt_game_limits.window_start<date_trunc('minute',now()) then 1 else public.mqd_shirt_game_limits.hits+1 end,window_start=date_trunc('minute',now())
 returning hits into count_now;
 return count_now<=p_limit;
end $$;
revoke all on function public.mqd_shirt_game_commit(uuid,bigint,jsonb),public.mqd_shirt_game_create(uuid,jsonb),public.mqd_shirt_game_reserve_bytes(bigint),public.mqd_shirt_game_rate(text,integer) from public,anon,authenticated;
grant execute on function public.mqd_shirt_game_commit(uuid,bigint,jsonb),public.mqd_shirt_game_create(uuid,jsonb),public.mqd_shirt_game_reserve_bytes(bigint),public.mqd_shirt_game_rate(text,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('mqd-shirt-games','mqd-shirt-games',false,8388608,array['image/png','image/jpeg','image/webp']);
-- Restrictive policy prevents permissive policies elsewhere from exposing this bucket.
create policy mqd_shirt_games_service_only on storage.objects as restrictive for all to anon,authenticated
using(bucket_id<>'mqd-shirt-games') with check(bucket_id<>'mqd-shirt-games');
