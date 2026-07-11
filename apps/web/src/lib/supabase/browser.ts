import { createBrowserClient } from "@supabase/ssr";
import { getBrowserEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const env = getBrowserEnv();

  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
