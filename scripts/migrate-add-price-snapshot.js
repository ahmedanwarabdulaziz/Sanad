const fs = require("fs");
const path = require("path");
const https = require("https");

// Read .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [key, ...val] = line.split("=");
  if (key && val.length) env[key.trim()] = val.join("=").trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

// Use PostgREST RPC to run SQL
const sql = "ALTER TABLE investor_contracts ADD COLUMN IF NOT EXISTS price_snapshot JSONB DEFAULT NULL;";
const postData = JSON.stringify({ query: sql });

const parsedUrl = new URL(`${url}/rest/v1/rpc/exec_sql`);

// Just use fetch if available
fetch(`${url}/rest/v1/rpc/`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
  body: JSON.stringify({})
}).then(() => {}).catch(() => {});

// Direct approach: use supabase-js to test
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(url, key);

async function run() {
  // Test if column exists
  const { data, error } = await supabase.from("investor_contracts").select("id, price_snapshot").limit(1);
  if (error) {
    console.log("Column test result:", error.message);
    if (error.message.includes("price_snapshot")) {
      console.log("❌ Column does NOT exist. Run this SQL in Supabase Dashboard > SQL Editor:");
      console.log("ALTER TABLE investor_contracts ADD COLUMN price_snapshot JSONB DEFAULT NULL;");
    }
  } else {
    console.log("✅ Column price_snapshot exists! Data:", JSON.stringify(data));
  }
}
run();
