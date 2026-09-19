import fs from 'node:fs';
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });

const fixtures = [
  { name: 'custom', file: '/tmp/dot-motion-custom-qa.html', times: [0, .25, .6] },
  { name: 'sequence', file: '/tmp/dot-motion-sequence-qa.html', times: [0, .09, .18, .27] }
];

const report = {};
for (const fixture of fixtures) {
  const page = await browser.newPage({ viewport: { width: 360, height: 360 }, deviceScaleFactor: 3 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(fs.readFileSync(fixture.file, 'utf8'), { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html,body{margin:0;background:#05070a;display:grid;place-items:center;min-height:100%}' });
  const host = page.locator('body > :first-child');
  await host.waitFor({ state: 'visible' });
  const defaultBox = await host.boundingBox();
  assert(defaultBox && Math.abs(defaultBox.width - 48) < .1, `${fixture.name} default width is not 48px`);
  await host.evaluate(element => { element.style.width = '240px'; element.pause(); });

  const samples = [];
  for (const time of fixture.times) {
    const stats = await host.evaluate((element, seconds) => {
      element.seek(seconds);
      const canvas = element.shadowRoot.querySelector('canvas');
      const context = canvas.getContext('2d');
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let visible = 0;
      let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
      let alphaTotal = 0;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const alpha = pixels[(y * canvas.width + x) * 4 + 3];
          if (alpha === 0) continue;
          visible += 1;
          alphaTotal += alpha;
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      return {
        time: seconds,
        width: canvas.width,
        height: canvas.height,
        visible,
        meanAlpha: visible ? alphaTotal / visible : 0,
        bounds: [minX, minY, maxX, maxY],
        signature: canvas.toDataURL()
      };
    }, time);
    assert(stats.visible > 1000, `${fixture.name} rendered too few pixels`);
    assert(stats.bounds[0] >= 0 && stats.bounds[1] >= 0 && stats.bounds[2] < stats.width && stats.bounds[3] < stats.height, `${fixture.name} clipped`);
    await host.screenshot({ path: `/tmp/web-${fixture.name}-${String(time).replace('.', '_')}.png` });
    samples.push(stats);
  }
  assert.equal(errors.length, 0, `${fixture.name} page error`);
  assert(new Set(samples.map(sample => sample.signature)).size > 1, `${fixture.name} did not animate`);
  if (fixture.name === 'sequence') {
    assert.notEqual(samples[0].signature, samples[1].signature, 'sequence inactive background did not animate within a frame');
    assert.notEqual(samples[1].signature, samples[2].signature, 'sequence frame did not advance at 6 FPS');
  }
  report[fixture.name] = samples.map(({ signature, ...sample }) => sample);
  await page.close();
}

await browser.close();
fs.writeFileSync('/tmp/dot-motion-web-platform-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
