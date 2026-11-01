import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import type {NextRequest} from 'next/server';
import {getCurrentAdmin} from '@/lib/auth/admin';

export function halloweenSessionSecret(){
 if(process.env.HALLOWEEN_SESSION_SECRET)return process.env.HALLOWEEN_SESSION_SECRET;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 return key?createHmac('sha256',key).update('road-country:halloween-session:v1').digest('hex'):null;
}
export function signHalloweenSession(value:string){
 const secret=halloweenSessionSecret();
 if(!secret)throw Error('Session signing is not configured.');
 return createHmac('sha256',secret).update(value).digest('hex');
}
export function halloweenRole(req:NextRequest){
 const [role,expires,signature]=(req.cookies.get('halloween')?.value||'').split('.');
 if(!halloweenSessionSecret()||!['host','admin'].includes(role)||!signature||!Number.isFinite(Number(expires))||Number(expires)<Date.now())return '';
 const expected=signHalloweenSession(`${role}.${expires}`);
 return Buffer.byteLength(signature)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected))?role:'';
}

export async function resolveHalloweenRole(req:NextRequest){
 const signed=halloweenRole(req);
 if(signed==='admin')return signed;
 if(req.cookies.getAll().some(cookie=>cookie.name.startsWith('sb-')&&cookie.name.includes('-auth-token'))){
  try{if(await getCurrentAdmin())return 'admin';}catch{/* Fail closed if website sign-in cannot be verified. */}
 }
 return signed;
}
