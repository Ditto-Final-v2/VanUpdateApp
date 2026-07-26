import Image from "next/image";

export function PostCover({ src, alt, priority = false, className = "", fit = "cover" }: { src: string | null; alt: string; priority?: boolean; className?: string; fit?: "cover" | "contain" }) {
  if (!src) return <div role="img" aria-label="No cover photo uploaded" className={`grid place-items-center bg-[linear-gradient(135deg,#24483d,#789083)] p-6 text-center text-sm font-bold uppercase tracking-[.14em] text-[#f7f0cf] ${className}`}><span>Road log<br />Photo coming soon</span></div>;
  if (fit === "contain") return <>
    <Image src={src} alt="" aria-hidden="true" fill priority={priority} unoptimized sizes="(max-width: 1024px) 100vw, 60vw" className="scale-125 object-cover opacity-70 brightness-[.65] saturate-75 blur-3xl" />
    <span aria-hidden="true" className="absolute inset-0 bg-[#172d28]/35" />
    <Image src={src} alt={alt} fill priority={priority} unoptimized sizes="(max-width: 1024px) 100vw, 60vw" className={`object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,.32)] ${className}`} />
  </>;
  return <Image src={src} alt={alt} fill priority={priority} unoptimized sizes="(max-width: 1024px) 100vw, 60vw" className={`object-cover ${className}`} />;
}
