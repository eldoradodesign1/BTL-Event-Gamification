import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://hvhidlyigfznmwmlubof.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_cnbdFJbtEwR5r1Ujgv_bzQ_v44o7ofU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
