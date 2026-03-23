import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Check if columns exist by trying to select them
  // We can just query information_schema or try to select 1 row.
  const { data, error } = await supabase
    .from("proj2_price_quote_items")
    .select("*")
    .limit(1);
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Columns:", Object.keys(data?.[0] || {}));
  }
}

run();
