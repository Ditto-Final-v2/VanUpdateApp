'use client';
import {useEffect,useRef,useState} from 'react';
import {nameColor} from './name-color';

export default function ChatComposer({host,enabled,onSent,playerName,questId}:{host:boolean;enabled:boolean;onSent:()=>Promise<void>;playerName?:string;questId?:number}){
 const [name,setName]=useState('');
 const [sender,setSender]=useState('');
 const [message,setMessage]=useState('');
 const [asking,setAsking]=useState(false);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const senderInput=useRef<HTMLInputElement>(null);
 const draft=useRef<HTMLTextAreaElement>(null);
 const inFlight=useRef(false);
 useEffect(()=>{if(asking)senderInput.current?.focus();},[asking]);
 async function send(who:string){
  if(inFlight.current||!enabled||!who.trim()||!message.trim())return;
  inFlight.current=true;setSending(true);setError('');
  try{
   const response=await fetch(playerName?'/api/halloween/magiquest':'/api/halloween',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'message',name:who.trim(),message:message.trim(),questId})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Message could not be sent. Please retry.');
   if(!host)setName(who.trim());
   setMessage('');setAsking(false);setSender('');
   await onSent();draft.current?.focus();
  }catch(e){setError(e instanceof Error?e.message:'Message could not be sent. Please retry.');}
  finally{inFlight.current=false;setSending(false);}
 }
 return <>
  {!asking&&<form className="hp-compose" onSubmit={e=>{e.preventDefault();if(!enabled||sending||!message.trim())return;setError('');if(playerName){void send(playerName);}else if(host||!name){setSender('');setAsking(true);}else void send(name);}}>
   <p className="hp-chat-identity">{playerName?<>Chatting as <strong style={{color:nameColor(playerName)}}>{playerName}</strong></>:host?'Choose a sender each time you send.':name?<>Chatting as <strong style={{color:nameColor(name)}}>{name}</strong></>:'Choose your name when you send your first message.'}</p>
   <label>Message<textarea ref={draft} value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&e.keyCode!==229){e.preventDefault();if(!e.repeat)e.currentTarget.form?.requestSubmit();}}} maxLength={500} required disabled={sending} placeholder="Type a message…" aria-describedby="hp-chat-keyboard"/></label>
   <button disabled={!enabled||sending||!message.trim()}>{sending?'Sending…':'Send'}</button>
   <small id="hp-chat-keyboard" className="hp-chat-identity">Enter to send · Shift+Enter for a new line</small>
   {error&&!asking&&<p className="hp-chat-error" role="alert">{error}</p>}
  </form>}
  {asking&&<section className="hp-sender-inline" aria-labelledby="hp-sender-title" onKeyDown={e=>{if(e.key==='Escape'&&!sending){setAsking(false);setError('');}}}>
   <form onSubmit={e=>{e.preventDefault();void send(sender);}}>
    <h2 id="hp-sender-title">Who’s sending?</h2>
    <p>{host?'Enter the name for this message.':'Your name stays until you refresh this page.'}</p>
    <label>Your name<input ref={senderInput} autoComplete="off" value={sender} onChange={e=>setSender(e.target.value)} required maxLength={40} disabled={sending}/></label>
    {error&&<p className="hp-chat-error" role="alert">{error}</p>}
    {!enabled&&<p role="status">Chat is currently unavailable. Your message is saved here.</p>}
    <div className="hp-buttons"><button type="button" disabled={sending} onClick={()=>{setAsking(false);setError('');}}>Cancel</button><button disabled={sending||!enabled||!sender.trim()}>{sending?'Sending…':'Send message'}</button></div>
   </form>
  </section>}
 </>;
}
