import Link from "next/link";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export default async function Confirm({searchParams}:{searchParams:Promise<{token?:string}>}){const token=(await searchParams).token;let confirmed=false;if(token&&/^[a-f0-9]{64}$/.test(token)){const supabase=await createClient();const hash=createHash("sha256").update(token).digest("hex");const {data}=await supabase.rpc("confirm_trip_subscription",{p_token_hash:hash});confirmed=Boolean(data);}return <main className="readable-surface page-shell my-16 max-w-2xl py-12 text-center"><h1 className="font-serif text-4xl font-semibold text-forest">{confirmed?"Subscription confirmed":"Confirmation link unavailable"}</h1><p className="mt-4 text-stone-600">{confirmed?"You’ll receive the next road journal update.":"This link is invalid, expired, or was already used."}</p><Link href="/" className="button-primary mt-7">Return to the road log</Link></main>}
