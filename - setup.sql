-- Run this once inside Supabase: open your project → SQL Editor → New query
-- → paste all of this → click "Run". It creates the two filing-cabinet
-- drawers your app needs: notes and tests.

create table if not exists notes (
  id text primary key,
  subject text not null,
  title text not null,
  chapter text,
  body text not null,
  created_at bigint not null
);

create table if not exists tests (
  id text primary key,
  subject text not null,
  title text not null,
  duration int not null,
  questions jsonb not null,
  created_at bigint not null
);

-- Allow anyone with your app's public key to read and write.
-- This matches "shared with every student" from your brief.
-- (If you later want to restrict who can post, this is the policy to tighten.)
alter table notes enable row level security;
alter table tests enable row level security;

create policy "public read notes" on notes for select using (true);
create policy "public write notes" on notes for insert with check (true);
create policy "public delete notes" on notes for delete using (true);

create policy "public read tests" on tests for select using (true);
create policy "public write tests" on tests for insert with check (true);
create policy "public delete tests" on tests for delete using (true);
