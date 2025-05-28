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
    //await page.getByRole('link', { name: 'Projekte' }).click();
    //await page.locator('.d-flex > button').first().click();
    //await page.getByRole('link', { name: 'list' }).click();
    //await page.getByRole('tab', { name: 'Sensoren' }).click();
    //await page.getByRole('cell', { name: '70B3D57ED005A270' }).click();
    //await page.getByText('Letztes Senden: 16.07.2023 12:').click();

    logUptime(true);
  } catch (error) {
    logUptime(false);
    console.error('Uptime check failed:', error);
    throw new Error('Website not reachable or test failed');
  }
});
