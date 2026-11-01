import {NextRequest,NextResponse} from 'next/server';
import {resolveHalloweenRole} from '@/lib/halloween-session';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';

const headers={'Cache-Control':'no-store'};
function fail(message:string,status=400){return NextResponse.json({error:message},{status,headers});}
export async function GET(req:NextRequest){
 if(await resolveHalloweenRole(req)!=='admin')return fail('Admin access required.',403);
 try{
  const db=createAdminClient();
  const [event,quests,players]=await Promise.all([
   db.from('halloween_event').select('*').eq('id',1).single(),
   db.from('halloween_quests').select('id,description,reward').order('id'),
   db.from('halloween_players').select('id',{head:true,count:'exact'}),
  ]);
  if(event.error||quests.error||players.error)throw Error('Could not load control room data.');
  return NextResponse.json({event:event.data,quests:quests.data,playerCount:players.count||0},{headers});
 }catch(e){return fail(e instanceof Error?e.message:'Could not load control room.',503);}
}
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return fail('Invalid origin.',403);
 if(await resolveHalloweenRole(req)!=='admin')return fail('Admin access required.',403);
 try{
  const b=await req.json();
  if(b.action==='logout'){
   if(req.cookies.getAll().some(cookie=>cookie.name.startsWith('sb-')&&cookie.name.includes('-auth-token'))){
    const client=await createClient();
    const {error}=await client.auth.signOut({scope:'local'});
    if(error)throw Error('Could not sign out. Please retry.');
   }
   const response=NextResponse.json({ok:true},{headers});
   response.cookies.set('halloween','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
   return response;
  }
  const db=createAdminClient();
  if(b.action==='quest'){
   const name=typeof b.name==='string'?b.name.trim():'';
   const instructions=typeof b.instructions==='string'?b.instructions.trim():'';
   if(!name||name.length>100||name.includes(':'))throw Error('Enter a task name of up to 100 characters; put instructions in the separate field.');
   if(instructions.length>320)throw Error('Keep instructions within 320 characters.');
   if(!Number.isInteger(b.reward)||b.reward<1||b.reward>1000000)throw Error('Enter a whole-number tonic reward between 1 and 1,000,000.');
   const quest={description:instructions?`${name}: ${instructions}`:name,reward:b.reward};
   if(b.id!==undefined&&(!Number.isInteger(b.id)||b.id<1))throw Error('Invalid task.');
   const result=b.id===undefined?await db.from('halloween_quests').insert(quest).select('id').single():await db.from('halloween_quests').update(quest).eq('id',b.id).select('id').single();
   if(result.error)throw Error('Could not save the task. Please retry.');
  }else if(b.action==='event'){
   if(typeof b.location!=='string'||!b.location.trim()||b.location.length>200||typeof b.information!=='string'||b.information.length>5000)throw Error('Enter a location and event information within the displayed limits.');
   const result=await db.from('halloween_event').update({location:b.location.trim(),information:b.information.trim()}).eq('id',1);
   if(result.error)throw Error('Could not update event information.');
  }else if(b.action==='goal'){
   if(!Number.isInteger(b.goal)||b.goal<1||b.goal>1000000)throw Error('Enter a goal between 1 and 1,000,000.');
   const result=await db.from('halloween_event').update({goal:b.goal}).eq('id',1);
   if(result.error)throw Error('Could not update the goal.');
  }else if(b.action==='chat'){
   if(typeof b.open!=='boolean')throw Error('Choose whether chat is open.');
   const result=await db.from('halloween_event').update({chat_open:b.open}).eq('id',1);
   if(result.error)throw Error('Could not change chat availability.');
  }else if(b.action==='adjust'){
   if(!Number.isInteger(b.delta)||b.delta===0||Math.abs(b.delta)>1000000)throw Error('Enter a nonzero whole-number tonic adjustment.');
   const result=await db.rpc('halloween_adjust_tonic',{p_delta:b.delta});
   if(result.error)throw Error(result.error.message);
  }else throw Error('Unknown control.');
  return NextResponse.json({ok:true},{headers});
 }catch(e){return fail(e instanceof Error?e.message:'Could not save changes.');}
}
