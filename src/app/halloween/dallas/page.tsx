import type { Metadata } from 'next';
import { getDallasHost } from '@/lib/auth/dallas';
import Booth from './booth';
export const metadata: Metadata = { title: 'Dallas broadcast booth', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || !process.env.HALLOWEEN_DALLAS_HOST_IDS) {
    return <main className="page-shell readable-surface my-10 p-6"><h1>Dallas broadcast booth</h1><p role="status">Host sign-in is awaiting server configuration. Contact the website owner.</p></main>;
  }
  const host = await getDallasHost();
  return <main className="page-shell readable-surface my-10 max-w-3xl p-6"><p className="retro-section-label">Halloween · Private host access</p><h1 className="my-4 font-serif text-4xl">Dallas broadcast booth</h1><Booth authorized={!!host} /></main>;
}
