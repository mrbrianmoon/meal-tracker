import { createClient } from '@supabase/supabase-js'

// ============================================================
// ⚠️  REPLACE THESE WITH YOUR OWN SUPABASE CREDENTIALS
// ============================================================
// 1. Go to https://supabase.com → create a free project
// 2. Go to Settings → API
// 3. Copy your "Project URL" and "anon public" key below
// ============================================================

const SUPABASE_URL = 'https://cbghonhtsinbjsmxepdu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_VGH0tLsn92gnsaqbdcZC4Q_StxOFqu1'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
