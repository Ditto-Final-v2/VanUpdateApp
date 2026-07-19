"use client";

import { FormEvent, useState } from "react";
import { commentSchema } from "@/validation/forms";

const sampleComments = [{ name: "Maya", date: "April 22, 2026", body: "That sunrise sounds worth the early alarm. Safe travels on the next stretch!" }, { name: "Dad", date: "April 22, 2026", body: "Glad the stove eventually cooperated. Great photos." }];

export function Comments() {
  const [errors, setErrors] = useState<Record<string, string>>({}); const [pending, setPending] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = commentSchema.safeParse({ displayName: data.get("displayName"), body: data.get("body") }); if (!result.success) { setErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); return; } setErrors({}); setPending(true); event.currentTarget.reset(); }
  return <section aria-labelledby="comments-heading" className="mt-16 border-t border-stone-200 pt-12"><h2 id="comments-heading" className="font-serif text-3xl font-semibold text-forest">Campfire comments</h2><p className="mt-2 text-stone-600">Leave a note for the road. Comments are reviewed before appearing.</p>
    <div className="mt-8 space-y-5">{sampleComments.map((comment) => <article key={comment.name} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-baseline justify-between gap-3"><h3 className="font-bold text-forest">{comment.name}</h3><time className="text-xs text-stone-500">{comment.date}</time></div><p className="mt-2 leading-7 text-stone-700">{comment.body}</p></article>)}</div>
    {pending ? <div role="status" className="mt-8 rounded-2xl border border-sage/30 bg-[#e9eee5] p-5"><p className="font-bold text-forest">Thanks for leaving a note.</p><p className="mt-1 text-sm text-stone-600">Your comment is pending moderation. This prototype does not store it.</p><button className="mt-4 text-sm font-bold text-terracotta focus-ring" onClick={() => setPending(false)}>Leave another</button></div> :
    <form onSubmit={submit} noValidate className="mt-8 rounded-3xl border border-stone-200 bg-[#f4f0e7] p-5 sm:p-7"><div><label className="form-label" htmlFor="displayName">Display name</label><input className="form-input bg-white" id="displayName" name="displayName" maxLength={60} aria-invalid={!!errors.displayName} />{errors.displayName && <p role="alert" className="mt-1 text-sm text-red-800">{errors.displayName}</p>}</div><div className="mt-4"><label className="form-label" htmlFor="commentBody">Comment</label><textarea className="form-input min-h-32 resize-y bg-white" id="commentBody" name="body" maxLength={1200} aria-invalid={!!errors.body} />{errors.body && <p role="alert" className="mt-1 text-sm text-red-800">{errors.body}</p>}</div><button type="submit" className="button-primary mt-5">Submit for review</button></form>}
  </section>;
}
