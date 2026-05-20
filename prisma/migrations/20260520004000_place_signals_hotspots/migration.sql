create table if not exists "PlaceSignal" (
  "id" text primary key default gen_random_uuid()::text,
  "placeId" text not null references "Place"("id") on delete cascade,
  "source" text not null,
  "title" text not null,
  "summary" text,
  "url" text,
  "heat" integer not null default 1,
  "occurredAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now()
);

alter table "PlaceSignal" enable row level security;

create index if not exists "PlaceSignal_placeId_heat_occurredAt_idx" on "PlaceSignal"("placeId", "heat", "occurredAt");

create policy "Anyone can read place signals" on "PlaceSignal"
  for select using (true);

create policy "Authenticated users can insert place signals" on "PlaceSignal"
  for insert to authenticated with check (true);
