import Link from "next/link";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";
import { RetryMmsButton } from "@/components/admin/retry-mms-button";
import { getAdminPosts } from "@/lib/posts";
import { formatDate } from "@/lib/utils";
import {
  cleanAbandonedPhotos,
  retryFailedPostMms,
} from "@/app/admin/posts/actions";

interface AdminPostsSearchParams {
  mms?: string;
  resent?: string;
  failed?: string;
  skipped?: string;
}

export default async function AdminPosts({
  searchParams,
}: {
  searchParams: Promise<AdminPostsSearchParams>;
}) {
  const posts = await getAdminPosts();
  const result = await searchParams;
  const retryMessage =
    result.mms === "complete"
      ? `MMS check complete: ${Number(result.resent) || 0} resent, ${Number(result.failed) || 0} failed, and ${Number(result.skipped) || 0} skipped because Twilio did not report a failed delivery.`
      : result.mms === "unavailable"
        ? "The MMS retry could not run. Check the post and Twilio configuration."
        : null;

  return (
    <AdminPlaceholder
      title="Posts"
      description="Edit, unpublish, republish, delete, or safely retry failed journal notifications."
    >
      {retryMessage && (
        <p
          role="status"
          className={`mt-6 border-2 p-3 text-sm font-bold ${
            result.mms === "complete"
              ? "border-green-800 bg-green-50 text-green-950"
              : "border-red-800 bg-red-50 text-red-900"
          }`}
        >
          {retryMessage}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-stone-600">
          {posts.length} total {posts.length === 1 ? "entry" : "entries"}
        </p>
        <div className="flex gap-2">
          <form action={cleanAbandonedPhotos}>
            <button className="border-2 border-forest bg-white px-3 py-2 text-xs font-bold uppercase">
              Clean unused photos
            </button>
          </form>
          <Link href="/admin/posts/new" className="button-primary">
            New post
          </Link>
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        MMS retry checks Twilio first and resends only failed or undelivered
        copies. Cleanup removes unlinked uploads older than 24 hours.
      </p>
      <div className="mt-4 overflow-hidden border-2 border-forest bg-white">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 p-4 last:border-0"
          >
            <div>
              <p className="font-bold text-forest">{post.title}</p>
              <p className="text-xs text-stone-500">
                {formatDate(post.entry_date)} ·{" "}
                <span
                  className={
                    post.status === "published"
                      ? "text-green-800"
                      : "text-amber-800"
                  }
                >
                  {post.status === "published" ? "Published" : "Draft"}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {post.status === "published" && (
                <form action={retryFailedPostMms}>
                  <input type="hidden" name="postId" value={post.id} />
                  <RetryMmsButton title={post.title} />
                </form>
              )}
              <Link
                href={`/admin/posts/${post.id}/edit`}
                className="button-primary"
              >
                Manage
              </Link>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="p-8 text-center text-stone-500">
            No journal entries yet.
          </p>
        )}
      </div>
    </AdminPlaceholder>
  );
}
