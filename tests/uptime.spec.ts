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
  const GLOBAL_TIMEOUT = 25_000; // 25 seconds in milliseconds
  const globalStart = Date.now();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Global timeout of ${GLOBAL_TIMEOUT}ms exceeded`)), GLOBAL_TIMEOUT)
  );

  const testLogic = (async () => {
    if (!process.env.USERNAME_JULIUS || !process.env.PASSWORD_JULIUS) {
      throw new Error('USERNAME_JULIUS and PASSWORD_JULIUS must be set as environment variables');
    }

    const MAX_ALLOWED_DURATION = 15000;
    let maxDuration = 0;
    let timeoutExceeded = false;

    let taskCounter = 1;
    const durations: { number: number; label: string; duration: number }[] = [];

    const measure = async (label: string, fn: () => Promise<void>) => {
      const taskNumber = taskCounter++;

      if (timeoutExceeded) {
        console.log(`Skipping ${taskNumber}. ${label} because max duration was exceeded.`);
        return;
      }

      const start = Date.now();
      try {
        await fn();
      } catch (e: any) {
        const duration = Date.now() - start;
        console.warn(`${taskNumber}. ${label} failed or was aborted after ${duration}ms`);
        durations.push({ number: taskNumber, label, duration });
        maxDuration = Math.max(maxDuration, duration);
        if (duration > MAX_ALLOWED_DURATION) timeoutExceeded = true;
        console.warn('Click Spannung cell failed but test will continue:', e.message);
        return;
      }

      const duration = Date.now() - start;
      console.log(`${taskNumber}. ${label} took ${duration}ms`);
      durations.push({ number: taskNumber, label, duration });
      maxDuration = Math.max(maxDuration, duration);
      if (duration > MAX_ALLOWED_DURATION) {
        console.warn(`${taskNumber}. ${label} exceeded max allowed duration: ${duration}ms`);
        timeoutExceeded = true;
      }
    };

    const start = Date.now();

    await measure('Goto login page', async () => {
      await page.goto('https://cloud.treesense.net/login');
    });

    await measure('Fill email', async () => {
      await page.getByRole('textbox', { name: 'email' }).fill(process.env.USERNAME_JULIUS!);
    });

    await measure('Fill password', async () => {
      await page.getByRole('textbox', { name: 'password' }).fill(process.env.PASSWORD_JULIUS!);
    });

    await measure('Click login button', async () => {
      await page.getByTestId('login-button').click();
    });

    await measure('Wait for projects page', async () => {
      await page.waitForURL('**/projects');
    });

    await measure('Click Klimakammer', async () => {
      await page.getByText('Klimakammer').click();
    });

    await measure('Click Klimakammer button', async () => {
      await page.locator('.d-flex > button').first().click();
    });

    await measure('Click list button', async () => {
      await page.getByRole('link', { name: 'list' }).click();
    });

    await measure('Click Sensoren tab', async () => {
      await page.getByRole('tab', { name: 'Sensoren' }).click();
    });

    await measure('Click sensor ID', async () => {
      await page.getByRole('cell', { name: '70B3D57ED005A270' }).click();
    });

    await measure('Click Spannung cell', async () => {
      await page.getByRole('cell', { name: '3.317 V' }).first().click();
    });

    const duration = Date.now() - start;

    const longest = durations.reduce((a, b) => (a.duration > b.duration ? a : b));
    console.log(`\nLongest step: ${longest.number}. ${longest.label} (${longest.duration}ms)\n`);

    logUptime({ cloudSpeedSingle: maxDuration > MAX_ALLOWED_DURATION ? MAX_ALLOWED_DURATION : maxDuration });
    logUptime({ cloudSpeedAll: duration });
    logUptime({ LongestAction: longest.number });
  })();

  try {
    await Promise.race([testLogic, timeoutPromise]);
  } catch (error: any) {
    const duration = Date.now() - globalStart;
    console.error('Test caught an error (possibly timeout):', error.message);

    logUptime({ cloudSpeedSingle: Math.min(duration, 15000) });
    logUptime({ cloudSpeedAll: duration });
    logUptime({ LongestAction: -1 }); // Optional: indicates timeout or unknown
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



