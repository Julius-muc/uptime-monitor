test('Check Cloud speed', async ({ page }) => {
  test.setTimeout(25000); // Give some buffer

  if (!process.env.USERNAME_JULIUS || !process.env.PASSWORD_JULIUS) {
    throw new Error('USERNAME_JULIUS and PASSWORD_JULIUS must be set as environment variables');
  }

  const MAX_ALLOWED_DURATION = 15000;
  let maxDuration = 0;
  let timeoutExceeded = false;

  const measure = async (label: string, fn: () => Promise<void>) => {
    if (timeoutExceeded) {
      console.log(`Skipping ${label} because max duration was exceeded.`);
      return;
    }
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    console.log(`${label} took ${duration}ms`);
    maxDuration = Math.max(maxDuration, duration);
    if (duration > MAX_ALLOWED_DURATION) {
      console.warn(`${label} exceeded max allowed duration: ${duration}ms`);
      timeoutExceeded = true;
    }
  };

  try {
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

    // Log max duration capped at MAX_ALLOWED_DURATION
    logUptime({ cloudSpeed: maxDuration > MAX_ALLOWED_DURATION ? MAX_ALLOWED_DURATION : maxDuration });

  } catch (error) {
    console.error('Test failed:', error.message);
    logUptime({ cloudSpeed: maxDuration > MAX_ALLOWED_DURATION ? MAX_ALLOWED_DURATION : maxDuration });
    throw error; // Still throw to mark test as failed if something else goes wrong
  }
});
