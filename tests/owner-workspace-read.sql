begin;
do $$
declare team uuid:=gen_random_uuid();r jsonb;body text;packet jsonb;i integer;failed boolean;logo text:=repeat('original-logo-',600000);begin
 insert into mqd_print_shop_businesses(id,revision,status,owner_email,token_hash,shop_config) values(team,1,'pending_review','private@example.invalid','PRIVATE_CAPABILITY',jsonb_build_object('ownerManaged',true,'logo',logo,'garmentLogo',logo,'ownerPublished',jsonb_build_object('shop',jsonb_build_object('garmentLogo',logo),'organizerFeeWaived',false)));
 if has_function_privilege('anon','mqd_owner_workspace_part(uuid,integer,integer)','execute') or has_function_privilege('authenticated','mqd_owner_workspace_part(uuid,integer,integer)','execute') then raise exception 'Public workspace access';end if;
 execute 'set local role service_role';
 r:=mqd_owner_workspace_part(team,null,0);body:=r->>'text';if length(body)>2097152 then raise exception 'Unbounded first part';end if;
 for i in 1..(r->>'parts')::int-1 loop r:=mqd_owner_workspace_part(team,1,i);if length(r->>'text')>2097152 then raise exception 'Unbounded part';end if;body:=body||(r->>'text');end loop;
 packet:=body::jsonb;if packet->'shop_config'->>'garmentLogo' is distinct from logo or packet->'shop_config'->>'logo' is distinct from logo then raise exception 'Original changed';end if;
 if packet ? 'token_hash' or packet->'shop_config'->'ownerPublished' ? 'shop' then raise exception 'Unnecessary private capability/publication artwork';end if;
 update mqd_print_shop_businesses set revision=2 where id=team;
 failed:=false;begin perform mqd_owner_workspace_part(team,1,1);exception when others then failed:=true;end;if not failed then raise exception 'Mixed workspace revision';end if;
 update mqd_print_shop_businesses set status='closed' where id=team;
 failed:=false;begin perform mqd_owner_workspace_part(team,null,0);exception when others then failed:=true;end;if not failed then raise exception 'Closed workspace read';end if;
end $$;
rollback;
