// ============================================================================
//  YOUR SUPABASE KEYS  -  paste them here.
//  Supabase dashboard > Project Settings > API:
//    url      = "Project URL"
//    anonKey  = "anon" / "publishable" key  (safe to be public; the database
//               rules in supabase/schema.sql protect the data)
//
//  NEVER paste the "service_role" key or the Paystack secret key in this file.
//  Those go in Vercel's Environment Variables (see README.md).
// ============================================================================
export const supabaseConfig = {
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
