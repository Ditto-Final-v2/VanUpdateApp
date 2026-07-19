"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { journalEntrySchema } from "@/validation/forms";

export interface JournalEntryState { message: string }

function makeSlug(title: string) {
  const base = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "road-entry";
  return `${base}-${Date.now().toString(36)}`;
}

export async function publishJournalEntry(
  _previousState: JournalEntryState,
  formData: FormData,
): Promise<JournalEntryState> {
  await requireAdmin();
  const parsed = journalEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the entry details." };

  const value = parsed.data;
  const photoPaths = formData.getAll("uploadedPhotoPath").filter((path): path is string => typeof path === "string");
  const coverPhotoPath = formData.get("coverPhotoPath");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_journal_entry_with_photos", {
    p_slug: makeSlug(value.title),
    p_title: value.title,
    p_entry_date: value.entryDate,
    p_location_name: value.locationName,
    p_van_mileage: value.vanMileage,
    p_miles_walked: value.milesWalked,
    p_miles_ran: value.milesRan,
    p_miles_biked: value.milesBiked,
    p_major_cities_visited: value.majorCitiesVisited,
    p_new_states_visited: value.newStatesVisited,
    p_new_national_parks_visited: value.newNationalParksVisited,
    p_tanks_of_gas: value.tanksOfGas,
    p_notification_hook: value.notificationHook,
    p_body: value.body,
    p_send_notification: value.sendNotification,
    p_photo_paths: photoPaths,
    p_cover_photo_path: typeof coverPhotoPath === "string" && coverPhotoPath ? coverPhotoPath : null,
  });

  if (error) return { message: error.message };
  const postId = data?.[0]?.post_id;
  if (postId) {
    const { error: locationError } = await supabase.from("posts").update({ latitude:value.latitude, longitude:value.longitude, loop_number:value.loopNumber }).eq("id",postId);
    if (locationError) return { message:locationError.message };
    const {data:latest}=await supabase.from("posts").select("id").eq("status","published").order("entry_date",{ascending:false}).order("published_at",{ascending:false}).limit(1).maybeSingle();
    if(latest?.id===postId)await supabase.from("trips").update({ current_location_name:value.locationName,current_latitude:value.latitude,current_longitude:value.longitude,active_loop:value.loopNumber }).eq("status","active");
  }
  revalidatePath("/");
  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}
