create table public.halloween_quests (
 id integer primary key,
 description text not null,
 reward integer not null check (reward > 0)
);
insert into public.halloween_quests (id,description,reward) values
 (1,'Possess a fellow party goer: take a clothespin and secretly pin it on someone''s costume',100),
 (2,'Ghostly Gaslight: go up to Mitchell and say approximately "I''m glad you''re here tonight, I was worried that with what happened that you may not make it" DENY everything!',200),
 (3,'Seduce the Spirits: show off your costume to the camera',100),
 (4,'Dance with the Demons: request a song',50),
 (5,'Capture a Soul: take a photo with someone you don''t know - send the photo to Curtis',200),
 (6,'Moving Memory Book: take B-Roll of the party and send it to Curtis',250),
 (7,'Tribal Dance: go all out and dance hard to one song',150),
 (8,'Soul Suck: Get someone to tell you a story about themselves, then go tell Curtis that story',250),
 (9,'Slasher Screenshot: stage a photo of a horror character committing murder - send it to Curtis',250),
 (10,'Exotic Elixir: Finish your drink - alcoholic or not :)',50),
 (11,'Making an Offering: do a kind gesture for the party hosts',150),
 (12,'Howl: go howl at the moon',100),
 (13,'Found Footage: Film a short vlog clip of yourself at the party - send it to Curtis',200),
 (14,'Trick or Treat: go enjoy a piece of candy',50),
 (15,'Spidey!: ask Curtis about Spidey.',100),
 (16,'Convine with Ghosts: Ask Curtis to tell you a tale',150),
 (17,'Regretful Reminiscing: send/tell Curtis about something that used to scare you as a kid',150),
 (18,'Scream and Tell: Send Curtis a picture of your favorite Halloween costume you''ve done',150),
 (19,'Spooky Sounds: make a spooky sound at the party in attempts to spook people',100);

create table public.halloween_players (
 id uuid primary key default gen_random_uuid(),
 token_hash text unique not null,
 name text not null check (char_length(name) between 1 and 40),
 intro_seen boolean not null default false,
 tonic integer not null default 0 check (tonic >= 0),
 current_quest integer references public.halloween_quests(id),
 last_command_at timestamptz,
 last_message_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.halloween_completions (
 player_id uuid not null references public.halloween_players(id) on delete cascade,
 quest_id integer not null references public.halloween_quests(id),
 completed_at timestamptz not null default now(),
 primary key (player_id,quest_id)
);
alter table public.halloween_quests enable row level security;
alter table public.halloween_players enable row level security;
alter table public.halloween_completions enable row level security;
grant select on public.halloween_quests, public.halloween_completions to service_role;
grant select, insert, update on public.halloween_players to service_role;

-- Each command holds the player's row lock. Rewards, assignments, and chat
-- announcements commit together, including an atomic community increment.
create function public.halloween_player_action(p_token text, p_action text, p_message text default '', p_expected integer default null)
returns void language plpgsql security definer set search_path = public as $$
declare
 p public.halloween_players%rowtype;
 q public.halloween_quests%rowtype;
 next_id integer;
begin
 select * into p from public.halloween_players where token_hash=p_token for update;
 if not found then raise exception 'Player session expired. Please register again.'; end if;
 if p_action='intro' then
  update public.halloween_players set intro_seen=true where id=p.id;
  return;
 end if;
 if not p.intro_seen then raise exception 'Visit the mine introduction first.'; end if;
 if p_action='message' then
  if not (select chat_open from public.halloween_event where id=1) then raise exception 'Chat is closed.'; end if;
  if p.last_message_at > clock_timestamp()-interval '3 seconds' then raise exception 'Please wait a moment between messages.'; end if;
  if char_length(trim(p_message)) not between 1 and 500 then raise exception 'Enter a message of up to 500 characters.'; end if;
  insert into public.halloween_messages(name,message) values(p.name,trim(p_message));
  update public.halloween_players set last_message_at=clock_timestamp() where id=p.id;
  return;
 end if;
 if p_action not in ('!quest','!done') then raise exception 'Unknown command.'; end if;
 if p.last_command_at > clock_timestamp()-interval '5 seconds' then raise exception 'Wait five seconds between quest actions.'; end if;
 if p_action='!done' then
  if p.current_quest is null then raise exception 'Get a quest first with !quest.'; end if;
  if p_expected is distinct from p.current_quest then raise exception 'Your quest changed. Refresh and try again.'; end if;
  select * into q from public.halloween_quests where id=p.current_quest;
  insert into public.halloween_completions(player_id,quest_id) values(p.id,q.id);
  update public.halloween_players set tonic=tonic+q.reward where id=p.id;
  update public.halloween_event set nuggets=nuggets+q.reward where id=1;
  insert into public.halloween_messages(name,message) values('MagiQuest',p.name || ' completed ' || split_part(q.description,':',1) || ' and earned ' || q.reward || ' Mercury Tonic!');
 elsif p.current_quest is not null then
  return;
 end if;
 if not exists(select 1 from public.halloween_completions where player_id=p.id) then
  next_id:=1;
 else
  select id into next_id from public.halloween_quests where id<>1 and id not in (select quest_id from public.halloween_completions where player_id=p.id) order by random() limit 1;
 end if;
 update public.halloween_players set current_quest=next_id,last_command_at=clock_timestamp() where id=p.id;
 if next_id is null then
  insert into public.halloween_messages(name,message) values('MagiQuest',p.name || ' has completed every quest! The spirits salute you.');
 else
  select * into q from public.halloween_quests where id=next_id;
  insert into public.halloween_messages(name,message) values('MagiQuest',p.name || ' has been given the quest ' || q.description);
 end if;
end;
$$;
revoke all on function public.halloween_player_action(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.halloween_player_action(text,text,text,integer) to service_role;
