import { test, expect } from '@playwright/test';

let urls;
test.beforeAll(async ({ request }) => { urls = (await (await request.get('/wp-content/uploads/demo-verification.json')).json()).urls; });

test('search ignores accents and combines with category and price filters', async ({ page }) => {
  await page.goto(urls.menu);
  await expect(page.getByRole('status')).toContainText('13 opciones');
  await page.getByLabel('Buscar en la carta').fill('limon');
  await expect(page.locator('.menu-item:visible')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Bizcocho de limón' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Verde que te quiero' })).toBeVisible();
  await page.getByLabel('Precio máximo (€)').fill('3');
  await expect(page.locator('#menu-empty')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('0 opciones');
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.locator('.menu-item:visible')).toHaveCount(13);
  await page.getByRole('button', { name: 'Café', exact: true }).click();
  await page.getByLabel('Precio máximo (€)').fill('2.5');
  await expect(page.locator('.menu-item:visible')).toHaveCount(2);
  await page.screenshot({ path: 'evidence/menu-filtered.png', fullPage: true });
});

test('literal search text cannot inject markup and reset restores all options', async ({ page }) => {
  await page.goto(urls.menu);
  await page.getByLabel('Buscar en la carta').fill('<img src=x onerror=alert(1)>');
  await expect(page.locator('#menu-empty')).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.getByLabel('Buscar en la carta')).toHaveValue('');
  await expect(page.locator('.menu-item:visible')).toHaveCount(13);
});

test('weekend preview cannot select times outside the displayed opening hours', async ({ page }) => {
  await page.goto(urls.visit);
  const min = await page.getByLabel('Día', { exact: true }).getAttribute('min');
  const day = new Date(`${min}T12:00:00`);
  while (day.getDay() !== 6) day.setDate(day.getDate() + 1);
  const saturday = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  await page.getByLabel('Día', { exact: true }).fill(saturday);
  await page.getByLabel('Día', { exact: true }).dispatchEvent('change');
  await expect(page.locator('select[name="time"] option').filter({ hasText: '16:00' })).toHaveJSProperty('disabled', true);
  await page.getByLabel('Tu nombre', { exact: true }).fill('Alex');
  // A disabled time must not produce a successful preview even if assigned directly.
  await page.getByRole('combobox', { name: 'Hora', exact: true }).evaluate(select => { select.value = '16:00'; });
  await page.getByRole('button', { name: 'Ver mi visita' }).click();
  await expect(page.getByRole('status')).toBeHidden();
  await page.getByRole('combobox', { name: 'Hora', exact: true }).selectOption('10:00');
  await page.getByRole('button', { name: 'Ver mi visita' }).click();
  await expect(page.getByRole('status')).toContainText('10:00');
});
