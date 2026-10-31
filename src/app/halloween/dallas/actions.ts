'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDallasHost } from '@/lib/auth/dallas';

export async function signIn(_: { error: string }, form: FormData) {
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword({ email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') });
  if (error) return { error: 'Sign-in was not accepted. Check your details or try again later.' };
  if (!await getDallasHost()) {
    await db.auth.signOut();
    return { error: 'This account is not authorized to broadcast from Dallas.' };
  }
  redirect('/halloween/dallas');
}

export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect('/halloween/dallas');
}
