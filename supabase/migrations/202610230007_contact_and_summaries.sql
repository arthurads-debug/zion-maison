create table public.event_products(event_id uuid not null references public.events(id) on delete cascade,product_id uuid not null references public.products(id) on delete restrict,primary key(event_id,product_id));
alter table public.event_products enable row level security;
grant select on public.event_products to authenticated;
grant all on public.event_products to service_role;
create policy report_event_products on public.event_products for select to authenticated using(public.can_access('reports.read'));
create index event_products_product on public.event_products(product_id,event_id);
create function private.associate_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.product_id is not null then insert into public.event_products values(new.id,new.product_id) on conflict do nothing; end if;
 if jsonb_typeof(new.data->'items')='array' then
  insert into public.event_products select distinct new.id,(item->>'product_id')::uuid from jsonb_array_elements(new.data->'items') item where item->>'product_id' is not null on conflict do nothing;
 end if;return new;
end $$;
create trigger associate_commercial_event after insert on public.events for each row execute function private.associate_event();
insert into public.event_products select id,product_id from public.events where product_id is not null on conflict do nothing;
insert into public.event_products select distinct e.id,(item->>'product_id')::uuid from public.events e cross join lateral jsonb_array_elements(case when jsonb_typeof(e.data->'items')='array' then e.data->'items' else '[]' end) item where item->>'product_id' is not null on conflict do nothing;

create table private.integration_cursors(provider text primary key references private.integrations(provider),interval_minutes int not null,cursor_at timestamptz not null);
create function private.queue_summaries() returns void language plpgsql security definer set search_path='' as $$
declare integration private.integrations; cursor_row private.integration_cursors; step int; boundary timestamptz; finish timestamptz; batch int; stats jsonb;
begin
 for integration in select * from private.integrations where provider='pushcut' and enabled and config->>'mode'='summary' for update loop
  step=60*coalesce((integration.config->>'interval_minutes')::int,15);boundary=to_timestamp(floor(extract(epoch from now())/step)*step);
  insert into private.integration_cursors(provider,interval_minutes,cursor_at) values(integration.provider,step/60,to_timestamp(floor(extract(epoch from integration.updated_at)/step)*step)) on conflict(provider) do nothing;
  select * into cursor_row from private.integration_cursors where provider=integration.provider for update;
  batch=0;
  while cursor_row.cursor_at<boundary and batch<96 loop
   finish=cursor_row.cursor_at+make_interval(secs=>step);
   select jsonb_build_object('sessions',count(*) filter(where type='site_visited'),'whatsapp',count(*) filter(where type='whatsapp_click'),'events',count(*)) into stats from public.events where created_at>=greatest(cursor_row.cursor_at,integration.updated_at) and created_at<finish and integration.config->'events' ? type;
   if (stats->>'events')::int>0 then
    insert into private.deliveries(provider,dedupe_key,payload) values(integration.provider,'summary:'||integration.provider||':'||step||':'||extract(epoch from cursor_row.cursor_at)||':'||extract(epoch from integration.updated_at),jsonb_build_object('type','summary','data',stats,'from',cursor_row.cursor_at,'to',finish)) on conflict(dedupe_key) do nothing;
   end if;
   cursor_row.cursor_at=finish;batch=batch+1;
  end loop;
  update private.integration_cursors set cursor_at=cursor_row.cursor_at where provider=integration.provider;
 end loop;
end $$;
revoke all on function private.associate_event(),private.queue_summaries() from public,anon,authenticated;
