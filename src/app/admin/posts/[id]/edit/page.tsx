import Link from "next/link";
import { notFound } from "next/navigation";
import { EditJournalForm } from "@/components/admin/edit-journal-form";
import { DeletePostButton } from "@/components/admin/delete-post-button";
import { deletePost } from "@/app/admin/posts/[id]/edit/actions";
import { getAdminPostById } from "@/lib/posts";

export default async function EditPost({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string}>}) { const {id}=await params;const post=await getAdminPostById(id);if(!post)notFound();const {error}=await searchParams;return <div><Link href="/admin/posts" className="text-sm font-bold text-terracotta underline">← Back to posts</Link><h1 className="mt-3 font-serif text-4xl font-semibold text-forest">Manage journal entry</h1><p className="mt-2 text-stone-600">Edit content, statistics, photos, cover image, and publication status.</p>{error&&<p className="mt-4 border-2 border-red-800 bg-red-50 p-3 text-red-900">{error}</p>}<EditJournalForm post={post}/><form action={deletePost} className="mt-8 border-t-2 border-red-900 pt-5"><input type="hidden" name="postId" value={post.id}/><DeletePostButton/></form></div>; }
