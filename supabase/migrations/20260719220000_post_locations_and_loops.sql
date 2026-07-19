alter table public.posts add column loop_number smallint not null default 1 check (loop_number in (1,2));
