-- Preserve the accumulated total while changing the community target.
alter table public.halloween_event alter column goal set default 10000;
update public.halloween_event set goal = 10000 where id = 1;
