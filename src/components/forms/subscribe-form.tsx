"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { subscribe,type SubscribeState } from "@/app/subscribe/actions";

export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [state,action,pending]=useActionState(subscribe,{message:"",success:false} as SubscribeState);
  if (state.success) return <div role="status" className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 text-forest"><CheckCircle2 className="mt-0.5 shrink-0 text-sage" /><div><p className="font-bold">You’re on the list.</p><p className="mt-1 text-sm text-stone-600">{state.message}</p></div></div>;
  return <form action={action} noValidate className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-2 sm:items-end"}>
    <div><label htmlFor={compact ? "prompt-name" : "subscribe-name"} className="form-label">Name <span className="font-normal text-stone-500">(optional)</span></label><input id={compact ? "prompt-name" : "subscribe-name"} name="name" autoComplete="name" className="form-input" placeholder="Curtis" /></div>
    <div><label htmlFor={compact ? "prompt-email" : "subscribe-email"} className="form-label">Email address</label><input id={compact ? "prompt-email" : "subscribe-email"} name="email" type="email" required autoComplete="email" className="form-input" placeholder="you@example.com" aria-describedby={state.message ? "subscribe-error" : undefined} /></div>
    <div><label htmlFor={compact ? "prompt-phone" : "subscribe-phone"} className="form-label">Mobile number <span className="font-normal text-stone-500">(optional)</span></label><input id={compact ? "prompt-phone" : "subscribe-phone"} name="phone" type="tel" autoComplete="tel" inputMode="tel" className="form-input" placeholder="(915) 555-0123" /></div>
    <label className="flex h-full items-start gap-2 border-2 border-dotted border-[#71806a] bg-white/55 p-3 text-[.68rem] leading-[1.15rem] text-stone-700"><input name="smsConsent" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" /><span>By checking this optional box, I agree to receive recurring automated Road &amp; Country journal alerts by text/MMS. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help. Consent is not a condition of purchase or email signup. See the <Link href="/terms" className="font-bold underline">Terms</Link> and <Link href="/privacy" className="font-bold underline">Privacy Policy</Link>.</span></label>
    <button className="button-primary h-[50px] sm:col-span-full" type="submit" disabled={pending}>{pending?"Saving…":"Keep me posted"}</button>
    {state.message && <p id="subscribe-error" role="alert" className="text-sm font-medium text-red-800 sm:col-span-full">{state.message}</p>}
  </form>;
}
