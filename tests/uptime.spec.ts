import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'users.env' });

const logFile = './uptime-log.json';
const MAX_RETRIES = 5;
const ATTEMPT_TIMEOUT_MS = 30000; // 30 seconds per attempt

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

test('Check Website Uptime with Retry', async ({ page }) => {
  test.setTimeout(5 * ATTEMPT_TIMEOUT_MS + 10000); // total timeout buffer

  if (!process.env.USERNAME_JULIUS || !process.env.PASSWORD_JULIUS) {
    throw new Error('USERNAME_JULIUS and PASSWORD_JULIUS must be set as environment variables');
  }

  let attempt = 0;
  let success = false;

  while (attempt < MAX_RETRIES && !success) {
    attempt++;
    try {
      console.log(`Attempt ${attempt}...`);

      await Promise.race([
        (async () => {
          await page.goto('https://cloud.treesense.net/login');
          await page.getByRole('textbox', { name: 'email' }).fill(process.env.USERNAME_JULIUS);
          await page.getByRole('textbox', { name: 'password' }).fill(process.env.PASSWORD_JULIUS);
          await page.getByTestId('login-button').click();
          await page.waitForURL('**/projects');
          await page.getByText('Klimakammer').click();
          await page.locator('.d-flex > button').first().click();
          await page.getByRole('link', { name: 'list' }).click();
          await page.getByRole('tab', { name: 'Sensoren' }).click();
          await page.getByRole('cell', { name: '70B3D57ED005A270' }).click();
          await page.getByText('Letztes Senden: 16.07.2023 12:').click();
          success = true;
          logUptime(true);
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Attempt timed out')), ATTEMPT_TIMEOUT_MS)
        ),
      ]);
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      if (attempt >= MAX_RETRIES) {
        logUptime(false);
        //throw new Error('Website not reachable or test failed after maximum retries');
      }
    }
  }
});