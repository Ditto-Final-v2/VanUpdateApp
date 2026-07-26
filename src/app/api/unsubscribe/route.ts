import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !/^[a-f0-9-]{36}$/i.test(token)) {
    return new Response(null, { status: 200 });
  }

  const form = new URLSearchParams(await request.text());
  if (form.get("List-Unsubscribe") !== "One-Click") {
    return new Response(null, { status: 400 });
  }

  await createAdminClient()
    .from("subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("unsubscribe_token", token);

  return new Response(null, { status: 200 });
}
