import { chromium } from '@playwright/test';

async function testBrowser() {
  console.log('=== LAUNCHING REAL CHROME BROWSER FOR E2E TEST ===');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  const title = await page.title();
  console.log(`Page title loaded: "${title}"`);
  await browser.close();
  console.log('=== REAL CHROME BROWSER LAUNCHED & VERIFIED ===');
}

testBrowser().catch((err) => {
  console.error('Browser Launch Error:', err);
  process.exit(1);
});
