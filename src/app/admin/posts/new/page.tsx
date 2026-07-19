import { JournalEntryForm } from "@/components/admin/journal-entry-form";

export default function NewPost() {
  const today = new Date().toISOString().slice(0, 10);
  return <div><p className="text-xs font-bold uppercase tracking-[.16em] text-terracotta">ROAD_LOG EDITOR</p><h1 className="mt-1 font-serif text-4xl font-semibold text-forest">New journal entry</h1><p className="mt-2 max-w-2xl leading-7 text-stone-600">Publish a road update and add this entry’s mileage, activities, and visited places to the homepage totals.</p><JournalEntryForm today={today} /></div>;
}
