// Complete index.js with improved message formatting
// Complete bot code for Render deployment with enhanced notification system

const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const moment = require('moment-timezone');
const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Initialize express app (for keep-alive)
const app = express();
const port = process.env.PORT || 3000;

// Initialize bot and database
const bot = new Telegraf(process.env.BOT_TOKEN);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Configure the timezone
const TIMEZONE = 'Asia/Kolkata';

// Specify the table name - USING THE CORRECT TABLE NAME
const TABLE_NAME = 'daily_panchangam';

// Define the directory and file for storage
const DATA_DIR = './data';
const PREFS_FILE = path.join(DATA_DIR, 'preferences.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('Created data directory:', DATA_DIR);
  } catch (e) {
    console.error('Error creating data directory:', e);
  }
}

// Load user preferences from file for persistence
let userPreferences = {};
try {
  if (fs.existsSync(PREFS_FILE)) {
    const data = fs.readFileSync(PREFS_FILE, 'utf8');
    userPreferences = JSON.parse(data);
    console.log(`Loaded preferences for ${Object.keys(userPreferences).length} users from file`);
  } else {
    console.log('No preferences file found, starting with empty preferences');
  }
} catch (error) {
  console.error('Error loading preferences:', error);
}

// Function to save preferences to file
function savePreferences() {
  try {
    fs.writeFileSync(PREFS_FILE, JSON.stringify(userPreferences, null, 2), 'utf8');
    console.log(`Saved preferences for ${Object.keys(userPreferences).length} users to file`);
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

// Helper functions
const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  return moment(timeString).tz(TIMEZONE).format('h:mm A');
};

const getTimeFromRange = (timeRange) => {
  if (!timeRange) return null;
  const times = timeRange.split(' - ');
  if (times.length !== 2) return null;
  return {
    start: moment.tz(times[0], 'h:mm A', TIMEZONE),
    end: moment.tz(times[1], 'h:mm A', TIMEZONE)
  };
};

// Function to safely parse JSON or use the object directly
const safelyParseJSON = (jsonData) => {
  if (!jsonData) return null;

  if (typeof jsonData === 'object') return jsonData;

  try {
    return JSON.parse(jsonData);
  } catch (e) {
    console.error('Error parsing JSON:', e);
    return null;
  }
};

// Test the database connection on startup
async function testDatabaseConnection() {
  console.log('Testing database connection...');

  try {
    // Using the correct table name
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('date')
      .limit(1);

    if (error) {
      console.error('Database connection failed:', error);
      return false;
    }

    console.log('Database connection successful!');
    if (data && data.length > 0) {
      console.log('Sample date:', data[0].date);
    } else {
      console.log('Table exists but no data found');
    }
    return true;
  } catch (e) {
    console.error('Exception testing database:', e);
    return false;
  }
}

// Updated function to get panchagam data for a date
const getPanchagamForDate = async (date) => {
  const formattedDate = moment(date).format('YYYY-MM-DD');
  console.log(`Querying for date: ${formattedDate}`);

  try {
    // Using the correct table name
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('date', formattedDate);

    if (error) {
      console.error('Database query error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log(`No data found for date: ${formattedDate}`);
      return null;
    }

    console.log(`Found data for date: ${formattedDate}`);
    return data[0];
  } catch (e) {
    console.error('Exception in getPanchagamForDate:', e);
    return null;
  }
};

// Updated function to format panchagam message with better spacing
const formatPanchagamMessage = (data) => {
  if (!data) return 'No Panchagam data available for this date.';

  // Extract basic information
  const date = moment(data.date).format('DD-MM-YYYY');
  const day = data.vaara;

  // Extract nakshatra information
  let nakshatra = 'N/A';
  try {
    const nakshatraData = safelyParseJSON(data.nakshatra);
    if (nakshatraData && nakshatraData.length > 0) {
      nakshatra = nakshatraData[0].name;
    }
  } catch (e) {
    console.error('Error extracting nakshatra:', e);
  }

  // Extract tithi information
  let tithi = 'N/A';
  try {
    const tithiData = safelyParseJSON(data.tithi);
    if (tithiData && tithiData.length > 0) {
      tithi = `${tithiData[0].name} (${tithiData[0].paksha})`;
    }
  } catch (e) {
    console.error('Error extracting tithi:', e);
  }

  // Extract chandrashtama information
  let chandrashtama = 'None';
  try {
    const chandrashtamaData = safelyParseJSON(data.chandrashtama_for);
    if (chandrashtamaData && chandrashtamaData.length > 0) {
      chandrashtama = chandrashtamaData.join(', ');
    }
  } catch (e) {
    console.error('Error extracting chandrashtama:', e);
  }

  // Build the message with improved spacing
  // Notice the careful positioning of line breaks and spacing
  const message = `📅 *DAILY PANCHAGAM - ${date} (${day})*

⏰ *TIMINGS*
🌅 Sunrise: ${formatTime(data.sunrise)}
🌇 Sunset: ${formatTime(data.sunset)}
🌔 Moonrise: ${formatTime(data.moonrise)}
🌘 Moonset: ${formatTime(data.moonset)}

🌟 *ASTROLOGICAL INFO*
✨ Nakshatra: ${nakshatra}
🌓 Tithi: ${tithi}${data.is_valar_pirai ? '\n🌒 Valar Pirai (Waxing Moon)' : ''}${data.is_thei_pirai ? '\n🌘 Thei Pirai (Waning Moon)' : ''}${data.is_amavasai ? '\n🌑 Amavasai (New Moon)' : ''}${data.is_pournami ? '\n🌕 Pournami (Full Moon)' : ''}

⚠️ *CAUTION PERIODS*
⏱️ Rahu Kalam: ${data.rahu_kalam || 'N/A'}
⏱️ Yamagandam: ${data.yamagandam || 'N/A'}
⏱️ Kuligai: ${data.kuligai || 'N/A'}
✨ Abhijit Muhurta: ${data.abhijit_muhurta || 'N/A'}

📊 Cosmic Score: ${data.cosmic_score}/10${chandrashtama !== 'None' ? `\n⚠️ Chandrashtama for: ${chandrashtama}` : ''}`;

  return message;
};

// Command handlers
bot.command('start', (ctx) => {
  // Save user to the preferences store if not exists
  if (!userPreferences[ctx.from.id]) {
    userPreferences[ctx.from.id] = {
      notifyRahuKalam: true,
      notifyYamagandam: true,
      notifyChandrashtama: true,
      notifyDaily: true
    };
    savePreferences(); // Save after creating new user preferences
    console.log(`Added new user: ${ctx.from.id} (${ctx.from.username || 'no username'})`);
  }

  return ctx.reply(
    `🙏 Welcome to Panchagam Bot!\n\nI'll help you keep track of daily Panchagam information and send you timely notifications about important periods.\n\nUse the keyboard below to navigate:`,
    {
      reply_markup: {
        keyboard: [
          ['📆 Today\'s Panchagam', '📅 Tomorrow\'s Panchagam'],
          ['⚙️ Notification Settings', '❓ Help']
        ],
        resize_keyboard: true
      }
    }
  );
});

bot.hears('📆 Today\'s Panchagam', async (ctx) => {
  const today = moment().tz(TIMEZONE).startOf('day');
  const data = await getPanchagamForDate(today);

  if (!data) {
    return ctx.reply('Sorry, I couldn\'t retrieve today\'s Panchagam information.');
  }

  return ctx.replyWithMarkdown(formatPanchagamMessage(data));
});

bot.hears('📅 Tomorrow\'s Panchagam', async (ctx) => {
  const tomorrow = moment().tz(TIMEZONE).add(1, 'day').startOf('day');
  const data = await getPanchagamForDate(tomorrow);

  if (!data) {
    return ctx.reply('Sorry, I couldn\'t retrieve tomorrow\'s Panchagam information.');
  }

  return ctx.replyWithMarkdown(formatPanchagamMessage(data));
});

bot.hears('⚙️ Notification Settings', (ctx) => {
  const prefs = userPreferences[ctx.from.id] || {
    notifyRahuKalam: true,
    notifyYamagandam: true,
    notifyChandrashtama: true,
    notifyDaily: true
  };

  if (!userPreferences[ctx.from.id]) {
    userPreferences[ctx.from.id] = prefs;
    savePreferences(); // Save if creating new preferences
  }

  return ctx.reply(
    'Notification Settings:',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `Rahu Kalam: ${prefs.notifyRahuKalam ? '✅' : '❌'}`,
              callback_data: 'toggle_rahu_kalam'
            }
          ],
          [
            {
              text: `Yamagandam: ${prefs.notifyYamagandam ? '✅' : '❌'}`,
              callback_data: 'toggle_yamagandam'
            }
          ],
          [
            {
              text: `Chandrashtama: ${prefs.notifyChandrashtama ? '✅' : '❌'}`,
              callback_data: 'toggle_chandrashtama'
            }
          ],
          [
            {
              text: `Daily Notification: ${prefs.notifyDaily ? '✅' : '❌'}`,
              callback_data: 'toggle_daily'
            }
          ]
        ]
      }
    }
  );
});

bot.hears('❓ Help', (ctx) => {
  return ctx.replyWithMarkdown(`
*Panchagam Bot Help*

This bot provides daily Hindu astrological calendar information and notifications.

*Commands:*
/start - Start the bot and display the main menu
/today - Get today's Panchagam
/tomorrow - Get tomorrow's Panchagam
/settings - Manage notification settings
/test - Test database connection
/testdaily - Test daily notification
/testrahu - Test Rahu Kalam notification
/myprefs - View your notification preferences
/stats - View bot statistics

*Notifications:*
- Daily summary at 6:00 AM
- 15 minutes before Rahu Kalam
- 15 minutes before Yamagandam
- 15 minutes before other important periods

*Keyboard Navigation:*
Use the buttons at the bottom of the screen to navigate through the bot's features.
  `);
});

// Add test commands for notifications
bot.command('testdaily', async (ctx) => {
  try {
    const today = moment().tz(TIMEZONE).startOf('day');
    const data = await getPanchagamForDate(today);

    if (!data) {
      return ctx.reply('❌ No data found for today.');
    }

    // Save the user's ID to preferences if not already there
    if (!userPreferences[ctx.from.id]) {
      userPreferences[ctx.from.id] = {
        notifyRahuKalam: true,
        notifyYamagandam: true,
        notifyChandrashtama: true,
        notifyDaily: true
      };
      savePreferences();
      console.log(`Added new user from testdaily: ${ctx.from.id} (${ctx.from.username || 'no username'})`);
    }

    // Send a test notification
    ctx.replyWithMarkdown(`🌞 *TEST NOTIFICATION* \n\nGood Morning! Here's your daily Panchagam update:\n\n${formatPanchagamMessage(data)}`);

    return ctx.reply('✅ Test notification sent! Your user ID has been saved for future notifications.');
  } catch (e) {
    console.error('Error in test notification:', e);
    return ctx.reply('❌ Error sending test notification.');
  }
});

bot.command('testrahu', async (ctx) => {
  try {
    const today = moment().tz(TIMEZONE).startOf('day');
    const data = await getPanchagamForDate(today);

    if (!data) {
      return ctx.reply('❌ No data found for today.');
    }

    if (!data.rahu_kalam) {
      return ctx.reply('❌ No Rahu Kalam information found for today.');
    }

    // Save the user's ID to preferences if not already there
    if (!userPreferences[ctx.from.id]) {
      userPreferences[ctx.from.id] = {
        notifyRahuKalam: true,
        notifyYamagandam: true,
        notifyChandrashtama: true,
        notifyDaily: true
      };
      savePreferences();
      console.log(`Added new user from testrahu: ${ctx.from.id} (${ctx.from.username || 'no username'})`);
    }

    // Extract Rahu Kalam time
    const rahuKalamTime = getTimeFromRange(data.rahu_kalam);
    if (!rahuKalamTime) {
      return ctx.reply('❌ Could not parse Rahu Kalam time.');
    }

    // Send a test notification
    ctx.replyWithMarkdown(`⚠️ *TEST: Rahu Kalam Alert*\nRahu Kalam will begin in 15 minutes (${formatTime(rahuKalamTime.start)} to ${formatTime(rahuKalamTime.end)}). Plan your activities accordingly.`);

    return ctx.reply('✅ Test Rahu Kalam notification sent! Your user ID has been saved for future notifications.');
  } catch (e) {
    console.error('Error in test notification:', e);
    return ctx.reply('❌ Error sending test notification.');
  }
});

// Add command to view preferences
bot.command('myprefs', (ctx) => {
  const userId = ctx.from.id;
  const prefs = userPreferences[userId];

  if (!prefs) {
    return ctx.reply('❌ You don\'t have any saved preferences. Use /start to set up notifications.');
  }

  return ctx.reply(`Your notification preferences:\n\nRahu Kalam: ${prefs.notifyRahuKalam ? '✅' : '❌'}\nYamagandam: ${prefs.notifyYamagandam ? '✅' : '❌'}\nChandrashtama: ${prefs.notifyChandrashtama ? '✅' : '❌'}\nDaily: ${prefs.notifyDaily ? '✅' : '❌'}\n\nYour User ID: ${userId}`);
});

// Add stats command
bot.command('stats', (ctx) => {
  const userCount = Object.keys(userPreferences).length;
  const notificationsEnabled = Object.values(userPreferences)
    .filter(p => p.notifyDaily || p.notifyRahuKalam || p.notifyYamagandam || p.notifyChandrashtama)
    .length;

  const dailyEnabled = Object.values(userPreferences).filter(p => p.notifyDaily).length;
  const rahuEnabled = Object.values(userPreferences).filter(p => p.notifyRahuKalam).length;
  const yamaEnabled = Object.values(userPreferences).filter(p => p.notifyYamagandam).length;
  const chandrashtamaEnabled = Object.values(userPreferences).filter(p => p.notifyChandrashtama).length;

  return ctx.reply(`📊 *Bot Statistics*\n\nTotal Users: ${userCount}\nUsers with any notifications: ${notificationsEnabled}\n\nNotification Types:\n- Daily: ${dailyEnabled}\n- Rahu Kalam: ${rahuEnabled}\n- Yamagandam: ${yamaEnabled}\n- Chandrashtama: ${chandrashtamaEnabled}\n\nBot uptime: ${formatUptime()}`, 
    { parse_mode: 'Markdown' });
});

// Helper function for uptime
let startTime = new Date();
function formatUptime() {
  const uptime = new Date() - startTime;
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

  return `${days}d ${hours}h ${minutes}m`;
}

// Add test command to check database connection
bot.command('test', async (ctx) => {
  ctx.reply('Testing database connection...');

  const testConnected = await testDatabaseConnection();

  if (!testConnected) {
    return ctx.reply('❌ Database connection failed. Please check your credentials and try again.');
  }

  // Check if we can get data for today
  const today = moment().tz(TIMEZONE).startOf('day');
  const todayFormatted = today.format('YYYY-MM-DD');

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('date', todayFormatted);

  if (error) {
    return ctx.reply(`❌ Error querying today's date: ${error.message}`);
  }

  if (!data || data.length === 0) {
    // Try to get any date to confirm the database has data
    const { data: anyData, error: anyError } = await supabase
      .from(TABLE_NAME)
      .select('date')
      .limit(5);

    if (anyError) {
      return ctx.reply(`❌ Error querying any dates: ${anyError.message}`);
    }

    if (!anyData || anyData.length === 0) {
      return ctx.reply('✅ Database connection works, but no data found in the table.');
    }

    return ctx.reply(`✅ Database works! No data for today (${todayFormatted}), but found data for other dates: ${anyData.map(d => d.date).join(', ')}`);
  }

  return ctx.reply(`✅ Success! Found data for today (${todayFormatted}).\nNakshatra: ${typeof data[0].nakshatra === 'string' ? 'JSON string' : 'JSON object'}`);
});

// Shortcut commands
bot.command('today', async (ctx) => {
  const today = moment().tz(TIMEZONE).startOf('day');
  const data = await getPanchagamForDate(today);

  if (!data) {
    return ctx.reply('Sorry, I couldn\'t retrieve today\'s Panchagam information.');
  }

  return ctx.replyWithMarkdown(formatPanchagamMessage(data));
});

bot.command('tomorrow', async (ctx) => {
  const tomorrow = moment().tz(TIMEZONE).add(1, 'day').startOf('day');
  const data = await getPanchagamForDate(tomorrow);

  if (!data) {
    return ctx.reply('Sorry, I couldn\'t retrieve tomorrow\'s Panchagam information.');
  }

  return ctx.replyWithMarkdown(formatPanchagamMessage(data));
});

bot.command('settings', async (ctx) => {
  // Trigger the settings handler
  const prefs = userPreferences[ctx.from.id] || {
    notifyRahuKalam: true,
    notifyYamagandam: true,
    notifyChandrashtama: true,
    notifyDaily: true
  };

  if (!userPreferences[ctx.from.id]) {
    userPreferences[ctx.from.id] = prefs;
    savePreferences(); // Save if creating new preferences
  }

  return ctx.reply(
    'Notification Settings:',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `Rahu Kalam: ${prefs.notifyRahuKalam ? '✅' : '❌'}`,
              callback_data: 'toggle_rahu_kalam'
            }
          ],
          [
            {
              text: `Yamagandam: ${prefs.notifyYamagandam ? '✅' : '❌'}`,
              callback_data: 'toggle_yamagandam'
            }
          ],
          [
            {
              text: `Chandrashtama: ${prefs.notifyChandrashtama ? '✅' : '❌'}`,
              callback_data: 'toggle_chandrashtama'
            }
          ],
          [
            {
              text: `Daily Notification: ${prefs.notifyDaily ? '✅' : '❌'}`,
              callback_data: 'toggle_daily'
            }
          ]
        ]
      }
    }
  );
});

// Callback queries for notification settings
bot.action('toggle_rahu_kalam', (ctx) => {
  const userId = ctx.from.id;
  if (!userPreferences[userId]) {
    userPreferences[userId] = {
      notifyRahuKalam: true,
      notifyYamagandam: true,
      notifyChandrashtama: true,
      notifyDaily: true
    };
  }

  userPreferences[userId].notifyRahuKalam = !userPreferences[userId].notifyRahuKalam;
  savePreferences(); // Save after updating preferences

  // Update the keyboard
  const prefs = userPreferences[userId];
  ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [
        {
          text: `Rahu Kalam: ${prefs.notifyRahuKalam ? '✅' : '❌'}`,
          callback_data: 'toggle_rahu_kalam'
        }
      ],
      [
        {
          text: `Yamagandam: ${prefs.notifyYamagandam ? '✅' : '❌'}`,
          callback_data: 'toggle_yamagandam'
        }
      ],
      [
        {
          text: `Chandrashtama: ${prefs.notifyChandrashtama ? '✅' : '❌'}`,
          callback_data: 'toggle_chandrashtama'
        }
      ],
      [
        {
          text: `Daily Notification: ${prefs.notifyDaily ? '✅' : '❌'}`,
          callback_data: 'toggle_daily'
        }
      ]
    ]
  });

  return ctx.answerCbQuery(`Rahu Kalam notifications ${prefs.notifyRahuKalam ? 'enabled' : 'disabled'}`);
});

bot.action('toggle_yamagandam', (ctx) => {
  const userId = ctx.from.id;
  if (!userPreferences[userId]) {
    userPreferences[userId] = {
      notifyRahuKalam: true,
      notifyYamagandam: true,
      notifyChandrashtama: true,
      notifyDaily: true
    };
  }

  userPreferences[userId].notifyYamagandam = !userPreferences[userId].notifyYamagandam;
  savePreferences(); // Save after updating preferences

  // Update the keyboard
  const prefs = userPreferences[userId];
  ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [
        {
          text: `Rahu Kalam: ${prefs.notifyRahuKalam ? '✅' : '❌'}`,
          callback_data: 'toggle_rahu_kalam'
        }
      ],
      [
        {
          text: `Yamagandam: ${prefs.notifyYamagandam ? '✅' : '❌'}`,
          callback_data: 'toggle_yamagandam'
        }
      ],
      [
        {
          text: `Chandrashtama: ${prefs.notifyChandrashtama ? '✅' : '❌'}`,
          callback_data: 'toggle_chandrashtama'
        }
      ],
      [
        {
          text: `Daily Notification: ${prefs.notifyDaily ? '✅' : '❌'}`,
          callback_data: 'toggle_daily'
        }
      ]
    ]
  });

  return ctx.answerCbQuery(`Yamagandam notifications ${prefs.notifyYamagandam ? 'enabled' : 'disabled'}`);
});

bot.action('toggle_chandrashtama', (ctx) => {
  const userId = ctx.from.id;
  if (!userPreferences[userId]) {
    userPreferences[userId] = {
      notifyRahuKalam: true,
      notifyYamagandam: true,
      notifyChandrashtama: true,
      notifyDaily: true
    };
  }

  userPreferences[userId].notifyChandrashtama = !userPreferences[userId].notifyChandrashtama;
  savePreferences(); // Save after updating preferences

  // Update the keyboard
  const prefs = userPreferences[userId];
  ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [
        {
          text: `Rahu Kalam: ${prefs.notifyRahuKalam ? '✅' : '❌'}`,
          callback_data: 'toggle_rahu_kalam'
        }
      ],
      [
        {
          text: `Yamagandam: ${prefs.notifyYamagandam ? '✅' : '❌'}`,
          callback_data: 'toggle_yamagandam'
        }
      ],
      [
        {
          text: `Chandrashtama: ${prefs.notifyChandrashtama ? '✅' : '❌'}`,
          callback_data: 'toggle_chandrashtama'
        }
      ],
      [
        {
          text: `Daily Notification: ${prefs.notifyDaily ? '✅' : '❌'}`,
          callback_data: 'toggle_daily'
        }
      ]
    ]
  });

  return ctx.answerCbQuery(`Chandrashtama notifications ${prefs.notifyChandrashtama ? 'enabled' : 'disabled'}`);
});

bot.action('toggle_daily', (ctx) => {
  const userId = ctx.from.id;
  if (!userPreferences[userId]) {
    userPreferences[userId] = {
      notifyRahuKalam: true,
      notifyYamagandam: true,
      notifyChandrashtama: true,
      notifyDaily: true
    };
  }

  userPreferences[userId].notifyDaily = !userPreferences[userId].notifyDaily;
  savePreferences(); // Save after updating preferences

  // Update the keyboard
  const prefs = userPreferences[userId];
  ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [
        {
          text: `Rahu Kalam: ${prefs.notifyRahuKalam ? '✅' : '❌'}`,
          callback_data: 'toggle_rahu_kalam'
        }
      ],
      [
        {
          text: `Yamagandam: ${prefs.notifyYamagandam ? '✅' : '❌'}`,
          callback_data: 'toggle_yamagandam'
        }
      ],
      [
        {
          text: `Chandrashtama: ${prefs.notifyChandrashtama ? '✅' : '❌'}`,
          callback_data: 'toggle_chandrashtama'
        }
      ],
      [
        {
          text: `Daily Notification: ${prefs.notifyDaily ? '✅' : '❌'}`,
          callback_data: 'toggle_daily'
        }
      ]
    ]
  });

  return ctx.answerCbQuery(`Daily notifications ${prefs.notifyDaily ? 'enabled' : 'disabled'}`);
});

// Notification system with cron jobs
function setupNotifications() {
  console.log('Setting up notification system...');

  // Daily morning notification at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('Running daily notification cron job');
    const today = moment().tz(TIMEZONE).startOf('day');
    const data = await getPanchagamForDate(today);

    if (!data) {
      console.error('Failed to fetch panchagam data for daily notification');
      return;
    }

    // Send to all users who have daily notifications enabled
    const usersWithDaily = Object.entries(userPreferences).filter(([_, prefs]) => prefs.notifyDaily);
    console.log(`Sending daily notifications to ${usersWithDaily.length} users`);

    let successCount = 0;
    let errorCount = 0;

    for (const [userId, prefs] of usersWithDaily) {
      try {
        await bot.telegram.sendMessage(
          userId,
          `🌞 *Good Morning! Here's your daily Panchagam update:*\n\n${formatPanchagamMessage(data)}`,
          { parse_mode: 'Markdown' }
        );
        successCount++;
      } catch (e) {
        console.error(`Error sending daily notification to user ${userId}:`, e.message);
        errorCount++;
      }
    }

    console.log(`Daily notifications: ${successCount} sent, ${errorCount} failed`);
  }, {
    timezone: TIMEZONE
  });

  // Check every 5 minutes for upcoming important periods
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running period notification check');
    const now = moment().tz(TIMEZONE);
    const today = now.clone().startOf('day');
    const data = await getPanchagamForDate(today);

    if (!data) {
      console.log('No data found for today in period notification check');
      return;
    }

    // Function to check if a period starts in 15 minutes
    const shouldSendNotification = (periodTimeStr) => {
      if (!periodTimeStr) return false;

      const periodTime = getTimeFromRange(periodTimeStr);
      if (!periodTime) return false;

      // Check if the period starts in 15 minutes (with a small buffer)
      const minutesUntilStart = periodTime.start.diff(now, 'minutes');
      return minutesUntilStart >= 14 && minutesUntilStart <= 16;
    };

    let notificationsSent = 0;

    // Check for Rahu Kalam
    if (shouldSendNotification(data.rahu_kalam)) {
      const rahuKalamTime = getTimeFromRange(data.rahu_kalam);

      const usersWithRahuKalam = Object.entries(userPreferences)
        .filter(([_, prefs]) => prefs.notifyRahuKalam);

      console.log(`Sending Rahu Kalam notifications to ${usersWithRahuKalam.length} users`);

      for (const [userId, prefs] of usersWithRahuKalam) {
        try {
          await bot.telegram.sendMessage(
            userId,
            `⚠️ *Rahu Kalam Alert*\nRahu Kalam will begin in 15 minutes (${formatTime(rahuKalamTime.start)} to ${formatTime(rahuKalamTime.end)}). Plan your activities accordingly.`,
            { parse_mode: 'Markdown' }
          );
          notificationsSent++;
        } catch (e) {
          console.error(`Error sending Rahu Kalam notification to user ${userId}:`, e.message);
        }
      }
    }

    // Check for Yamagandam
    if (shouldSendNotification(data.yamagandam)) {
      const yamagandamTime = getTimeFromRange(data.yamagandam);

      const usersWithYamagandam = Object.entries(userPreferences)
        .filter(([_, prefs]) => prefs.notifyYamagandam);

      console.log(`Sending Yamagandam notifications to ${usersWithYamagandam.length} users`);

      for (const [userId, prefs] of usersWithYamagandam) {
        try {
          await bot.telegram.sendMessage(
            userId,
            `⚠️ *Yamagandam Alert*\nYamagandam will begin in 15 minutes (${formatTime(yamagandamTime.start)} to ${formatTime(yamagandamTime.end)}). Plan your activities accordingly.`,
            { parse_mode: 'Markdown' }
          );
          notificationsSent++;
        } catch (e) {
          console.error(`Error sending Yamagandam notification to user ${userId}:`, e.message);
        }
      }
    }

    // Check for Kuligai
    if (shouldSendNotification(data.kuligai)) {
      const kuligaiTime = getTimeFromRange(data.kuligai);

      const usersWithRahuKalam = Object.entries(userPreferences)
        .filter(([_, prefs]) => prefs.notifyRahuKalam); // Using same preference as Rahu Kalam

      console.log(`Sending Kuligai notifications to ${usersWithRahuKalam.length} users`);

      for (const [userId, prefs] of usersWithRahuKalam) {
        try {
          await bot.telegram.sendMessage(
            userId,
            `⚠️ *Kuligai Alert*\nKuligai will begin in 15 minutes (${formatTime(kuligaiTime.start)} to ${formatTime(kuligaiTime.end)}). Plan your activities accordingly.`,
            { parse_mode: 'Markdown' }
          );
          notificationsSent++;
        } catch (e) {
          console.error(`Error sending Kuligai notification to user ${userId}:`, e.message);
        }
      }
    }

    // Check for Abhijit Muhurta
    if (shouldSendNotification(data.abhijit_muhurta)) {
      const abhijitTime = getTimeFromRange(data.abhijit_muhurta);

      const usersWithDaily = Object.entries(userPreferences)
        .filter(([_, prefs]) => prefs.notifyDaily); // Using daily notification preference

      console.log(`Sending Abhijit Muhurta notifications to ${usersWithDaily.length} users`);

      for (const [userId, prefs] of usersWithDaily) {
        try {
          await bot.telegram.sendMessage(
            userId,
            `✨ *Abhijit Muhurta Alert*\nThe auspicious Abhijit Muhurta will begin in 15 minutes (${formatTime(abhijitTime.start)} to ${formatTime(abhijitTime.end)}). This is considered a good time for starting important activities.`,
            { parse_mode: 'Markdown' }
          );
          notificationsSent++;
        } catch (e) {
          console.error(`Error sending Abhijit Muhurta notification to user ${userId}:`, e.message);
        }
      }
    }

    if (notificationsSent > 0) {
      console.log(`Sent ${notificationsSent} period notifications`);
    }
  }, {
    timezone: TIMEZONE
  });

  // Add a self-checking notification system
  cron.schedule('*/10 * * * *', () => {
    console.log('Running self-check (every 10 minutes)');

    // Log the number of users
    const userCount = Object.keys(userPreferences).length;
    console.log(`Currently have ${userCount} users with preferences`);

    // Current time in Indian timezone
    const now = moment().tz(TIMEZONE);
    console.log(`Current time in ${TIMEZONE}: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
  });
}

// Set up self-polling to keep the service alive
let appUrl = process.env.APP_URL || null;

// Function to ping the app every 5 minutes to keep it alive
async function setupSelfPolling() {
  if (!appUrl) {
    console.log('APP_URL environment variable not set. Self-polling disabled.');
    return;
  }
  
  console.log(`Setting up self-polling for URL: ${appUrl}`);
  
  // Add a ping endpoint that just returns 200 OK
  app.get('/ping', (req, res) => {
    res.status(200).send('OK');
  });
  
  // Add more frequent pinging using setTimeout instead of cron
  // This will ping every 40 seconds to prevent the 50-second timeout
  const pingInterval = 40 * 1000; // 40 seconds in milliseconds
  
  // Function to ping the server
  const pingServer = async () => {
    try {
      console.log(`Pinging self at ${appUrl}/ping to prevent sleep...`);
      const response = await axios.get(`${appUrl}/ping`);
      console.log(`Self-ping successful (${response.status})`);
    } catch (error) {
      console.error('Error pinging self:', error.message);
    }
    
    // Schedule the next ping
    setTimeout(pingServer, pingInterval);
  };
  
  // Start the pinging process
  console.log(`Starting self-ping every ${pingInterval/1000} seconds`);
  setTimeout(pingServer, pingInterval);
  
  // Keep the cron job as a backup (every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    console.log('Backup cron job running self-ping check...');
    try {
      const response = await axios.get(`${appUrl}/ping`);
      console.log(`Backup cron self-ping successful (${response.status})`);
    } catch (error) {
      console.error('Error in backup cron self-ping:', error.message);
    }
  });
}

// Set up simple express server for health checks and to keep the app alive
app.get('/', (req, res) => {
  const uptime = formatUptime();
  const userCount = Object.keys(userPreferences).length;

  res.send(`
    <html>
      <head>
        <title>Panchagam Bot Status</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .status { background-color: #e9f7ef; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
          .success { color: #27ae60; }
          h1 { color: #2c3e50; }
          .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .stat-card { background-color: #f8f9fa; border-radius: 5px; padding: 15px; }
          .footer { margin-top: 30px; color: #7f8c8d; font-size: 0.8em; }
        </style>
      </head>
      <body>
        <h1>Panchagam Bot Status</h1>
        <div class="status">
          <h2 class="success">✅ Bot is running!</h2>
          <p>Uptime: ${uptime}</p>
        </div>

        <h2>Statistics</h2>
        <div class="stats">
          <div class="stat-card">
            <h3>Users</h3>
            <p>Total registered: ${userCount}</p>
          </div>
          <div class="stat-card">
            <h3>System</h3>
            <p>Server time: ${new Date().toISOString()}</p>
            <p>Indian time: ${moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}</p>
          </div>
        </div>

        <div class="footer">
          <p>Tamil Panchagam Bot | Created with Telegraf</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    uptime: formatUptime(),
    users: Object.keys(userPreferences).length,
    time: {
      server: new Date().toISOString(),
      indian: moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
    }
  });
});

// For Uptime Robot pings
app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

// Start the bot using polling mode
bot.launch().then(async () => {
  console.log('Panchagam Bot is starting...');
  startTime = new Date(); // Record start time for uptime calculation

  // Test the database connection
  const isConnected = await testDatabaseConnection();
  if (!isConnected) {
    console.error('⚠️ WARNING: Database connection test failed. Bot may not work correctly.');
  } else {
    console.log('✅ Database connection successful! Bot is ready.');
  }

  // Set up notifications
  setupNotifications();

  // Set up self-polling
  setupSelfPolling();

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
