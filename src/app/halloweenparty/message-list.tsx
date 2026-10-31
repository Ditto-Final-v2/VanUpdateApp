'use client';
import {useLayoutEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import {nameColor} from './name-color';

type Message={id:number;name:string;message:string};
type Position={id:string;offset:number;scrollTop:number;scrollHeight:number};

export default function MessageList({messages,className,empty,onDelete}:{messages:Message[];className:string;empty?:ReactNode;onDelete?:(id:number)=>void}){
 const container=useRef<HTMLDivElement>(null);
 const following=useRef(true);
 const position=useRef<Position|null>(null);
 const newestFirst=[...messages].sort((a,b)=>b.id-a.id);

 function remember(){
  const element=container.current;
  if(!element)return;
  following.current=element.scrollTop<=1;
  const top=element.getBoundingClientRect().top;
  const visible=Array.from(element.children).find(child=>child.getBoundingClientRect().bottom>top) as HTMLElement|undefined;
  position.current=visible?.dataset.chatMessageId?{
   id:visible.dataset.chatMessageId,offset:visible.getBoundingClientRect().top-top,
   scrollTop:element.scrollTop,scrollHeight:element.scrollHeight,
  }:null;
 }

 useLayoutEffect(()=>{
  const element=container.current;
  if(!element)return;
  if(following.current){element.scrollTop=0;}
  else if(position.current){
   const saved=position.current;
   const anchor=Array.from(element.children).find(child=>(child as HTMLElement).dataset.chatMessageId===saved.id);
   if(anchor){element.scrollTop+=anchor.getBoundingClientRect().top-element.getBoundingClientRect().top-saved.offset;}
   else{element.scrollTop=saved.scrollTop+element.scrollHeight-saved.scrollHeight;}
  }
  remember();
 },[messages]);

 return <div ref={container} className={className} onScroll={remember} aria-label="Party chat messages, newest first" aria-live="polite" style={{overflowAnchor:'none',scrollBehavior:'auto'}}>
  {newestFirst.length===0?empty:newestFirst.map(message=><div key={message.id} data-chat-message-id={message.id}>
   <strong style={{color:nameColor(message.name)}}>{message.name}</strong><p>{message.message}</p>
   {onDelete&&<button onClick={()=>onDelete(message.id)}>Delete</button>}
  </div>)}
 </div>;
}
