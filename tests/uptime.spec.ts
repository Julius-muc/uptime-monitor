import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: 'users.env' });
import fs from 'fs';

const logFile = './uptime-log.json';

function logUptime(success: boolean) {
  const record = { timestamp: new Date().toISOString(), success };
  let data = [];

  if (fs.existsSync(logFile)) {
    try {
      data = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    } catch (e) {
      console.error('Error reading uptime-log.json:', e);
    }
  }

  data.push(record);
  fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
}

test('Check Website Uptime', async ({ page }) => {
  // Ensure env variables are set
  if (!process.env.USERNAME_JULIUS || !process.env.PASSWORD_JULIUS) {
    throw new Error('USERNAME_JULIUS and PASSWORD_JULIUS must be set as environment variables');
  }

  try {
    await page.goto('https://cloud.treesense.net/login');
    await page.getByRole('textbox', { name: 'email' }).fill(process.env.USERNAME_JULIUS);
    await page.getByRole('textbox', { name: 'password' }).fill(process.env.PASSWORD_JULIUS);
    await page.getByTestId('login-button').click();
    await page.waitForURL('**/projects');
    await page.getByText('Klimakammer').click();

    logUptime(true);
  } catch (error) {
    logUptime(false);
    console.error('Uptime check failed:', error);
    throw new Error('Website not reachable or test failed');
  }
});
