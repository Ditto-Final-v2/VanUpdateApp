create function public.update_journal_photo_details(p_post_id uuid,p_paths text[],p_alt_texts text[],p_captions text[])
returns void language plpgsql security definer set search_path='' as $$
declare i integer;
begin
  if not public.is_admin() then raise exception 'Administrator access is required.';end if;
  if coalesce(array_length(p_paths,1),0)<>coalesce(array_length(p_alt_texts,1),0) or coalesce(array_length(p_paths,1),0)<>coalesce(array_length(p_captions,1),0) then raise exception 'Photo details are incomplete.';end if;
  for i in 1..coalesce(array_length(p_paths,1),0) loop
    update public.post_photos set alt_text=coalesce(nullif(trim(p_alt_texts[i]),''),'Journal photo'),caption=nullif(trim(p_captions[i]),'') where post_id=p_post_id and storage_path=p_paths[i];
  end loop;
end $$;
revoke all on function public.update_journal_photo_details(uuid,text[],text[],text[]) from public;
grant execute on function public.update_journal_photo_details(uuid,text[],text[],text[]) to authenticated;
