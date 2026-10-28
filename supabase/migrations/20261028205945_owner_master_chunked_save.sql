-- Private transient transport, not a new master format or customer endpoint.
create table public.mqd_master_uploads (
 id uuid primary key, team_id uuid not null references public.mqd_team_accounts(team_id),
 part_count integer not null check(part_count between 1 and 25),
 byte_count integer not null check(byte_count between 1 and 51380224),
 expires_at timestamptz not null default now()+interval '15 minutes'
);
create index mqd_master_uploads_expiry on public.mqd_master_uploads(expires_at);
create table public.mqd_master_upload_parts (
 upload_id uuid not null references public.mqd_master_uploads(id) on delete cascade,
 part integer not null check(part between 0 and 24),
 body text not null check(octet_length(body) between 1 and 2097152),
 primary key(upload_id,part)
);
alter table public.mqd_master_uploads enable row level security;
alter table public.mqd_master_upload_parts enable row level security;
revoke all on public.mqd_master_uploads,public.mqd_master_upload_parts from public,anon,authenticated;
grant select,insert,delete on public.mqd_master_uploads,public.mqd_master_upload_parts to service_role;
create function public.mqd_begin_master_upload(p_upload uuid,p_team uuid,p_parts integer,p_bytes integer)
returns boolean language plpgsql security invoker set search_path=public as $$
begin
 if p_parts is null or p_bytes is null or p_parts<>ceil(p_bytes/2097152.0) or p_parts not between 1 and 25 or p_bytes not between 1 and 51380224 then raise exception 'Invalid master upload bounds.';end if;
 if not exists(select 1 from public.mqd_team_accounts where team_id=p_team and status<>'closed') then raise exception 'Team unavailable.';end if;
 delete from public.mqd_master_uploads where expires_at<now();
 insert into public.mqd_master_uploads(id,team_id,part_count,byte_count) values(p_upload,p_team,p_parts,p_bytes);
 return true;
end $$;
create function public.mqd_put_master_upload_part(p_upload uuid,p_part integer,p_text text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare u public.mqd_master_uploads;old text;expected integer;
begin
 select * into u from public.mqd_master_uploads where id=p_upload and expires_at>now() for update;
 if not found or p_part is null or p_part<0 or p_part>=u.part_count then raise exception 'Master upload unavailable.';end if;
 expected:=case when p_part=u.part_count-1 then u.byte_count-p_part*2097152 else 2097152 end;
 if p_text is null or octet_length(p_text)<>expected then raise exception 'Master upload part size mismatch.';end if;
 select body into old from public.mqd_master_upload_parts where upload_id=p_upload and part=p_part;
 if found then if old is distinct from p_text then raise exception 'Master upload part already exists.';end if;return true;end if;
 insert into public.mqd_master_upload_parts values(p_upload,p_part,p_text);return true;
end $$;
create function public.mqd_finish_master_upload(p_upload uuid)
returns jsonb language plpgsql security invoker set search_path=public set statement_timeout='60s' as $$
declare u public.mqd_master_uploads;body text;parts integer;bytes bigint;packet jsonb;r jsonb;product text;
begin
 select * into u from public.mqd_master_uploads where id=p_upload and expires_at>now() for update;
 if not found then raise exception 'Master upload unavailable.';end if;
 select count(*),sum(octet_length(p.body)) into parts,bytes from public.mqd_master_upload_parts p where upload_id=p_upload;
 if parts<>u.part_count or bytes<>u.byte_count then raise exception 'Master upload incomplete.';end if;
 select string_agg(p.body,'' order by part) into body from public.mqd_master_upload_parts p where upload_id=p_upload;
 packet:=body::jsonb;body:=null;
 if (packet->>'p_team')::uuid is distinct from u.team_id or jsonb_typeof(packet->'p_draft') is distinct from 'object' or jsonb_typeof(packet->'p_publish') is distinct from 'boolean' or (packet->>'p_revision')::integer<0 then raise exception 'Invalid master upload.';end if;
 product:=packet->>'p_product';
 if product is not null and product is distinct from packet->'p_draft'->'payload'->'product'->>'id' then raise exception 'Garment mismatch.';end if;
 if product is null then
  r:=public.mqd_save_team_master(u.team_id,(packet->>'p_revision')::integer,packet->'p_draft',(packet->>'p_publish')::boolean,(packet->>'p_version')::uuid);
 else
  r:=public.mqd_save_owner_garment_master(u.team_id,product,(packet->>'p_revision')::integer,packet->'p_draft',(packet->>'p_publish')::boolean,(packet->>'p_version')::uuid);
 end if;
 delete from public.mqd_master_uploads where id=p_upload;return r;
end $$;
create function public.mqd_abort_master_upload(p_upload uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
begin delete from public.mqd_master_uploads where id=p_upload;return true;end $$;
revoke all on function public.mqd_begin_master_upload(uuid,uuid,integer,integer),public.mqd_put_master_upload_part(uuid,integer,text),public.mqd_finish_master_upload(uuid),public.mqd_abort_master_upload(uuid) from public,anon,authenticated;
grant execute on function public.mqd_begin_master_upload(uuid,uuid,integer,integer),public.mqd_put_master_upload_part(uuid,integer,text),public.mqd_finish_master_upload(uuid),public.mqd_abort_master_upload(uuid) to service_role;
notify pgrst,'reload schema';
