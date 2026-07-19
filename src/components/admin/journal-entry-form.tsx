"use client";

import { useActionState } from "react";
import { publishJournalEntry, type JournalEntryState } from "@/app/admin/posts/new/actions";

const initialState: JournalEntryState = { message: "" };
const metricFields = [
  ["milesWalked", "Miles Walked", "0.1"], ["milesRan", "Miles Ran", "0.1"],
  ["milesBiked", "Miles Biked", "0.1"], ["majorCitiesVisited", "Major Cities Visited", "1"],
  ["newStatesVisited", "New States Visited", "1"], ["newNationalParksVisited", "New National Parks Visited", "1"],
  ["tanksOfGas", "Tanks of Gas", "0.1"],
] as const;

export function JournalEntryForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(publishJournalEntry, initialState);
  return <form action={formAction} className="mt-8 grid gap-5 border-2 border-forest bg-white p-5 shadow-[5px_5px_0_#1f352d] sm:grid-cols-2 sm:p-7">
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
    <div className="sm:col-span-2"><label className="form-label" htmlFor="body">Body</label><textarea className="form-input mt-2 min-h-72 resize-y" id="body" name="body" required placeholder="Write the day’s story…" /></div>
    {state.message && <p role="alert" className="border-2 border-red-800 bg-red-50 p-3 text-sm font-bold text-red-900 sm:col-span-2">{state.message}</p>}
    <div className="sm:col-span-2"><button className="button-primary" type="submit" disabled={pending}>{pending ? "Publishing…" : "Publish journal entry"}</button></div>
  </form>;
}

function Field({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <div><label className="form-label" htmlFor={props.name}>{label}</label><input {...props} id={props.name} className="form-input mt-2" />{hint && <p className="mt-1 text-xs text-stone-600">{hint}</p>}</div>;
}
