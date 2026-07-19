import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Gauge, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { TripMap } from "@/components/map/trip-map";
import { Comments } from "@/components/blog/comments";
import { SubscribeForm } from "@/components/forms/subscribe-form";
import { getAdjacentPosts, getPostBySlug, publishedPosts } from "@/lib/posts";
import { formatDate, formatMiles } from "@/lib/utils";

export function generateStaticParams() { return publishedPosts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const post = getPostBySlug(slug); return post ? { title: post.title, description: post.excerpt } : {}; }

export default async function JournalPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const post = getPostBySlug(slug); if (!post) notFound(); const adjacent = getAdjacentPosts(slug);
  return <article className="retro-article-surface"><header className="page-shell pb-10 pt-14 text-center sm:pt-20"><Link href="/#journal" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-terracotta focus-ring"><ArrowLeft size={16} />Back to journal</Link><p className="text-xs font-bold uppercase tracking-[.16em] text-sage">Day {post.tripDay} · {formatDate(post.entryDate)}</p><h1 className="mx-auto mt-4 max-w-4xl font-serif text-[clamp(2.7rem,7vw,5.8rem)] font-semibold leading-[1.02] tracking-tight text-forest">{post.title}</h1><div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-stone-600"><span className="flex items-center gap-2"><MapPin size={16} />{post.locationName}</span><span className="flex items-center gap-2"><Gauge size={16} />{formatMiles(post.mileageToDate)} miles to date</span></div></header>
    <div className="page-shell relative aspect-[16/9] min-h-72 overflow-hidden rounded-[2rem]"><Image src={post.coverImage} alt={post.coverImageAlt} fill priority sizes="(max-width: 1280px) 100vw, 1200px" className="object-cover" /></div>
    <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20"><div className="space-y-7 font-serif text-[1.15rem] leading-9 text-stone-700 sm:text-xl">{post.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      <section className="mt-14" aria-labelledby="gallery-heading"><h2 id="gallery-heading" className="mb-6 font-serif text-3xl font-semibold text-forest">Scenes from the day</h2><div className="grid gap-5 sm:grid-cols-2">{post.photos.map((photo) => <figure key={photo.src}><div className="relative aspect-[4/3] overflow-hidden rounded-2xl"><Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 640px) 100vw, 400px" className="object-cover" /></div><figcaption className="mt-2 text-sm italic text-stone-500">{photo.caption}</figcaption></figure>)}</div></section>
      <section className="mt-14" aria-labelledby="location-heading"><h2 id="location-heading" className="mb-6 font-serif text-3xl font-semibold text-forest">Where I wrote this</h2><TripMap posts={[post]} compact center={[post.longitude, post.latitude]} /></section>
      <Comments />
      <aside className="mt-16 rounded-3xl bg-[#d8c09d] p-6 sm:p-8"><h2 className="font-serif text-3xl font-semibold text-forest">Ride along from home</h2><p className="mb-6 mt-2 text-stone-700">Get a note when the next road entry goes live.</p><SubscribeForm compact /></aside>
      <nav aria-label="Journal pagination" className="mt-12 grid gap-3 border-t border-stone-200 pt-8 sm:grid-cols-2">{adjacent.older ? <Link href={`/journal/${adjacent.older.slug}`} className="rounded-2xl bg-white p-4 focus-ring"><span className="text-xs font-bold uppercase tracking-wider text-sage">← Previous</span><span className="mt-1 block font-serif text-lg font-semibold text-forest">{adjacent.older.title}</span></Link> : <span />}{adjacent.newer && <Link href={`/journal/${adjacent.newer.slug}`} className="rounded-2xl bg-white p-4 text-right focus-ring"><span className="text-xs font-bold uppercase tracking-wider text-sage">Next →</span><span className="mt-1 block font-serif text-lg font-semibold text-forest">{adjacent.newer.title}</span></Link>}</nav>
    </div></article>;
}
