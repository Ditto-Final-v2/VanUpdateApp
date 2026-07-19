"use server";

import { createHash,randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { subscribeSchema } from "@/validation/forms";
import { sendEmail } from "@/lib/email";

export interface SubscribeState{message:string;success:boolean}
export async function subscribe(_state:SubscribeState,formData:FormData):Promise<SubscribeState>{const parsed=subscribeSchema.safeParse({name:formData.get("name")||undefined,email:formData.get("email")});if(!parsed.success)return{message:parsed.error.issues[0]?.message??"Check your details.",success:false};const token=randomBytes(32).toString("hex");const hash=createHash("sha256").update(token).digest("hex");const supabase=await createClient();const {error}=await supabase.rpc("subscribe_to_trip",{p_email:parsed.data.email,p_name:parsed.data.name??"",p_confirmation_token_hash:hash});if(error)return{message:"Subscription could not be saved. Please try again.",success:false};const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";const result=await sendEmail(parsed.data.email,"Confirm your road-trip updates",`<h1>One quick confirmation</h1><p>Confirm that you want new road journal entries by email.</p><p><a href="${siteUrl}/subscribe/confirm?token=${token}">Confirm subscription</a></p>`);return result.sent?{message:"Check your email and confirm your subscription.",success:true}:{message:"You’re saved as pending. Email delivery is not configured yet, so the trip admin will need to activate you.",success:true};}
