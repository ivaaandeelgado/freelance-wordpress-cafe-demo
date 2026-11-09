import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const previewOnly = process.argv.includes('--local-blueprint');
const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, 'test-results/playground');
await mkdir(out, { recursive: true });
const blueprintUrl = 'https://raw.githubusercontent.com/ivaaandeelgado/freelance-wordpress-cafe-demo/main/docs/playground.json';
const url = `https://playground.wordpress.net/?mode=seamless&blueprint-url=${encodeURIComponent(blueprintUrl)}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { startedAtUtc: new Date().toISOString(), mode: previewOnly ? 'local-blueprint-intercept-only' : 'public-unmodified-url', url, checks: [], errors: [], expectedValidationErrors: [] };
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
page.on('console', message => {
  if (message.type() !== 'error') return;
  const error = { message: message.text().slice(0, 400), url: message.location().url };
  if (error.message.includes('status of 400') && error.url.includes('miga/v1/quote')) report.expectedValidationErrors.push(error);
  else report.errors.push(error);
});
if (previewOnly) {
  const body = await readFile(resolve(root, 'docs/playground.json'), 'utf8');
  await context.route(blueprintUrl, route => route.fulfill({
    status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body,
  }));
}
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('Playground opened; waiting for browser WordPress and Elementor.');
  let site;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (await frame.getByRole('navigation', { name: 'Navegación principal', exact: true }).count().catch(() => 0)) { site = frame; break; }
    }
    if (site) break;
    await page.waitForTimeout(1000);
  }
  if (!site) throw new Error('Miga did not load: ' + (await page.locator('body').innerText()).slice(0, 2500));
  const runtimeBase = site.url();
  report.checks.push({ check: 'home loaded', url: site.url() });
  await site.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('link', { name: 'La carta', exact: true }).click();
  await site.locator('#menu-search').waitFor({ timeout: 30000 });
  report.checks.push({ check: 'menu navigation', url: site.url() });
  await site.locator('#menu-search').fill('croissant');
  await page.waitForTimeout(300);
  report.checks.push({ check: 'menu search', result: await site.locator('#menu-status').innerText() });
  assert.match(await site.locator('#menu-status').innerText(), /^1 opci/);
  await site.locator('#menu-reset').click();
  await site.locator('[data-product="cafe-2"]').click();
  await site.locator('#product-form select[name="size"]').selectOption('large');
  await site.locator('#product-form select[name="milk"]').selectOption('oat');
  await site.locator('#product-form input[name="shot"]').check();
  await site.locator('#product-form input[name="quantity"]').fill('2');
  assert.match(await site.locator('#product-total').innerText(), /10,40/);
  await site.getByRole('button', { name: 'Añadir a mi bolsa' }).click();
  await site.locator('#bag-open').click();
  await site.locator('#bag-verify').click();
  await site.waitForFunction(() => document.querySelector('#bag-feedback')?.textContent.includes('Presupuesto comprobado'), null, { timeout: 50000 });
  const quotation = await site.locator('#bag-feedback').innerText();
  assert.match(quotation, /10,40/);
  report.checks.push({ check: 'WordPress PHP quotation from browser', result: quotation });
  await page.screenshot({ path: resolve(out, 'desktop.png') });
  await page.keyboard.press('Escape');
  const api = await site.evaluate(async () => {
    const endpoint = window.MigaExperience.quoteUrl;
    const post = async items => {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, totalCents: 1 }) });
      return { status: r.status, body: await r.json() };
    };
    return {
      correct: await post([{ id: 'cafe-2', quantity: 2, size: 'large', milk: 'oat', shot: true, unitCents: 1 }]),
      invalid: await post([{ id: 'missing', quantity: 1 }]),
    };
  });
  assert.equal(api.correct.status, 200);
  assert.equal(api.correct.body.totalCents, 1040);
  assert.equal(api.invalid.status, 400);
  report.checks.push({ check: 'server ignores forged prices and rejects unknown products', totalCents: api.correct.body.totalCents, invalidStatus: api.invalid.status });
  report.images = await site.locator('img').evaluateAll(nodes => nodes.filter(n => n.src.includes('miga-demo/assets/')).map(n => ({ src: n.src, loaded: n.complete && n.naturalWidth > 0 })));
  await page.setViewportSize({ width: 390, height: 844 });
  await site.locator('[data-product="cafe-0"]').click();
  await page.screenshot({ path: resolve(out, 'mobile.png') });
  report.viewport = await site.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(report.viewport.document <= report.viewport.viewport);
  await page.keyboard.press('Escape');
  await site.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('link', { name: 'Ven a vernos' }).click();
  await site.locator('#visit-form').waitFor();
  report.checks.push({ check: 'visit page navigation', url: site.url() });
  await site.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('link', { name: 'El café', exact: true }).click();
  await site.locator('#ritual-form').waitFor();
  report.checks.push({ check: 'home navigation returns to same sandbox', url: site.url() });
  await site.goto(new URL('wp-admin/edit.php?post_type=page', runtimeBase).href);
  await site.getByRole('heading', { name: 'Pages', exact: true }).waitFor();
  report.checks.push({ check: 'WordPress admin page list available', titles: await site.locator('.row-title').allTextContents() });
  assert.equal(report.errors.length, 0, 'Browser errors recorded');
  report.passed = true;
  console.log(JSON.stringify(report));
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  report.frames = page.frames().map(f => ({ name: f.name(), url: f.url() }));
  await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
  console.log(JSON.stringify(report));
  process.exitCode = 1;
} finally {
  report.finishedAtUtc = new Date().toISOString();
  await writeFile(resolve(out, previewOnly ? 'local-review.json' : 'public-review.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
