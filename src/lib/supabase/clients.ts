import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getRequiredServerEnv } from "../env";

type GenericClient = SupabaseClient<any, "public", any>;

export async function createSupabaseServerClient(): Promise<GenericClient> {
  const SUPABASE_URL = getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const SUPABASE_ANON_KEY = getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  
  const cookieStore = await cookies();
  const mutableCookies = cookieStore as unknown as {
    set?: (options: { name: string; value: string } & Record<string, unknown>) => void;
    delete?: (options: { name: string } & Record<string, unknown>) => void;
  };

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        if (typeof mutableCookies.set === "function") {
          mutableCookies.set({ name, value, ...options });
        }
      },
      remove(name: string, options: any) {
        if (typeof mutableCookies.delete === "function") {
          mutableCookies.delete({ name, ...options });
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

