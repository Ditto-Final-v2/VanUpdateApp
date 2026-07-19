create function public.submit_journal_comment(p_post_id uuid,p_display_name text,p_body text,p_fingerprint_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.posts where id=p_post_id and status='published' and published_at<=now()) then raise exception 'Journal entry not found.';end if;
  if char_length(trim(p_display_name)) not between 2 and 60 or char_length(trim(p_body)) not between 5 and 1200 then raise exception 'Comment details are invalid.';end if;
  if (select count(*) from public.comments where commenter_fingerprint_hash=p_fingerprint_hash and created_at>now()-interval '1 hour')>=5 then raise exception 'Please wait before leaving another comment.';end if;
  insert into public.comments(post_id,display_name,body,status,commenter_fingerprint_hash) values(p_post_id,trim(p_display_name),trim(p_body),'pending',p_fingerprint_hash) returning id into v_id;return v_id;
end $$;
revoke all on function public.submit_journal_comment(uuid,text,text,text) from public;
grant execute on function public.submit_journal_comment(uuid,text,text,text) to anon,authenticated;
