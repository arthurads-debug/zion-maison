create schema if not exists private;
revoke all on schema private from public;

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (length(display_name) between 1 and 120),
  role text not null check (role in ('owner','staff')),
  permissions text[] not null default '{}', active boolean not null default true,
  created_at timestamptz not null default now()
);
create function public.can_access(required text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_profiles where user_id=auth.uid() and active and (role='owner' or required=any(permissions)));
$$;
create function private.protect_owner() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(712345);
  if old.role='owner' and old.active and (TG_OP='DELETE' or new.role<>'owner' or not new.active) then
    if not exists(select 1 from public.admin_profiles where role='owner' and active and user_id<>old.user_id) then
      raise exception 'Last active owner must be preserved';
    end if;
  end if;
  if TG_OP='DELETE' then return old; end if;
  return new;
end $$;
create trigger preserve_owner before update or delete on public.admin_profiles for each row execute function private.protect_owner();

create table public.taxonomy (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in('category','collection')),
  name text not null, slug text not null, description text not null default '', image_url text,
  published boolean not null default false, sort_order int not null default 0,
  unique(kind,slug)
);
create table public.products (
  id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 200),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), sku text unique,
  description text not null default '', short_description text not null default '',
  price_cents int not null check(price_cents>=0), promo_cents int check(promo_cents>=0 and promo_cents<price_cents),
  category_id uuid references public.taxonomy(id) on delete set null,
  collection_id uuid references public.taxonomy(id) on delete set null,
  status text not null default 'draft' check(status in('draft','published','archived')),
  featured boolean not null default false, sort_order int not null default 0,
  details jsonb not null default '{}', version int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete restrict,
  sku text unique, color text not null, size text not null, stock int not null default 0 check(stock>=0),
  low_stock int not null default 2 check(low_stock>=0), active boolean not null default true,
  version int not null default 0, unique(product_id,color,size)
);
create table public.media_assets (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in('image','video')),
  original_path text not null, public_path text, url text, poster_url text, alt text not null default '',
  mime text not null, bytes bigint not null check(bytes>=0), width int, height int,
  published boolean not null default false, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.product_media (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete restrict, color text,
  sort_order int not null default 0, unique(product_id,asset_id)
);
create table public.content_entries (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in('hero','section','page','look','video','instagram','campaign')),
  title text not null, slug text not null unique, body jsonb not null default '{}',
  status text not null default 'draft' check(status in('draft','published','archived')), sort_order int not null default 0,
  updated_at timestamptz not null default now()
);
create table public.look_items (
  id uuid primary key default gen_random_uuid(), look_id uuid not null references public.content_entries(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  x numeric check(x between 0 and 100), y numeric check(y between 0 and 100), sort_order int not null default 0,
  unique(look_id,product_id)
);
create table public.site_settings (
  id text primary key check(id='public'), data jsonb not null default '{}', updated_at timestamptz not null default now()
);
insert into public.site_settings(id,data) values('public','{"name":"Zion Maison","announcement":"Enviamos para todo o Brasil","instagram":"https://www.instagram.com/zionmaison_/","whatsapp":"","timezone":"America/Belem"}');

create table public.analytics_sessions (
  id uuid primary key, visitor_id uuid not null, started_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  attribution jsonb not null default '{}'
);
create table public.events (
  id uuid primary key default gen_random_uuid(), type text not null, session_id uuid references public.analytics_sessions(id),
  product_id uuid references public.products(id) on delete set null, variant_id uuid references public.variants(id) on delete set null,
  data jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.purchase_intents (
  id uuid primary key, customer_name text not null, items jsonb not null, total_cents int not null check(total_cents>=0),
  source text not null default '', fingerprint text not null, created_at timestamptz not null default now()
);
create table public.sales (
  id uuid primary key, actor_id uuid not null references auth.users(id), items jsonb not null, total_cents int not null,
  note text not null default '', fingerprint text not null, reversed_at timestamptz, created_at timestamptz not null default now()
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.variants(id),
  delta int not null, reason text not null, actor_id uuid references auth.users(id), sale_id uuid references public.sales(id),
  created_at timestamptz not null default now()
);
create table public.audit_log (
  id bigint generated always as identity primary key, actor_id uuid, entity text not null, entity_id text,
  operation text not null, fields text[] not null default '{}', created_at timestamptz not null default now()
);
create table private.integrations (
  provider text primary key check(provider in('meta','analytics','pushcut','whatsapp')),
  enabled boolean not null default false, config jsonb not null default '{}', secret_ciphertext text,
  last_test_at timestamptz, last_status text not null default 'not_configured', updated_at timestamptz not null default now()
);
create table public.integration_status (
  provider text primary key, enabled boolean not null default false, public_config jsonb not null default '{}',
  status text not null default 'not_configured', last_test_at timestamptz
);
create table private.deliveries (
  id uuid primary key default gen_random_uuid(), provider text not null, event_id uuid references public.events(id),
  dedupe_key text not null unique, state text not null default 'pending' check(state in('pending','processing','delivered','failed','cancelled')),
  attempts int not null default 0, next_attempt_at timestamptz not null default now(), lease_until timestamptz, lease_token uuid,
  payload jsonb not null default '{}', last_code int, last_error text, created_at timestamptz not null default now(), delivered_at timestamptz
);
create table private.rate_limits (key text primary key, count int not null, expires_at timestamptz not null);
create index products_public_order on public.products(status,sort_order,created_at desc);
create index variants_product on public.variants(product_id);
create index events_time_type on public.events(created_at,type);
create index events_product_time on public.events(product_id,created_at);
create index events_session on public.events(session_id);
create index audit_time on public.audit_log(created_at desc);
create index deliveries_ready on private.deliveries(state,next_attempt_at);

create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare record_data jsonb; changed text[];
begin
  if TG_OP='DELETE' then record_data=to_jsonb(old); else record_data=to_jsonb(new); end if;
  select array_agg(key) into changed from jsonb_object_keys(record_data) key
    where key not in('secret_ciphertext','config','customer_name','items','data','body')
    and (TG_OP<>'UPDATE' or (to_jsonb(old)->key) is distinct from (record_data->key));
  insert into public.audit_log(actor_id,entity,entity_id,operation,fields)
    values(coalesce(auth.uid(),nullif(record_data->>'created_by','')::uuid),TG_TABLE_NAME,coalesce(record_data->>'id',record_data->>'user_id',record_data->>'provider'),TG_OP,coalesce(changed,'{}'));
  if TG_OP='DELETE' then return old; end if; return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['admin_profiles','products','variants','taxonomy','media_assets','product_media','content_entries','look_items','site_settings','sales','stock_movements'] loop
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function private.audit_change()',t,t);
  end loop;
end $$;

-- RLS is the final authority; admin UI alone never grants access.
do $$ declare t text; begin
  foreach t in array array['admin_profiles','products','variants','taxonomy','media_assets','product_media','content_entries','look_items','site_settings','analytics_sessions','events','purchase_intents','sales','stock_movements','audit_log','integration_status'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('grant select on public.%I to anon,authenticated',t);
    execute format('grant insert,update,delete on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
grant usage on schema public to anon,authenticated,service_role;
grant usage,select on all sequences in schema public to authenticated,service_role;
grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;

create policy own_profile on public.admin_profiles for select to authenticated using(user_id=auth.uid() or public.can_access('team.write'));
create policy owner_profile_write on public.admin_profiles for all to authenticated using(public.can_access('team.write')) with check(public.can_access('team.write') and (role='owner' or permissions <@ array['products.read','products.write','stock.read','stock.write','content.read','content.write','reports.read']::text[]));
create policy published_products on public.products for select using(status='published' or public.can_access('products.read') or public.can_access('products.write') or public.can_access('stock.read') or public.can_access('stock.write'));
create policy product_writes on public.products for all to authenticated using(public.can_access('products.write')) with check(public.can_access('products.write'));
create policy visible_variants on public.variants for select using(active and exists(select 1 from public.products p where p.id=product_id and p.status='published') or public.can_access('products.read') or public.can_access('products.write') or public.can_access('stock.read') or public.can_access('stock.write'));
-- Direct stock mutation is prohibited even for authenticated staff; use transactional functions.
create policy visible_taxonomy on public.taxonomy for select using(published or public.can_access('content.read') or public.can_access('content.write') or public.can_access('products.write'));
create policy taxonomy_writes on public.taxonomy for all to authenticated using(public.can_access('content.write')) with check(public.can_access('content.write'));
create policy published_content on public.content_entries for select using(status='published' or public.can_access('content.read') or public.can_access('content.write'));
create policy content_writes on public.content_entries for all to authenticated using(public.can_access('content.write')) with check(public.can_access('content.write'));
create policy visible_media on public.media_assets for select using(published or public.can_access('products.write') or public.can_access('content.write'));
create policy media_writes on public.media_assets for all to authenticated using(public.can_access('products.write') or public.can_access('content.write')) with check(public.can_access('products.write') or public.can_access('content.write'));
create policy visible_product_media on public.product_media for select using(exists(select 1 from public.products p where p.id=product_id and p.status='published') or public.can_access('products.write'));
create policy product_media_writes on public.product_media for all to authenticated using(public.can_access('products.write')) with check(public.can_access('products.write'));
create policy visible_look_items on public.look_items for select using(exists(select 1 from public.content_entries c where c.id=look_id and c.status='published') or public.can_access('content.write'));
create policy look_writes on public.look_items for all to authenticated using(public.can_access('content.write')) with check(public.can_access('content.write'));
create policy public_settings on public.site_settings for select using(true);
create policy settings_write on public.site_settings for all to authenticated using(public.can_access('settings.write')) with check(public.can_access('settings.write'));
create policy integration_public_status on public.integration_status for select using(true);
create policy report_events on public.events for select to authenticated using(public.can_access('reports.read'));
create policy report_sessions on public.analytics_sessions for select to authenticated using(public.can_access('reports.read'));
create policy report_intents on public.purchase_intents for select to authenticated using(public.can_access('reports.read'));
create policy stock_sales on public.sales for select to authenticated using(public.can_access('reports.read') or public.can_access('stock.write'));
create policy stock_history on public.stock_movements for select to authenticated using(public.can_access('stock.read') or public.can_access('stock.write'));
create policy history_read on public.audit_log for select to authenticated using(public.can_access('history.read'));

create function public.adjust_stock(p_variant uuid,p_quantity int,p_version int,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare v public.variants;
begin
  if not public.can_access('stock.write') then raise exception 'Permission denied'; end if;
  if p_quantity<0 or length(trim(p_reason))=0 then raise exception 'Invalid adjustment'; end if;
  select * into strict v from public.variants where id=p_variant for update;
  if v.version<>p_version then raise exception 'Stock version conflict'; end if;
  update public.variants set stock=p_quantity,version=version+1 where id=p_variant;
  insert into public.stock_movements(variant_id,delta,reason,actor_id) values(p_variant,p_quantity-v.stock,p_reason,auth.uid());
end $$;

create function public.record_sale(p_key uuid,p_items jsonb,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare item jsonb; v record; snapshots jsonb='[]'; total bigint=0; existing public.sales; fingerprint text;
begin
  if not public.can_access('stock.write') then raise exception 'Permission denied'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'Invalid items'; end if;
  fingerprint=md5(p_items::text || coalesce(p_note,''));
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select * into existing from public.sales where id=p_key;
  if found then
    if existing.fingerprint<>fingerprint or existing.actor_id<>auth.uid() then raise exception 'Idempotency conflict'; end if;
    return existing.id;
  end if;
  -- Stable lock order prevents multi-item deadlocks; merge duplicate lines.
  for item in select jsonb_build_object('variant_id',q.id,'quantity',sum(q.qty)) from
    (select (x->>'variant_id')::uuid id, (x->>'quantity')::int qty from jsonb_array_elements(p_items) x) q group by q.id order by q.id loop
    if (item->>'quantity')::int<1 then raise exception 'Invalid quantity'; end if;
    select va.*,p.name,p.slug,coalesce(p.promo_cents,p.price_cents) price,p.status into strict v
      from public.variants va join public.products p on p.id=va.product_id where va.id=(item->>'variant_id')::uuid for update of va;
    if not v.active or v.stock<(item->>'quantity')::int then raise exception 'Insufficient stock'; end if;
    snapshots=snapshots || jsonb_build_array(jsonb_build_object('variant_id',v.id,'product_id',v.product_id,'name',v.name,'slug',v.slug,'color',v.color,'size',v.size,'quantity',(item->>'quantity')::int,'unit_price_cents',v.price));
    total=total+v.price::bigint*(item->>'quantity')::int;
  end loop;
  if total>2147483647 then raise exception 'Total exceeds supported amount'; end if;
  insert into public.sales(id,actor_id,items,total_cents,note,fingerprint) values(p_key,auth.uid(),snapshots,total,coalesce(p_note,''),fingerprint);
  for item in select value from jsonb_array_elements(snapshots) loop
    update public.variants set stock=stock-(item->>'quantity')::int,version=version+1 where id=(item->>'variant_id')::uuid;
    insert into public.stock_movements(variant_id,delta,reason,actor_id,sale_id) values((item->>'variant_id')::uuid,-(item->>'quantity')::int,'Confirmed sale',auth.uid(),p_key);
  end loop;
  insert into public.events(type,data) values('sale_confirmed',jsonb_build_object('sale_id',p_key,'value',total));
  return p_key;
end $$;

create function public.reverse_sale(p_sale uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.sales; item jsonb;
begin
  if not public.can_access('stock.write') then raise exception 'Permission denied'; end if;
  select * into strict s from public.sales where id=p_sale for update;
  if s.reversed_at is not null then return; end if;
  for item in select value from jsonb_array_elements(s.items) order by value->>'variant_id' loop
    update public.variants set stock=stock+(item->>'quantity')::int,version=version+1 where id=(item->>'variant_id')::uuid;
    insert into public.stock_movements(variant_id,delta,reason,actor_id,sale_id) values((item->>'variant_id')::uuid,(item->>'quantity')::int,'Sale reversal',auth.uid(),p_sale);
  end loop;
  update public.sales set reversed_at=now() where id=p_sale;
end $$;

create function public.save_product(p_product jsonb,p_variants jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid; current_version int; v jsonb; existing public.variants; desired_status text;
begin
  if not public.can_access('products.write') then raise exception 'Permission denied'; end if;
  pid=coalesce((p_product->>'id')::uuid,gen_random_uuid()); desired_status=coalesce(p_product->>'status','draft');
  perform pg_advisory_xact_lock(hashtextextended(pid::text,0));
  select version into current_version from public.products where id=pid for update;
  if found and current_version<>coalesce((p_product->>'version')::int,-1) then raise exception 'Product version conflict'; end if;
  if desired_status='published' and (jsonb_array_length(p_variants)=0 or (p_product->>'price_cents')::int<=0) then raise exception 'Publication requires price and variants'; end if;
  insert into public.products(id,name,slug,sku,description,short_description,price_cents,promo_cents,category_id,collection_id,status,featured,sort_order,details)
    values(pid,p_product->>'name',p_product->>'slug',nullif(p_product->>'sku',''),coalesce(p_product->>'description',''),coalesce(p_product->>'short_description',''),(p_product->>'price_cents')::int,(p_product->>'promo_cents')::int,(p_product->>'category_id')::uuid,(p_product->>'collection_id')::uuid,desired_status,coalesce((p_product->>'featured')::boolean,false),coalesce((p_product->>'sort_order')::int,0),coalesce(p_product->'details','{}'))
    on conflict(id) do update set name=excluded.name,slug=excluded.slug,sku=excluded.sku,description=excluded.description,short_description=excluded.short_description,price_cents=excluded.price_cents,promo_cents=excluded.promo_cents,category_id=excluded.category_id,collection_id=excluded.collection_id,status=excluded.status,featured=excluded.featured,sort_order=excluded.sort_order,details=excluded.details,version=public.products.version+1,updated_at=now();
  for v in select value from jsonb_array_elements(p_variants) loop
    if v->>'id' is not null then
      select * into strict existing from public.variants where id=(v->>'id')::uuid and product_id=pid;
      update public.variants set color=v->>'color',size=v->>'size',sku=nullif(v->>'sku',''),active=coalesce((v->>'active')::boolean,true) where id=existing.id;
    else
      insert into public.variants(product_id,color,size,sku,active,stock,low_stock) values(pid,v->>'color',v->>'size',nullif(v->>'sku',''),coalesce((v->>'active')::boolean,true),0,coalesce((v->>'low_stock')::int,2));
    end if;
  end loop;
  return pid;
end $$;

create function public.create_intent(p_key uuid,p_name text,p_items jsonb,p_source text) returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; v record; snapshots jsonb='[]'; total bigint=0; existing public.purchase_intents; fingerprint text;
begin
  fingerprint=md5(p_items::text||p_name);
  perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  select * into existing from public.purchase_intents where id=p_key;
  if found then
    if existing.fingerprint<>fingerprint then raise exception 'Idempotency conflict'; end if;
    return jsonb_build_object('items',existing.items,'total_cents',existing.total_cents);
  end if;
  for item in select jsonb_build_object('variant_id',q.id,'quantity',sum(q.qty)) from
    (select (x->>'variant_id')::uuid id,(x->>'quantity')::int qty from jsonb_array_elements(p_items) x) q group by q.id order by q.id loop
    select va.*,p.name,p.slug,coalesce(p.promo_cents,p.price_cents) price,p.status into strict v
      from public.variants va join public.products p on p.id=va.product_id where va.id=(item->>'variant_id')::uuid;
    if v.status<>'published' or not v.active or (item->>'quantity')::int<1 or v.stock<(item->>'quantity')::int then raise exception 'Selection unavailable'; end if;
    snapshots=snapshots || jsonb_build_array(jsonb_build_object('variant_id',v.id,'product_id',v.product_id,'name',v.name,'slug',v.slug,'color',v.color,'size',v.size,'quantity',(item->>'quantity')::int,'unit_price_cents',v.price));
    total=total+v.price::bigint*(item->>'quantity')::int;
  end loop;
  if jsonb_array_length(snapshots)=0 or total>2147483647 then raise exception 'Invalid selection'; end if;
  insert into public.purchase_intents(id,customer_name,items,total_cents,source,fingerprint) values(p_key,p_name,snapshots,total,p_source,fingerprint);
  insert into public.events(id,type,data) values(p_key,'whatsapp_intent_created',jsonb_build_object('items',snapshots,'value',total));
  return jsonb_build_object('items',snapshots,'total_cents',total);
end $$;

create function public.consume_rate_limit(p_key text,p_limit int,p_seconds int) returns boolean language plpgsql security definer set search_path='' as $$
declare n int;
begin
  insert into private.rate_limits(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
    on conflict(key) do update set count=case when private.rate_limits.expires_at<=now() then 1 else private.rate_limits.count+1 end,
      expires_at=case when private.rate_limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else private.rate_limits.expires_at end returning count into n;
  return n<=p_limit;
end $$;

create function private.queue_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into private.deliveries(provider,event_id,dedupe_key,payload)
    select provider,new.id,provider||':'||new.id::text,jsonb_build_object('type',new.type,'event_id',new.id,'data',new.data,'created_at',new.created_at)
    from private.integrations where enabled and provider='pushcut' and config->'events' ? new.type
      and coalesce(config->>'mode','individual')='individual'
    on conflict(dedupe_key) do nothing;
  return new;
end $$;
create trigger queue_events after insert on public.events for each row execute function private.queue_event();
create function private.stock_alert() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.stock=0 and old.stock>0 then insert into public.events(type,product_id,variant_id,data) values('product_out_of_stock',new.product_id,new.id,jsonb_build_object('stock',new.stock));
  elsif new.stock>0 and new.stock<=new.low_stock and old.stock>old.low_stock then insert into public.events(type,product_id,variant_id,data) values('product_low_stock',new.product_id,new.id,jsonb_build_object('stock',new.stock)); end if;
  return new;
end $$;
create trigger stock_alert after update of stock on public.variants for each row execute function private.stock_alert();

-- PostgreSQL grants EXECUTE to PUBLIC by default; explicitly revoke every privileged function.
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.adjust_stock(uuid,int,int,text),public.record_sale(uuid,jsonb,text),public.reverse_sale(uuid),public.save_product(jsonb,jsonb),public.create_intent(uuid,text,jsonb,text),public.consume_rate_limit(text,int,int) from public,anon,authenticated;
grant execute on function public.adjust_stock(uuid,int,int,text),public.record_sale(uuid,jsonb,text),public.reverse_sale(uuid),public.save_product(jsonb,jsonb) to authenticated;
grant execute on function public.create_intent(uuid,text,jsonb,text),public.consume_rate_limit(text,int,int) to service_role;
grant execute on function public.can_access(text) to anon,authenticated,service_role;
