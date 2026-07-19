"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "@/config/site";

const links = [
  ["Home", "/"], ["Route", "/#route"], ["Journal", "/#journal"], ["Subscribe", "/#subscribe"],
] as const;

function VanLogo() {
  return <svg className="site-van-logo" viewBox="0 0 64 34" role="img" aria-label="Minivan logo">
    <defs><linearGradient id="site-van-gradient" x1="4" y1="4" x2="59" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#f09bce" /><stop offset="1" stopColor="#37245c" /></linearGradient></defs>
    <path d="M3 24.8V12.2c0-2.1 1.5-3.9 3.6-4.3L31.8 3c5.7-1.1 11.5 1.2 14.9 5.9l4 5.5 7.6 2.1c1.8.5 3.1 2.2 3.1 4.1v2.7c0 .9-.7 1.5-1.5 1.5h-4.8a7.2 7.2 0 0 0-14.2 0H21.4a7.2 7.2 0 0 0-14.2 0H3Z" fill="url(#site-van-gradient)" stroke="#f2b7dc" strokeWidth=".8" strokeLinejoin="round" />
    <path d="M8 10.6 31.3 6v8.6H7.1v-2.7c0-.6.4-1.2.9-1.3Zm27-5c3.8 0 7.4 1.8 9.6 4.9l2.8 4.1H35V5.6Z" fill="#263d35" stroke="#d887bd" strokeWidth="1" strokeLinejoin="round" />
    <path d="M32.8 5.8v8.8M7 18.2h45.8m5.5 1.8h3" fill="none" stroke="#f4c6e3" strokeWidth="1" strokeLinecap="round" opacity=".8" />
    <path d="M53.4 16.1h4.8c1.8.5 3.1 2.2 3.1 4.1v.5h-6.5l-1.4-4.6Z" fill="#59305f" />
    <circle cx="14.3" cy="25" r="5.2" fill="#1c2b27" stroke="#f09bce" strokeWidth="2" /><circle cx="14.3" cy="25" r="1.7" fill="#d78abe" /><circle cx="48" cy="25" r="5.2" fill="#1c2b27" stroke="#5b326a" strokeWidth="2" /><circle cx="48" cy="25" r="1.7" fill="#a76aa5" />
  </svg>;
}

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header sticky top-0 z-50">
      <div className="page-shell flex min-h-18 items-center justify-between gap-4 py-2">
        <Link href="/" className="site-logo focus-ring"><VanLogo /><span>{siteConfig.name}<small>A VAN LIFE WEB LOG</small></span></Link>
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
