create policy "Authenticated users can create places" on "Place"
  for insert to authenticated with check (true);

create policy "Authenticated users can update places" on "Place"
  for update to authenticated using (true) with check (true);

create policy "Users can create own pending posts" on "Post"
  for insert to authenticated with check (auth.uid() = "authorId" and status = 'pending');

create policy "Users can create own pending comments" on "Comment"
  for insert to authenticated with check (auth.uid() = "authorId" and status = 'pending');

create policy "Admins can read all posts" on "Post"
  for select to authenticated using (exists (select 1 from "User" u where u.id = auth.uid() and u.role = 'admin'));

create policy "Admins can update posts" on "Post"
  for update to authenticated using (exists (select 1 from "User" u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from "User" u where u.id = auth.uid() and u.role = 'admin'));

create policy "Admins can read all comments" on "Comment"
  for select to authenticated using (exists (select 1 from "User" u where u.id = auth.uid() and u.role = 'admin'));

create policy "Admins can update comments" on "Comment"
  for update to authenticated using (exists (select 1 from "User" u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from "User" u where u.id = auth.uid() and u.role = 'admin'));

create policy "Admins can update users" on "User"
  for update to authenticated using (exists (select 1 from "User" u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from "User" u where u.id = auth.uid() and u.role = 'admin'));

create policy "Admins can insert moderation actions" on "ModerationAction"
  for insert to authenticated with check (exists (select 1 from "User" u where u.id = auth.uid() and u.role = 'admin'));

create policy "Admins can read moderation actions" on "ModerationAction"
  for select to authenticated using (exists (select 1 from "User" u where u.id = auth.uid() and u.role = 'admin'));
