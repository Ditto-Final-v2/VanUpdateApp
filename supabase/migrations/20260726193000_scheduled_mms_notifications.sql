alter type public.notification_status
  add value if not exists 'scheduled' after 'queued';

alter table public.notification_sends
  add column if not exists scheduled_for timestamptz;

create index if not exists notification_scheduled_for_idx
  on public.notification_sends (status, scheduled_for);

comment on column public.notification_sends.scheduled_for is
  'Provider-scheduled delivery time for text/MMS notifications.';
