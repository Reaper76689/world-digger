create type "PostFeedbackType" as enum ('confirmed', 'outdated');

alter table "Post"
  add column "statusTag" text not null default '一般',
  add column "confirmsCount" integer not null default 0,
  add column "outdatedCount" integer not null default 0;

create index "Post_status_expiresAt_createdAt_idx" on "Post"("status", "expiresAt", "createdAt");

create table "PostFeedback" (
  "id" text primary key,
  "postId" text not null references "Post"("id") on delete cascade,
  "userId" uuid not null references "User"("id") on delete cascade,
  "type" "PostFeedbackType" not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index "PostFeedback_postId_userId_key" on "PostFeedback"("postId", "userId");
create index "PostFeedback_postId_type_idx" on "PostFeedback"("postId", "type");
create index "PostFeedback_userId_idx" on "PostFeedback"("userId");

alter table "PostFeedback" enable row level security;

create policy "Users can read post feedback" on "PostFeedback"
  for select using (true);

create policy "Users can create own post feedback" on "PostFeedback"
  for insert to authenticated with check (auth.uid() = "userId");

create policy "Users can update own post feedback" on "PostFeedback"
  for update to authenticated using (auth.uid() = "userId") with check (auth.uid() = "userId");

drop policy if exists "Users can create own pending posts" on "Post";

create policy "Users can create own realtime posts" on "Post"
  for insert to authenticated with check (
    auth.uid() = "authorId"
    and status in ('pending', 'approved')
    and "expiresAt" > current_timestamp
  );

create or replace function public.submit_post(
  p_campus_id text,
  p_spot_id text,
  p_text text,
  p_image_urls text[] default array[]::text[],
  p_status_tag text default '一般'
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

  insert into "Post" ("campusId", "spotId", "authorId", text, "imageUrls", "statusTag", status, "expiresAt")
  values (
    p_campus_id,
    p_spot_id,
    v_author_id,
    p_text,
    coalesce(p_image_urls, array[]::text[]),
    p_status_tag,
    'approved',
    current_timestamp + interval '24 hours'
  )
  returning * into v_post;

  return v_post;
end;
$$;

grant execute on function public.submit_post(text, text, text, text[], text) to authenticated;
