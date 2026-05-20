create table if not exists "EmailConfirmationRequest" (
  "emailHash" text primary key,
  "lastRequestedAt" timestamptz not null default now()
);

alter table "EmailConfirmationRequest" enable row level security;

create or replace function public.can_request_email_confirmation(email_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  last_request timestamptz;
begin
  select "lastRequestedAt" into last_request
  from "EmailConfirmationRequest"
  where "emailHash" = email_hash;

  if last_request is not null and last_request > now() - interval '15 minutes' then
    return false;
  end if;

  insert into "EmailConfirmationRequest" ("emailHash", "lastRequestedAt")
  values (email_hash, now())
  on conflict ("emailHash") do update set "lastRequestedAt" = excluded."lastRequestedAt";

  return true;
end;
$$;

grant execute on function public.can_request_email_confirmation(text) to anon, authenticated;
