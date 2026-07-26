import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Gauge, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Comments } from "@/components/blog/comments";
import { EntryStats } from "@/components/blog/entry-stats";
import { JournalStory } from "@/components/blog/journal-story";
import { SubscribeForm } from "@/components/forms/subscribe-form";
import { getAdjacentPosts, getPostBySlug } from "@/lib/posts";
import { formatDate, formatMiles } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default async function JournalPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const [adjacent,supabase] = await Promise.all([getAdjacentPosts(slug),createClient()]);
  const {data:commentRows}=await supabase.from("comments").select("id,display_name,body,created_at").eq("post_id",post.id).eq("status","approved").order("created_at");
  const comments=(commentRows??[]).map((comment)=>({id:comment.id,displayName:comment.display_name,body:comment.body,createdAt:comment.created_at}));

  const coverPhoto=post.photos.find((photo)=>photo.src===post.coverImage);
  const cover = post.coverImage ? { src:post.coverImage, alt:post.coverImageAlt, caption:coverPhoto?.caption??"" } : null;

  return <article className="retro-article-surface"><header className="page-shell pb-10 pt-14 text-center sm:pt-20"><Link href="/#journal" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-terracotta focus-ring"><ArrowLeft size={16} />Back to journal</Link><p className="text-xs font-bold uppercase tracking-[.16em] text-sage">Day {post.tripDay} · {formatDate(post.entryDate)}</p><h1 className="mx-auto mt-4 max-w-4xl font-serif text-[clamp(2.7rem,7vw,5.8rem)] font-semibold leading-[1.02] tracking-tight text-forest">{post.title}</h1><div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-stone-600"><span className="flex items-center gap-2"><MapPin size={16} />Main activities: {post.locationName}</span><span className="flex items-center gap-2"><Gauge size={16} />{formatMiles(post.mileageToDate)} total trip miles</span></div><EntryStats post={post} /></header>
    <JournalStory paragraphs={post.body} cover={cover} photos={post.photos} />
    <div className="mx-auto max-w-3xl px-5 pb-14 sm:pb-20">
      <Comments postId={post.id} slug={post.slug} comments={comments}/>
      <aside className="mt-16 rounded-3xl bg-[#d8c09d] p-6 sm:p-8"><h2 className="font-serif text-3xl font-semibold text-forest">Ride along from home</h2><p className="mb-6 mt-2 text-stone-700">Get a note when the next road entry goes live.</p><SubscribeForm compact /></aside>
      <nav aria-label="Journal pagination" className="mt-12 grid gap-3 border-t border-stone-200 pt-8 sm:grid-cols-2">{adjacent.older ? <Link href={`/journal/${adjacent.older.slug}`} className="rounded-2xl bg-white p-4 focus-ring"><span className="text-xs font-bold uppercase tracking-wider text-sage">← Previous</span><span className="mt-1 block font-serif text-lg font-semibold text-forest">{adjacent.older.title}</span></Link> : <span />}{adjacent.newer && <Link href={`/journal/${adjacent.newer.slug}`} className="rounded-2xl bg-white p-4 text-right focus-ring"><span className="text-xs font-bold uppercase tracking-wider text-sage">Next →</span><span className="mt-1 block font-serif text-lg font-semibold text-forest">{adjacent.newer.title}</span></Link>}</nav>
    </div></article>;
}
