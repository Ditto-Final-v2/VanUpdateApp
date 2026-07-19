"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { journalEditSchema } from "@/validation/forms";

export interface EditPostState { message: string }

export async function updatePost(_state: EditPostState, formData: FormData): Promise<EditPostState> {
  await requireAdmin();
  const parsed = journalEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the entry details." };
  const id = String(formData.get("postId") ?? "");
  const retained = formData.getAll("retainedPhotoPath").filter((value): value is string => typeof value === "string");
  const added = formData.getAll("uploadedPhotoPath").filter((value): value is string => typeof value === "string");
  const cover = formData.get("coverPhotoPath");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("post_photos").select("storage_path").eq("post_id", id);
  const removed = (existing ?? []).map((photo) => photo.storage_path).filter((path) => !retained.includes(path));
  const v = parsed.data;
  const { error } = await supabase.rpc("update_journal_entry", {
    p_post_id:id,p_title:v.title,p_entry_date:v.entryDate,p_location_name:v.locationName,p_van_mileage:v.vanMileage,
    p_miles_walked:v.milesWalked,p_miles_ran:v.milesRan,p_miles_biked:v.milesBiked,p_major_cities_visited:v.majorCitiesVisited,
    p_new_states_visited:v.newStatesVisited,p_new_national_parks_visited:v.newNationalParksVisited,p_tanks_of_gas:v.tanksOfGas,
    p_notification_hook:v.notificationHook,p_body:v.body,p_status:v.status,p_retained_photo_paths:retained,p_new_photo_paths:added,
    p_cover_photo_path:typeof cover === "string" && cover ? cover : null,
  });
  if (error) return { message: error.message };
  const { error:locationError } = await supabase.from("posts").update({latitude:v.latitude,longitude:v.longitude,loop_number:v.loopNumber}).eq("id",id);
  if(locationError)return {message:locationError.message};
  if(v.status==="published") { const {data:latest}=await supabase.from("posts").select("id").eq("status","published").order("entry_date",{ascending:false}).order("published_at",{ascending:false}).limit(1).maybeSingle();if(latest?.id===id)await supabase.from("trips").update({current_location_name:v.locationName,current_latitude:v.latitude,current_longitude:v.longitude,active_loop:v.loopNumber}).eq("status","active"); }
  if (removed.length) await supabase.storage.from("trip-photos").remove(removed);
  revalidatePath("/"); revalidatePath("/admin/posts"); revalidatePath(`/admin/posts/${id}/edit`);
  redirect("/admin/posts");
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("postId") ?? "");
  const supabase = await createClient();
  const { data: photos } = await supabase.from("post_photos").select("storage_path").eq("post_id", id);
  const { error } = await supabase.rpc("delete_journal_entry", { p_post_id:id });
  if (error) redirect(`/admin/posts/${id}/edit?error=${encodeURIComponent(error.message)}`);
  const paths = (photos ?? []).map((photo) => photo.storage_path);
  if (paths.length) await supabase.storage.from("trip-photos").remove(paths);
  const {data:latest}=await supabase.from("posts").select("location_name,latitude,longitude,loop_number").eq("status","published").order("entry_date",{ascending:false}).order("published_at",{ascending:false}).limit(1).maybeSingle();
  if(latest)await supabase.from("trips").update({current_location_name:latest.location_name,current_latitude:latest.latitude,current_longitude:latest.longitude,active_loop:latest.loop_number}).eq("status","active");
  revalidatePath("/"); revalidatePath("/admin/posts");
  redirect("/admin/posts");
}
