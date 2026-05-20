create table "LoginAccount" (
  "id" text primary key default gen_random_uuid()::text,
  "userId" uuid not null references "User"("id") on delete cascade,
  "provider" text not null default 'email',
  "account" text not null,
  "lastLoginAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create unique index "LoginAccount_provider_account_key" on "LoginAccount"("provider", "account");
create index "LoginAccount_userId_idx" on "LoginAccount"("userId");
create index "LoginAccount_account_idx" on "LoginAccount"("account");

alter table "LoginAccount" enable row level security;
