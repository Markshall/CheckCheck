import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';

// Tag Manager and AdSense are blocked, so the tests don't send lookups to
// Google or show ads, and the page has to work without them.
test.beforeEach(async ({ context }) => {
  await context.route(url => url.hostname !== 'localhost', route => route.abort());
});

const box = (page: Page) => page.getByRole('textbox', { name: 'Shelf location or check character' });
const checkChar = (page: Page) => page.locator('#check-char');
const label = (page: Page) => page.locator('#location-text');

// Waits until the service worker has cached the app and controls the page.
async function installOffline(page: Page): Promise<void> {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });
}

async function goOffline(context: BrowserContext): Promise<void> {
  await context.setOffline(true);
}

test('a location shows its check character', async ({ page }) => {
  await page.goto('./');
  await box(page).fill('10ak');

  await expect(label(page)).toHaveText('“ONE ZERO ALPHA KILO”');
  await expect(checkChar(page)).toHaveText('NOVEMBER');
});

test('tapping an example looks it up', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'J1PG Jewellery' }).click();

  await expect(box(page)).toHaveValue('J1PG');
  await expect(checkChar(page)).toHaveText('ECHO');
  await expect(page.locator('#examples')).toBeHidden();
});

test('only a browser too old to run the app says so', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.locator('#browser-note')).toBeHidden();

  // Like Internet Explorer, or a browser from before late 2020.
  await context.addInitScript(() => { delete (Element.prototype as Partial<Element>).replaceChildren; });
  const old = await context.newPage();
  await old.goto('./');
  await expect(old.locator('#browser-note')).toBeVisible();
});

test('a link opens straight to its lookup', async ({ page }) => {
  await page.goto('./#J1PG');

  await expect(box(page)).toHaveValue('J1PG');
  await expect(checkChar(page)).toHaveText('ECHO');
});

test('the link follows what is typed', async ({ page }) => {
  await page.goto('./');

  await box(page).fill('10a+');
  await expect(page).toHaveURL(/#10A\+$/);

  await box(page).fill('');
  await expect(page).toHaveURL(/\/$/);
});

test('a link opened while the page is open looks it up', async ({ page }) => {
  await page.goto('./');
  await box(page).fill('10AK');

  await page.evaluate(() => { location.hash = 'NOVEMBER'; });

  await expect(box(page)).toHaveValue('NOVEMBER');
  await expect(page.locator('#reverse-lookup-results')).toContainText('have the check character NOVEMBER');
});

// AdSense adds #google_vignette when it shows a vignette ad.
test('an ad hash leaves the lookup as it is', async ({ page }) => {
  await page.goto('./');
  await box(page).fill('10AK');
  const before = await checkChar(page).textContent();

  await page.evaluate(() => { location.hash = 'google_vignette'; });

  await expect(box(page)).toHaveValue('10AK');
  await expect(checkChar(page)).toHaveText(before ?? '');
});

test('a page opened with an ad hash starts empty', async ({ page }) => {
  await page.goto('./#google_vignette');

  await expect(box(page)).toHaveValue('');
});

test('a link is remembered in recent lookups', async ({ page }) => {
  await page.goto('./#L10A');
  await expect(checkChar(page)).toHaveText('GOLF');

  await box(page).fill('');
  await expect(page.locator('#recent')).toContainText('L10A');
});

test('it works offline once it has been opened', async ({ page, context }) => {
  await installOffline(page);
  await goOffline(context);

  await page.reload();
  await box(page).fill('10AK');

  await expect(checkChar(page)).toHaveText('NOVEMBER');
});

test('a link works offline', async ({ page, context }) => {
  await installOffline(page);
  await goOffline(context);

  // A new tab, as going to ./#S1PG from ./ would only change the hash of
  // the page that's already open, not load it again.
  const tab = await context.newPage();
  await tab.goto('./#S1PG');

  await expect(checkChar(tab)).toHaveText('X-RAY');
});

test('the font is cached for offline', async ({ page, context }) => {
  await installOffline(page);
  await goOffline(context);
  await page.reload();

  // The page's font loads from the cache, so it isn't drawn in a fallback.
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(font => font.family.includes('Source Sans 3') && font.status === 'loaded');
  });
  expect(loaded).toBe(true);
});
