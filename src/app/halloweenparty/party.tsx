'use client';
import {useState,useEffect,useRef,useCallback} from 'react';
import './party.css';
import ChatComposer from './chat';
import {nameColor} from './name-color';
type Event={location:string;information:string;nuggets:number;goal:number;chat_open:boolean};
type Data={event:Event;messages:{id:number;name:string;message:string}[];streams:{id:string;name:string;url:string}[];role:string;configured:boolean};
export default function Party({mode}:{mode:'viewer'|'host'|'admin'|'monitor'}){
 const [data,setData]=useState<Data>();const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [live,setLive]=useState(false);const [mic,setMic]=useState(true);const [camera,setCamera]=useState(true);
 const [devices,setDevices]=useState<MediaDeviceInfo[]>([]);const [cameraDevice,setCameraDevice]=useState('');const [micDevice,setMicDevice]=useState('');
 const video=useRef<HTMLVideoElement>(null);const media=useRef<MediaStream|null>(null);const peer=useRef<RTCPeerConnection|null>(null);const session=useRef('');
 const attempt=useRef(0);const connectAbort=useRef<AbortController|null>(null);const connectTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const selfWindow=useRef<Window|null>(null);
 const [monitorStream,setMonitorStream]=useState('curtis');
 useEffect(()=>{if(mode==='monitor')setMonitorStream(new URLSearchParams(window.location.search).get('stream')==='dallas'?'dallas':'curtis');},[mode]);
 async function fullscreen(element:HTMLElement|null){
  if(!element)return;
  try{if(document.fullscreenElement)await document.exitFullscreen();else await element.requestFullscreen();}
  catch{setError('Fullscreen is unavailable in this browser. Try opening the stream in a separate window.');}
 }
 function popout(id:string){
  const popup=window.open('/halloweenparty/monitor?stream='+encodeURIComponent(id),'halloween-'+id,'popup,width=1100,height=700');
  if(!popup)setError('Allow pop-ups for this site to open a stream window.');else popup.focus();
 }
 function popoutSelf(){
  if(!media.current){setError('Connect your camera before opening its preview.');return;}
  if(selfWindow.current&&!selfWindow.current.closed){selfWindow.current.focus();return;}
  const popup=window.open('','halloween-self','popup,width=960,height=640');
  if(!popup){setError('Allow pop-ups for this site to open your camera preview.');return;}
  selfWindow.current=popup;
  const doc=popup.document;doc.title='Dallas · Camera preview';
  doc.body.replaceChildren();doc.body.style.cssText='margin:0;background:#10120f;color:#ddd;font:14px Arial;height:100vh;display:flex;flex-direction:column';
  const bar=doc.createElement('div');bar.style.cssText='padding:10px;display:flex;justify-content:space-between;align-items:center';
  const label=doc.createElement('span');label.textContent='Dallas · Self view (muted)';
  const button=doc.createElement('button');button.textContent='Fullscreen';button.onclick=()=>{void doc.documentElement.requestFullscreen().catch(()=>{label.textContent='Use your browser fullscreen control.';});};
  const preview=doc.createElement('video');preview.autoplay=true;preview.muted=true;preview.playsInline=true;preview.srcObject=media.current;preview.style.cssText='width:100%;min-height:0;flex:1;object-fit:contain';
  const note=doc.createElement('p');note.textContent='Keep the host page open to continue broadcasting.';note.style.cssText='padding:0 10px;font-size:12px';
  bar.append(label,button);doc.body.append(bar,preview,note);void preview.play().catch(()=>{});
 }
 const refresh=useCallback(async()=>{try{const r=await fetch('/api/halloween');if(!r.ok)throw Error();setData(await r.json());}catch{setError('Connection lost. Retrying…');}},[]);
 const stop=useCallback(()=>{attempt.current++;connectAbort.current?.abort();connectAbort.current=null;if(connectTimer.current)clearTimeout(connectTimer.current);connectTimer.current=null;if(peer.current)peer.current.onconnectionstatechange=null;peer.current?.close();peer.current=null;media.current?.getTracks().forEach(t=>t.stop());media.current=null;if(session.current){void fetch(session.current,{method:'DELETE'}).catch(()=>{});session.current='';}selfWindow.current?.close();selfWindow.current=null;setLive(false);setBusy(false);},[]);
 useEffect(()=>{void refresh();const timer=setInterval(refresh,3000);return()=>{clearInterval(timer);stop();};},[refresh,stop]);
 async function action(body:object){const r=await fetch('/api/halloween',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw Error(result.error || 'Request failed');return result;}
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();await refresh();}catch(e){setError(e instanceof Error?e.message:'Something went wrong');}finally{setBusy(false);}}
 async function start(){await run(async()=>{
  const currentAttempt=++attempt.current;
  try{
   const {url}=await action({action:'broadcast'});
   if(currentAttempt!==attempt.current)return;
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Use HTTPS and a browser with camera support.');
   connectTimer.current=setTimeout(()=>{if(currentAttempt===attempt.current){stop();setError('Camera permission did not respond. Open this host page in Chrome, Edge, or Firefox and allow camera and microphone access.');}},30000);
   const m=await navigator.mediaDevices.getUserMedia({video:cameraDevice?{deviceId:{exact:cameraDevice}}:true,audio:{...(micDevice?{deviceId:{exact:micDevice}}:{}),echoCancellation:true,noiseSuppression:true}});
   if(currentAttempt!==attempt.current){m.getTracks().forEach(t=>t.stop());return;}
   if(connectTimer.current)clearTimeout(connectTimer.current);connectTimer.current=null;
   void refreshDevices();
   media.current=m;if(video.current)video.current.srcObject=m;
   const pc=new RTCPeerConnection();peer.current=pc;
   m.getTracks().forEach(t=>{pc.addTransceiver(t,{direction:'sendonly'});t.onended=()=>{if(currentAttempt===attempt.current){stop();setError('Camera or microphone disconnected. Reconnect to start again.');}};});
   connectTimer.current=setTimeout(()=>{if(currentAttempt===attempt.current){stop();setError('Cloudflare connection timed out. Please reconnect.');}},30000);
   pc.onconnectionstatechange=()=>{
    if(currentAttempt!==attempt.current)return;
    if(pc.connectionState==='connected'){if(connectTimer.current)clearTimeout(connectTimer.current);connectTimer.current=null;setLive(true);}
    if(['failed','disconnected'].includes(pc.connectionState)){stop();setError('Broadcast disconnected. Reconnect to start again.');}
   };
   const offer=await pc.createOffer();await pc.setLocalDescription(offer);
   const controller=new AbortController();connectAbort.current=controller;
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/sdp'},body:offer.sdp,signal:controller.signal});
   if(!response.ok)throw Error('Cloudflare could not start this broadcast ('+response.status+'). Please retry.');
   const location=response.headers.get('Location');if(location)session.current=new URL(location,url).toString();
   const answer=await response.text();if(currentAttempt!==attempt.current)return;
   await pc.setRemoteDescription({type:'answer',sdp:answer});setMic(true);setCamera(true);
  }catch(e){
   if(currentAttempt!==attempt.current)return;
   stop();
   if(e instanceof DOMException&&e.name==='NotAllowedError')throw Error('Allow camera and microphone access for this website, then reconnect.');
   if(e instanceof DOMException&&e.name==='NotFoundError')throw Error('Connect a webcam and microphone, then retry.');
   if(e instanceof DOMException&&e.name==='NotReadableError')throw Error('Your camera or microphone is busy. Close other apps using it and retry.');
   throw e;
  }
 });}

 async function switchDevice(kind:'video'|'audio',deviceId:string){
  const select=kind==='video'?setCameraDevice:setMicDevice;
  if(!media.current||!peer.current){select(deviceId);return;}
  await run(async()=>{
   const pc=peer.current,stream=media.current,currentAttempt=attempt.current;
   if(!pc||!stream)return;
   let replacement:MediaStream|null=null;
   try{
    replacement=await navigator.mediaDevices.getUserMedia(kind==='video'?{video:deviceId?{deviceId:{exact:deviceId}}:true,audio:false}:{video:false,audio:{...(deviceId?{deviceId:{exact:deviceId}}:{}),echoCancellation:true,noiseSuppression:true}});
    if(currentAttempt!==attempt.current){replacement.getTracks().forEach(t=>t.stop());return;}
    const next=replacement.getTracks()[0],previous=stream.getTracks().find(t=>t.kind===kind);
    const sender=pc.getSenders().find(s=>s.track?.kind===kind);
    if(!next||!sender)throw Error('No active '+kind+' sender. Reconnect the broadcast.');
    next.enabled=kind==='video'?camera:mic;
    await sender.replaceTrack(next);
    if(currentAttempt!==attempt.current){replacement.getTracks().forEach(t=>t.stop());return;}
    next.onended=()=>{if(currentAttempt===attempt.current){stop();setError('Camera or microphone disconnected. Reconnect to start again.');}};
    if(previous){stream.removeTrack(previous);previous.stop();}
    stream.addTrack(next);if(video.current){video.current.srcObject=stream;void video.current.play().catch(()=>{});}
    select(deviceId);void refreshDevices();
   }catch{
    replacement?.getTracks().forEach(t=>t.stop());
    if(currentAttempt===attempt.current)throw Error('Could not switch '+(kind==='video'?'camera':'microphone')+'. Your previous source is still selected. Check the device is available.');
   }
  });
 }
 const refreshDevices=useCallback(async()=>{try{if(navigator.mediaDevices?.enumerateDevices)setDevices(await navigator.mediaDevices.enumerateDevices());}catch{setError('Could not list devices. Check camera and microphone permissions.');}},[]);
 useEffect(()=>{if(mode!=='host')return;void refreshDevices();navigator.mediaDevices?.addEventListener('devicechange',refreshDevices);return()=>navigator.mediaDevices?.removeEventListener('devicechange',refreshDevices);},[mode,refreshDevices]);
 const allowed=mode==='viewer'||mode==='monitor'||data?.role==='admin'||(mode==='host'&&data?.role==='host');
 function player(s:{id:string;name:string;url:string}){return <article className="hp-panel hp-stream" key={s.id}><div className="hp-bar"><span>{s.name}</span><div className="hp-stream-actions"><button onClick={e=>void fullscreen(e.currentTarget.closest('article'))} aria-label={`Fullscreen ${s.name}`}>Fullscreen ⛶</button>{mode!=='monitor'&&<button onClick={()=>popout(s.id)} aria-label={`Pop out ${s.name}`}>Pop out ↗</button>}</div></div><div className="hp-screen">{s.url?<iframe src={s.url} title={s.name} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen/>:<div className="hp-offline"><strong>Camera offline</strong></div>}</div></article>;}
 return <div className={`hp ${mode==='monitor'?'hp-monitor':''}`}><div className="hp-inner"><nav className="hp-nav"><a href="/halloweenparty">R&C / AFTER DARK</a><span>OCT 31 · HALLOWEEN SPECIAL</span><a href="/">Road journal ↗</a></nav><header className="hp-hero"><h1>Halloween at Poinsettia Mine</h1><span>Road & Country · October 31</span></header>
 {error&&<p role="alert" className="hp-alert">{error}</p>}
 {!data?<p>Searching for a signal…</p>:!allowed?<form className="hp-panel hp-login" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{await action({action:'login',role:mode,password:f.get('password')});});}}><p className="hp-eyebrow">AUTHORIZED PERSONNEL</p><h2>{mode==='host'?'Dallas broadcast booth':'Mine control room'}</h2><label>Access password<input name="password" type="password" required autoComplete="current-password"/></label><button disabled={busy}>Unlock door →</button></form>:<>
 {!data.configured&&<p className="hp-alert">Chat and event controls aren’t connected yet. Video streaming works independently.</p>}

 <div className="hp-grid"><section className="hp-feeds">{data.streams.filter(s=>mode==='monitor'?s.id===monitorStream:mode==='host'?s.id==='curtis':true).map(player)}{mode==='host'&&<section className="hp-panel hp-controls"><h2>Dallas broadcast booth</h2><p>Start your camera here. Open Curtis on another monitor, then use the player’s fullscreen button.</p><div className="hp-buttons"><label>Camera<select value={cameraDevice} disabled={busy} onChange={e=>void switchDevice('video',e.target.value)}><option value="">Default camera</option>{devices.filter(d=>d.kind==='videoinput').map((d,i)=><option key={d.deviceId||i} value={d.deviceId}>{d.label||`Camera ${i+1}`}</option>)}</select></label><label>Microphone<select value={micDevice} disabled={busy} onChange={e=>void switchDevice('audio',e.target.value)}><option value="">Default microphone</option>{devices.filter(d=>d.kind==='audioinput').map((d,i)=><option key={d.deviceId||i} value={d.deviceId}>{d.label||`Microphone ${i+1}`}</option>)}</select></label><button onClick={()=>void refreshDevices()}>Refresh devices</button></div><p>Switch your camera or microphone here, even while live.</p><div className="hp-buttons"><button disabled={busy||!!media.current} onClick={start}>{live?'Broadcasting':'Connect webcam & microphone'}</button><button onClick={stop}>Stop broadcast</button><button onClick={()=>popout('curtis')}>Curtis on second monitor ↗</button></div><div className="hp-self-panel"><div className="hp-bar"><span>Dallas · Your camera</span><div className="hp-stream-actions"><button onClick={e=>void fullscreen(e.currentTarget.closest('.hp-self-panel') as HTMLElement)}>Fullscreen ⛶</button><button onClick={popoutSelf}>Pop out ↗</button></div></div><video className="hp-self" ref={video} autoPlay muted playsInline/></div><p role="status">{live?'● LIVE · Dallas camera':media.current?'Connecting to Cloudflare…':'Camera offline'}</p><div className="hp-buttons"><button onClick={()=>{media.current?.getAudioTracks().forEach(t=>t.enabled=!mic);setMic(!mic);}}>{mic?'Mute microphone':'Unmute microphone'}</button><button onClick={()=>{media.current?.getVideoTracks().forEach(t=>t.enabled=!camera);setCamera(!camera);}}>{camera?'Turn camera off':'Turn camera on'}</button></div></section>}<article className="hp-panel hp-info"><p className="hp-eyebrow">Location & event</p><h2>{data.event.location}</h2><p className="hp-description">{data.event.information}</p></article></section>{mode!=='monitor'&&<aside className="hp-panel hp-chat"><div className="hp-bar">Chat <span>{data.event.chat_open?'OPEN':'PAUSED'}</span></div><div className="hp-messages" aria-live="polite">{data.messages.length===0?<p className="hp-empty">It’s quiet down here.<br/>Say hello.</p>:data.messages.map(m=><div key={m.id}><strong style={{color:nameColor(m.name)}}>{m.name}</strong><p>{m.message}</p>{mode==='admin'&&<button onClick={()=>void run(async()=>{await action({action:'delete',id:m.id});})}>Delete</button>}</div>)}</div><ChatComposer host={mode==='host'} enabled={data.configured&&data.event.chat_open} onSent={refresh}/></aside>}</div>
 <div className="hp-goal"><div><span className="hp-eyebrow">Gold nuggets</span><h2>◆ {data.event.nuggets} <small>/ {data.event.goal} gold nuggets</small></h2></div><div className="hp-meter"><progress value={data.event.nuggets} max={data.event.goal}/><small>{data.event.nuggets>=data.event.goal?'GOAL REACHED!':`${Math.round(data.event.nuggets/data.event.goal*100)}% excavated`}</small></div></div>

 {mode==='admin'&&<section className="hp-panel hp-controls"><p className="hp-eyebrow">CONTROL ROOM</p><h2>Run the night</h2><p>Watch the feeds above, moderate messages, and update the shared event board.</p><form key={`${data.event.location}-${data.event.goal}-${data.event.nuggets}-${data.event.chat_open}-${data.event.information}`} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run(async()=>{await action({action:'update',location:f.get('location'),information:f.get('information'),nuggets:Number(f.get('nuggets')),goal:Number(f.get('goal')),chat_open:f.get('chat_open')==='on'});});}}><label>Current location<input name="location" defaultValue={data.event.location} maxLength={200}/></label><label>Event information<textarea name="information" defaultValue={data.event.information} maxLength={5000}/></label><div className="hp-buttons"><label>Gold nuggets<input name="nuggets" type="number" min="0" max="1000000" defaultValue={data.event.nuggets} required/></label><label>Nugget goal<input name="goal" type="number" min="1" max="1000000" defaultValue={data.event.goal} required/></label></div><label><input name="chat_open" type="checkbox" defaultChecked={data.event.chat_open}/> Chat open</label><button disabled={busy||!data.configured}>Save event & goal</button></form></section>}
 </>}<footer className="hp-bottom">Road & Country · Halloween <a href="/halloweenparty/host">Host entrance</a><a href="/halloweenparty/amin">Control room</a></footer></div></div>;
}
