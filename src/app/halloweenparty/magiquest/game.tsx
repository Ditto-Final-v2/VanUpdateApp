'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Check,ChevronRight,Flag,FlaskConical,Ghost,Timer} from 'lucide-react';
import Party from '../party';
import AboutMines from '../mines/about-mines';
import '../party.css';

type State={player:{id:string;name:string;intro_seen:boolean;tonic:number;current_quest:number|null;last_command_at:string|null}|null;quest:{id:number;description:string;reward:number}|null;completed:number;totalQuests:number;serverTime:number};
const endpoint='/api/halloween/magiquest';
export default function MagiQuest({introduction=false}:{introduction?:boolean}){
 const router=useRouter();
 const [data,setData]=useState<State>();
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [remaining,setRemaining]=useState(0);
 const expires=useRef(0);
 const inFlight=useRef(false);
 const refresh=useCallback(async()=>{
  const response=await fetch(endpoint,{cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Could not load your player.');
  const next:State=result;
  expires.current=Date.now()+Math.max(0,new Date(next.player?.last_command_at||0).getTime()+5000-next.serverTime);
  setRemaining(Math.max(0,Math.ceil((expires.current-Date.now())/1000)));
  setData(next);
  if(next.player&&!next.player.intro_seen&&!introduction)router.replace('/halloweenparty/mines');
  if(next.player?.intro_seen&&introduction)router.replace('/halloweenparty/magiquest');
 },[introduction,router]);
 useEffect(()=>{
  const load=()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:'Connection lost. Retrying…'));};
  load();const timer=setInterval(load,3000);
  const clock=setInterval(()=>setRemaining(Math.max(0,Math.ceil((expires.current-Date.now())/1000))),250);
  return ()=>{clearInterval(timer);clearInterval(clock);};
 },[refresh]);
 async function act(body:object){
  if(inFlight.current)return;
  inFlight.current=true;setBusy(true);setError('');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Please try again.');
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Please try again.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 if(!data||!data.player||!data.player.intro_seen||introduction)return <div className="hp hp-onboarding"><div className="hp-inner">
  <nav className="hp-nav"><a href="/halloweenparty">R&C / AFTER DARK</a><span>HALLOWEEN MAGIQUEST</span></nav>
  <header className="hp-hero"><h1>{data?.player?'Welcome to Poinsettia Mine':'The spirits are expecting you'}</h1></header>
  {error&&<p className="hp-alert" role="alert">{error}</p>}
  {!data?<p>Contacting the spirits…</p>:!data.player?<form className="hp-panel hp-login" onSubmit={e=>{e.preventDefault();void act({action:'register',name:new FormData(e.currentTarget).get('name')});}}>
   <h2>Join MagiQuest</h2><p>Choose your player name. This device will remember your name, quests, and Mercury Tonic.</p><label>Your name<input name="name" required maxLength={40} autoComplete="nickname"/></label><button disabled={busy}>{busy?'Joining…':'Enter the mine →'}</button>
  </form>:<><AboutMines/><div className="hp-enter"><p>Welcome, {data.player.name}. Your first quest awaits.</p><button disabled={busy} onClick={()=>void act({action:'intro'})}>{busy?'Opening the gates…':'Enter MagiQuest →'}</button></div></>}
 </div></div>;
 const player=data.player;
 const allComplete=data.totalQuests>0&&data.completed>=data.totalQuests;
 const questPanel=<section id="player-quest" className="hp-quest" aria-labelledby="quest-title">
  <div className="hp-quest-heading"><div><p className="hp-eyebrow">A LITTLE MISCHIEF. A LITTLE MAGIC.</p><h2><Ghost size={24} aria-hidden="true"/> MagiQuest</h2></div><span className="hp-quest-player">{player.name}</span></div>
  <div className="hp-quest-stats"><div><span>Your Mercury Tonic</span><strong><FlaskConical size={20} aria-hidden="true"/>{player.tonic.toLocaleString()}</strong></div><div><span>Quests complete</span><strong>{data.completed}<small>/ {data.totalQuests}</small></strong></div></div>
  <progress className="hp-quest-progress" aria-label="Quests completed" value={data.completed} max={data.totalQuests||1}/>
  <div className="hp-quest-mission"><h3 id="quest-title">{data.quest?'Your current !quest':allComplete?'Every quest complete!':data.completed>0?'A new quest awaits':'Your first quest awaits'}</h3>
   <p>{data.quest?.description||(allComplete?'You’ve completed every haunting. The spirits salute you.':'Press !quest to receive your next mission.')}</p>
   {data.quest&&<span className="hp-quest-reward"><FlaskConical size={16} aria-hidden="true"/> +{data.quest.reward} Mercury Tonic</span>}
  </div>
  <button className="hp-quest-action" aria-label={remaining>0?`Quest cooldown: ${remaining} seconds remaining`:busy?'Saving quest':data.quest?'!done':allComplete?'All quests complete':'!quest'} disabled={busy||remaining>0||allComplete} onClick={()=>void act({action:data.quest?'!done':'!quest',questId:data.quest?.id})}>
   {remaining>0?<Timer size={25} aria-hidden="true"/>:data.quest||allComplete?<Check size={25} aria-hidden="true"/>:<Flag size={25} aria-hidden="true"/>}
   <span><strong>{remaining>0?`Wait ${remaining}s`:busy?'Summoning…':data.quest?'!done':allComplete?'All quests complete':'!quest'}</strong><small>{remaining>0?'The spirits need a moment':data.quest?'Complete quest & receive the next':allComplete?'You’ve conquered every haunting':'Get your next mission'}</small></span>
   {!allComplete&&remaining===0&&<ChevronRight size={22} aria-hidden="true"/>}
  </button>
  <small className="hp-quest-help">Complete your mission before pressing !done. Prefer chat? Type !quest or !done.</small>
  {error&&<p className="hp-chat-error" role="alert">{error}</p>}
 </section>;
 return <Party mode="viewer" playerName={player.name} questPanel={questPanel} questId={data.quest?.id} onPlayerRefresh={refresh}/>;
}
