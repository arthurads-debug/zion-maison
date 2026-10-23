-- Every publication and asset verification must pass through the complete server transaction.
revoke insert,update,delete on public.products,public.product_media,public.media_assets from authenticated;
revoke execute on function public.save_product(jsonb,jsonb),public.set_product_media(uuid,jsonb) from authenticated;

create function public.save_product_complete(p_product jsonb,p_variants jsonb,p_media jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
 if not public.can_access('products.write') then raise exception 'Permission denied'; end if;
 if p_product->>'status'='published' then
   if not exists(select 1 from jsonb_array_elements(p_variants) v where coalesce((v->>'active')::boolean,true)) then raise exception 'Publication requires active variants'; end if;
   if not exists(select 1 from jsonb_array_elements(p_media) m join public.media_assets a on a.id=(m->>'asset_id')::uuid where a.published and a.kind='image') then raise exception 'Publication requires verified image'; end if;
   if exists(select 1 from jsonb_array_elements(p_media) m join public.media_assets a on a.id=(m->>'asset_id')::uuid where a.kind='video' and (a.poster_url is null or a.poster_url='')) then raise exception 'Publication requires video poster'; end if;
 end if;
 pid=public.save_product(p_product,p_variants);
 perform public.set_product_media(pid,p_media);
 return pid;
end $$;
create function public.archive_product(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.can_access('products.write') then raise exception 'Permission denied'; end if;
 update public.products set status='archived',version=version+1,updated_at=now() where id=p_id;
 if not found then raise exception 'Product not found'; end if;
end $$;
create function public.media_metadata(p_id uuid,p_alt text default '',p_poster text default null,p_delete boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare asset public.media_assets;
begin
 if not (public.can_access('products.write') or public.can_access('content.write')) then raise exception 'Permission denied'; end if;
 select * into strict asset from public.media_assets where id=p_id for update;
 if p_delete then
  if exists(select 1 from public.content_entries where body->>'image_url'=asset.url or body->>'mobile_image_url'=asset.url or body->>'video_url'=asset.url or body->>'poster_url'=asset.url) then raise exception 'Asset referenced by content'; end if;
  if exists(select 1 from public.taxonomy where image_url=asset.url) or exists(select 1 from public.site_settings where data->>'logo_url'=asset.url or data->>'icon_url'=asset.url) or exists(select 1 from public.media_assets where poster_url=asset.url) then raise exception 'Asset in use'; end if;
  insert into private.deliveries(provider,dedupe_key,payload) values('storage','media-delete:'||p_id::text,jsonb_build_object('type','storage_delete','data',jsonb_build_object('original_path',asset.original_path,'public_path',asset.public_path,'kind',asset.kind))) on conflict(dedupe_key) do nothing;
  delete from public.media_assets where id=p_id;
 else
  if length(p_alt)>300 or p_poster is not null and p_poster !~ '^https?://' then raise exception 'Invalid metadata'; end if;
  update public.media_assets set alt=p_alt,poster_url=coalesce(p_poster,poster_url) where id=p_id;
 end if;
end $$;
create function private.published_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='published' and (TG_OP='INSERT' or old.status<>'published') then
  insert into public.events(type,product_id,data) values('new_product_published',new.id,jsonb_build_object('name',new.name));
 end if;return new;
end $$;
create trigger product_publication after insert or update of status on public.products for each row execute function private.published_event();
revoke all on function public.save_product_complete(jsonb,jsonb,jsonb),public.archive_product(uuid),public.media_metadata(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.save_product_complete(jsonb,jsonb,jsonb),public.archive_product(uuid),public.media_metadata(uuid,text,text,boolean) to authenticated;
