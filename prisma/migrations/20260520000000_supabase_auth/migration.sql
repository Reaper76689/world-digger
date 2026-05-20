create type "UserStatus" as enum ('active', 'banned');
create type "UserRole" as enum ('user', 'admin');
create type "ContentStatus" as enum ('pending', 'approved', 'rejected', 'hidden');
create type "ModerationTargetType" as enum ('post', 'comment', 'user');
create type "ModerationActionType" as enum ('approve', 'reject', 'hide', 'ban');

create table "User" (
  "id" uuid primary key references auth.users(id) on delete cascade,
  "email" text not null unique,
  "nickname" text not null unique,
  "avatarUrl" text,
  "bio" text,
  "status" "UserStatus" not null default 'active',
  "role" "UserRole" not null default 'user',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "Place" (
  "id" text primary key default gen_random_uuid()::text,
  "amapPoiId" text unique,
  "name" text not null,
  "address" text,
  "city" text,
  "lat" double precision not null,
  "lng" double precision not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "Post" (
  "id" text primary key default gen_random_uuid()::text,
  "placeId" text not null references "Place"("id") on delete cascade,
  "authorId" uuid not null references "User"("id") on delete cascade,
  "text" text not null,
  "imageUrls" text[] not null default array[]::text[],
  "status" "ContentStatus" not null default 'pending',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "Comment" (
  "id" text primary key default gen_random_uuid()::text,
  "postId" text not null references "Post"("id") on delete cascade,
  "authorId" uuid not null references "User"("id") on delete cascade,
  "text" text not null,
  "status" "ContentStatus" not null default 'pending',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table "ModerationAction" (
  "id" text primary key default gen_random_uuid()::text,
  "targetType" "ModerationTargetType" not null,
  "targetId" text not null,
  "action" "ModerationActionType" not null,
  "adminId" uuid not null references "User"("id"),
  "reason" text,
  "createdAt" timestamptz not null default now()
);

create index "Place_name_idx" on "Place"("name");
create index "Place_lat_lng_idx" on "Place"("lat", "lng");
create index "Post_placeId_status_createdAt_idx" on "Post"("placeId", "status", "createdAt");
create index "Post_authorId_idx" on "Post"("authorId");
create index "Comment_postId_status_createdAt_idx" on "Comment"("postId", "status", "createdAt");
create index "Comment_authorId_idx" on "Comment"("authorId");
create index "ModerationAction_targetType_targetId_idx" on "ModerationAction"("targetType", "targetId");
