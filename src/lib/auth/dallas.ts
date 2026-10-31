import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getDallasHost() {
  const allowed = (process.env.HALLOWEEN_DALLAS_HOST_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.length) return null;
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  return !error && user && allowed.includes(user.id) ? user : null;
}
