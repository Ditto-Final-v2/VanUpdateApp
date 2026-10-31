create table public.halloween_event (
 id integer primary key check (id = 1),
 location text not null default 'Poinsettia Mine',
 information text not null default 'Halloween underground. Join Curtis at the mine and the Dallas watch party for a night on the abandoned side of Road & Country.',
 nuggets integer not null default 0 check(nuggets >= 0),
 goal integer not null default 100 check(goal > 0),
 chat_open boolean not null default true
);
insert into public.halloween_event(id) values (1);
create table public.halloween_messages (
 id bigint generated always as identity primary key,
 name text not null check(char_length(name) between 1 and 40),
 message text not null check(char_length(message) between 1 and 500),
 created_at timestamptz not null default now()
);
alter table public.halloween_event enable row level security;
alter table public.halloween_messages enable row level security;
-- All access goes through the server route and service role; no public write policies.
