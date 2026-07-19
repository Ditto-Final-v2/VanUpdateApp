"use client";

import Image from "next/image";
import { useActionState, useEffect, useState, useTransition } from "react";
import { updatePost, type EditPostState } from "@/app/admin/posts/[id]/edit/actions";
import { createClient } from "@/lib/supabase/client";
import type { AdminPost } from "@/lib/posts";
import { LocationFields } from "@/components/admin/location-fields";

const initialState: EditPostState = { message:"" };
const metrics = [["milesWalked","Miles Walked","0.1"],["milesRan","Miles Ran","0.1"],["milesBiked","Miles Biked","0.1"],["majorCitiesVisited","Major Cities Visited","1"],["newStatesVisited","New States Visited","1"],["newNationalParksVisited","New National Parks Visited","1"],["tanksOfGas","Tanks of Gas","0.1"]] as const;

export function EditJournalForm({ post }: { post:AdminPost }) {
  const [state,formAction,pending]=useActionState(updatePost,initialState);
  const [retained,setRetained]=useState(() => new Set(post.photos.map((photo)=>photo.path)));
  const [cover,setCover]=useState(post.coverImagePath??"");
  const [files,setFiles]=useState<File[]>([]); const [previews,setPreviews]=useState<string[]>([]);
  const [error,setError]=useState(""); const [uploading,setUploading]=useState(false); const [,startAction]=useTransition();
  useEffect(()=>()=>previews.forEach(URL.revokeObjectURL),[previews]);

  function choose(event:React.ChangeEvent<HTMLInputElement>) { const selected=Array.from(event.target.files??[]);
    if(selected.length+retained.size>12){setError("Keep and upload no more than 12 photos total.");return;}
    if(selected.some((file)=>!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>15*1024*1024)){setError("Photos must be JPEG, PNG, or WebP and no larger than 15 MB each.");return;}
    setError("");setFiles(selected);setPreviews(selected.map(URL.createObjectURL));
  }
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setError("");setUploading(true);const form=event.currentTarget;
    try { const supabase=createClient();const batch=crypto.randomUUID();const paths:string[]=[];
      for(const file of files){const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";const path=`staged/${batch}/${crypto.randomUUID()}.${ext}`;const {error:uploadError}=await supabase.storage.from("trip-photos").upload(path,file,{contentType:file.type});if(uploadError){setError(uploadError.message);return;}paths.push(path);}
      const data=new FormData(form);data.delete("photos");retained.forEach((path)=>data.append("retainedPhotoPath",path));paths.forEach((path)=>data.append("uploadedPhotoPath",path));
      const coverPath=cover.startsWith("new:")?paths[Number(cover.slice(4))]:cover;if(coverPath)data.set("coverPhotoPath",coverPath);else data.delete("coverPhotoPath");startAction(()=>formAction(data));
    } finally {setUploading(false);}
  }
  function toggle(path:string,keep:boolean){setRetained((current)=>{const next=new Set(current);if(keep)next.add(path);else next.delete(path);return next;});if(!keep&&cover===path)setCover("");}
  const values:Record<string,number>={milesWalked:post.milesWalked,milesRan:post.milesRan,milesBiked:post.milesBiked,majorCitiesVisited:post.majorCitiesVisited,newStatesVisited:post.newStatesVisited,newNationalParksVisited:post.newNationalParksVisited,tanksOfGas:post.tanksOfGas};
  const busy=pending||uploading;
  return <form onSubmit={submit} className="mt-8 grid gap-5 border-2 border-forest bg-white p-5 shadow-[5px_5px_0_#1f352d] sm:grid-cols-2 sm:p-7"><input type="hidden" name="postId" value={post.id}/>
    <Field name="title" label="Title" defaultValue={post.title} required/><Field name="entryDate" label="Entry Date" type="date" defaultValue={post.entryDate} required/>
    <Field name="locationName" label="Location Name" defaultValue={post.locationName} required/><LocationFields latitude={post.latitude} longitude={post.longitude} loopNumber={post.loopNumber}/><Field name="vanMileage" label="Current Van Mileage" type="number" min="0" step="1" defaultValue={post.vanMileage} required/>
    {metrics.map(([name,label,step])=><Field key={name} name={name} label={label} type="number" min="0" step={step} defaultValue={values[name]} required/>)}
    <div className="sm:col-span-2"><label className="form-label" htmlFor="notificationHook">Notification Hook</label><input className="form-input mt-2" id="notificationHook" name="notificationHook" defaultValue={post.notificationHook} maxLength={180}/></div>
    <div><label className="form-label" htmlFor="status">Publication status</label><select className="form-input mt-2" id="status" name="status" defaultValue={post.status}><option value="published">Published</option><option value="draft">Draft / hidden</option></select></div>
    <fieldset className="border-2 border-dashed border-sage p-4 sm:col-span-2"><legend className="px-2 text-sm font-bold uppercase text-forest">Manage photos</legend>
      {post.photos.length>0&&<div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{post.photos.map((photo)=><div key={photo.path} className={`border-2 p-2 ${retained.has(photo.path)?"border-stone-300":"border-red-700 opacity-50"}`}><div className="relative aspect-[4/3]"><Image src={photo.url} alt={photo.alt} fill className="object-cover"/></div><label className="mt-2 flex gap-2 text-xs font-bold"><input type="checkbox" checked={retained.has(photo.path)} onChange={(e)=>toggle(photo.path,e.target.checked)}/>Keep photo</label><label className="mt-1 flex gap-2 text-xs font-bold"><input type="radio" name="coverChoice" checked={cover===photo.path} disabled={!retained.has(photo.path)} onChange={()=>setCover(photo.path)}/>Main cover</label></div>)}</div>}
      <label className="button-primary cursor-pointer">Add photos<input className="sr-only" type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple onChange={choose}/></label>
      {previews.length>0&&<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{previews.map((src,index)=><label key={src} className="border-2 border-stone-300 p-2"><span className="relative block aspect-[4/3]"><Image src={src} alt={`New photo ${index+1}`} fill unoptimized className="object-cover"/></span><span className="mt-2 flex gap-2 text-xs font-bold"><input type="radio" name="coverChoice" checked={cover===`new:${index}`} onChange={()=>setCover(`new:${index}`)}/>Main cover</span></label>)}</div>}
      {(cover||post.photos.length>0||previews.length>0)&&<button type="button" className="mt-3 text-xs font-bold text-red-800 underline" onClick={()=>setCover("")}>Use no cover image</button>}
    </fieldset>
    <div className="sm:col-span-2"><label className="form-label" htmlFor="body">Body</label><textarea className="form-input mt-2 min-h-72" id="body" name="body" defaultValue={post.body} required/></div>
    {(error||state.message)&&<p role="alert" className="border-2 border-red-800 bg-red-50 p-3 text-sm font-bold text-red-900 sm:col-span-2">{error||state.message}</p>}
    <div className="sm:col-span-2"><button className="button-primary" disabled={busy}>{uploading?"Uploading…":pending?"Saving…":"Save changes"}</button></div>
  </form>;
}
function Field({label,...props}:React.InputHTMLAttributes<HTMLInputElement>&{label:string}){return <div><label className="form-label" htmlFor={props.name}>{label}</label><input {...props} id={props.name} className="form-input mt-2"/></div>}
