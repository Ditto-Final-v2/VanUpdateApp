"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/config/site";

const links = [
  ["Home", "/"], ["Route", "/#route"], ["Journal", "/#journal"], ["Subscribe", "/#subscribe"],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header sticky top-0 z-50">
      <div className="page-shell flex min-h-18 items-center justify-between gap-4 py-2">
        <Link href="/" className="site-logo focus-ring"><span aria-hidden="true">◆</span><span>{siteConfig.name}<small>A VAN LIFE WEB LOG</small></span></Link>
        <button className="rounded-full p-2 text-forest focus-ring md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <nav className="hidden items-center gap-2 md:flex" aria-label="Primary navigation">
          {links.map(([label, href]) => <Link key={label} href={href} className="nav-link focus-ring">{label}</Link>)}
        </nav>
      </div>
      {open && <nav id="mobile-nav" className="mobile-retro-nav px-5 py-4 md:hidden" aria-label="Mobile navigation">
        <div className="mx-auto flex max-w-7xl flex-col gap-1">{links.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 font-medium text-forest hover:bg-white">{label}</Link>)}</div>
      </nav>}
    </header>
  );
}
