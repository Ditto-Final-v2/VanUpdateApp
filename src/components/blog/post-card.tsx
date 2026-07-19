import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { TripPost } from "@/types";
import { formatDate } from "@/lib/utils";
import { PostCover } from "@/components/blog/post-cover";

export function PostCard({ post }: { post: TripPost }) {
  return <article className="retro-post-card group overflow-hidden bg-white">
    <Link href={`/journal/${post.slug}`} className="relative block aspect-[4/3] overflow-hidden focus-ring">
      <PostCover src={post.coverImage} alt={post.coverImageAlt} className="transition duration-500 group-hover:scale-[1.025]" />
    </Link>
    <div className="p-5 sm:p-6"><div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold uppercase tracking-[.12em] text-sage"><time dateTime={post.entryDate}>{formatDate(post.entryDate)}</time><span className="flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{post.locationName}</span></div>
      <h3 className="font-serif text-2xl font-semibold leading-tight text-forest"><Link href={`/journal/${post.slug}`} className="focus-ring">{post.title}</Link></h3>
      <p className="mt-3 leading-7 text-stone-600">{post.excerpt}</p>
      <Link href={`/journal/${post.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-terracotta focus-ring">Read entry <ArrowUpRight size={16} aria-hidden="true" /></Link>
    </div>
  </article>;
}
