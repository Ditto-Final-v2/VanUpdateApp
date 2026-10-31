'use client';
import {useEffect,useState} from 'react';
import MessageList from '../message-list';
import './overlay.css';

type Data={configured:boolean;event:{nuggets:number;goal:number};messages:{id:number;name:string;message:string}[]};

export default function Overlay({view}:{view:'chat'|'counter'}) {
 const [data,setData]=useState<Data>();
 const [stale,setStale]=useState(false);
 useEffect(()=>{
  let disposed=false;
  const controller=new AbortController();
  async function refresh(){
   try {
    const response=await fetch('/api/halloween',{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error();
    const result:Data=await response.json();
    if(!result.configured)throw Error();
    if(!disposed){setData(result);setStale(false);}
   }catch{if(!disposed)setStale(true);}
  }
  void refresh();
  const timer=setInterval(refresh,3000);
  return ()=>{disposed=true;controller.abort();clearInterval(timer);};
 },[]);
 return <div className={`hp-obs hp-obs-${view}`}>
  {data&&(view==='counter'?<section className="obs-counter"><h1>Mercury Tonic</h1><p>{data.event.nuggets.toLocaleString()} <small>/ {data.event.goal.toLocaleString()}</small></p><progress aria-label="Community Mercury Tonic goal" value={data.event.nuggets} max={data.event.goal}/></section>:<MessageList className="obs-messages" messages={data.messages}/>)}
  {stale&&<p className="obs-status" role="status">Reconnecting…</p>}
 </div>;
}
