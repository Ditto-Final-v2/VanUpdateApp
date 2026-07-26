"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X, ZoomIn } from "lucide-react";
import type { TripPhoto } from "@/types";

interface JournalStoryProps {
  paragraphs: string[];
  cover: TripPhoto | null;
  photos: TripPhoto[];
}

interface PhotoFigureProps {
  photo: TripPhoto;
  index: number;
  onOpen: (index: number) => void;
  variant?: "cover" | "inline" | "gallery";
}

function PhotoFigure({ photo, index, onOpen, variant = "inline" }: PhotoFigureProps) {
  const [ratio, setRatio] = useState(4 / 3);
  const heightLimit = variant === "cover" ? 78 : variant === "gallery" ? 62 : 70;
  const portraitWidth = ratio < 0.9 ? `min(100%, ${Math.max(24, heightLimit * ratio)}vh)` : "100%";

  return <figure className={`journal-photo journal-photo-${variant}`}>
    <button
      type="button"
      className="journal-photo-frame focus-ring"
      style={{ aspectRatio: ratio, maxWidth: portraitWidth }}
      onClick={() => onOpen(index)}
      aria-label={`Enlarge image: ${photo.alt}`}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        priority={variant === "cover"}
        unoptimized
        sizes={variant === "cover" ? "(max-width: 1200px) 100vw, 1150px" : variant === "gallery" ? "(max-width: 640px) 100vw, 500px" : "(max-width: 1024px) 100vw, 900px"}
        className="object-contain"
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth && image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight);
        }}
      />
      <span className="journal-photo-zoom" aria-hidden="true"><ZoomIn size={16} /> View larger</span>
    </button>
    {photo.caption && <figcaption>{photo.caption}</figcaption>}
  </figure>;
}

function distanceBetween(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return 0;
  return Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
}

export function JournalStory({ paragraphs, cover, photos }: JournalStoryProps) {
  const storyPhotos = useMemo(() => photos.filter((photo) => photo.src !== cover?.src), [cover?.src, photos]);
  const allPhotos = useMemo(() => cover ? [cover, ...storyPhotos] : storyPhotos, [cover, storyPhotos]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);

  const wovenCount = paragraphs.length && storyPhotos.length
    ? Math.min(4, storyPhotos.length, Math.max(1, paragraphs.length - 1))
    : 0;
  const wovenPhotos = storyPhotos.slice(0, wovenCount);
  const remainingPhotos = storyPhotos.slice(wovenCount);
  const placements = new Map<number, TripPhoto[]>();
  wovenPhotos.forEach((photo, index) => {
    const paragraphIndex = Math.min(paragraphs.length - 1, Math.max(0, Math.round(((index + 1) * paragraphs.length) / (wovenCount + 1)) - 1));
    placements.set(paragraphIndex, [...(placements.get(paragraphIndex) ?? []), photo]);
  });
  const photoIndex = (photo: TripPhoto) => allPhotos.findIndex((candidate) => candidate.src === photo.src);

  useEffect(() => {
    if (activeIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        setScale(1);
        setPan({ x:0, y:0 });
        setActiveIndex((current) => current === null ? current : (current + (event.key === "ArrowLeft" ? -1 : 1) + allPhotos.length) % allPhotos.length);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keydown);
    };
  }, [activeIndex, allPhotos.length]);

  function adjustScale(nextScale: number) {
    const limited = Math.min(5, Math.max(1, nextScale));
    setScale(limited);
    if (limited === 1) setPan({ x: 0, y: 0 });
  }

  function changePhoto(direction: number) {
    setScale(1);
    setPan({ x:0, y:0 });
    pointers.current.clear();
    pinch.current=null;
    setActiveIndex((current) => current === null ? current : (current + direction + allPhotos.length) % allPhotos.length);
  }

  function openPhoto(index:number){
    setScale(1);
    setPan({x:0,y:0});
    pointers.current.clear();
    pinch.current=null;
    setActiveIndex(index);
  }

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    if (points.length === 2) pinch.current = { distance: distanceBetween(points), scale };
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    if (points.length === 2) {
      if (!pinch.current) pinch.current = { distance: distanceBetween(points), scale };
      adjustScale(pinch.current.scale * distanceBetween(points) / Math.max(1, pinch.current.distance));
    } else if (scale > 1) {
      setPan((current) => ({ x: current.x + event.clientX - previous.x, y: current.y + event.clientY - previous.y }));
    }
  }

  function pointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  const lightboxPhoto = activeIndex === null ? null : allPhotos[activeIndex];
  const lightbox = lightboxPhoto && activeIndex !== null
    ? <div
        className="photo-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={`Expanded image ${activeIndex + 1} of ${allPhotos.length}`}
        onClick={(event) => { if (event.target === event.currentTarget) setActiveIndex(null); }}
      >
        <div className="photo-lightbox-toolbar">
          <button type="button" onClick={() => adjustScale(scale - 0.5)} disabled={scale <= 1} aria-label="Zoom out"><Minus size={20} /></button>
          <output aria-live="polite">{Math.round(scale * 100)}%</output>
          <button type="button" onClick={() => adjustScale(scale + 0.5)} disabled={scale >= 5} aria-label="Zoom in"><Plus size={20} /></button>
          <button type="button" onClick={() => adjustScale(1)} disabled={scale === 1} aria-label="Reset zoom"><RotateCcw size={18} /></button>
          <button type="button" onClick={() => setActiveIndex(null)} aria-label="Close enlarged image" autoFocus><X size={23} /></button>
        </div>
        {allPhotos.length > 1 && <>
          <button type="button" className="photo-lightbox-previous" onClick={() => changePhoto(-1)} aria-label="Previous image"><ChevronLeft size={28} /></button>
          <button type="button" className="photo-lightbox-next" onClick={() => changePhoto(1)} aria-label="Next image"><ChevronRight size={28} /></button>
        </>}
        <div
          className="photo-lightbox-stage"
          onWheel={(event) => { event.preventDefault(); adjustScale(scale + (event.deltaY < 0 ? 0.35 : -0.35)); }}
          onDoubleClick={() => adjustScale(scale === 1 ? 2.5 : 1)}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        >
          <div className="photo-lightbox-image" style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})` }}>
            <Image key={lightboxPhoto.src} src={lightboxPhoto.src} alt={lightboxPhoto.alt} fill unoptimized sizes="100vw" className="pointer-events-none select-none object-contain" priority />
          </div>
        </div>
        <div className="photo-lightbox-caption">
          <span>{activeIndex + 1} / {allPhotos.length}</span>
          {lightboxPhoto.caption && <p>{lightboxPhoto.caption}</p>}
          <small>Pinch, scroll, or use the controls to zoom. Drag while zoomed.</small>
        </div>
      </div>
    : null;

  return <>
    {cover
      ? <div className="page-shell"><PhotoFigure photo={cover} index={0} onOpen={openPhoto} variant="cover" /></div>
      : <div className="page-shell grid min-h-72 place-items-center border-2 border-forest bg-[linear-gradient(135deg,#24483d,#789083)] p-6 text-center text-sm font-bold uppercase tracking-[.14em] text-[#f7f0cf]">Road log<br />Photo coming soon</div>}
    <div className="journal-story mx-auto max-w-5xl px-5 py-14 sm:py-20">
      <div className="journal-story-copy">
        {paragraphs.map((paragraph, index) => <Fragment key={`${index}-${paragraph.slice(0, 24)}`}>
          <p>{paragraph}</p>
          {(placements.get(index) ?? []).map((photo) => <PhotoFigure key={photo.src} photo={photo} index={photoIndex(photo)} onOpen={openPhoto} />)}
        </Fragment>)}
      </div>
      {remainingPhotos.length > 0 && <section className="journal-photo-gallery" aria-labelledby="gallery-heading">
        <h2 id="gallery-heading">More scenes from the day</h2>
        <div>{remainingPhotos.map((photo) => <PhotoFigure key={photo.src} photo={photo} index={photoIndex(photo)} onOpen={openPhoto} variant="gallery" />)}</div>
      </section>}
    </div>
    {lightbox && createPortal(lightbox, document.body)}
  </>;
}
