import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });

for (const viewport of [{ width: 1440, height: 1000 }, { width: 820, height: 900 }]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3108/editor');
  await page.locator('[data-panel-id="properties"]').waitFor();
  assert.equal(await page.locator('[data-panel-id="properties"]').count(), 1);
  assert.deepEqual(
    (await page.locator('[data-slot="control-section-header"]').allTextContents()).map(text => text.trim()),
    ['网格', '预设', '动画', '颜色', '效果']
  );
  assert.equal(await page.getByText('预设', { exact: true }).count(), 2);
  assert.equal(await page.locator('.dot-grid-editor-shell__badge').count(), 0);
  const canvasBox = await page.locator('.builder-canvas').boundingBox();
  const centerCanvasButton = page.getByRole('button', { name: '居中画布' });
  const centerButtonBox = await centerCanvasButton.boundingBox();
  assert(canvasBox && centerButtonBox);
  assert(Math.abs(centerButtonBox.x + centerButtonBox.width / 2 - (canvasBox.x + canvasBox.width / 2)) < 1);
  const controls = page.locator('[data-slot="toolcraft-panel-content"] [role="combobox"]');
  await controls.first().click();
  await page.locator('[role="option"]').first().waitFor({ state: 'visible' });
  assert.deepEqual(await page.locator('[role="option"]').allTextContents(), ['圆角', '方形', '圆形', '菱形', '六边形', '星型']);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('textbox', { name: '画板名称' }).count(), 0);
  assert.equal(await page.getByText('发光颜色', { exact: true }).count(), 0);
  assert.equal(await page.locator('.motion-library').count(), 0);
  await page.getByRole('button', { name: '展开效果' }).first().click();
  assert.equal(await page.getByRole('switch', { name: '发光' }).count(), 1);
  assert.equal(await page.getByRole('slider', { name: '间距' }).count(), 1);
  assert.equal(await controls.count(), 4);
  if (viewport.width === 1440) {
    const surface = page.locator('.builder-canvas__surface');
    const initialTransform = await surface.evaluate(element => element.style.transform);
    await page.mouse.move(800, 700);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(60);
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(100);
    assert.notEqual(await surface.evaluate(element => element.style.transform), initialTransform);
    await centerCanvasButton.click();
    await page.waitForTimeout(100);
    assert((await surface.evaluate(element => element.style.transform)).endsWith('scale(1)'));
    const centeredArtboard = await page.locator('.canvas-artboard').first().boundingBox();
    const sidebar = await page.locator('.settings-sidebar').boundingBox();
    assert(centeredArtboard && sidebar);
    const expectedCenterX = (48 + sidebar.x - 24) / 2;
    const expectedCenterY = (64 + canvasBox.height - 72) / 2;
    assert(Math.abs(centeredArtboard.x + centeredArtboard.width / 2 - expectedCenterX) < 2);
    assert(Math.abs(centeredArtboard.y + centeredArtboard.height / 2 - expectedCenterY) < 2);
    await page.locator('[data-panel-id="properties"] button[aria-label="收起参数面板"]').click();
    await page.waitForTimeout(250);
    assert((await page.locator('.settings-sidebar').getAttribute('class')).includes('is-collapsed'));
    assert.equal((await page.locator('.settings-sidebar').boundingBox()).width, 52);
    await page.locator('[data-panel-id="properties"] button[aria-label="展开参数面板"]').click();
    await page.locator('[data-slot="control-section-header"]').first().click();
    assert.equal(await page.locator('[data-slot="control-section-header"]').first().getAttribute('aria-expanded'), 'false');
    await page.locator('[data-slot="control-section-header"]').first().click();
    await page.getByRole('button', { name: '导出', exact: true }).click();
    assert(await page.locator('[data-slot="sheet-content"]').isVisible());
    assert.deepEqual(
      await page.locator('[data-slot="sheet-content"] [data-slot="toggle-group-item"]').allTextContents(),
      ['JavaScript', 'Swift']
    );
    await page.keyboard.press('Escape');
    await page.locator('[data-slot="sheet-content"]').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '+ 新建', exact: true }).click();
    await page.getByRole('button', { name: '序列', exact: true }).click();
    assert.equal(await page.getByRole('slider', { name: '速度 (FPS)' }).getAttribute('aria-valuenow'), '6');
    await page.getByRole('button', { name: '+ 序列', exact: true }).click();
    await page.getByRole('button', { name: '预览动画', exact: true }).click();
    assert.equal(await page.locator('.dot-grid-editor-shell__badge').count(), 0);
    const inactiveCell = page.locator('.canvas-artboard--sequence-preview .preview-loader__cell').first();
    await inactiveCell.waitFor({ state: 'visible' });
    const inactiveSelector = controls.last();
    for (const option of ['无（静态）', '静态暗点', '幽灵网格', '呼吸']) {
      await inactiveSelector.click();
      await page.getByRole('option', { name: option, exact: true }).click();
      await page.waitForTimeout(60);
      const opacity = Number(await inactiveCell.evaluate(element => getComputedStyle(element).opacity));
      if (option === '无（静态）') assert.equal(opacity, 1);
      if (option === '静态暗点') assert(Math.abs(opacity - .62) < .001);
      if (option === '幽灵网格') assert(opacity >= .34 && opacity <= .58);
      if (option === '呼吸') assert(opacity >= .58 && opacity <= .9);
    }
    const inactiveBefore = await inactiveCell.evaluate(element => getComputedStyle(element).opacity);
    await page.waitForTimeout(220);
    const inactiveAfter = await inactiveCell.evaluate(element => getComputedStyle(element).opacity);
    assert.notEqual(inactiveBefore, inactiveAfter, 'sequence inactive-cell effect must animate');
  } else {
    const canvas = await page.locator('.builder-canvas').boundingBox();
    const artboard = await page.locator('.canvas-artboard').first().boundingBox();
    assert(canvas && artboard && canvas.height > 500);
    assert(artboard.y < canvas.height && artboard.x < canvas.width);
  }
  await page.getByText('EN', { exact: true }).click();
  assert.deepEqual(
    (await page.locator('[data-slot="control-section-header"]').allTextContents()).map(text => text.trim()),
    ['Grid', 'Preset', 'Animation', 'Colors', 'Effects']
  );
  assert((await page.getByText('Preset', { exact: true }).count()) >= 1);
  assert.equal(await page.getByText('Pattern', { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  await page.close();
}

await browser.close();
console.log('PASS: real Toolcraft panel, controls, collapse, narrow layout, sheet and Escape close.');
