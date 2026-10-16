import { createBrowserClient } from '@supabase/ssr';

// Browser client. Uses only the public anon key; every table is protected by
// Row Level Security, so this key cannot read anything the signed-in person
// isn't allowed to see.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
