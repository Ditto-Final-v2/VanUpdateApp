import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.includes('/halloween/dallas') &&
      (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))) {
    return request.nextUrl.pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Host sign-in is not configured on this server.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
      : NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/halloween/dallas/:path*", "/api/halloween/dallas/:path*"],
};
