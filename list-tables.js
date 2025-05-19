const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

async function listTables() {
  try {
    console.log("Listing all tables in the database...");

    // This query works with PostgreSQL to list all tables in the public schema
    const { data, error } = await supabase
      .from("pg_catalog.pg_tables")
      .select("tablename")
      .eq("schemaname", "public");

    if (error) {
      console.error("❌ Error listing tables:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log("No tables found in the database!");
      return;
    }

    console.log("Tables in your database:");
    data.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename}`);
    });
  } catch (e) {
    console.error("❌ Exception:", e.message);
  }
}

listTables();
