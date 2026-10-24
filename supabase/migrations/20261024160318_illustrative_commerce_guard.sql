-- Examples are editable catalog content, never saleable stock. Both commerce
-- RPCs reach this guard before committing their snapshots/events/movements.
create function private.reject_illustrative_commerce()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from jsonb_array_elements(new.items) as item
    join public.products p on p.id = (item->>'product_id')::uuid
    cross join lateral jsonb_array_elements_text(
      case when jsonb_typeof(p.details->'tags') = 'array'
        then p.details->'tags' else '[]'::jsonb end
    ) as tag(value)
    where lower(btrim(tag.value)) = 'ilustrativo'
  ) then
    raise exception 'Peças ilustrativas não estão disponíveis para compra ou venda.';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_illustrative_commerce() from public, anon, authenticated;
create trigger reject_illustrative_intent
before insert on public.purchase_intents
for each row execute function private.reject_illustrative_commerce();
create trigger reject_illustrative_sale
before insert on public.sales
for each row execute function private.reject_illustrative_commerce();
