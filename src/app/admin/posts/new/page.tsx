import { JournalEntryForm } from "@/components/admin/journal-entry-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewPost() {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data: trip } = await supabase
    .from("trips")
    .select("current_van_mileage")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const currentVanMileage = Number(trip?.current_van_mileage ?? 314135);

  return <div><p className="text-xs font-bold uppercase tracking-[.16em] text-terracotta">ROAD_LOG EDITOR</p><h1 className="mt-1 font-serif text-4xl font-semibold text-forest">New journal entry</h1><p className="mt-2 max-w-2xl leading-7 text-stone-600">Publish a road update and add this entry’s mileage, activities, and visited places to the homepage totals.</p><JournalEntryForm today={today} currentVanMileage={currentVanMileage} /></div>;
}
