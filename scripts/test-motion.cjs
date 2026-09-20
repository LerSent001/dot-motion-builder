const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) {return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args);};
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, filename);
const {createMockProject} = require('../src/lib/mock-project.ts');
const {motionPresets, getDefaultMotionConfig} = require('../src/lib/motion-presets.ts');
const {sampleMotion, getCycleDuration} = require('../src/lib/core/motion-sampler.ts');
const {compileTimeline} = require('../src/lib/core/timeline.ts');
const {generateExportArtifact} = require('../src/lib/exporters/index.ts');
const {buildMotionData} = require('../src/lib/exporters/motion-data.ts');
let checks = 0;
assert.equal(motionPresets.length, 44, 'curated reference-adapted catalog size');
assert.deepEqual(
  motionPresets.filter(({id}) => ['blink', 'pulse', 'ripple'].includes(id)).map(({id}) => id),
  [],
  'removed presets must not return'
);
for (const preset of motionPresets) for (const size of [2, 5, 8]) {
  const loader = structuredClone(createMockProject().loaders[0]);
  loader.pattern.grid.rows = loader.pattern.grid.cols = size;
  loader.pattern.activeCells = [0, size * size - 1];
  loader.animation = {...loader.animation, ...getDefaultMotionConfig(preset.id), originX: (size + 1) / 2, originY: (size + 1) / 2, speed: 1};
  if (preset.id === 'fish-eye') assert.equal(loader.animation.style, 'fisheye');
  for (let cell = 0; cell < size * size; cell++) {
    assert.deepEqual(sampleMotion(loader, cell, 0), sampleMotion(loader, cell, 1), 'loop endpoints');
    for (const phase of [.001, .1, .3, .5, .9, .999]) {
      const value = sampleMotion(loader, cell, phase);
      assert(Number.isFinite(value.opacity) && value.opacity >= 0 && value.opacity <= 1);
      assert(Number.isFinite(value.scale) && value.scale >= 0 && value.scale <= 1.31);
      checks++;
    }
    if (preset.id === 'fish-eye') {
      const value = sampleMotion(loader, cell, .3);
      const row = Math.floor(cell / size), col = cell % size;
      const center = (size - 1) / 2;
      const distance = Math.hypot(col - center, row - center);
      const radius = Math.max(Math.hypot(center, center), 1);
      const referenceScale = (1.3 - distance / radius * .6) * (.5 + value.opacity * .5);
      assert(Math.abs(value.scale - referenceScale) < 1e-12, 'fish-eye must match the reference lens formula');
    }
  }
  const timeline = compileTimeline(loader);
  assert.equal(timeline.tracks.length, 2, 'preserve the user mask');
  for (const track of timeline.tracks) {
    const frame = track.keyframes[30];
    assert.deepEqual({opacity:frame.opacity, scale:frame.scale}, sampleMotion(loader,track.cellIndex,frame.timeMs/timeline.durationMs));
  }
  const project = createMockProject();
  project.loaders = [loader];
  const data = buildMotionData(project, loader);
  assert.equal(data.scenes[0].cells.filter(c => c.active).length, 2);
  const frame = data.scenes[0].cells[0].samples[30];
  const expected = sampleMotion(loader, 0, 30 / (data.scenes[0].cells[0].samples.length - 1));
  assert(Math.abs(frame[0] - expected.opacity) < 0.00001);
  for (const format of ['web', 'swift']) {
    const result = generateExportArtifact(format, project, loader);
    assert(!result.content.includes('undefined') && !result.content.includes('NaN'));
    assert(result.filename.endsWith(format === 'web' ? '.js' : '.swift'));
  }
  const duration = getCycleDuration(loader);
  loader.animation.speed = 2;
  assert.equal(getCycleDuration(loader), duration / 2);
}

const referenceWave = structuredClone(createMockProject().loaders[0]);
referenceWave.pattern.grid.rows = referenceWave.pattern.grid.cols = 5;
referenceWave.animation = {...referenceWave.animation, ...getDefaultMotionConfig('wave'), direction:'right', originX:3, originY:3};
const wavePhase = .25;
const waveRow = 2, waveCol = 3;
const expectedWave = (Math.sin(waveCol * .8 + waveRow * .3 - wavePhase * Math.PI * 2) + 1) / 2;
assert(Math.abs(sampleMotion(referenceWave, waveRow * 5 + waveCol, wavePhase).opacity - expectedWave) < 1e-12, 'wave parameters match reference');

const deterministic = structuredClone(referenceWave);
deterministic.animation = {...deterministic.animation, ...getDefaultMotionConfig('matrix')};
assert.deepEqual(sampleMotion(deterministic, 7, .375), sampleMotion(deterministic, 7, .375), 'random-looking presets stay deterministic');

for (const preset of motionPresets) {
  const loader = structuredClone(createMockProject().loaders[0]);
  loader.pattern.grid.rows = loader.pattern.grid.cols = 5;
  loader.pattern.activeCells = Array.from({length:25}, (_, index) => index);
  loader.animation = {...loader.animation, ...getDefaultMotionConfig(preset.id), originX:3, originY:3, speed:1};
  const frames = Array.from({length:24}, (_, frameIndex) =>
    loader.pattern.activeCells.map(cellIndex => sampleMotion(loader, cellIndex, frameIndex / 24).opacity)
  );
  assert(Math.max(...frames.flat()) >= .2, `${preset.id} must produce a visible frame`);
  assert(new Set(frames.map(frame => frame.map(value => value.toFixed(4)).join(','))).size > 1, `${preset.id} must animate over time`);
}
console.log(`PASS: ${motionPresets.length} presets, 2/5/8 grids, ${checks} samples; mask, loop, exports and speed.`);
