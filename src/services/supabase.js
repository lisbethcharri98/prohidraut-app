import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://apmrapjrrvdgtmrfzxqo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_HWHTbTIR1D63hpAk3YErMw_rqSdq_2X";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
