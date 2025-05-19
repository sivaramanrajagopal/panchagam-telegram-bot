// index-minimal.js
// Simplified minimal version of the bot for testing database connection

const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

// Initialize express app for keep-alive
const app = express();
const port = process.env.PORT || 3000;

// Initialize bot and database
const bot = new Telegraf(process.env.BOT_TOKEN);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Test command to check if bot is running
bot.command('ping', (ctx) => {
  ctx.reply('Pong! The bot is running.');
});

// Test command to check database connection
bot.command('test', async (ctx) => {
  try {
    ctx.reply('Testing database connection...');

    const { data, error } = await supabase
      .from('panchagam')
      .select('date')
      .limit(5);

    if (error) {
      console.error('Database error:', error);
      return ctx.reply(`❌ Database error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return ctx.reply('✅ Connection successful, but no data found in the panchagam table.');
    }

    return ctx.reply(`✅ Connection successful! Found ${data.length} rows. First date: ${data[0].date}`);
  } catch (e) {
    console.error('Exception:', e);
    return ctx.reply(`❌ Exception: ${e.message}`);
  }
});

// Command to see all tables in the database
bot.command('tables', async (ctx) => {
  try {
    ctx.reply('Checking available tables...');

    // This requires proper permissions and may not work with all Supabase accounts
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');

    if (error) {
      return ctx.reply(`❌ Error listing tables: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return ctx.reply('No tables found in the database.');
    }

    const tableNames = data.map(t => t.tablename).join(', ');
    return ctx.reply(`Available tables: ${tableNames}`);
  } catch (e) {
    return ctx.reply(`❌ Exception: ${e.message}`);
  }
});

// Command to check if date in provided format exists
bot.command('checkdate', async (ctx) => {
  const dateStr = ctx.message.text.split(' ')[1]; // Get date from command argument
  if (!dateStr) {
    return ctx.reply('Please provide a date in YYYY-MM-DD format. Example: /checkdate 2025-04-13');
  }

  try {
    const { data, error } = await supabase
      .from('panchagam')
      .select('date')
      .eq('date', dateStr);

    if (error) {
      return ctx.reply(`❌ Error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return ctx.reply(`No data found for date: ${dateStr}`);
    }

    return ctx.reply(`✅ Found data for date: ${dateStr}`);
  } catch (e) {
    return ctx.reply(`❌ Exception: ${e.message}`);
  }
});

// Add test data command
bot.command('addtest', async (ctx) => {
  try {
    ctx.reply('Adding test data to the database...');

    const testData = {
      id: "test-" + Date.now(),
      date: "2025-05-01",
      vaara: "Test Day",
      sunrise: "2025-05-01 06:00:00+00",
      sunset: "2025-05-01 18:00:00+00",
      moonrise: "2025-05-01 19:00:00+00",
      moonset: "2025-05-02 07:00:00+00",
      nakshatra: JSON.stringify([{"id": 1, "name": "Test Nakshatra"}]),
      tithi: JSON.stringify([{"id": 1, "name": "Test Tithi", "paksha": "Test Paksha"}]),
      chandrashtama_for: JSON.stringify(["Test Star"]),
      rahu_kalam: "4:30 PM - 6:00 PM",
      yamagandam: "12:00 PM - 1:30 PM",
      cosmic_score: 8.5
    };

    const { data, error } = await supabase
      .from('panchagam')
      .insert([testData]);

    if (error) {
      return ctx.reply(`❌ Error adding test data: ${error.message}`);
    }

    return ctx.reply('✅ Test data added successfully! Try /checkdate 2025-05-01');
  } catch (e) {
    return ctx.reply(`❌ Exception: ${e.message}`);
  }
});

// Simple health check endpoint
app.get('/', (req, res) => {
  res.send('Panchagam Bot diagnostic version is running!');
});

// Start the bot
bot.launch().then(() => {
  console.log('Diagnostic bot is running!');
  console.log('Available commands:');
  console.log('/ping - Check if bot is running');
  console.log('/test - Test database connection');
  console.log('/tables - List available tables');
  console.log('/checkdate YYYY-MM-DD - Check if specific date exists');
  console.log('/addtest - Add test data to the database');

  // Start express server
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to start bot:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));