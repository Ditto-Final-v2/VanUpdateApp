import "server-only";

import { z } from "zod";
import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

const statsSchema = z.object({
  days: z.number(), milesDriven: z.number(), states: z.number(), nationalParks: z.number(),
  majorCities: z.number(), milesWalked: z.number(), milesBiked: z.number(), milesRan: z.number(), tanksOfGas: z.number(),
});

function display(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export async function getTripStats() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("trips").select("stats").eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !data) return siteConfig.tripStats;
    const parsed = statsSchema.safeParse(data.stats);
    if (!parsed.success) return siteConfig.tripStats;
    const s = parsed.data;
    return [
      { label: "Days", value: display(s.days) }, { label: "Driven", value: `${display(s.milesDriven)} mi` },
      { label: "States", value: display(s.states) }, { label: "National Parks", value: display(s.nationalParks) },
      { label: "Major Cities", value: display(s.majorCities) }, { label: "Walked", value: `${display(s.milesWalked)} mi` },
      { label: "Biked", value: `${display(s.milesBiked)} mi` }, { label: "Ran", value: `${display(s.milesRan)} mi` },
      { label: "Tanks of Gas", value: display(s.tanksOfGas) },
    ];
  } catch {
    return siteConfig.tripStats;
  }
}

export interface TripMapState { currentLocationName:string;latitude:number;longitude:number;activeLoop:1|2 }
export async function getTripMapState():Promise<TripMapState>{try{const supabase=await createClient();const {data}=await supabase.from("trips").select("current_location_name,current_latitude,current_longitude,active_loop").eq("status","active").limit(1).maybeSingle();if(data?.current_latitude!=null&&data.current_longitude!=null)return{currentLocationName:data.current_location_name??"Current location",latitude:data.current_latitude,longitude:data.current_longitude,activeLoop:data.active_loop as 1|2};}catch{}return{currentLocationName:"El Paso, TX",latitude:31.820633,longitude:-106.546623,activeLoop:1};}
