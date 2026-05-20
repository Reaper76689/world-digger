create or replace function public.submit_post(
  p_place_id text,
  p_text text,
  p_image_urls text[] default array[]::text[]
)
returns "Post"
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid := auth.uid();
  v_post "Post";
begin
  if v_author_id is null then
    raise exception 'Please sign in first' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from "User"
    where id = v_author_id and status = 'active'
  ) then
    raise exception 'User does not exist or is banned' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from "Place"
    where id = p_place_id
  ) then
    raise exception 'Place does not exist' using errcode = 'P0002';
  end if;

  insert into "Post" ("placeId", "authorId", text, "imageUrls", status)
  values (p_place_id, v_author_id, p_text, coalesce(p_image_urls, array[]::text[]), 'pending')
  returning * into v_post;

  return v_post;
end;
$$;

revoke all on function public.submit_post(text, text, text[]) from public;
grant execute on function public.submit_post(text, text, text[]) to authenticated;
