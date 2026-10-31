-- Grant only the operations used by the server route. Public clients retain no access.
grant select, update on public.halloween_event to service_role;
grant select, insert, delete on public.halloween_messages to service_role;
grant usage, select on sequence public.halloween_messages_id_seq to service_role;
