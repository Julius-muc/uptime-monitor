import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'users.env' });

const logFile = './uptime-log.json';
const MAX_RETRIES = 5;
const ATTEMPT_TIMEOUT_MS = 30000; // 30 seconds per attempt

function logUptime(entry: Record<string, boolean>) {
  const record = { timestamp: new Date().toISOString(), ...entry };
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

test('Check Cloud speed', async ({ page }) => {
  test.setTimeout(5 * ATTEMPT_TIMEOUT_MS + 10000); // total timeout buffer

  if (!process.env.USERNAME_JULIUS || !process.env.PASSWORD_JULIUS) {
    throw new Error('USERNAME_JULIUS and PASSWORD_JULIUS must be set as environment variables');
  }

  let attempt = 0;
  let cloudSpeed = false;
  let loggedIn = false;
  let timeoutAction = 20000;

  while (attempt < MAX_RETRIES && !cloudSpeed) {
    attempt++;
    try {
      console.log(`Attempt ${attempt}...`);

      await Promise.race([
        (async () => {
          console.log('Loading cloud.treesense.net');
          await page.goto('https://cloud.treesense.net/login', { timeout: timeoutAction });

          if (!loggedIn) {
            console.log('Typing User');
            await page.getByRole('textbox', { name: 'email' }).fill(process.env.USERNAME_JULIUS, { timeout: timeoutAction });
            console.log('Typing password');
            await page.getByRole('textbox', { name: 'password' }).fill(process.env.PASSWORD_JULIUS, { timeout: timeoutAction });
            console.log('Clicking login button');
            await page.getByTestId('login-button').click({ timeout: timeoutAction });
            console.log('Waiting for loading of projects');
            await page.waitForURL('**/projects', { timeout: timeoutAction });
            loggedIn = true;
          }

          console.log('Waiting for Klimakammer');
          await page.getByText('Klimakammer', { timeout: timeoutAction }).click({ timeout: timeoutAction });
          console.log('Clicking Klimakammer button');
          await page.locator('.d-flex > button').first().click({ timeout: timeoutAction });
          console.log('Clicking list button');
          await page.getByRole('link', { name: 'list' }).click({ timeout: timeoutAction });
          console.log('Clicking sensoren button');
          await page.getByRole('tab', { name: 'Sensoren' }).click({ timeout: timeoutAction });
          console.log('Clicking 70B3D57ED005A270 button');
          await page.getByRole('cell', { name: '70B3D57ED005A270' }).click({ timeout: timeoutAction });
          console.log('Get letztes senden');
          await page.getByRole('cell', { name: 'Sonntag, 16. Juli 2023 um 12:19' }).click({ timeout: timeoutAction });

          cloudSpeed = true;
          logUptime({ cloudSpeed });
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Attempt timed out')), ATTEMPT_TIMEOUT_MS)
        ),
      ]);
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      if (attempt >= MAX_RETRIES) {
        logUptime({ cloudSpeed: false });
      }
    }
  }
});

test('Check Cloud Uptime with Retry', async ({ page }) => {
  test.setTimeout(5 * ATTEMPT_TIMEOUT_MS + 10000); // total timeout buffer

  if (!process.env.USERNAME_JULIUS || !process.env.PASSWORD_JULIUS) {
    throw new Error('USERNAME_JULIUS and PASSWORD_JULIUS must be set as environment variables');
  }

  let attempt = 0;
  let cloud = false;
  let loggedIn = false;

  while (attempt < MAX_RETRIES && !cloud) {
    attempt++;
    try {
      console.log(`Attempt ${attempt}...`);

      await Promise.race([
        (async () => {
          console.log('Loading cloud.treesense.net');
          await page.goto('https://cloud.treesense.net/login');

          if (!loggedIn) {
            console.log('Typing User');
            await page.getByRole('textbox', { name: 'email' }).fill(process.env.USERNAME_JULIUS);
            console.log('Typing password');
            await page.getByRole('textbox', { name: 'password' }).fill(process.env.PASSWORD_JULIUS);
            console.log('Clicking login button');
            await page.getByTestId('login-button').click();
            console.log('waiting for loading of projects');
            await page.waitForURL('**/projects');
            loggedIn = true;
          }

          console.log('Waiting for Klimakammer');
          await page.getByText('Klimakammer').click();
          console.log('Clicking Klimakammer button');
          await page.locator('.d-flex > button').first().click();
          console.log('Clicking list button');
          await page.getByRole('link', { name: 'list' }).click();
          console.log('Clicking sensoren button');
          await page.getByRole('tab', { name: 'Sensoren' }).click();
          console.log('Clicking 70B3D57ED005A270 button');
          await page.getByRole('cell', { name: '70B3D57ED005A270' }).click();
          console.log('Get letztes senden 16');
          await page.getByRole('cell', { name: '3.317 V' }).first().click();

          cloud = true;
          logUptime({ cloud });
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Attempt timed out')), ATTEMPT_TIMEOUT_MS)
        ),
      ]);
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      if (attempt >= MAX_RETRIES) {
        logUptime({ cloud: false });
      }
    }
  }
});

test('Check Main Website Uptime', async ({ page }) => {
  test.setTimeout(5 * ATTEMPT_TIMEOUT_MS + 10000); // total timeout buffer
  let website = false;
  let attempt = 0;

  while (attempt < MAX_RETRIES && !website) {
    attempt++;
    try {
      console.log(`Website check attempt ${attempt}...`);
      await Promise.race([
        page.goto('https://treesense.net', {
          waitUntil: 'domcontentloaded',
          timeout: ATTEMPT_TIMEOUT_MS
        }).then(() => page.locator('.brand-logo').first().click()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Attempt timed out')), ATTEMPT_TIMEOUT_MS)
        ),
      ]);
      website = true;
      logUptime({ website });
    } catch (error) {
      console.warn(`Website check attempt ${attempt} failed:`, error.message);
      if (attempt >= MAX_RETRIES) {
        logUptime({ website: false });
      }
    }
  }
});


test('Check API Uptime', async ({ browser }) => {
  test.setTimeout(5 * ATTEMPT_TIMEOUT_MS + 10000); // total timeout buffer
  let api = false;
  let attempt = 0;

  while (attempt < MAX_RETRIES && !api) {
    attempt++;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      console.log(`API check attempt ${attempt}...`);
      await Promise.race([
        (async () => {
          await page.goto('https://api.treesense.net/', {
            waitUntil: 'domcontentloaded',
            timeout: ATTEMPT_TIMEOUT_MS
          });

          // Optional: Wait for presence of welcome message
          await page.getByText('{"message":"Welcome to the Treesense API"}', {
            exact: false
          });
        })(),

        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Attempt timed out')), ATTEMPT_TIMEOUT_MS)
        ),
      ]);

      api = true;
      logUptime({ api });
    } catch (error) {
      console.warn(`API check attempt ${attempt} failed:`, error.message);
      if (attempt >= MAX_RETRIES) {
        logUptime({ api: false });
      }
    } finally {
      await page.close();
      await context.close();
    }
  }
});



