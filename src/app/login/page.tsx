import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <section className="readable-surface page-shell my-12 max-w-lg py-10 sm:my-16">
      <div className="retro-titlebar -mx-4 -mt-10 mb-8 sm:-mx-8">
        <span>ADMIN_LOGIN.EXE</span><span>— □ ×</span>
      </div>
      <p className="retro-section-label">Private road desk</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold text-forest">Administrator sign in</h1>
      <p className="mt-3 leading-7 text-stone-600">Use the private account created in Supabase. Public visitors cannot create accounts.</p>
      <LoginForm />
    </section>
  );
}
