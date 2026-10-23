-- Anonymous daily totals, retained independently of consented visitor identifiers.
create table public.analytics_archive(day date primary key,page_views bigint not null,product_views bigint not null,whatsapp_clicks bigint not null,intents bigint not null);
alter table public.analytics_archive enable row level security;
grant select on public.analytics_archive to authenticated;
create policy archive_read on public.analytics_archive for select to authenticated using(public.can_access('reports.read'));
create or replace function public.retention_cleanup() returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7234921);
 insert into public.analytics_archive
 select (created_at at time zone 'America/Belem')::date,count(*) filter(where type='page_view'),count(*) filter(where type='view_item'),count(*) filter(where type='whatsapp_click'),count(*) filter(where type='whatsapp_intent_created')
 from public.events where (created_at at time zone 'America/Belem')::date < (now() at time zone 'America/Belem')::date-90 group by 1
 on conflict(day) do update set page_views=analytics_archive.page_views+excluded.page_views,product_views=analytics_archive.product_views+excluded.product_views,whatsapp_clicks=analytics_archive.whatsapp_clicks+excluded.whatsapp_clicks,intents=analytics_archive.intents+excluded.intents;
 delete from public.events where (created_at at time zone 'America/Belem')::date < (now() at time zone 'America/Belem')::date-90;
 delete from public.analytics_sessions s where last_seen_at<now()-interval '90 days' and not exists(select 1 from public.events e where e.session_id=s.id);
 delete from public.purchase_intents where created_at<now()-interval '90 days';
 delete from private.deliveries where created_at<now()-interval '90 days' and state in('delivered','failed');
 delete from private.rate_limits where expires_at<now()-interval '1 day';
 delete from public.analytics_archive where day<(now() at time zone 'America/Belem')::date-interval '13 months';
end $$;
alter function public.dashboard_report(timestamptz,timestamptz,uuid[]) rename to dashboard_report_raw;
revoke all on function public.dashboard_report_raw(timestamptz,timestamptz,uuid[]) from public,anon,authenticated;
create function public.dashboard_report(p_from timestamptz,p_to timestamptz,p_products uuid[] default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.dashboard_report_raw(p_from,p_to,p_products);
 return result||jsonb_build_object('archive',case when p_products is not null then '[]'::jsonb else coalesce((select jsonb_agg(to_jsonb(a) order by day) from public.analytics_archive a where day>=(p_from at time zone 'America/Belem')::date and day<(p_to at time zone 'America/Belem')::date),'[]'::jsonb) end);
end $$;
revoke all on function public.dashboard_report(timestamptz,timestamptz,uuid[]) from public,anon;
grant execute on function public.dashboard_report(timestamptz,timestamptz,uuid[]) to authenticated;
