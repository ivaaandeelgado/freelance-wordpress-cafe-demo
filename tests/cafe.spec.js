import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

let manifest;
test.beforeAll(async ({ request }) => {
  await mkdir('evidence', { recursive: true });
  const response = await request.get('/wp-content/uploads/demo-verification.json');
  expect(response.ok()).toBeTruthy();
  manifest = await response.json();
  await writeFile('evidence/runtime-versions.json', JSON.stringify(manifest, null, 2));
});

test('three genuine Elementor pages render, navigate, and load all local photographs', async ({ page }) => {
  // This scenario navigates through six PHP-rendered pages in the local WASM runtime.
  test.setTimeout(180000);
  const problems = [];
  page.on('pageerror', error => problems.push(error.message));
  for (const [key, url] of Object.entries(manifest.urls)) {
    await page.goto(url);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('.elementor-widget-heading').first()).toBeVisible();
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    expect(await page.locator('img').evaluateAll(images => images.every(image => image.naturalWidth > 0))).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `evidence/${key}-desktop.png`, fullPage: true });
    if (key === 'home') await page.screenshot({ path: 'evidence/home-desktop-viewport.png' });
  }
  await page.goto('/');
  await page.getByRole('link', { name: 'Descubre la carta' }).click();
  await expect(page.getByRole('heading', { name: 'La carta.', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Ven a vernos' }).click();
  await expect(page.locator('#visit-form')).toBeVisible();
  expect(problems).toEqual([]);
});

test('menu filtering works with accessible button states and keyboard navigation', async ({ page }) => {
  await page.goto(manifest.urls.menu);
  await expect(page.locator('.menu-group:visible')).toHaveCount(3);
  await page.getByRole('button', { name: 'Obrador', exact: true }).click();
  await expect(page.locator('.menu-group:visible')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Croissant de mantequilla', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Espresso', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Obrador', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Café', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Espresso', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Toda la carta' }).click();
  await expect(page.locator('.menu-group:visible')).toHaveCount(3);
});

test('visit preview rejects whitespace and past dates, transmits nothing, and clears on reload', async ({ page }) => {
  await page.goto(manifest.urls.visit);
  const submissions = [];
  page.on('request', request => { if (request.method() !== 'GET') submissions.push(request.url()); });
  await page.getByRole('button', { name: 'Ver mi visita' }).click();
  expect(await page.locator('#visit-form').evaluate(form => form.checkValidity())).toBeFalsy();
  await expect(page.getByRole('status')).toBeHidden();
  await page.getByLabel('Tu nombre').fill('  ');
  const minDate = await page.getByLabel('Día', { exact: true }).getAttribute('min');
  await page.getByLabel('Día', { exact: true }).fill(minDate);
  await page.getByRole('combobox', { name: 'Hora', exact: true }).selectOption('10:00');
  await page.getByRole('button', { name: 'Ver mi visita' }).click();
  await expect(page.getByRole('status')).toBeHidden();
  await page.getByLabel('Tu nombre').fill('Alex');
  await page.getByLabel('Día', { exact: true }).fill('2020-01-01');
  await page.getByRole('button', { name: 'Ver mi visita' }).click();
  expect(await page.locator('#visit-form').evaluate(form => form.checkValidity())).toBeFalsy();
  await page.getByLabel('Día', { exact: true }).fill(minDate);
  await page.getByRole('button', { name: 'Ver mi visita' }).click();
  await expect(page.getByRole('status')).toContainText('no se ha reservado, enviado ni guardado nada');
  expect(submissions).toEqual([]);
  await page.reload();
  await expect(page.getByLabel('Tu nombre')).toHaveValue('');
  await expect(page.getByRole('status')).toBeHidden();
});

test('all pages fit phone and tablet viewports; mobile links and disclosure work', async ({ page }) => {
  test.setTimeout(180000);
  for (const [key, url] of Object.entries(manifest.urls)) {
    await page.goto(url);
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    for (const width of [360, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${key} at ${width}px`).toBeTruthy();
      await expect(page.locator('main h1')).toBeVisible();
      if (width === 390) {
        await page.screenshot({ path: `evidence/${key}-mobile.png`, fullPage: true });
        if (key === 'home') await page.screenshot({ path: 'evidence/home-mobile-viewport.png' });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(manifest.urls.visit);
  await page.getByText('¿Puedo hacer una reserva real?').click();
  await expect(page.getByText('No. Miga es una demostración de portafolio.')).toBeVisible();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'El café', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Descubre la carta' })).toBeVisible();
});
