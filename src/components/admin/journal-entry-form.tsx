"use client";

import Image from "next/image";
import { useActionState, useEffect, useState, useTransition } from "react";
import { publishJournalEntry, type JournalEntryState } from "@/app/admin/posts/new/actions";
import { createClient } from "@/lib/supabase/client";

const initialState: JournalEntryState = { message: "" };
const metricFields = [
  ["milesWalked", "Miles Walked", "0.1"], ["milesRan", "Miles Ran", "0.1"],
  ["milesBiked", "Miles Biked", "0.1"], ["majorCitiesVisited", "Major Cities Visited", "1"],
  ["newStatesVisited", "New States Visited", "1"], ["newNationalParksVisited", "New National Parks Visited", "1"],
  ["tanksOfGas", "Tanks of Gas", "0.1"],
] as const;

export function JournalEntryForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(publishJournalEntry, initialState);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [, startAction] = useTransition();

  useEffect(() => {
    return () => previews.forEach(URL.revokeObjectURL);
  }, [previews]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setUploadError("");
    setUploading(true);
    try {
      const paths: string[] = [];
      const supabase = createClient();
      const batchId = crypto.randomUUID();
      for (const photo of photos) {
        const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
        const path = `staged/${batchId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("trip-photos").upload(path, photo, { contentType: photo.type, upsert: false });
        if (error) { setUploadError(`Photo upload failed: ${error.message}`); return; }
        paths.push(path);
      }
      const data = new FormData(form);
      data.delete("photos");
      paths.forEach((path) => data.append("uploadedPhotoPath", path));
      if (paths[coverIndex]) data.set("coverPhotoPath", paths[coverIndex]);
      startAction(() => formAction(data));
    } finally {
      setUploading(false);
    }
  }

  function choosePhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 12) { setUploadError("Choose no more than 12 photos per entry."); return; }
    const invalid = selected.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024);
    if (invalid) { setUploadError("Photos must be JPEG, PNG, or WebP and no larger than 15 MB each."); return; }
    setUploadError(""); setPhotos(selected); setPreviews(selected.map((photo) => URL.createObjectURL(photo))); setCoverIndex(0);
  }

  const busy = pending || uploading;
  return <form onSubmit={submit} className="mt-8 grid gap-5 border-2 border-forest bg-white p-5 shadow-[5px_5px_0_#1f352d] sm:grid-cols-2 sm:p-7">
    <Field name="title" label="Title" required />
    <Field name="entryDate" label="Entry Date" type="date" defaultValue={today} required />
    <Field name="locationName" label="Location Name" required />
    <Field name="vanMileage" label="Current Van Mileage" type="number" min="0" step="1" defaultValue="0" hint="Enter 0 to reuse the mileage from your most recent entry." required />
    {metricFields.map(([name, label, step]) => <Field key={name} name={name} label={label} type="number" min="0" step={step} defaultValue="0" required />)}
    <div className="sm:col-span-2"><label className="form-label" htmlFor="notificationHook">Notification Hook</label><input className="form-input mt-2" id="notificationHook" name="notificationHook" maxLength={180} placeholder="A short subject line that makes readers want to open the entry" /></div>
    <label className="flex items-center gap-3 border-2 border-dashed border-sage bg-[#eef1e9] p-4 text-sm font-bold text-forest sm:col-span-2">
      <input className="h-5 w-5 accent-[#344d40]" type="checkbox" name="sendNotification" />
      Send push notification to subscribers when this journal is posted
    </label>
    <fieldset className="border-2 border-dashed border-sage p-4 sm:col-span-2">
      <legend className="px-2 text-sm font-bold uppercase tracking-[.1em] text-forest">Entry photos</legend>
      <label className="button-primary inline-flex cursor-pointer"><span>Choose photos</span><input className="sr-only" type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple onChange={choosePhotos} /></label>
      <p className="mt-2 text-xs text-stone-600">On Android, this opens your camera or photo gallery. Up to 12 photos, 15 MB each.</p>
      {previews.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{previews.map((src, index) => <label key={src} className={`cursor-pointer border-2 p-2 ${coverIndex === index ? "border-forest bg-[#e4eadf]" : "border-stone-300"}`}><span className="relative block aspect-[4/3] overflow-hidden bg-stone-100"><Image src={src} alt={`Selected photo ${index + 1}`} fill unoptimized className="object-cover" /></span><span className="mt-2 flex items-center gap-2 text-xs font-bold text-forest"><input type="radio" name="coverChoice" checked={coverIndex === index} onChange={() => setCoverIndex(index)} /> Main cover</span></label>)}</div>}
    </fieldset>
    <div className="sm:col-span-2"><label className="form-label" htmlFor="body">Body</label><textarea className="form-input mt-2 min-h-72 resize-y" id="body" name="body" required placeholder="Write the day’s story…" /></div>
    {uploadError && <p role="alert" className="border-2 border-red-800 bg-red-50 p-3 text-sm font-bold text-red-900 sm:col-span-2">{uploadError}</p>}
    {state.message && <p role="alert" className="border-2 border-red-800 bg-red-50 p-3 text-sm font-bold text-red-900 sm:col-span-2">{state.message}</p>}
    <div className="sm:col-span-2"><button className="button-primary" type="submit" disabled={busy}>{uploading ? "Uploading photos…" : pending ? "Publishing…" : "Publish journal entry"}</button></div>
  </form>;
}

function Field({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <div><label className="form-label" htmlFor={props.name}>{label}</label><input {...props} id={props.name} className="form-input mt-2" />{hint && <p className="mt-1 text-xs text-stone-600">{hint}</p>}</div>;
}
