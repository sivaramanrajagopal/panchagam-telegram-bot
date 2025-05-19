const { createClient } = require("@supabase/supabase-js");

// Log the environment variables (first few characters only for security)
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log(
  "SUPABASE_KEY starts with:",
  process.env.SUPABASE_KEY
    ? process.env.SUPABASE_KEY.substring(0, 6) + "..."
    : "NOT SET",
);

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

// Simple function to test connection
async function testConnection() {
  try {
    console.log("Testing Supabase connection...");

    // Try to get the current timestamp from Supabase
    const { data, error } = await supabase.rpc("now");

    if (error) {
      console.error("❌ Connection FAILED!");
      console.error("Error message:", error.message);
      console.error("Error details:", error);
      return;
    }

    console.log("✅ Connection SUCCESSFUL!");
    console.log("Server time:", data);

    // Now try to list all tables (if connection works)
    console.log("\nTrying to list tables...");
    try {
      const { data: tables, error: tablesError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public");

      if (tablesError) {
        console.error("❌ Could not list tables:", tablesError.message);
        return;
      }

      if (!tables || tables.length === 0) {
        console.log("No tables found in the public schema.");
        return;
      }

      console.log("Tables in your database:");
      tables.forEach((table, i) => {
        console.log(`${i + 1}. ${table.table_name}`);
      });
    } catch (e) {
      console.error("❌ Exception listing tables:", e.message);
    }
  } catch (e) {
    console.error("❌ Exception testing connection:", e);
  }
}

// Run the test
testConnection();
