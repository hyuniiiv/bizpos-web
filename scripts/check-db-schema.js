#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://supabase.gproai.com";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY 환경변수 필수");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

async function checkAllTables() {
  console.log("🔍 Supabase 스키마 조회 중...\n");

  const tables = [
    "merchant_users",
    "stores",
    "terminals",
    "client_users",
    "store_managers",
    "role_permissions",
  ];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count} rows`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log("\n✨ merchant_users 스키마 샘플:");
  try {
    const { data, error } = await supabase
      .from("merchant_users")
      .select("id, user_id, role, merchant_id, created_at")
      .limit(1);
    if (!error && data?.length) {
      console.log(JSON.stringify(data[0], null, 2));
    } else if (error) {
      console.log(`  ${error.message}`);
    } else {
      console.log("  (테이블이 비어있음)");
    }
  } catch (err) {
    console.log(`  ${err.message}`);
  }
}

checkAllTables().catch(console.error);
