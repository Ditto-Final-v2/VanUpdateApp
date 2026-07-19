"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export async function cleanAbandonedPhotos(){await requireAdmin();const supabase=await createClient();const {data:used}=await supabase.from("post_photos").select("storage_path");const usedPaths=new Set((used??[]).map((row)=>row.storage_path));const {data:folders}=await supabase.storage.from("trip-photos").list("staged",{limit:100});const cutoff=Date.now()-24*60*60*1000;const abandoned:string[]=[];for(const folder of folders??[]){if(folder.id)continue;const {data:files}=await supabase.storage.from("trip-photos").list(`staged/${folder.name}`,{limit:100});for(const file of files??[]){const path=`staged/${folder.name}/${file.name}`;if(file.id&&!usedPaths.has(path)&&new Date(file.created_at??0).getTime()<cutoff)abandoned.push(path);}}if(abandoned.length)await supabase.storage.from("trip-photos").remove(abandoned);revalidatePath("/admin/posts");}
