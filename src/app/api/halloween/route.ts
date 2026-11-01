import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import {halloweenSessionSecret as sessionSecret,signHalloweenSession as sign,resolveHalloweenRole as role} from '@/lib/halloween-session';
import { createAdminClient } from '@/lib/supabase/admin';
const defaults = {location:'Poinsettia Mine',information:'Halloween underground. Join Curtis at the mine and the Dallas watch party for a night on the abandoned side of Road & Country.',nuggets:0,goal:10000,chat_open:true};
function playbackUrl(value:string,muted:boolean){if(!value)return '';try{const url=new URL(value);url.searchParams.set('muted',String(muted));return url.toString();}catch{return '';}}
function streams(){return [{id:'curtis',name:'Curtis · Poinsettia Mine',url:playbackUrl(process.env.HALLOWEEN_CURTIS_PLAYER_URL || '',false)},{id:'dallas',name:'Dallas · Watch party',url:playbackUrl(process.env.HALLOWEEN_DALLAS_PLAYER_URL || '',true)}];}
export async function GET(req:NextRequest){
 let event=defaults,messages:unknown[]=[];let configured=false;
 try{const db=createAdminClient();const [a,b]=await Promise.all([db.from('halloween_event').select('*').eq('id',1).single(),db.from('halloween_messages').select('*').order('id',{ascending:false}).limit(100)]);if(a.error||b.error)throw Error();event=a.data;messages=(b.data || []).reverse();configured=true;}catch{}
 return NextResponse.json({event,messages,streams:streams(),role:await role(req),configured},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 try{
 const b=await req.json();const r=await role(req);
 if(b.action==='login'){
 if(!sessionSecret())throw Error('Set HALLOWEEN_SESSION_SECRET in the website hosting settings to enable login.');
 const password=b.role==='admin'?process.env.HALLOWEEN_ADMIN_PASSWORD:b.role==='host'?process.env.HALLOWEEN_HOST_PASSWORD:undefined;
 const valid=typeof password==='string'&&password.length>=16&&typeof b.password==='string'&&Buffer.byteLength(b.password)===Buffer.byteLength(password)&&timingSafeEqual(Buffer.from(b.password),Buffer.from(password));
 if(!valid)return NextResponse.json({error:'Incorrect password'},{status:401});
 const value=`${b.role}.${Date.now()+12*3600*1000}`;const res=NextResponse.json({ok:true});res.cookies.set('halloween',`${value}.${sign(value)}`,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:43200});return res;
 }
 if(b.action==='broadcast'){
 return NextResponse.json({error:'Use the private broadcaster at /halloween/dallas.'},{status:410,headers:{'Cache-Control':'no-store'}});
 }
 const db=createAdminClient();
 if(b.action==='message'){
 const {data,error}=await db.from('halloween_event').select('chat_open').eq('id',1).single();if(error||!data?.chat_open)throw Error('Chat is closed.');
 const last=Number(req.cookies.get('halloween_chat')?.value || 0);if(Date.now()-last<3000)throw Error('Please wait a moment between messages.');
 const name=String(b.name || '').trim().slice(0,40),message=String(b.message || '').trim().slice(0,500);if(!name||!message)throw Error('Enter your name and message.');
 const result=await db.from('halloween_messages').insert({name,message});if(result.error)throw Error('Could not send message.');const res=NextResponse.json({ok:true});res.cookies.set('halloween_chat',String(Date.now()),{httpOnly:true,sameSite:'strict',path:'/'});return res;
 }
 if(r!=='admin')return NextResponse.json({error:'Admin access required'},{status:403});
 if(b.action==='update'){
 if(!Number.isInteger(b.nuggets)||b.nuggets<0||b.nuggets>1000000||!Number.isInteger(b.goal)||b.goal<1||b.goal>1000000)throw Error('Enter valid Mercury Tonic totals and a positive goal.');
 const {error}=await db.from('halloween_event').update({location:String(b.location).slice(0,200),information:String(b.information).slice(0,5000),nuggets:b.nuggets,goal:b.goal,chat_open:!!b.chat_open}).eq('id',1);if(error)throw Error('Could not save event.');
 }else if(b.action==='delete'){const {error}=await db.from('halloween_messages').delete().eq('id',b.id);if(error)throw Error('Could not delete message.');}else throw Error('Unknown action');
 return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Request failed'},{status:400});}
}
