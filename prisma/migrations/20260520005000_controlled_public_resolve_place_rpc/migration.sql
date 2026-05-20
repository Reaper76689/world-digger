create or replace function public.resolve_place(
  amap_poi_id text,
  place_name text,
  place_address text,
  place_city text,
  place_lat double precision,
  place_lng double precision
)
returns "Place"
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved "Place";
  resolved_amap_id text;
begin
  if place_name is null or length(trim(place_name)) = 0 then
    raise exception 'place_name is required';
  end if;

  if place_lat < -90 or place_lat > 90 or place_lng < -180 or place_lng > 180 then
    raise exception 'invalid coordinates';
  end if;

  resolved_amap_id := coalesce(nullif(amap_poi_id, ''), place_name || ':' || round(place_lat::numeric, 5)::text || ',' || round(place_lng::numeric, 5)::text);

  insert into "Place" ("amapPoiId", "name", "address", "city", "lat", "lng")
  values (resolved_amap_id, place_name, place_address, place_city, place_lat, place_lng)
  on conflict ("amapPoiId") do update set
    "name" = excluded."name",
    "address" = excluded."address",
    "city" = excluded."city",
    "lat" = excluded."lat",
    "lng" = excluded."lng",
    "updatedAt" = now()
  returning * into resolved;

  return resolved;
end;
$$;

grant execute on function public.resolve_place(text, text, text, text, double precision, double precision) to anon, authenticated;
