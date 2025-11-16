import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getRequiredServerEnv } from "../env";

type GenericClient = SupabaseClient<any, "public", any>;

export async function createSupabaseServerClient(): Promise<GenericClient> {
  const SUPABASE_URL = getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const SUPABASE_ANON_KEY = getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false, // Don't persist sessions - require password each time
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          // In Next.js 15, cookies can only be modified in Server Actions or Route Handlers
          // Wrap in try-catch to handle cases where we're in a Server Component
          cookieStore.set(name, value, options);
        } catch (error) {
          // Silently fail if we can't set cookies (e.g., in Server Components)
          // Token refresh will need to happen in a Server Action or Route Handler
          console.warn(`Cannot set cookie ${name}: cookies can only be modified in Server Actions or Route Handlers`);
        }
      },
      remove(name: string, options: any) {
        try {
          // In Next.js 15, cookies can only be modified in Server Actions or Route Handlers
          // Note: Next.js 15's delete() only accepts the name, not options
          cookieStore.delete(name);
        } catch (error) {
          // Silently fail if we can't delete cookies (e.g., in Server Components)
          console.warn(`Cannot delete cookie ${name}: cookies can only be modified in Server Actions or Route Handlers`);
        }
      },
    },
  });
}

export function createSupabaseServiceRoleClient(): GenericClient {
  const SUPABASE_URL = getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

