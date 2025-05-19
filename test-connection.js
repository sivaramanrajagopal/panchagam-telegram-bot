// test-connection.js
const { createClient } = require('@supabase/supabase-js');

console.log('URL:', process.env.SUPABASE_URL);
console.log('Key starts with:', process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.substring(0, 5) + '...' : 'NOT SET');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function test() {
  try {
    console.log('Testing connection to daily_panchagam table...');
    const { data, error } = await supabase
      .from('daily_panchagam')
      .select('date')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    console.log('✅ Connection successful!');
    console.log('Data:', data);
  } catch (e) {
    console.error('❌ Exception:', e.message);
  }
}

test();