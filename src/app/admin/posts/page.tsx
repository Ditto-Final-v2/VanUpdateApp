import Link from "next/link";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";
import { publishedPosts } from "@/lib/posts";
import { formatDate } from "@/lib/utils";
export default function AdminPosts() { return <AdminPlaceholder title="Posts" description="Create, edit, publish, and filter journal entries."><div className="mt-8 flex justify-end"><Link href="/admin/posts/new" className="button-primary">New post</Link></div><div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">{publishedPosts.map((post) => <div key={post.id} className="flex items-center justify-between gap-4 border-b border-stone-100 p-4 last:border-0"><div><p className="font-bold text-forest">{post.title}</p><p className="text-xs text-stone-500">{formatDate(post.entryDate)} · Published</p></div><Link href={`/admin/posts/${post.id}/edit`} className="text-sm font-bold text-terracotta focus-ring">Edit</Link></div>)}</div></AdminPlaceholder>; }
