// src/services/supabase.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://demswvtoqurpjoqrqndy.supabase.co";
const SUPABASE_KEY = "sb_publishable_nB5DXgfVKcGDokaWRKKe3A_YjHq85oi";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);