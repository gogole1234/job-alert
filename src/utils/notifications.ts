import { JobListing } from '../types';

export async function sendNotifications(newJobs: JobListing[]) {
  if (newJobs.length === 0) return;

  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  // --- 1. DISCORD EMBEDS ---
  if (discordWebhookUrl) {
    try {
      const embeds = newJobs.map((job) => ({
        title: `🚨 ${job.title}`,
        url: job.url,
        color: 0x10b981, // Emerald green
        fields: [
          { name: 'Company', value: job.company, inline: true },
          { name: 'Location', value: job.location, inline: true },
        ],
        footer: { text: 'Job Tracker Alert' },
        timestamp: new Date().toISOString(),
      }));

      // Discord allows max 10 embeds per message payload
      for (let i = 0; i < embeds.length; i += 10) {
        await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🔥 **${newJobs.length} New R&D Role(s) Discovered!**`,
            embeds: embeds.slice(i, i + 10),
          }),
        });
      }
      console.log('[🔔] Discord notification sent successfully.');
    } catch (err) {
      console.error('[❌] Failed to send Discord notification:', err);
    }
  }

  // --- 2. TELEGRAM MESSAGE ---
  if (telegramBotToken && telegramChatId) {
    try {
      let message = `🚀 *${newJobs.length} New R&D Role(s) Discovered!*\n\n`;

      newJobs.forEach((job, idx) => {
        message += `${idx + 1}. *[${job.company}]* [${job.title}](${job.url})\n📍 _${job.location}_\n\n`;
      });

      const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        }),
      });

      console.log('[🔔] Telegram notification sent successfully.');
    } catch (err) {
      console.error('[❌] Failed to send Telegram notification:', err);
    }
  }
}