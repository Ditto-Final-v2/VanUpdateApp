"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import { MapPin } from "lucide-react";
import { siteConfig } from "@/config/site";
import rawMapOverlayData from "@/data/map-overlay-data.json";
import type { TripPost } from "@/types";
import { formatDate } from "@/lib/utils";
import type { TripMapState } from "@/lib/trip-stats";

interface TripMapProps { posts: TripPost[]; compact?: boolean; center?: [number, number]; tripState?:TripMapState }

type LoopId = 1 | 2;

const loopColors = { 1: "#d56a24", 2: "#2f78a8" } as const;
const transparentMapStyle:maplibregl.StyleSpecification={version:8,glyphs:"https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",sources:{},layers:[{id:"transparent-background",type:"background",paint:{"background-color":"rgba(0,0,0,0)"}}]};
function milesBetween(a:[number,number],b:[number,number]){const rad=Math.PI/180;const dLat=(b[1]-a[1])*rad;const dLng=(b[0]-a[0])*rad;const x=Math.sin(dLat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dLng/2)**2;return 3958.8*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

interface OverlayLine { coordinates:[number,number][];projected:[number,number][] }
interface OverlayStop { name:string;coordinates:[number,number];projected:[number,number] }
interface OverlayLoop { lines:OverlayLine[];labelsMarkup:string;stops:OverlayStop[] }
const mapOverlayData=rawMapOverlayData as unknown as Record<"1"|"2",OverlayLoop>;
function nearestRouteIndex(loop:OverlayLoop,checkpoint:[number,number]){let nearest={line:0,point:0,miles:Number.POSITIVE_INFINITY};loop.lines.forEach((line,lineIndex)=>line.coordinates.forEach((point,pointIndex)=>{const miles=milesBetween(checkpoint,point);if(miles<nearest.miles)nearest={line:lineIndex,point:pointIndex,miles};}));return nearest;}
function svgPath(points:[number,number][]){return points.length>1?`M${points.map(([x,y])=>`${x},${y}`).join(" L")}`:"";}

function TripRouteOverlay({posts,selectedLoop,liveState}:{posts:TripPost[];selectedLoop:LoopId;liveState?:TripMapState}){
  const active=mapOverlayData[String(selectedLoop) as "1"|"2"];
  const otherLoop=(selectedLoop===1?2:1) as LoopId;
  const inactive=mapOverlayData[String(otherLoop) as "1"|"2"];
  const activePosts=posts.filter((post)=>(post.loopNumber??1)===selectedLoop);
  const latest=activePosts.slice().sort((a,b)=>a.entryDate.localeCompare(b.entryDate)||a.publishedAt.localeCompare(b.publishedAt)).at(-1);
  const cutoff=latest?nearestRouteIndex(active,[latest.longitude,latest.latitude]):null;
  const liveLoop=mapOverlayData[String(liveState?.activeLoop??1) as "1"|"2"];
  const vanPoint=liveState?nearestRouteIndex(liveLoop,[liveState.longitude,liveState.latitude]):null;
  const vanPosition=vanPoint?liveLoop.lines[vanPoint.line]?.projected[vanPoint.point]:undefined;
  const previousVanPosition=vanPoint?(liveLoop.lines[vanPoint.line]?.projected[Math.max(0,vanPoint.point-1)]??vanPosition):undefined;
  const vanFacesLeft=Boolean(vanPosition&&previousVanPosition&&vanPosition[0]<previousVanPosition[0]);
  const checkpoints=activePosts.map((post)=>[post.longitude,post.latitude] as [number,number]);
  return <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 1400 760" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Loop ${selectedLoop} planned route with completed travel and current van location`}>
    <style>{`.svg-trip-route{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:8 7}.svg-trip-labels text{fill:#263f37;stroke:#fffdf8;stroke-width:4px;paint-order:stroke;stroke-linejoin:round;font:750 15px system-ui,sans-serif}.svg-trip-labels .leader{fill:none;stroke:#71806a;stroke-width:1.5}`}</style>
    <g opacity=".28">{inactive.lines.map((line,index)=><path key={`inactive-${otherLoop}-${index}`} className="svg-trip-route" d={svgPath(line.projected)} stroke={loopColors[otherLoop]} strokeWidth="3" />)}</g>
    <g>{active.lines.map((line,lineIndex)=>{
      if(!cutoff||lineIndex>cutoff.line)return <path key={`planned-${lineIndex}`} className="svg-trip-route" d={svgPath(line.projected)} stroke={loopColors[selectedLoop]} strokeWidth="4"/>;
      if(lineIndex<cutoff.line)return <path key={`completed-${lineIndex}`} className="svg-trip-route" d={svgPath(line.projected)} stroke="#7c3aed" strokeWidth="4"/>;
      const completed=line.projected.slice(0,cutoff.point+1);const remaining=line.projected.slice(cutoff.point);
      return <g key={`split-${lineIndex}`}>{completed.length>1&&<path className="svg-trip-route" d={svgPath(completed)} stroke="#7c3aed" strokeWidth="4"/>}{remaining.length>1&&<path className="svg-trip-route" d={svgPath(remaining)} stroke={loopColors[selectedLoop]} strokeWidth="4"/>}</g>;
    })}</g>
    <g className="svg-trip-labels" dangerouslySetInnerHTML={{__html:active.labelsMarkup}}/>
    <g>{active.stops.map((stop)=><circle key={stop.name} cx={stop.projected[0]} cy={stop.projected[1]} r="6" fill={checkpoints.some((point)=>milesBetween(point,stop.coordinates)<=30)?"#7c3aed":"#8b1e1e"} stroke="#fffdf8" strokeWidth="2.5"/>)}</g>
    {vanPosition&&<g aria-label={`Current location: ${liveState?.currentLocationName??"Current location"}`}><title>{`Current location: ${liveState?.currentLocationName??"Current location"}`}</title><image href="/images/minivan-current-location.png" x={vanPosition[0]-24} y={vanPosition[1]-27} width="48" height="27" preserveAspectRatio="xMidYMid meet" transform={vanFacesLeft?`translate(${vanPosition[0]*2} 0) scale(-1 1)`:undefined}/></g>}
  </svg>;
}

const loopConfig = {
  1: {
    name: "Loop 1 · Jul 20–Aug 28",
  },
  2: {
    name: "Loop 2 · Sep–Dec (Tentative)",
  },
} as const;

export function TripMap({ posts, compact = false, center,tripState }: TripMapProps) {
  const liveState=useMemo<TripMapState|undefined>(()=>{const newestPost=posts.slice().sort((a,b)=>b.entryDate.localeCompare(a.entryDate)||b.publishedAt.localeCompare(a.publishedAt))[0];return newestPost?{currentLocationName:newestPost.locationName,latitude:newestPost.latitude,longitude:newestPost.longitude,activeLoop:newestPost.loopNumber??1}:tripState;},[posts,tripState]);
  const container = useRef<HTMLDivElement>(null); const fallbackMap = useRef<HTMLDivElement>(null); const map = useRef<maplibregl.Map | null>(null); const fallbackView = useRef({ scale: 1, x: 0, y: 0 }); const fallbackDrag = useRef<{ pointerId: number; x: number; y: number } | null>(null); const fallbackTouch = useRef<{ distance: number; midpointX: number; midpointY: number; scale: number; x: number; y: number } | null>(null); const [selectedPost, setSelectedPost] = useState<TripPost | null>(null); const [selectedLoop, setSelectedLoop] = useState<LoopId>(liveState?.activeLoop??1); const [mapError, setMapError] = useState<string | null>(null);
  useEffect(() => {
    if (!container.current || map.current) return;
    let instance: maplibregl.Map;
    let repaintFrame: number | undefined;
    try {
      instance = new maplibregl.Map({ container: container.current, style: compact?siteConfig.mapStyleUrl:transparentMapStyle, center: center ?? [-109.5, 36], zoom: compact ? 8 : 4.6, minZoom: 2.5, maxZoom: 14, attributionControl: false, cooperativeGestures: true, dragRotate: false, pitchWithRotate: false, touchPitch: false });
    } catch {
      const initializationError = window.setTimeout(() => setMapError("Interactive map unavailable in this browser. Showing the route preview instead."), 0);
      return () => window.clearTimeout(initializationError);
    }
    map.current = instance;
    instance.dragPan.enable();
    instance.scrollZoom.enable();
    instance.touchZoomRotate.enable();
    instance.doubleClickZoom.enable();
    instance.keyboard.enable();
    const mapSurface = container.current.parentElement ?? container.current;
    const renderFallbackView = () => {
      if (!fallbackMap.current) return;
      const { scale, x, y } = fallbackView.current;
      fallbackMap.current.style.width = `${scale * 100}%`;
      fallbackMap.current.style.height = `${scale * 100}%`;
      fallbackMap.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const handleWheelZoom = (event: WheelEvent) => {
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
      const bounds = container.current?.getBoundingClientRect();
      if (!bounds) return;
      const rawDelta = event.deltaY || event.deltaX;
      if (rawDelta === 0) return;
      const zoomStep = rawDelta < 0 ? 0.45 : -0.45;
      const nextZoom = Math.max(instance.getMinZoom(), Math.min(instance.getMaxZoom(), instance.getZoom() + zoomStep));
      instance.jumpTo({ zoom: nextZoom });
      const oldView = fallbackView.current;
      const nextScale = Math.max(1, Math.min(5, oldView.scale * (rawDelta < 0 ? 1.18 : 1 / 1.18)));
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      const ratio = nextScale / oldView.scale;
      fallbackView.current = nextScale === 1 ? { scale: 1, x: 0, y: 0 } : { scale: nextScale, x: pointerX - (pointerX - oldView.x) * ratio, y: pointerY - (pointerY - oldView.y) * ratio };
      renderFallbackView();
    };
    const handleFallbackPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || fallbackView.current.scale <= 1 || event.button > 0 || (event.target as HTMLElement).closest("button, a, .maplibregl-control-container")) return;
      fallbackDrag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      mapSurface.setPointerCapture(event.pointerId);
    };
    const handleFallbackPointerMove = (event: PointerEvent) => {
      const drag = fallbackDrag.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      fallbackView.current.x += event.clientX - drag.x;
      fallbackView.current.y += event.clientY - drag.y;
      fallbackDrag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      renderFallbackView();
    };
    const handleFallbackPointerUp = (event: PointerEvent) => {
      if (fallbackDrag.current?.pointerId === event.pointerId) fallbackDrag.current = null;
    };
    const touchMeasurement = (touches: TouchList) => {
      const first = touches[0]; const second = touches[1];
      return { distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY), midpointX: (first.clientX + second.clientX) / 2, midpointY: (first.clientY + second.clientY) / 2 };
    };
    const handleFallbackTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      if (event.cancelable) event.preventDefault();
      const measurement = touchMeasurement(event.touches);
      fallbackTouch.current = { ...measurement, ...fallbackView.current };
    };
    const handleFallbackTouchMove = (event: TouchEvent) => {
      const start = fallbackTouch.current;
      if (!start || event.touches.length !== 2) return;
      if (event.cancelable) event.preventDefault();
      const bounds = container.current?.getBoundingClientRect();
      if (!bounds) return;
      const current = touchMeasurement(event.touches);
      const nextScale = Math.max(1, Math.min(5, start.scale * current.distance / Math.max(start.distance, 1)));
      const startX = start.midpointX - bounds.left;
      const startY = start.midpointY - bounds.top;
      const currentX = current.midpointX - bounds.left;
      const currentY = current.midpointY - bounds.top;
      const contentX = (startX - start.x) / start.scale;
      const contentY = (startY - start.y) / start.scale;
      fallbackView.current = nextScale === 1 ? { scale: 1, x: 0, y: 0 } : { scale: nextScale, x: currentX - contentX * nextScale, y: currentY - contentY * nextScale };
      renderFallbackView();
    };
    const handleFallbackTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) fallbackTouch.current = null;
    };
    mapSurface.addEventListener("wheel", handleWheelZoom, { capture: true, passive: false });
    mapSurface.addEventListener("pointerdown", handleFallbackPointerDown);
    mapSurface.addEventListener("pointermove", handleFallbackPointerMove);
    mapSurface.addEventListener("pointerup", handleFallbackPointerUp);
    mapSurface.addEventListener("pointercancel", handleFallbackPointerUp);
    mapSurface.addEventListener("touchstart", handleFallbackTouchStart, { passive: false });
    mapSurface.addEventListener("touchmove", handleFallbackTouchMove, { passive: false });
    mapSurface.addEventListener("touchend", handleFallbackTouchEnd);
    mapSurface.addEventListener("touchcancel", handleFallbackTouchEnd);
    if(compact){instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");instance.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");}
    const loadTimeout = window.setTimeout(() => setMapError("Interactive map is taking too long to load. Showing the route preview instead."), 8000);
    instance.on("load", async () => {
      window.clearTimeout(loadTimeout);
      if (!compact) {
        repaintFrame = window.requestAnimationFrame(() => {
          instance.resize();
          instance.triggerRepaint();
        });
      }
      if(compact)posts.forEach((post) => {
        const el = document.createElement("button"); el.type = "button"; el.className = "trip-marker"; el.setAttribute("aria-label", `Open ${post.title}`); el.innerHTML = `<span>${post.tripDay}</span>`; el.addEventListener("click", () => setSelectedPost(post)); new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([post.longitude, post.latitude]).addTo(instance);
      });
    });
    instance.on("error", (event) => { if (event.error?.message?.includes("style")) setMapError("The interactive map style could not load. Showing the route preview instead."); });
    return () => { window.clearTimeout(loadTimeout); if (repaintFrame !== undefined) window.cancelAnimationFrame(repaintFrame); mapSurface.removeEventListener("wheel", handleWheelZoom, { capture: true }); mapSurface.removeEventListener("pointerdown", handleFallbackPointerDown); mapSurface.removeEventListener("pointermove", handleFallbackPointerMove); mapSurface.removeEventListener("pointerup", handleFallbackPointerUp); mapSurface.removeEventListener("pointercancel", handleFallbackPointerUp); mapSurface.removeEventListener("touchstart", handleFallbackTouchStart); mapSurface.removeEventListener("touchmove", handleFallbackTouchMove); mapSurface.removeEventListener("touchend", handleFallbackTouchEnd); mapSurface.removeEventListener("touchcancel", handleFallbackTouchEnd); instance.remove(); map.current = null; };
  }, [center, compact, posts, liveState]);

  return <div className={`trip-map-shell relative overflow-hidden ${compact ? "trip-map-shell-compact h-72 rounded-3xl bg-[#d9ddd5]" : "trip-map-shell-main h-[62vh] min-h-[500px] max-h-[760px] rounded-[1.75rem] bg-[#d6e2e3] sm:min-h-[560px]"}`}>
    {!compact && <div ref={fallbackMap} className="trip-map-fallback absolute left-0 top-0 z-0 h-full w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: "url('/data/us-map-basemap.svg?v=live-map-2')" }}><TripRouteOverlay posts={posts} selectedLoop={selectedLoop} liveState={liveState}/></div>}
    <div ref={container} className="trip-map-canvas absolute inset-0 z-[1]" aria-label={compact ? "Map showing this journal entry location" : "Interactive map of the planned and completed road trip route"} />
    {!compact && <div aria-hidden="true" className="map-gesture-hint"><span className="map-tip-desktop">Drag to move · Scroll to zoom</span><span className="map-tip-mobile">Use two fingers to move or zoom · One finger scrolls the page</span></div>}
    {mapError && <div role="status" className="absolute inset-x-4 top-4 z-10 rounded-xl bg-white/95 p-4 text-sm shadow-lg"><strong>Route preview.</strong> {mapError}</div>}
    {!compact && <div className="map-loop-key absolute bottom-16 left-4 z-10 w-[min(18rem,calc(100%-2rem))] rounded-xl bg-[#fffdf8]/95 p-3 text-xs shadow-lg backdrop-blur sm:bottom-4"><p className="mb-2 font-bold text-forest">Planned loops</p><div className="space-y-1.5">{([1, 2] as const).map((loop) => <button key={loop} type="button" aria-pressed={selectedLoop === loop} onClick={() => setSelectedLoop(loop)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold transition focus-ring ${selectedLoop === loop ? "bg-forest text-white" : "bg-white text-stone-700 hover:bg-stone-100"}`}><span className={`w-6 shrink-0 border-t-2 border-dashed ${loop === 1 ? "border-[#d56a24]" : "border-[#2f78a8]"} ${selectedLoop === loop ? "opacity-100" : "opacity-50"}`} />{loopConfig[loop].name}</button>)}</div><div className="mt-2 flex items-center gap-2 border-t border-stone-200 pt-2 text-[.7rem] text-stone-600"><span className="h-0.5 w-6 rounded bg-[#7c3aed]" />Completed travel</div></div>}
    {!compact && <div className="map-van-key absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-xl border-2 border-white/80 bg-[#fffdf8]/95 px-3 py-2 text-xs font-bold text-forest shadow-lg backdrop-blur"><span aria-hidden="true" className="van-key-icon" /><span>Current location</span></div>}
    {selectedPost && <div className="absolute inset-x-4 bottom-4 z-20 max-w-sm rounded-2xl bg-[#fffdf8] p-4 shadow-2xl sm:bottom-auto sm:left-auto sm:right-5 sm:top-5">
      <button onClick={() => setSelectedPost(null)} aria-label="Close entry preview" className="absolute right-3 top-2 rounded p-1 text-xl text-stone-500 focus-ring">×</button><p className="pr-7 text-xs font-bold uppercase tracking-wider text-sage">Day {selectedPost.tripDay} · {formatDate(selectedPost.entryDate)}</p><h3 className="mt-1 font-serif text-xl font-semibold text-forest">{selectedPost.title}</h3><p className="mt-1 flex items-center gap-1 text-sm text-stone-600"><MapPin size={14} />{selectedPost.locationName}</p><Link href={`/journal/${selectedPost.slug}`} className="mt-3 inline-block text-sm font-bold text-terracotta focus-ring">Read full entry →</Link>
    </div>}
  </div>;
}
