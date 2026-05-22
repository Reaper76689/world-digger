drop table if exists "PlaceSignal" cascade;

delete from "ModerationAction"
where "targetType" in ('post', 'comment');

delete from "Comment";
delete from "Post";

alter table "Post" drop constraint if exists "Post_placeId_fkey";
drop index if exists "Post_placeId_status_createdAt_idx";
drop index if exists "Place_name_idx";
drop index if exists "Place_lat_lng_idx";

alter table "Place" rename to "Campus";
alter table "Campus" rename column "name" to "displayName";
alter table "Campus" drop column if exists "amapPoiId";
alter table "Campus" drop column if exists "address";
alter table "Campus" drop column if exists "lat";
alter table "Campus" drop column if exists "lng";
alter table "Campus" add column "schoolName" text;
alter table "Campus" add column "campusName" text;
alter table "Campus" add column "level" text;
alter table "Campus" add column "ownership" text;
alter table "Campus" add column "sourceCode" text;

update "Campus"
set
  "schoolName" = "displayName",
  "campusName" = null,
  "level" = '未知',
  "ownership" = '未知',
  "sourceCode" = id
where "schoolName" is null;

delete from "Campus";

alter table "Campus" alter column "schoolName" set not null;
alter table "Campus" alter column "city" set not null;
alter table "Campus" alter column "level" set not null;
alter table "Campus" alter column "ownership" set not null;
alter table "Campus" alter column "sourceCode" set not null;

create unique index "Campus_sourceCode_key" on "Campus"("sourceCode");
create index "Campus_schoolName_idx" on "Campus"("schoolName");
create index "Campus_displayName_idx" on "Campus"("displayName");
create index "Campus_city_idx" on "Campus"("city");

create table "Spot" (
  "id" text primary key,
  "campusId" text not null references "Campus"("id") on delete cascade,
  "name" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index "Spot_campusId_name_key" on "Spot"("campusId", "name");
create index "Spot_campusId_idx" on "Spot"("campusId");
alter table "Spot" enable row level security;

create policy "Anyone can read campuses" on "Campus"
  for select using (true);

create policy "Anyone can read spots" on "Spot"
  for select using (true);

create policy "Authenticated users can create campuses" on "Campus"
  for insert to authenticated with check (true);

create policy "Authenticated users can update campuses" on "Campus"
  for update to authenticated using (true) with check (true);

create policy "Authenticated users can create spots" on "Spot"
  for insert to authenticated with check (true);

alter table "Post" rename column "placeId" to "campusId";
alter table "Post" add column "spotId" text not null;
alter table "Post" add column "expiresAt" timestamp(3) not null default (current_timestamp + interval '24 hours');

alter table "Post"
  add constraint "Post_campusId_fkey" foreign key ("campusId") references "Campus"("id") on delete cascade;

alter table "Post"
  add constraint "Post_spotId_fkey" foreign key ("spotId") references "Spot"("id") on delete restrict;

create index "Post_campusId_status_expiresAt_createdAt_idx" on "Post"("campusId", "status", "expiresAt", "createdAt");
create index "Post_spotId_idx" on "Post"("spotId");

drop policy if exists "Anyone can read places" on "Campus";
drop policy if exists "Authenticated users can create places" on "Campus";
drop policy if exists "Authenticated users can update places" on "Campus";
drop policy if exists "Users can create own pending posts" on "Post";

create policy "Users can create own pending posts" on "Post"
  for insert to authenticated with check (
    auth.uid() = "authorId"
    and status = 'pending'
    and "expiresAt" > current_timestamp
  );

create or replace function public.submit_post(
  p_campus_id text,
  p_spot_id text,
  p_text text,
  p_image_urls text[] default array[]::text[]
)
returns "Post"
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_post "Post";
begin
  v_author_id := auth.uid();
  if v_author_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if not exists (select 1 from "User" where id = v_author_id and status = 'active') then
    raise exception 'User is not allowed to post' using errcode = '28000';
  end if;

  if not exists (select 1 from "Campus" where id = p_campus_id) then
    raise exception 'Campus does not exist' using errcode = 'P0002';
  end if;

  if not exists (select 1 from "Spot" where id = p_spot_id and "campusId" = p_campus_id) then
    raise exception 'Spot does not belong to campus' using errcode = 'P0002';
  end if;

  insert into "Post" ("campusId", "spotId", "authorId", text, "imageUrls", status, "expiresAt")
  values (p_campus_id, p_spot_id, v_author_id, p_text, coalesce(p_image_urls, array[]::text[]), 'pending', current_timestamp + interval '24 hours')
  returning * into v_post;

  return v_post;
end;
$$;

grant execute on function public.submit_post(text, text, text, text[]) to authenticated;
