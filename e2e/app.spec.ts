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

// window.print is stubbed on every page the tab opens, as the print screen
// would stop the test. Each call is counted on <html>.
async function stubPrint(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.print = () => {
      const root = document.documentElement;
      root.dataset.printed = String(Number(root.dataset.printed ?? 0) + 1);
    };
  });
}

const sheetLabels = (page: Page) => page.locator('#print-sheet .print-label');
const printButton = (page: Page, name: RegExp) => page.getByRole('link', { name });

test('a location prints its label', async ({ page }) => {
  await stubPrint(page);
  await page.goto('./#10AK');

  await printButton(page, /Print a label for 10AK/).click();

  await expect(page).toHaveURL(/\/labels\.html#10AK$/);
  await expect(sheetLabels(page)).toHaveCount(1);
  await expect(sheetLabels(page)).toContainText(['10AKONE ZERO ALPHA KILONOVEMBER']);
  await expect(page.locator('html')).toHaveAttribute('data-printed', '1');

  // On paper only the labels show.
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#print-sheet')).toBeVisible();
  await expect(page.locator('.labels-bar')).toBeHidden();
});

test('a bay prints a label for every shelf', async ({ page }) => {
  await stubPrint(page);
  await page.goto('./');
  await box(page).fill('10a');

  await printButton(page, /Print labels for bay 10A/).click();

  await expect(sheetLabels(page)).toHaveCount(26);
  await expect(sheetLabels(page).first()).toContainText('10AA');
  await expect(sheetLabels(page).last()).toContainText('10AZ');
  await expect(page.locator('#labels-title')).toHaveText('Bay 10A, 26 labels');
});

test('the labels page loads no ads or Tag Manager', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await stubPrint(page);

  await page.goto('./labels.html#10AK');
  await expect(sheetLabels(page)).toHaveCount(1);

  expect(requests.filter(url => new URL(url).hostname !== 'localhost')).toEqual([]);
  expect(await page.locator('script[src*="googlesyndication"], script[src*="googletagmanager"], ins.adsbygoogle').count()).toBe(0);
});

test('the labels page can print again, and goes back to the lookup', async ({ page }) => {
  await stubPrint(page);
  await page.goto('./#10AK');
  await printButton(page, /Print a label for 10AK/).click();
  await expect(page.locator('html')).toHaveAttribute('data-printed', '1');

  await page.getByRole('button', { name: 'Print' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-printed', '2');

  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/#10AK$/);
  await expect(checkChar(page)).toHaveText('NOVEMBER');
});

test('there is nothing to print for half a location', async ({ page }) => {
  await stubPrint(page);
  await page.goto('./');
  await box(page).fill('10');

  await expect(page.locator('#print-labels')).toBeHidden();

  // Or a link to its labels.
  await page.goto('./labels.html#10');
  await expect(page.locator('#labels-note')).toContainText('no label to print for 10');
  await expect(sheetLabels(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-printed');
});

test('printing the page any other way prints the page', async ({ page }) => {
  await page.goto('./#10AK');
  await page.emulateMedia({ media: 'print' });

  await expect(page.locator('.hero')).toBeVisible();
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

test('labels print offline', async ({ page, context }) => {
  await installOffline(page);
  await goOffline(context);
  await stubPrint(page);

  await page.reload();
  await box(page).fill('10AK');
  await printButton(page, /Print a label for 10AK/).click();

  await expect(sheetLabels(page)).toContainText(['10AKONE ZERO ALPHA KILONOVEMBER']);
  await expect(page.locator('html')).toHaveAttribute('data-printed', '1');
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
