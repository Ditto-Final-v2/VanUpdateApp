alter table public.posts
  add column activity_location_name text not null default '';

update public.posts
set activity_location_name = location_name
where trim(activity_location_name) = '';

comment on column public.posts.location_name is
  'Location where the journal entry was made; coordinates and current van position refer to this location.';

comment on column public.posts.activity_location_name is
  'Public location of the day''s main activities; used for article labels and destination journal lists.';

create function public.default_journal_activity_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if nullif(trim(new.activity_location_name), '') is null then
    new.activity_location_name := new.location_name;
  end if;
  return new;
end;
$$;

create trigger posts_default_activity_location
before insert on public.posts
for each row execute function public.default_journal_activity_location();
