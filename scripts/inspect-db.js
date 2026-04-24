#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://supabase.gproai.com";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function inspectDB() {
  console.log("📊 Supabase 상세 스키마 분석\n");

  // 1. merchant_users 상세 조회
  console.log("=== merchant_users ===");
  const { data: mu } = await supabase.from("merchant_users").select("*");
  console.log("행 수:", mu?.length || 0);
  if (mu?.length) {
    console.log("Role 분포:");
    const roles = {};
    mu.forEach(m => { roles[m.role] = (roles[m.role] || 0) + 1; });
    Object.entries(roles).forEach(([role, count]) => console.log(`  ${role}: ${count}`));
  }

  // 2. stores 상세 조회
  console.log("\n=== stores ===");
  const { data: stores } = await supabase.from("stores").select("id, merchant_id, store_name");
  console.log("행 수:", stores?.length || 0);
  stores?.forEach(s => console.log(`  ${s.store_name}: merchant_id=${s.merchant_id.substring(0, 8)}...`));

  // 3. terminals 상세 조회
  console.log("\n=== terminals ===");
  const { data: terminals } = await supabase.from("terminals").select("id, merchant_id, store_id, term_id, name");
  console.log("행 수:", terminals?.length || 0);
  console.log("store_id 백필 상태:");
  const filled = terminals?.filter(t => t.store_id).length || 0;
  const unfilled = (terminals?.length || 0) - filled;
  console.log(`  ✅ 백필됨: ${filled}`);
  console.log(`  ❌ 미백필: ${unfilled}`);

  console.log("\n샘플 terminals:");
  terminals?.slice(0, 3).forEach(t => {
    console.log(`  term_id=${t.term_id}, store_id=${t.store_id ? "✓" : "NULL"}, name=${t.name}`);
  });

  // 4. client_users 확인
  console.log("\n=== client_users ===");
  const { data: cu } = await supabase.from("client_users").select("*");
  console.log("행 수:", cu?.length || 0);
  if (cu?.length) {
    console.log("Role 분포:");
    const cuRoles = {};
    cu.forEach(c => { cuRoles[c.role] = (cuRoles[c.role] || 0) + 1; });
    Object.entries(cuRoles).forEach(([role, count]) => console.log(`  ${role}: ${count}`));
  }

  // 5. store_managers 확인
  console.log("\n=== store_managers ===");
  const { data: sm } = await supabase.from("store_managers").select("*");
  console.log("행 수:", sm?.length || 0);

  // 6. role_permissions 확인
  console.log("\n=== role_permissions ===");
  const { data: rp } = await supabase.from("role_permissions").select("role, resource, can_create, can_read, can_update, can_delete");
  console.log("행 수:", rp?.length || 0);
  if (rp?.length) {
    console.log("정의된 권한:");
    rp.slice(0, 5).forEach(p => {
      const perms = [];
      if (p.can_create) perms.push("C");
      if (p.can_read) perms.push("R");
      if (p.can_update) perms.push("U");
      if (p.can_delete) perms.push("D");
      console.log(`  ${p.role}/${p.resource}: ${perms.join("")}`);
    });
  }

  console.log("\n✅ 분석 완료");
}

inspectDB().catch(console.error);
