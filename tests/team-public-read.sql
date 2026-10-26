-- Read-only verification against the existing Mopar Kingz publication.
-- No master, order, billing or publication writes. Only the derived cache may be populated.
do $$
declare packet jsonb;original jsonb;rebuilt jsonb;zone record;layer jsonb;layers jsonb;zones jsonb:='{}';source text;
begin
 if has_function_privilege('anon','public.mqd_read_owner_team_public(text,boolean,text,uuid)','execute') or has_function_privilege('authenticated','public.mqd_read_owner_team_public(text,boolean,text,uuid)','execute') then raise exception 'Private reader exposed';end if;
 if has_table_privilege('anon','public.mqd_team_public_read_cache','select') or has_table_privilege('authenticated','public.mqd_team_public_read_cache','select') then raise exception 'Private cache exposed';end if;
 packet:=public.mqd_read_owner_team_public('moparkingz',true,null,null);
 select to_jsonb(v) into original from public.mqd_team_master_versions v where id=(packet->'master'->>'id')::uuid;
 if original is null then raise exception 'No comparison master';end if;
 rebuilt:=packet->'master';
 for zone in select key,value from jsonb_each(rebuilt->'payload'->'design'->'zones') loop
  layers:='[]';for layer in select value from jsonb_array_elements(zone.value->'layers') loop
   if layer->>'type'='image' then source:=rebuilt->'sources'->>((split_part(layer->>'src',':',2))::integer);layer:=jsonb_set(layer,'{src}',to_jsonb(source));end if;
   layers:=layers||jsonb_build_array(layer);
  end loop;zones:=zones||jsonb_build_object(zone.key,jsonb_set(zone.value,'{layers}',layers));
 end loop;
 rebuilt:=jsonb_set(rebuilt,'{payload,design,zones}',zones)-'sources'-'sourceFormat';
 if rebuilt is distinct from original then raise exception 'Published master changed during transport';end if;
 if public.mqd_read_owner_team_public('moparkingz',false,null,null) is not null then raise exception 'Cross-mode read';end if;
 if public.mqd_read_owner_team_public('missing-team-for-synthetic-check',true,null,null) is not null then raise exception 'Missing team read';end if;
end$$;
