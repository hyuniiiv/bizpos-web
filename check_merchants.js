const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ihyqawscvdsfksjxddrm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloeXFhd3NjdmRzZmtzanhkZHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEzMTY4NDAsImV4cCI6MjA0Njg5Njg0MH0.XM1u9PL0tNLy_ZbUfS6CYv_Eya0xt7Pr4v5RW1TJSl0'
);

(async () => {
  const { data, error } = await supabase
    .from('merchants')
    .select('*');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Merchants:', JSON.stringify(data, null, 2));
  }
})();
