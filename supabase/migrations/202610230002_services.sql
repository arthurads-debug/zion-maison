create function public.ingest_event(p_event jsonb) returns void language plpgsql security definer set search_path='' as $$
declare inserted int; sid uuid=(p_event->>'session_id')::uuid; vid uuid=(p_event->>'visitor_id')::uuid; event_data jsonb=coalesce(p_event->'data','{}'); intent_items jsonb; pid uuid=(p_event->>'product_id')::uuid;
begin
  insert into public.analytics_sessions(id,visitor_id,attribution) values(sid,vid,coalesce(p_event->'attribution','{}')) on conflict(id) do nothing;
  get diagnostics inserted=row_count;
  if inserted=1 then insert into public.events(type,session_id,data) values('site_visited',sid,jsonb_build_object('attribution',p_event->'attribution')); end if;
  update public.analytics_sessions set last_seen_at=now() where id=sid and visitor_id=vid;
  if not found then raise exception 'Session mismatch'; end if;
  if p_event->>'variant_id' is not null then select product_id into pid from public.variants where id=(p_event->>'variant_id')::uuid; end if;
  if pid is not null and not exists(select 1 from public.products where id=pid and status='published') then raise exception 'Product unavailable'; end if;
  if p_event->>'type'='whatsapp_click' and event_data->>'intent_id' is not null then
   select items into strict intent_items from public.purchase_intents where id=(event_data->>'intent_id')::uuid;
   event_data=event_data||jsonb_build_object('items',intent_items);
  end if;
  insert into public.events(id,type,session_id,product_id,variant_id,data) values((p_event->>'id')::uuid,p_event->>'type',sid,pid,(p_event->>'variant_id')::uuid,event_data) on conflict(id) do nothing;
end $$;

create function public.integration_admin(p_provider text,p_actor uuid,p_input jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not exists(select 1 from public.admin_profiles where user_id=p_actor and role='owner' and active) then raise exception 'Permission denied'; end if;
  if p_input is not null then
    insert into private.integrations(provider,enabled,config,secret_ciphertext,last_status)
      values(p_provider,(p_input->>'enabled')::boolean,p_input->'config',p_input->>'secret_ciphertext',coalesce(p_input->>'last_status','configured'))
      on conflict(provider) do update set enabled=excluded.enabled,config=excluded.config,
        secret_ciphertext=case when p_input->>'remove_secret'='true' then null else coalesce(excluded.secret_ciphertext,private.integrations.secret_ciphertext) end,
        last_status=excluded.last_status,updated_at=case when p_input->>'tested'='true' then private.integrations.updated_at else now() end,last_test_at=case when p_input->>'tested'='true' then now() else private.integrations.last_test_at end;
    insert into public.integration_status(provider,enabled,public_config,status,last_test_at)
      values(p_provider,(p_input->>'enabled')::boolean,coalesce(p_input->'public_config','{}'),coalesce(p_input->>'last_status','configured'),case when p_input->>'tested'='true' then now() end)
      on conflict(provider) do update set enabled=excluded.enabled,public_config=excluded.public_config,status=excluded.status,last_test_at=coalesce(excluded.last_test_at,public.integration_status.last_test_at);
    if p_input->>'tested' is distinct from 'true' then
     update private.deliveries set state='cancelled' where provider=p_provider and state in('pending','processing');
     delete from private.integration_cursors where provider=p_provider;
    end if;
    insert into public.audit_log(actor_id,entity,entity_id,operation) values(p_actor,'integrations',p_provider,'UPDATE');
  end if;
  select to_jsonb(i) into result from private.integrations i where provider=p_provider;
  return result;
end $$;
create function public.worker_integration(p_provider text) returns jsonb language sql security definer set search_path='' as $$
 select to_jsonb(i) from private.integrations i where provider=p_provider and enabled;
$$;
create function public.delivery_jobs(p_action text,p_id uuid default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if p_action in('lease','storage-lease') then
   update private.deliveries set state='failed',last_error='lease_exhausted',lease_until=null where state='processing' and lease_until<now() and attempts>=5;
   with candidates as (select id from private.deliveries where (state='pending' or state='processing' and lease_until<now()) and next_attempt_at<=now() and attempts<5 and (p_action='lease' or provider='storage' and (p_id is null or dedupe_key='media-delete:'||p_id::text)) order by created_at for update skip locked limit 20), leased as
     (update private.deliveries d set state='processing',lease_until=now()+interval '10 minutes',lease_token=gen_random_uuid(),attempts=attempts+1 from candidates c where d.id=c.id returning d.*)
   select coalesce(jsonb_agg(to_jsonb(leased)),'[]') into result from leased;
 elsif p_action='finish' then
   update private.deliveries set state=p_data->>'state',lease_until=null,attempts=case when p_data->>'deferred'='true' then greatest(0,attempts-1) else attempts end,next_attempt_at=coalesce((p_data->>'next_attempt_at')::timestamptz,now()),last_code=(p_data->>'code')::int,last_error=p_data->>'error',delivered_at=case when p_data->>'state'='delivered' then now() end where id=p_id and state='processing' and lease_token=(p_data->>'lease_token')::uuid;
 elsif p_action='logs' then
   select coalesce(jsonb_agg(to_jsonb(d)),'[]') into result from (select id,provider,state,attempts,last_code,last_error,created_at,delivered_at from private.deliveries order by created_at desc limit 100) d;
 elsif p_action='retry' then
   update private.deliveries set state='pending',attempts=0,next_attempt_at=now(),lease_until=null where id=p_id and state='failed';
 elsif p_action='summary' then
   perform private.queue_summaries();
 elsif p_action='media-status' then
   select jsonb_build_object('state',state) into result from private.deliveries where dedupe_key='media-delete:'||p_id::text;
 end if;return coalesce(result,'null');
end $$;

create function public.dashboard_report(p_from timestamptz,p_to timestamptz,p_products uuid[] default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.can_access('reports.read') then raise exception 'Permission denied'; end if;
 if p_to<=p_from or p_to-p_from>interval '400 days' then raise exception 'Invalid date range'; end if;
 with filtered as (select * from public.events e where created_at>=p_from and created_at<p_to and (p_products is null or exists(select 1 from public.event_products ep where ep.event_id=e.id and ep.product_id=any(p_products)))),
 metrics as (select count(*) filter(where type='page_view') page_views,count(*) filter(where type='view_item') product_views,
   count(distinct session_id) sessions,count(*) filter(where type='whatsapp_click') whatsapp_clicks,
   count(*) filter(where type='whatsapp_intent_created') intents,count(*) filter(where type='cart_started') carts,
   count(*) filter(where type='add_to_wishlist') favorites,
   count(distinct session_id) filter(where type='view_item') product_sessions,
   count(distinct session_id) filter(where type='whatsapp_click' and session_id in(select session_id from filtered where type='view_item')) converted_sessions from filtered),
 series as(select (created_at at time zone 'America/Belem')::date as day,count(*) filter(where type='view_item') views,count(*) filter(where type='whatsapp_click') clicks from filtered group by 1 order by 1),
 ranking as(select p.id,p.name,p.slug,count(*) filter(where f.type='view_item') views,count(distinct f.session_id) filter(where f.type='view_item') unique_views,count(*) filter(where f.type='whatsapp_click') clicks,count(*) filter(where f.type='add_to_cart') cart,count(*) filter(where f.type='add_to_wishlist') favorites from filtered f join public.event_products ep on ep.event_id=f.id join public.products p on p.id=ep.product_id group by p.id order by views desc limit 50),
 attribution as(select coalesce(s.attribution->>'utm_source','Desconhecida') source,s.attribution->>'utm_campaign' campaign,count(distinct f.session_id) sessions,count(*) filter(where f.type='whatsapp_click') clicks from filtered f left join public.analytics_sessions s on s.id=f.session_id group by 1,2),
 choices as(select data->>'color' color,data->>'size' size,count(*) count from filtered where type='select_variant' group by 1,2)
 select jsonb_build_object('metrics',(select to_jsonb(m) from metrics m),'series',coalesce((select jsonb_agg(to_jsonb(s)) from series s),'[]'),'products',coalesce((select jsonb_agg(to_jsonb(r)) from ranking r),'[]'),'sources',coalesce((select jsonb_agg(to_jsonb(a)) from attribution a),'[]'),'choices',coalesce((select jsonb_agg(to_jsonb(c)) from choices c),'[]'),
 'visitors',(select count(distinct visitor_id) from public.analytics_sessions where id in(select session_id from filtered)),
 'inventory',(select jsonb_build_object('active',(select count(*) from public.products where status='published'),'low',count(*) filter(where active and stock>0 and stock<=low_stock),'out',count(*) filter(where active and stock=0)) from public.variants),
 'sales',(select jsonb_build_object('count',count(*),'total_cents',coalesce(sum(total_cents),0)) from public.sales where created_at>=p_from and created_at<p_to and reversed_at is null)) into result;
 return result;
end $$;

create function public.retention_cleanup() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from private.deliveries where created_at<now()-interval '90 days';
 delete from public.events where created_at<now()-interval '90 days';
 delete from public.analytics_sessions where last_seen_at<now()-interval '90 days';
 delete from public.purchase_intents where created_at<now()-interval '90 days';
 delete from private.rate_limits where expires_at<now()-interval '1 day';
end $$;

revoke all on function public.ingest_event(jsonb),public.integration_admin(text,uuid,jsonb),public.worker_integration(text),public.delivery_jobs(text,uuid,jsonb),public.dashboard_report(timestamptz,timestamptz,uuid[]),public.retention_cleanup() from public,anon,authenticated;
grant execute on function public.ingest_event(jsonb),public.integration_admin(text,uuid,jsonb),public.worker_integration(text),public.delivery_jobs(text,uuid,jsonb),public.retention_cleanup() to service_role;
grant execute on function public.dashboard_report(timestamptz,timestamptz,uuid[]) to authenticated;
