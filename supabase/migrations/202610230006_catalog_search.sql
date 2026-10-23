create table private.product_scores(product_id uuid primary key references public.products(id) on delete cascade,score bigint not null default 0);
insert into private.product_scores(product_id,score) select product_id,sum(case type when 'whatsapp_click' then 5 when 'add_to_cart' then 3 when 'add_to_wishlist' then 2 else 1 end) from public.events where product_id is not null and type in('view_item','whatsapp_click','add_to_cart','add_to_wishlist') group by product_id;
create function private.score_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.product_id is not null and new.type in('view_item','whatsapp_click','add_to_cart','add_to_wishlist') then
  insert into private.product_scores(product_id,score) values(new.product_id,case new.type when 'whatsapp_click' then 5 when 'add_to_cart' then 3 when 'add_to_wishlist' then 2 else 1 end) on conflict(product_id) do update set score=private.product_scores.score+excluded.score;
 end if;return new;
end $$;
create trigger interest_score after insert on public.events for each row execute function private.score_event();
create index product_search_text on public.products using gin(to_tsvector('simple',name||' '||description||' '||coalesce(sku,'')));
create function public.search_catalog(p_filters jsonb default '{}') returns jsonb language sql stable security definer set search_path='' as $$
 with filtered as (
 select p.*,coalesce(s.score,0) score,coalesce(p.promo_cents,p.price_cents) effective_price
 from public.products p left join private.product_scores s on s.product_id=p.id
 where p.status='published'
 and (coalesce(p_filters->>'featured','false')<>'true' or p.featured)
 and (p_filters->'ids' is null or p.id in(select value::uuid from jsonb_array_elements_text(p_filters->'ids')))
 and (coalesce(p_filters->>'category','')='' or exists(select 1 from public.taxonomy t where t.id=p.category_id and t.slug=p_filters->>'category' and t.published))
 and (coalesce(p_filters->>'collection','')='' or exists(select 1 from public.taxonomy t where t.id=p.collection_id and t.slug=p_filters->>'collection' and t.published))
 and (coalesce(p_filters->>'min','')='' or coalesce(p.promo_cents,p.price_cents)>=round((p_filters->>'min')::numeric*100))
 and (coalesce(p_filters->>'max','')='' or coalesce(p.promo_cents,p.price_cents)<=round((p_filters->>'max')::numeric*100))
 and (coalesce(p_filters->>'newest','')<>'true' or p.created_at>=now()-interval '30 days')
 and (coalesce(p_filters->>'q','')='' or p.name||' '||p.description||' '||p.short_description||' '||coalesce(p.sku,'')||' '||coalesce((p.details->'tags')::text,'') ilike '%'||(p_filters->>'q')||'%'
  or exists(select 1 from public.variants v where v.product_id=p.id and v.active and v.color ilike '%'||(p_filters->>'q')||'%')
  or exists(select 1 from public.taxonomy t where t.id in(p.category_id,p.collection_id) and t.published and t.name ilike '%'||(p_filters->>'q')||'%'))
 and ((coalesce(p_filters->>'color','')='' and coalesce(p_filters->>'size','')='' and coalesce(p_filters->>'available','')<>'true') or exists(select 1 from public.variants v where v.product_id=p.id and v.active and (coalesce(p_filters->>'color','')='' or v.color=p_filters->>'color') and (coalesce(p_filters->>'size','')='' or v.size=p_filters->>'size') and (coalesce(p_filters->>'available','')<>'true' or v.stock>0)))
 ),ordered as(select f.*,row_number() over(order by
 case when p_filters->>'sort'='price-asc' then effective_price end asc,
 case when p_filters->>'sort'='price-desc' then effective_price end desc,
 case when p_filters->>'sort'='popular' then score end desc,
 case when p_filters->>'sort'='featured' then sort_order end asc,
 created_at desc,id) position from filtered f),paged as(select * from ordered where position between (greatest(1,least(10000,coalesce(nullif(p_filters->>'page','')::int,1)))-1)*24+1 and greatest(1,least(10000,coalesce(nullif(p_filters->>'page','')::int,1)))*24),
 data as(select position,(to_jsonb(p)-'score'-'effective_price'-'position')||jsonb_build_object(
 'variants',coalesce((select jsonb_agg(to_jsonb(v) order by v.color,v.size) from public.variants v where v.product_id=p.id and v.active),'[]'),
 'media',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'asset_id',a.id,'color',m.color,'sort_order',m.sort_order,'asset',jsonb_build_object('id',a.id,'kind',a.kind,'url',a.url,'poster_url',a.poster_url,'alt',a.alt,'published',a.published,'width',a.width,'height',a.height)) order by m.sort_order) from public.product_media m join public.media_assets a on a.id=m.asset_id where m.product_id=p.id and a.published),'[]')) item from paged p)
 select jsonb_build_object('products',coalesce((select jsonb_agg(item order by position) from data),'[]'),'count',(select count(*) from filtered));
$$;
revoke all on function public.search_catalog(jsonb) from public;
grant execute on function public.search_catalog(jsonb) to anon,authenticated;
