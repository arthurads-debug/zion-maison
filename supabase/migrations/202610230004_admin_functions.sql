create function public.set_product_media(p_product uuid,p_media jsonb) returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; ord int=0;
begin
 if not public.can_access('products.write') then raise exception 'Permission denied'; end if;
 if not exists(select 1 from public.products where id=p_product) then raise exception 'Product not found'; end if;
 delete from public.product_media where product_id=p_product;
 for item in select value from jsonb_array_elements(p_media) loop
  if not exists(select 1 from public.media_assets where id=(item->>'asset_id')::uuid and published) then raise exception 'Unverified media'; end if;
  insert into public.product_media(product_id,asset_id,color,sort_order) values(p_product,(item->>'asset_id')::uuid,nullif(item->>'color',''),ord);ord=ord+1;
 end loop;
end $$;
create function public.set_stock_threshold(p_variant uuid,p_minimum int) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.can_access('stock.write') then raise exception 'Permission denied'; end if;
 update public.variants set low_stock=p_minimum,version=version+1 where id=p_variant;
end $$;
create function public.set_look_items(p_look uuid,p_items jsonb) returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; ord int=0;
begin
 if not public.can_access('content.write') then raise exception 'Permission denied'; end if;
 if not exists(select 1 from public.content_entries where id=p_look and kind='look') then raise exception 'Look not found'; end if;
 delete from public.look_items where look_id=p_look;
 for item in select value from jsonb_array_elements(p_items) loop
  insert into public.look_items(look_id,product_id,x,y,sort_order) values(p_look,(item->>'product_id')::uuid,(item->>'x')::numeric,(item->>'y')::numeric,ord);ord=ord+1;
 end loop;
end $$;
revoke all on function public.set_product_media(uuid,jsonb),public.set_stock_threshold(uuid,int),public.set_look_items(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.set_product_media(uuid,jsonb),public.set_stock_threshold(uuid,int),public.set_look_items(uuid,jsonb) to authenticated;
