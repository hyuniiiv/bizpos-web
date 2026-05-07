import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('.eval-screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log('[eval]', ...a);

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  log('screenshot:', file, '| url=', page.url(), '| title=', await page.title());
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') log('PAGE ERROR:', msg.text().slice(0, 300));
  });
  page.on('pageerror', (err) => log('PAGE EXCEPTION:', String(err).slice(0, 300)));

  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 20000 });
    await shot(page, '00-login');
  } catch (e) {
    log('login goto err:', e.message);
  }

  try {
    await page.goto('http://localhost:3000/store/admin/terminals', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);
    await shot(page, '01-terminals-list');
    const terminalLink = page.locator('a[href*="/store/admin/terminals/"]').first();
    if (await terminalLink.count() > 0) {
      const href = await terminalLink.getAttribute('href');
      log('terminal link href:', href);
      await terminalLink.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await shot(page, '02-terminal-detail');
    } else {
      log('no terminal link found');
    }
  } catch (e) {
    log('terminals err:', e.message);
    await shot(page, '01-terminals-error').catch(() => {});
  }

  try {
    await page.goto('http://localhost:3000/store/admin/stores', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);
    await shot(page, '03-stores-list');
    const storeLink = page.locator('a[href*="/store/admin/stores/"]').first();
    if (await storeLink.count() > 0) {
      const href = await storeLink.getAttribute('href');
      log('store link href:', href);
      await storeLink.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await shot(page, '04-store-detail');
    } else {
      log('no store link found');
    }
  } catch (e) {
    log('stores err:', e.message);
    await shot(page, '03-stores-error').catch(() => {});
  }

  try {
    await page.goto('http://localhost:3000/store/admin/keys', { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(1500);
    await shot(page, '05-keys-list');
    const keyLink = page.locator('a[href*="/store/admin/keys/"]').first();
    if (await keyLink.count() > 0) {
      const href = await keyLink.getAttribute('href');
      log('key link href:', href);
      await keyLink.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await shot(page, '06-key-detail');
    } else {
      log('no key link found');
    }
  } catch (e) {
    log('keys err:', e.message);
    await shot(page, '05-keys-error').catch(() => {});
  }

  const html = await page.content();
  fs.writeFileSync(path.join(OUT, 'last-page.html'), html.slice(0, 50000));

  await browser.close();
  log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
