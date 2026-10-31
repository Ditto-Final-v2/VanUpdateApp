'use client';
import {useEffect,useRef,useState} from 'react';

export default function ChatComposer({host,enabled,onSent}:{host:boolean;enabled:boolean;onSent:()=>Promise<void>}){
 const [name,setName]=useState('');
 const [sender,setSender]=useState('');
 const [message,setMessage]=useState('');
 const [asking,setAsking]=useState(false);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);
 const draft=useRef<HTMLTextAreaElement>(null);
 const inFlight=useRef(false);
 useEffect(()=>{if(asking)dialog.current?.showModal();else dialog.current?.close();},[asking]);
 async function send(who:string){
  if(inFlight.current||!enabled||!who.trim()||!message.trim())return;
  inFlight.current=true;setSending(true);setError('');
  try{
   const response=await fetch('/api/halloween',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'message',name:who.trim(),message:message.trim()})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Message could not be sent. Please retry.');
   if(!host)setName(who.trim());
   setMessage('');setAsking(false);setSender('');
   await onSent();draft.current?.focus();
  }catch(e){setError(e instanceof Error?e.message:'Message could not be sent. Please retry.');}
  finally{inFlight.current=false;setSending(false);}
 }
 return <>
  <form className="hp-compose" onSubmit={e=>{e.preventDefault();if(!enabled||sending||!message.trim())return;setError('');if(host||!name){setSender('');setAsking(true);}else void send(name);}}>
   <p className="hp-chat-identity">{host?'Choose a sender each time you send.':name?`Chatting as ${name}`:'Choose your name when you send your first message.'}</p>
   <label>Message<textarea ref={draft} value={message} onChange={e=>setMessage(e.target.value)} maxLength={500} required disabled={sending} placeholder="Type a message…"/></label>
   <button disabled={!enabled||sending||!message.trim()}>{sending?'Sending…':'Send'}</button>
   {error&&!asking&&<p className="hp-chat-error" role="alert">{error}</p>}
  </form>
  <dialog ref={dialog} className="hp-sender-dialog" aria-labelledby="hp-sender-title" onCancel={e=>{if(sending)e.preventDefault();else{setAsking(false);setError('');}}}>
   <form onSubmit={e=>{e.preventDefault();void send(sender);}}>
    <h2 id="hp-sender-title">Who’s sending?</h2>
    <p>{host?'Enter the name for this message.':'Your name stays until you refresh this page.'}</p>
    <label>Your name<input autoFocus autoComplete="off" value={sender} onChange={e=>setSender(e.target.value)} required maxLength={40} disabled={sending}/></label>
    {error&&<p className="hp-chat-error" role="alert">{error}</p>}
    {!enabled&&<p role="status">Chat is currently unavailable. Your message is saved here.</p>}
    <div className="hp-buttons"><button type="button" disabled={sending} onClick={()=>{setAsking(false);setError('');}}>Cancel</button><button disabled={sending||!enabled||!sender.trim()}>{sending?'Sending…':'Send message'}</button></div>
   </form>
  </dialog>
 </>;
}
