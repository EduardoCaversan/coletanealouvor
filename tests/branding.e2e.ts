import { test, expect } from '@playwright/test';

test('Ekklesia identity, scoped assets and neutral Display', async ({page}) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Ekklesia — Seu culto. Uma única central.');
  await expect(page.getByRole('heading', {name:'Ekklesia', exact:true})).toBeVisible();
  await expect(page.getByText('Seu culto. Uma única central.', {exact:true})).toBeVisible();
  const logo=page.locator('.brand-lockup img');
  expect(await logo.evaluate((img: HTMLImageElement)=>img.complete && img.naturalWidth>0)).toBe(true);
  const manifestUrl=await page.locator('link[rel="manifest"]').getAttribute('href');
  if(manifestUrl) {
    const response=await page.request.get(new URL(manifestUrl,page.url()).href);
    const manifest=await response.json();
    expect(manifest.name).toBe('Ekklesia');
    expect(manifest.short_name).toBe('Ekklesia');
    expect(manifest.scope).toBe('/ekklesia/');
    expect(manifest.start_url).toBe('/ekklesia/');
    for(const icon of manifest.icons) expect((await page.request.get(new URL(icon.src,page.url()).href)).ok()).toBe(true);
  }
  const popup=page.waitForEvent('popup');
  await page.getByRole('button',{name:'Abrir projeção',exact:true}).click();
  const display=await popup;
  await expect(display.locator('.brand-lockup')).toHaveCount(0);
  await expect(display.locator('body')).not.toContainText('Ekklesia');
  await expect(display.locator('.opacity-100.bg-black')).toBeVisible();
  await page.screenshot({path:'test-results/ekklesia-console.png'});
});

test('historical operator data remains available after rebrand', async ({page}) => {
  // These are intentionally the legacy persistence keys, not the live channel.
  await page.addInitScript(() => {
    localStorage.setItem('coletanea:planDraft', JSON.stringify({id:null,name:'Culto preservado',date:''}));
    localStorage.setItem('coletanea:setlist', JSON.stringify([{uid:'legacy-stage',type:'label',text:'Oração preservada',note:'Microfone 2'}]));
    localStorage.setItem('coletanea:draw-history', JSON.stringify(['73','14']));
  });
  await page.goto('./');
  await expect(page.getByLabel('Nome da programação')).toHaveValue('Culto preservado');
  await expect(page.locator('.service-panel')).toContainText('Oração preservada');
  await expect(page.locator('.service-panel')).toContainText('Microfone 2');
  await page.getByRole('button',{name:'Ferramentas',exact:true}).click();
  await page.locator('summary',{hasText:'Sorteio'}).click();
  await expect(page.locator('.operator-draw-history')).toContainText('73 · 14');
  await expect(page.getByTestId('live-monitor')).toContainText('Nenhum conteúdo no ar');
});
