import Image from "next/image";

export function PostCover({ src, alt, priority = false, className = "" }: { src: string | null; alt: string; priority?: boolean; className?: string }) {
  if (!src) return <div role="img" aria-label="No cover photo uploaded" className={`grid place-items-center bg-[linear-gradient(135deg,#24483d,#789083)] p-6 text-center text-sm font-bold uppercase tracking-[.14em] text-[#f7f0cf] ${className}`}><span>Road log<br />Photo coming soon</span></div>;
  return <Image src={src} alt={alt} fill priority={priority} sizes="(max-width: 1024px) 100vw, 60vw" className={`object-cover ${className}`} />;
}
