alter table public.subscribers add column unsubscribe_token uuid not null default gen_random_uuid() unique;

create function public.subscribe_to_trip(p_email text,p_name text,p_confirmation_token_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  insert into public.subscribers(email,name,status,confirmation_token_hash,confirmation_sent_at,source)
  values(lower(trim(p_email)),nullif(trim(p_name),''),'pending',p_confirmation_token_hash,now(),'website')
  on conflict(email) do update set name=coalesce(excluded.name,subscribers.name),status=case when subscribers.status='active' then 'active'::public.subscriber_status else 'pending'::public.subscriber_status end,
    confirmation_token_hash=case when subscribers.status='active' then subscribers.confirmation_token_hash else excluded.confirmation_token_hash end,
    confirmation_sent_at=case when subscribers.status='active' then subscribers.confirmation_sent_at else now() end,
    unsubscribed_at=null
  returning id into v_id; return v_id;
end $$;
revoke all on function public.subscribe_to_trip(text,text,text) from public;
grant execute on function public.subscribe_to_trip(text,text,text) to anon,authenticated;

create function public.confirm_trip_subscription(p_token_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_changed integer;
begin update public.subscribers set status='active',confirmed_at=now(),confirmation_token_hash=null where confirmation_token_hash=p_token_hash and status='pending';get diagnostics v_changed=row_count;return v_changed>0;end $$;
revoke all on function public.confirm_trip_subscription(text) from public;
grant execute on function public.confirm_trip_subscription(text) to anon,authenticated;

create function public.unsubscribe_from_trip(p_token uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_changed integer;
begin update public.subscribers set status='unsubscribed',unsubscribed_at=now() where unsubscribe_token=p_token;get diagnostics v_changed=row_count;return v_changed>0;end $$;
revoke all on function public.unsubscribe_from_trip(uuid) from public;
grant execute on function public.unsubscribe_from_trip(uuid) to anon,authenticated;
