import {createHash,randomBytes} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';

const cookie='halloween_player';
function tokenHash(req:NextRequest){
 const token=req.cookies.get(cookie)?.value;
 return token&&/^[a-f0-9]{64}$/.test(token)?createHash('sha256').update(token).digest('hex'):null;
}
async function findPlayer(req:NextRequest){
 const hash=tokenHash(req);
 if(!hash)return null;
 const {data,error}=await createAdminClient().from('halloween_players').select('id,name,intro_seen,tonic,current_quest,last_command_at').eq('token_hash',hash).maybeSingle();
 if(error)throw Error('MagiQuest is not connected yet. Please try again shortly.');
 return data;
}
export async function GET(req:NextRequest){
 try{
  const player=await findPlayer(req);
  const db=createAdminClient();
  const catalog=await db.from('halloween_quests').select('id',{count:'exact',head:true});
  if(catalog.error)throw Error('Could not load the quest pool.');
  const totalQuests=catalog.count||0;
  let quest=null,completed=0;
  if(player){
   const completion=await db.from('halloween_completions').select('*',{count:'exact',head:true}).eq('player_id',player.id);
   if(completion.error)throw Error('Could not load your progress.');
   completed=completion.count||0;
   if(player.current_quest){
    const result=await db.from('halloween_quests').select('id,description,reward').eq('id',player.current_quest).single();
    if(result.error)throw Error('Could not load your quest.');
    quest=result.data;
   }
  }
  return NextResponse.json({player,quest,completed,totalQuests,serverTime:Date.now()},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not load MagiQuest.'},{status:503});}
}
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 try{
  const body=await req.json();
  const db=createAdminClient();
  if(body.action==='register'){
   const existing=await findPlayer(req);
   if(existing)return NextResponse.json({ok:true});
   const name=typeof body.name==='string'?body.name.trim():'';
   if(!name||name.length>40||/[\u0000-\u001f\u007f]/.test(name))throw Error('Enter a name of 1–40 characters.');
   const token=randomBytes(32).toString('hex');
   const hash=createHash('sha256').update(token).digest('hex');
   const {error}=await db.from('halloween_players').insert({name,token_hash:hash});
   if(error)throw Error('Could not register your player. Please try again shortly.');
   const response=NextResponse.json({ok:true});
   response.cookies.set(cookie,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*365});
   return response;
  }
  const hash=tokenHash(req);
  if(!hash)return NextResponse.json({error:'Register your player first.'},{status:401});
  const message=typeof body.message==='string'?body.message.trim():'';
  let action=body.action;
  if(action==='message'&&['!quest','!done'].includes(message.toLowerCase()))action=message.toLowerCase();
  if(!['intro','message','!quest','!done'].includes(action))throw Error('Unknown action.');
  const {error}=await db.rpc('halloween_player_action',{p_token:hash,p_action:action,p_message:message,p_expected:Number.isInteger(body.questId)?body.questId:null});
  if(error)throw Error(error.message);
  return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not save your action.'},{status:400});}
}
