import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email: string;
}

export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) return null;

  const { data: admin, error: adminError } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) return null;
  return { id: user.id, email: user.email };
});

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  return admin;
}
