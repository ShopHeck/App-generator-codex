/**
 * Supabase JS client factory.
 *
 * Used for Supabase-specific features (Storage, Admin auth) that sit on top
 * of the standard PostgreSQL interface.  Raw SQL queries still go through
 * the pg Pool from `./client.js`.
 *
 * Required environment variables:
 *   SUPABASE_URL              — project URL, e.g. https://xyz.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key for server-side operations
 *     (never expose this in the browser/client)
 */

import { createClient } from "@supabase/supabase-js";

/**
 * @param {object} [config]
 * @param {string} [config.supabaseUrl]
 * @param {string} [config.supabaseKey]
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createSupabaseClient(config = {}) {
  const url = config.supabaseUrl ?? process.env.SUPABASE_URL;
  const key = config.supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
