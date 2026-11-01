'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {FlaskConical,Ghost,ListChecks,Plus,Radio,Settings2} from 'lucide-react';

type Event={location:string;information:string;nuggets:number;goal:number;chat_open:boolean};
type Quest={id:number;description:string;reward:number};
type Data={event:Event;quests:Quest[];playerCount:number};
const endpoint='/api/halloween/admin';
const blankTask={name:'',instructions:'',reward:'100'};
function parts(description:string){const split=description.indexOf(':');return split<0?{name:description,instructions:''}:{name:description.slice(0,split),instructions:description.slice(split+1).trim()};}

export default function AdminControls({onUpdated}:{onUpdated:()=>Promise<void>}){
 const [data,setData]=useState<Data>();
 const [event,setEvent]=useState({location:'',information:''});
 const [goal,setGoal]=useState('');
 const [delta,setDelta]=useState('');
 const [task,setTask]=useState(blankTask);
 const [editing,setEditing]=useState<number|null>(null);
 const [search,setSearch]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [connectionError,setConnectionError]=useState('');
 const [status,setStatus]=useState('');
 const dirtyEvent=useRef(false),dirtyGoal=useRef(false),inFlight=useRef(false);
 const load=useCallback(async()=>{
  const response=await fetch(endpoint,{cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Could not load controls.');
  const next:Data=result;
  setData(next);setConnectionError('');
  if(!dirtyEvent.current)setEvent({location:next.event.location,information:next.event.information});
  if(!dirtyGoal.current)setGoal(String(next.event.goal));
 },[]);
 useEffect(()=>{
  const refresh=()=>{void load().catch(e=>setConnectionError(e instanceof Error?e.message:'Connection lost. Retrying…'));};
  refresh();const timer=setInterval(refresh,5000);return()=>clearInterval(timer);
 },[load]);
 async function save(body:object,message:string,onSaved?:()=>void){
  if(inFlight.current)return;
  inFlight.current=true;setBusy(true);setError('');setStatus('');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Could not save changes.');
   onSaved?.();setStatus(message);
   await Promise.all([load(),onUpdated()]);
  }catch(e){setError(e instanceof Error?e.message:'Could not save changes.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 function edit(quest:Quest){setEditing(quest.id);setTask({...parts(quest.description),reward:String(quest.reward)});document.getElementById('admin-task-form')?.scrollIntoView({behavior:'auto',block:'start'});}
 return <section className="hp-admin-controls" aria-label="Party control room">
  <div className="hp-admin-intro"><div><p className="hp-eyebrow">BEHIND THE SCENES / HALLOWEEN</p><h2><Ghost size={29} aria-hidden="true"/>Run the haunting</h2><p>Keep the party moving. Your changes go live for players and OBS.</p></div><button disabled={busy} onClick={()=>void save({action:'logout'},'Control room locked.')}>Sign out of admin</button></div>
  <nav className="hp-admin-links" aria-label="Control room shortcuts"><a href="#event-controls">Event & counters</a><a href="#quest-controls">Quest desk</a><a href="#party-chat">Live chat</a><a href="/halloweenparty">Party page ↗</a><a href="/halloweenparty/magiquest">MagiQuest ↗</a><a href="/halloweenparty/obs?view=chat">OBS chat ↗</a><a href="/halloweenparty/obs?view=counter">OBS counter ↗</a></nav>
  {connectionError&&<p role="alert" className="hp-alert">{connectionError}</p>}
  {error&&<p role="alert" className="hp-admin-error">{error}</p>}
  {status&&<p role="status" className="hp-admin-success">{status}</p>}
  {!data?<p>Opening the control room…</p>:<>
   <div className="hp-admin-stats"><div><FlaskConical size={20} aria-hidden="true"/><span>Community Mercury Tonic</span><strong>{data.event.nuggets.toLocaleString()}<small>/ {data.event.goal.toLocaleString()}</small></strong></div><div><ListChecks size={20} aria-hidden="true"/><span>Tasks in the pool</span><strong>{data.quests.length}</strong></div><div><Ghost size={20} aria-hidden="true"/><span>Registered players</span><strong>{data.playerCount}</strong></div><div><Radio size={20} aria-hidden="true"/><span>Visitor chat</span><strong>{data.event.chat_open?'Open':'Paused'}</strong><button disabled={busy} onClick={()=>void save({action:'chat',open:!data.event.chat_open},data.event.chat_open?'Visitor chat paused.':'Visitor chat reopened.')}>{data.event.chat_open?'Pause chat':'Reopen chat'}</button></div></div>
   <p className="hp-admin-note">Pausing chat stops visitor messages. Quest gameplay and quest announcements continue.</p>
   <div id="event-controls" className="hp-admin-grid">
    <section className="hp-admin-card"><h3><Settings2 size={20} aria-hidden="true"/>Event board</h3><p>This text appears beside the public streams.</p>
     <form onSubmit={e=>{e.preventDefault();void save({action:'event',...event},'Event information updated.',()=>{dirtyEvent.current=false;});}}><fieldset disabled={busy}><label>Current location<input value={event.location} onChange={e=>{dirtyEvent.current=true;setEvent({...event,location:e.target.value});}} required maxLength={200}/></label><label>Event information<textarea value={event.information} onChange={e=>{dirtyEvent.current=true;setEvent({...event,information:e.target.value});}} maxLength={5000} rows={4}/></label><button>Save event information</button></fieldset></form>
    </section>
    <section className="hp-admin-card"><h3><FlaskConical size={20} aria-hidden="true"/>Tonic controls</h3><p>Adjust the shared counter while keeping player-earned points intact.</p>
     <form onSubmit={e=>{e.preventDefault();void save({action:'goal',goal:Number(goal)},'Community goal updated.',()=>{dirtyGoal.current=false;});}}><fieldset disabled={busy}><label>Community goal<input type="number" min="1" max="1000000" step="1" value={goal} onChange={e=>{dirtyGoal.current=true;setGoal(e.target.value);}} required/></label><button>Save goal</button></fieldset></form>
     <form className="hp-admin-adjust" onSubmit={e=>{e.preventDefault();void save({action:'adjust',delta:Number(delta)},'Community tonic adjustment applied.',()=>setDelta(''));}}><fieldset disabled={busy}><label>Add or subtract community tonics<input type="number" step="1" min="-1000000" max="1000000" value={delta} onChange={e=>setDelta(e.target.value)} placeholder="100 or -100" required/></label><small>Use a positive number to add, a negative number to subtract. Personal player balances stay the same.</small><button>Apply tonic adjustment</button></fieldset></form>
    </section>
   </div>
   <section id="quest-controls" className="hp-admin-quest-desk"><div className="hp-admin-section-heading"><div><p className="hp-eyebrow">NEW MISCHIEF, ON DEMAND</p><h2>Quest desk</h2></div><span>{data.quests.length} tasks</span></div>
    <div className="hp-admin-grid">
     <section id="admin-task-form" className="hp-admin-card"><h3><Plus size={20} aria-hidden="true"/>{editing===null?'Add a new task':`Edit task #${editing}`}</h3><p>{editing===null?'New tasks join the random pool as soon as you save.':'Edits apply to unfinished quests. Previously earned rewards stay saved.'}</p>
      <form onSubmit={e=>{e.preventDefault();void save({action:'quest',...(editing===null?{}:{id:editing}),name:task.name,instructions:task.instructions,reward:Number(task.reward)},editing===null?'Task added to the live quest pool.':'Task updated.',()=>{setTask(blankTask);setEditing(null);});}}><fieldset disabled={busy}><label>Task name<input value={task.name} onChange={e=>setTask({...task,name:e.target.value})} maxLength={100} required placeholder="Mining Horror History"/></label><label>What should the player do? <small>(optional)</small><textarea value={task.instructions} onChange={e=>setTask({...task,instructions:e.target.value})} maxLength={320} rows={3} placeholder="Tell Curtis a fact about Poinsettia Mines"/></label><label>Mercury Tonics awarded<input type="number" min="1" max="1000000" step="1" value={task.reward} onChange={e=>setTask({...task,reward:e.target.value})} required/></label><div className="hp-buttons"><button className="hp-admin-primary">{busy?'Saving…':editing===null?'Add task to pool':'Save task changes'}</button>{editing!==null&&<button type="button" className="hp-admin-secondary" onClick={()=>{setEditing(null);setTask(blankTask);}}>Cancel editing</button>}</div></fieldset></form>
     </section>
     <section className="hp-admin-card"><h3><ListChecks size={20} aria-hidden="true"/>Live task pool</h3><label>Find a task<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks…"/></label><div className="hp-admin-task-list">{data.quests.filter(quest=>quest.description.toLowerCase().includes(search.toLowerCase())).map(quest=><article className="hp-admin-task" key={quest.id}><div><strong>{parts(quest.description).name}</strong>{quest.id===1&&<span className="hp-admin-starting">Starting quest</span>}<p>{parts(quest.description).instructions}</p><span className="hp-admin-reward">{quest.reward.toLocaleString()} Mercury Tonic</span></div><button disabled={busy} onClick={()=>edit(quest)} aria-label={`Edit ${parts(quest.description).name}`}>Edit</button></article>)}</div></section>
    </div>
   </section>
  </>}
 </section>;
}
