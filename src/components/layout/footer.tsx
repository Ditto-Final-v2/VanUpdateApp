import Link from "next/link";
import { Camera } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Footer() {
  return <footer className="site-footer">
    <div className="page-shell flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="font-serif text-xl font-semibold text-forest">{siteConfig.name}</p><p className="mt-2 max-w-md text-sm text-stone-600">{siteConfig.description}</p><p className="retro-valid mt-3">BEST VIEWED WITH CURIOSITY • 2026 EDITION</p></div>
      <div className="flex items-center gap-5 text-sm text-stone-600"><a href={siteConfig.socialLinks.instagram} target="_blank" rel="noreferrer" className="focus-ring" aria-label="Instagram"><Camera size={20} /></a><Link href="/admin" className="focus-ring hover:text-forest">Admin</Link><span>© {new Date().getFullYear()}</span></div>
    </div>
  </footer>;
}
