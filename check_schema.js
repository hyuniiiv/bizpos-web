const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // merchant_users 테이블 구조 확인
  const { data, error } = await supabase
    .from('merchant_users')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('merchant_users columns:', Object.keys(data[0] || {}));
    console.log('Sample data:', data[0]);
  }
})();
