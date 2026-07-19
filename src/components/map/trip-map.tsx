"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import maplibregl, { LngLatBounds } from "maplibre-gl";
import { MapPin } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { TripPost } from "@/types";
import { formatDate } from "@/lib/utils";
import type { TripMapState } from "@/lib/trip-stats";

interface TripMapProps { posts: TripPost[]; compact?: boolean; center?: [number, number]; tripState?:TripMapState }

type LoopId = 1 | 2;

const loopColors = { 1: "#d56a24", 2: "#2f78a8" } as const;
function milesBetween(a:[number,number],b:[number,number]){const rad=Math.PI/180;const dLat=(b[1]-a[1])*rad;const dLng=(b[0]-a[0])*rad;const x=Math.sin(dLat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dLng/2)**2;return 3958.8*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

const loopConfig = {
  1: {
    name: "Loop 1 · Jul 20–Aug 28",
    routeUrl: "/data/planned-route-loop-1.geojson",
    stopsUrl: "/data/planned-stops-loop-1.geojson",
    bounds: new LngLatBounds([-114.18494, 31.75902], [-90.24228, 48.50262]),
  },
  2: {
    name: "Loop 2 · Sep–Dec (Tentative)",
    routeUrl: "/data/planned-route-loop-2.geojson",
    stopsUrl: "/data/planned-stops-loop-2.geojson",
    bounds: new LngLatBounds([-122.22668, 29.9908], [-80.83554, 40.4251]),
  },
} as const;

export function TripMap({ posts, compact = false, center,tripState }: TripMapProps) {
  const container = useRef<HTMLDivElement>(null); const map = useRef<maplibregl.Map | null>(null); const vanArt = useRef<HTMLSpanElement>(null); const [selectedPost, setSelectedPost] = useState<TripPost | null>(null); const [selectedLoop, setSelectedLoop] = useState<LoopId>(tripState?.activeLoop??1); const [mapReady, setMapReady] = useState(false); const [mapError, setMapError] = useState<string | null>(null);
  useEffect(() => {
    if (!container.current || map.current) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({ container: container.current, style: siteConfig.mapStyleUrl, center: center ?? [-109.5, 36], zoom: compact ? 8 : 4.6, attributionControl: false });
    } catch {
      const initializationError = window.setTimeout(() => setMapError("Interactive map unavailable in this browser. Showing the route preview instead."), 0);
      return () => window.clearTimeout(initializationError);
    }
    map.current = instance; instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right"); instance.addControl(new maplibregl.AttributionControl({ compact: true }), compact ? "bottom-right" : "top-left");
    const loadTimeout = window.setTimeout(() => setMapError("Interactive map is taking too long to load. Showing the route preview instead."), 8000);
    instance.on("load", async () => {
      window.clearTimeout(loadTimeout);
      if (!compact) {
        await Promise.all(([1, 2] as const).map(async (loop) => {
          instance.addSource(`planned-loop-${loop}`, { type: "geojson", data: loopConfig[loop].routeUrl });
          const active=loop===(tripState?.activeLoop??1);instance.addLayer({ id: `planned-loop-${loop}`, type: "line", source: `planned-loop-${loop}`, paint: { "line-color": loopColors[loop], "line-width": active ? 4 : 3, "line-opacity": active ? 1 : .28, "line-dasharray": active ? [2, 2] : [1.5, 2.5] } });
          const stops=await fetch(loopConfig[loop].stopsUrl).then((response)=>response.json()) as GeoJSON.FeatureCollection<GeoJSON.Point>;
          const checkpoints=posts.filter((post)=>(post.loopNumber??1)===loop).map((post)=>[post.longitude,post.latitude] as [number,number]);stops.features.forEach((stop)=>{stop.properties={...stop.properties,completed:checkpoints.some((point)=>milesBetween(point,stop.geometry.coordinates as [number,number])<=30)}});
          instance.addSource(`planned-stops-${loop}`, { type: "geojson", data:stops });
          instance.addLayer({ id: `planned-stop-markers-${loop}`, type: "circle", source: `planned-stops-${loop}`, layout: { visibility: active ? "visible" : "none" }, paint: { "circle-color": ["case", ["boolean", ["get", "completed"], false], "#7c3aed", "#8b1e1e"], "circle-radius": 5, "circle-stroke-color": "#fffdf8", "circle-stroke-width": 2 } });
          instance.addLayer({ id: `planned-stop-labels-${loop}`, type: "symbol", source: `planned-stops-${loop}`, layout: { visibility: active ? "visible" : "none", "text-field": ["get", "name"], "text-size": 15, "text-font": ["Noto Sans Regular"], "text-variable-anchor": ["top", "bottom", "left", "right"], "text-radial-offset": .9, "text-padding": 4, "text-justify": "auto" }, paint: { "text-color": "#263f37", "text-halo-color": "#fffdf8", "text-halo-width": 2 } });
          const traveled=posts.filter((post)=>(post.loopNumber??1)===loop).sort((a,b)=>a.entryDate.localeCompare(b.entryDate)).map((post)=>[post.longitude,post.latitude]);if(traveled.length>1){instance.addSource(`completed-loop-${loop}`,{type:"geojson",data:{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:traveled}}});instance.addLayer({id:`completed-loop-${loop}`,type:"line",source:`completed-loop-${loop}`,layout:{visibility:active?"visible":"none"},paint:{"line-color":"#7c3aed","line-width":5,"line-opacity":.95}});}
        }));
        const vanMarker = document.createElement("div");
        vanMarker.className = "current-van-marker";
        vanMarker.setAttribute("role", "img");
        vanMarker.setAttribute("aria-label", `Current location: ${tripState?.currentLocationName??"El Paso, Texas"}`);
        const vanImage = document.createElement("span");
        vanImage.className = "current-van-art facing-left";
        vanMarker.appendChild(vanImage);
        vanArt.current = vanImage;
        new maplibregl.Marker({ element: vanMarker, anchor: "bottom" }).setLngLat([tripState?.longitude??-106.546623,tripState?.latitude??31.820633]).addTo(instance);
        instance.fitBounds(loopConfig[tripState?.activeLoop??1].bounds, { padding: 55, maxZoom: 6, duration: 0 });
        setMapReady(true);
      }
      posts.forEach((post) => {
        const el = document.createElement("button"); el.type = "button"; el.className = "trip-marker"; el.setAttribute("aria-label", `Open ${post.title}`); el.innerHTML = `<span>${post.tripDay}</span>`; el.addEventListener("click", () => setSelectedPost(post)); new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([post.longitude, post.latitude]).addTo(instance);
      });
    });
    instance.on("error", (event) => { if (event.error?.message?.includes("style")) setMapError("The interactive map style could not load. Showing the route preview instead."); });
    return () => { window.clearTimeout(loadTimeout); instance.remove(); map.current = null; };
  }, [center, compact, posts, tripState]);

  useEffect(() => {
    const instance = map.current;
    if (compact || !mapReady || !instance) return;
    ([1, 2] as const).forEach((loop) => {
      const active = loop === selectedLoop;
      instance.setPaintProperty(`planned-loop-${loop}`, "line-color", loopColors[loop]);
      instance.setPaintProperty(`planned-loop-${loop}`, "line-width", active ? 4 : 3);
      instance.setPaintProperty(`planned-loop-${loop}`, "line-opacity", active ? 1 : .28);
      instance.setPaintProperty(`planned-loop-${loop}`, "line-dasharray", active ? [2, 2] : [1.5, 2.5]);
      instance.setLayoutProperty(`planned-stop-markers-${loop}`, "visibility", active ? "visible" : "none");
      instance.setLayoutProperty(`planned-stop-labels-${loop}`, "visibility", active ? "visible" : "none");
      if(instance.getLayer(`completed-loop-${loop}`))instance.setLayoutProperty(`completed-loop-${loop}`,"visibility",active?"visible":"none");
    });
    vanArt.current?.classList.toggle("facing-left", selectedLoop === 1);
    instance.fitBounds(loopConfig[selectedLoop].bounds, { padding: 55, maxZoom: 6, duration: 500 });
  }, [compact, mapReady, selectedLoop]);

  return <div className={`relative overflow-hidden ${compact ? "h-72 rounded-3xl bg-[#d9ddd5]" : "h-[58vh] min-h-[430px] max-h-[680px] rounded-[1.75rem] bg-[#d6e2e3] sm:min-h-[520px]"}`}>
    {!compact && <div aria-hidden="true" className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url('/data/planned-routes-loop-${selectedLoop}-selected.svg?v=van-nav-4')` }} />}
    <div ref={container} className="absolute inset-0" aria-label={compact ? "Map showing this journal entry location" : "Interactive map of the planned and completed road trip route"} />
    {mapError && <div role="status" className="absolute inset-x-4 top-4 z-10 rounded-xl bg-white/95 p-4 text-sm shadow-lg"><strong>Route preview.</strong> {mapError}</div>}
    {!compact && <div className="absolute bottom-16 left-4 z-10 w-[min(18rem,calc(100%-2rem))] rounded-xl bg-[#fffdf8]/95 p-3 text-xs shadow-lg backdrop-blur sm:bottom-4"><p className="mb-2 font-bold text-forest">Planned loops</p><div className="space-y-1.5">{([1, 2] as const).map((loop) => <button key={loop} type="button" aria-pressed={selectedLoop === loop} onClick={() => setSelectedLoop(loop)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold transition focus-ring ${selectedLoop === loop ? "bg-forest text-white" : "bg-white text-stone-700 hover:bg-stone-100"}`}><span className={`w-6 shrink-0 border-t-2 border-dashed ${loop === 1 ? "border-[#d56a24]" : "border-[#2f78a8]"} ${selectedLoop === loop ? "opacity-100" : "opacity-50"}`} />{loopConfig[loop].name}</button>)}</div><div className="mt-2 flex items-center gap-2 border-t border-stone-200 pt-2 text-[.7rem] text-stone-600"><span className="h-0.5 w-6 rounded bg-[#7c3aed]" />Completed travel</div></div>}
    {!compact && <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-xl border-2 border-white/80 bg-[#fffdf8]/95 px-3 py-2 text-xs font-bold text-forest shadow-lg backdrop-blur"><span aria-hidden="true" className="van-key-icon" /><span>Current location</span></div>}
    {selectedPost && <div className="absolute inset-x-4 bottom-4 z-20 max-w-sm rounded-2xl bg-[#fffdf8] p-4 shadow-2xl sm:bottom-auto sm:left-auto sm:right-5 sm:top-5">
      <button onClick={() => setSelectedPost(null)} aria-label="Close entry preview" className="absolute right-3 top-2 rounded p-1 text-xl text-stone-500 focus-ring">×</button><p className="pr-7 text-xs font-bold uppercase tracking-wider text-sage">Day {selectedPost.tripDay} · {formatDate(selectedPost.entryDate)}</p><h3 className="mt-1 font-serif text-xl font-semibold text-forest">{selectedPost.title}</h3><p className="mt-1 flex items-center gap-1 text-sm text-stone-600"><MapPin size={14} />{selectedPost.locationName}</p><Link href={`/journal/${selectedPost.slug}`} className="mt-3 inline-block text-sm font-bold text-terracotta focus-ring">Read full entry →</Link>
    </div>}
  </div>;
}
