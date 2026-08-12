import * as dotenv from 'dotenv';
import * as path from 'path';
import { sendNotifications } from '../src/utils/notifications';
import { JobListing } from '../src/types';

// Load .env variables locally
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mockJobs: JobListing[] = [
  {
    title: 'Senior Backend Developer (Test Alert)',
    company: 'Test Company',
    location: 'Tel Aviv, Israel',
    url: 'https://example.com/careers/backend-dev',
    scrapedAt: new Date().toISOString(),
  },
  {
    title: 'Fullstack Engineer (Test Alert)',
    company: 'Test Company',
    location: 'Remote',
    url: 'https://example.com/careers/fullstack-eng',
    scrapedAt: new Date().toISOString(),
  },
];

async function runTest() {
  console.log('🧪 Testing Telegram & Discord Webhooks...\n');

  console.log(`DISCORD_WEBHOOK_URL: ${process.env.DISCORD_WEBHOOK_URL ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`TELEGRAM_BOT_TOKEN:  ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`TELEGRAM_CHAT_ID:   ${process.env.TELEGRAM_CHAT_ID ? '✅ Loaded' : '❌ Missing'}\n`);

  await sendNotifications(mockJobs);

  console.log('\nDone! Check your Discord channel and Telegram chat.');
}

runTest().catch(console.error);