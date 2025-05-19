const { createClient } = require('@supabase/supabase-js');

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Function to check if a specific table exists
async function checkTable(tableName) {
  try {
    console.log(`Checking if table '${tableName}' exists...`);

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`  ❌ Table '${tableName}' does not exist`);
        return false;
      } else {
        console.error(`  ❓ Error querying table '${tableName}':`, error.message);
        return false;
      }
    }

    console.log(`  ✅ SUCCESS! Table '${tableName}' exists`);

    // Show sample data
    if (data && data.length > 0) {
      console.log(`  Found ${data.length} row(s)`);
      console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);

      // Check for panchagam-specific columns
      const columns = Object.keys(data[0]);
      const hasPanchagamColumns = 
        columns.includes('nakshatra') || 
        columns.includes('tithi') ||
        columns.includes('vaara') ||
        columns.includes('rahu_kalam');

      if (hasPanchagamColumns) {
        console.log('  ✅✅✅ THIS LOOKS LIKE YOUR PANCHAGAM TABLE! ✅✅✅');
      }
    } else {
      console.log('  Table exists but has no data');
    }

    return true;
  } catch (e) {
    console.error(`  ❌ Exception checking table '${tableName}':`, e.message);
    return false;
  }
}

// Function to try common table names
async function findPanchagamTable() {
  console.log('Searching for your panchagam table...\n');

  const tablesToCheck = [
    'panchagam',
    'panchangam',
    'daily_panchagam',
    'daily_panchangam',
    'panchagam_daily',
    'panchangam_daily',
    'tamil_panchagam',
    'tamil_panchangam',
    'hindu_calendar',
    'astrological_data',
    'panchang'
  ];

  for (const tableName of tablesToCheck) {
    const exists = await checkTable(tableName);
    console.log(); // Add a blank line between results
  }

  console.log('\nIf none of these worked, check your Supabase dashboard for the exact table name.');
}

// Run the search
findPanchagamTable();