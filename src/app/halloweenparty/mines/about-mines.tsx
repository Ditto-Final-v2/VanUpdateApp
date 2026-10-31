'use client';
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';

const photos=[9,8,11,13,14,25,26,28,29,2,4,5,6,7,10,12,15,16,17,18,19,20,21,22,23,24,27,1,3];
export default function AboutMines(){
 const [selected,setSelected]=useState<number|null>(null);
 const lightbox=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  if(selected===null)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return ()=>{document.body.style.overflow=previous;};
 },[selected]);
 function open(index:number){setSelected(index);lightbox.current?.showModal();}
 function close(){lightbox.current?.close();setSelected(null);}
 return <section className="hp-panel hp-info hp-about" aria-labelledby="about-mines-title">
  <p className="hp-eyebrow">A HALLOWEEN TRANSMISSION FROM NEVADA</p>
  <h2 id="about-mines-title">About the mines</h2>
  <p className="hp-description">Poinsettia is a remote Nevada mining ghost town, with abandoned buildings scattered across the desert. I’m here at the abandoned Poinsettia mercury mine, two hours from the nearest paved road. I came out to party with ghosts on Halloween, but the spirits trapped me: heavy rain is in the forecast, leaving me stuck for the foreseeable future.</p>
  <p className="hp-description hp-about-invite">Join the party from the Abode or wherever you’re haunting tonight. Complete quests, collect Mercury Tonic, and help us reach 10,000.</p>
  <div className="hp-mine-gallery">{photos.map((id,index)=>{
   const src=`/images/mines/nevada-${String(id).padStart(2,'0')}.webp`;
   return <button type="button" key={id} onClick={()=>open(index)} aria-label={`Open Nevada photo ${index+1}`}><Image src={src} alt={`Curtis’s Nevada trip, photo ${index+1}`} width={700} height={500} loading="lazy" unoptimized/></button>;
  })}</div>
  <dialog ref={lightbox} className="hp-photo-dialog" aria-label="Nevada photo viewer" onClose={()=>setSelected(null)} onClick={event=>{if(event.target===event.currentTarget)close();}}>
   <div className="hp-photo-window">
    <div className="hp-photo-toolbar"><span>{selected!==null?`Photo ${selected+1} of ${photos.length}`:''}</span><button type="button" onClick={close} aria-label="Close photo viewer" autoFocus>Close ×</button></div>
    {selected!==null&&<Image src={`/images/mines/nevada-${String(photos[selected]).padStart(2,'0')}.webp`} alt={`Curtis’s Nevada trip, photo ${selected+1}`} width={1400} height={1100} unoptimized/>}
   </div>
  </dialog>
 </section>;
}
