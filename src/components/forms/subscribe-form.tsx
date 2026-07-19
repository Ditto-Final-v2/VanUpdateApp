"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { subscribeSchema } from "@/validation/forms";

export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [error, setError] = useState(""); const [submitted, setSubmitted] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const result = subscribeSchema.safeParse({ name: data.get("name") || undefined, email: data.get("email") }); if (!result.success) { setError(result.error.issues[0]?.message ?? "Check your details."); return; } setError(""); setSubmitted(true); event.currentTarget.reset(); }
  if (submitted) return <div role="status" className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 text-forest"><CheckCircle2 className="mt-0.5 shrink-0 text-sage" /><div><p className="font-bold">You’re on the list.</p><p className="mt-1 text-sm text-stone-600">Prototype only—no email was stored or sent.</p></div></div>;
  return <form onSubmit={submit} noValidate className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end"}>
    <div><label htmlFor={compact ? "prompt-name" : "subscribe-name"} className="form-label">Name <span className="font-normal text-stone-500">(optional)</span></label><input id={compact ? "prompt-name" : "subscribe-name"} name="name" autoComplete="name" className="form-input" placeholder="Curtis" /></div>
    <div><label htmlFor={compact ? "prompt-email" : "subscribe-email"} className="form-label">Email address</label><input id={compact ? "prompt-email" : "subscribe-email"} name="email" type="email" required autoComplete="email" className="form-input" placeholder="you@example.com" aria-describedby={error ? "subscribe-error" : undefined} /></div>
    <button className="button-primary h-[50px]" type="submit">Keep me posted</button>
    {error && <p id="subscribe-error" role="alert" className="text-sm font-medium text-red-800 sm:col-span-full">{error}</p>}
  </form>;
}
