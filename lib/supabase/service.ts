import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseServiceEnv() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return { supabaseUrl, serviceRoleKey };
}

export function getSupabaseServiceRoleClient() {
  if (globalThis.__kittisapSupabaseServiceClient) {
    return globalThis.__kittisapSupabaseServiceClient;
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseServiceEnv();
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  globalThis.__kittisapSupabaseServiceClient = client;
  return client;
}

declare global {
  var __kittisapSupabaseServiceClient: SupabaseClient | undefined;
}
