import { siteConfig } from "@/config/site";

export function Footer() {
  return <footer className="site-footer">
    <div className="page-shell py-10">
      <div><p className="font-serif text-xl font-semibold text-forest">{siteConfig.name}</p><p className="mt-2 max-w-md text-sm text-stone-600">{siteConfig.description}</p><p className="retro-valid mt-3">BEST VIEWED WITH CURIOSITY • 2026 EDITION</p></div>
    </div>
  </footer>;
}
