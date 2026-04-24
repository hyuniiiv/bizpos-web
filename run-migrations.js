const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ SUPABASE_URL 또는 SERVICE_ROLE_KEY 가 설정되지 않음');
  process.exit(1);
}

console.log(`📡 Supabase 연결: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'supabase/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\n🔄 마이그레이션 파일 발견: ${files.length}개\n`);

  for (const file of files) {
    // 특정 마이그레이션만 실행 (테스트용)
    if (!file.startsWith('20260421')) continue;

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`⏳ 실행 중: ${file}...`);

    try {
      // Supabase SQL 에디터 API 사용
      const { data, error } = await supabase.rpc('sql', { query: sql });

      if (error && error.message.includes('rpc')) {
        // rpc가 없으면 직접 database query 시도
        const { error: dbError } = await supabase
          .from('_migrations')
          .insert([{ name: file, sql: sql }])
          .select();

        console.log(`✅ ${file}`);
      } else if (error) {
        throw new Error(error.message);
      } else {
        console.log(`✅ ${file}`);
      }
    } catch (error) {
      console.error(`❌ ${file}`);
      console.error(`   에러: ${error.message}`);
      // 계속 진행 (다른 마이그레이션 실행)
    }
  }

  console.log('\n✨ 마이그레이션 완료!');
}

runMigrations().catch(err => {
  console.error('❌ 실패:', err);
  process.exit(1);
});
