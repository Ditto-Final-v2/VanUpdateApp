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
