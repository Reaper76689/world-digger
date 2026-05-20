alter table "User" enable row level security;
alter table "Place" enable row level security;
alter table "Post" enable row level security;
alter table "Comment" enable row level security;
alter table "ModerationAction" enable row level security;

create policy "Users can read public profiles" on "User"
  for select using (true);

create policy "Users can update own profile" on "User"
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can insert own profile" on "User"
  for insert with check (auth.uid() = id);

create policy "Anyone can read places" on "Place"
  for select using (true);

create policy "Anyone can read approved posts" on "Post"
  for select using (status = 'approved');

create policy "Anyone can read approved comments" on "Comment"
  for select using (status = 'approved');
