import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
let urls;
test.beforeAll(async ({request}) => { urls = (await (await request.get('/wp-content/uploads/demo-verification.json')).json()).urls; });

test('personalized drinks, persistent bag and WordPress quotation agree in cents', async ({page}) => {
  await page.goto(urls.menu);
  await page.locator('[data-product="cafe-2"]').click();
  await expect(page.locator('#product-dialog')).toBeVisible();
  await page.locator('#product-form select[name="size"]').selectOption('large');
  await page.locator('#product-form select[name="milk"]').selectOption('oat');
  await page.locator('#product-form input[name="shot"]').check();
  await page.locator('#product-form input[name="quantity"]').fill('2');
  await expect(page.locator('#product-total')).toHaveText('10,40 €');
  await page.getByRole('button',{name:'Añadir a mi bolsa'}).click();
  await expect(page.locator('#bag-count')).toHaveText('2');
  await page.reload();await expect(page.locator('#bag-count')).toHaveText('2');
  await page.locator('#bag-open').click();await page.locator('#bag-verify').click();
  await expect(page.locator('#bag-feedback')).toContainText('Presupuesto comprobado', { timeout: 50000 });
  await expect(page.locator('#bag-feedback')).toContainText('10,40');
  await page.screenshot({path:'evidence/bag-desktop.png'});
  const downloading=page.waitForEvent('download');await page.locator('#bag-download').click();const file=await downloading;
  expect(await readFile(await file.path(),'utf8')).toContain('No es un pedido');
  await page.getByRole('button',{name:'Reducir Flat white'}).click();await expect(page.locator('#bag-summary')).toHaveText('5,20 €');
  await expect(page.locator('#bag-feedback')).toBeEmpty();
  await page.locator('#bag-clear').click();await expect(page.locator('#bag-verify')).toBeDisabled();
});
test('API ignores forged prices and rejects unknown products and impossible quantities', async ({page,request}) => {
  await page.goto(urls.menu);const endpoint=await page.evaluate(()=>window.MigaExperience.quoteUrl);
  const item={id:'cafe-2',quantity:2,size:'large',milk:'oat',shot:true,unitCents:1};
  const good=await request.post(endpoint,{data:{items:[item],totalCents:1}});expect(good.status()).toBe(200);expect((await good.json()).totalCents).toBe(1040);
  for(const invalid of [{...item,id:'missing'},{...item,quantity:-1},{...item,quantity:1.5},{...item,quantity:11},{...item,id:'horno-0'}]){
    const response=await request.post(endpoint,{data:{items:[invalid]}});expect(response.status()).toBe(400);
  }
  expect((await request.post(endpoint,{data:{items:[]}})).status()).toBe(400);
});
test('favorites and plant-based preferences combine with existing search and reset',async({page})=>{
  await page.goto(urls.menu);await page.locator('[data-favorite="cocina-1"]').click();await page.locator('#menu-favorites').check();await expect(page.locator('.menu-item:visible')).toHaveCount(1);
  await page.locator('#menu-vegan').check();await expect(page.locator('.menu-item:visible')).toHaveCount(1);
  await page.reload();await expect(page.locator('[data-favorite="cocina-1"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('#menu-vegan').check();await expect(page.locator('.menu-item:visible')).toHaveCount(4);
  await page.locator('#menu-search').fill('limon');await expect(page.locator('.menu-item:visible')).toHaveCount(1);
  await page.locator('#menu-reset').click();await expect(page.locator('.menu-item:visible')).toHaveCount(13);await expect(page.locator('#menu-vegan')).not.toBeChecked();
});
test('ritual finder respects budget and plant-based preferences and adds real catalog items',async({page})=>{
  await page.goto('/');await page.locator('#ritual-mood').selectOption('vegetal');await page.locator('#ritual-food').selectOption('dulce');await page.locator('#ritual-form button').click();
  await expect(page.locator('#ritual-result')).toContainText('No hay una combinación');
  await page.locator('#ritual-food').selectOption('salado');await page.locator('#ritual-form button').click();await expect(page.locator('#ritual-result')).toContainText('Filtro del día');
  await page.locator('#ritual-result button').click();await expect(page.locator('#bag-count')).toHaveText('2');
  await page.locator('.ritual-lab').screenshot({path:'evidence/ritual-desktop.png'});
});
test('seat plan adapts to group size and generates a calendar file without a reservation',async({page})=>{
  await page.goto(urls.visit);await expect(page.locator('#floor-tables button:enabled')).toHaveCount(0);
  await page.getByLabel('Tu nombre', { exact: true }).fill('Alex');const min=await page.getByLabel('Día',{exact:true}).getAttribute('min');await page.getByLabel('Día',{exact:true}).fill(min);await page.getByRole('combobox',{name:'Hora',exact:true}).selectOption('10:00');
  await page.getByRole('combobox',{name:'Personas',exact:true}).selectOption('4');
  await expect(page.locator('[data-table="V1"]')).toBeDisabled();
  await page.locator('#floor-tables button:enabled').first().click();
  await page.getByRole('button',{name:'Ver mi visita'}).click();await expect(page.locator('#visit-result')).toContainText('Rincón elegido');
  const downloading=page.waitForEvent('download');await page.locator('#visit-calendar').click();const file=await downloading;const calendar=await readFile(await file.path(),'utf8');expect(calendar).toContain('BEGIN:VCALENDAR');expect(calendar).toContain('No confirma ninguna reserva');
  await page.locator('.seat-studio').screenshot({path:'evidence/seats-desktop.png'});
  await page.getByRole('combobox',{name:'Personas',exact:true}).selectOption('1');await expect(page.locator('.visit-extras')).toBeHidden();
});
test('new dialogs and controls fit a narrow phone and remain keyboard accessible',async({page})=>{
  await page.setViewportSize({width:360,height:800});await page.goto(urls.menu);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('[data-product="cafe-0"]').click();await expect(page.locator('#product-dialog')).toBeVisible();const box=await page.locator('#product-dialog').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(360);
  await page.screenshot({path:'evidence/product-mobile.png'});await page.keyboard.press('Escape');await expect(page.locator('#product-dialog')).toBeHidden();
});
