import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function cover(postId: string, includeBody: boolean) {
  if (!/^[a-f0-9-]{36}$/i.test(postId)) return new Response("Not found", { status: 404 });
  const supabase = createAdminClient();
  const { data: post } = await supabase.from("posts").select("cover_image_path,status").eq("id", postId).eq("status", "published").maybeSingle();
  if (!post?.cover_image_path) return new Response("Not found", { status: 404 });
  const { data, error } = await supabase.storage.from("trip-photos").download(post.cover_image_path);
  if (error || !data) return new Response("Not found", { status: 404 });
  const image = await sharp(Buffer.from(await data.arrayBuffer())).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(includeBody ? image : null, { headers: { "Content-Type": "image/jpeg", "Content-Length": String(image.byteLength), "Content-Disposition": 'inline; filename="cover.jpg"', "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ postId: string }> }) { return cover((await params).postId, true); }
export async function HEAD(_request: Request, { params }: { params: Promise<{ postId: string }> }) { return cover((await params).postId, false); }
