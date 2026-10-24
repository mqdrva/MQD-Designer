-- Isolated CI only: parent records used by the actual master migration/RPC.
-- Supabase roles and storage metadata come from template-schema-fixture.sql.
create table public.mqd_print_shop_businesses (
 id uuid primary key, preferred_slug text, plan text, owner_email text,
 owner_phone text, shop_config jsonb, payload_hash text, ip_hash text,
 mail_origin text, token_hash text, token_cipher jsonb,
 token_expires_at timestamptz, email_verified_at timestamptz
);
create table public.mqd_team_accounts (
 team_id uuid primary key references public.mqd_print_shop_businesses(id),
 shop_config jsonb, status text not null default 'ready'
);
grant select,insert,update on public.mqd_team_accounts to service_role;
