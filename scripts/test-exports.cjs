// Generate fixtures and verify edge cases. Output files are test artifacts only.
require('./test-motion.cjs');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {createMockProject} = require('../src/lib/mock-project.ts');
const {generateExportArtifact} = require('../src/lib/exporters/index.ts');
const {buildMotionData} = require('../src/lib/exporters/motion-data.ts');
const webFixture = content => `<!doctype html><html><head><meta charset="utf-8"></head><body><dot-motion-loader style="width:48px" aria-label="Loading animation"></dot-motion-loader><script>${content}</script></body></html>`;
const project = createMockProject();
const loader = project.loaders[0];
loader.pattern.activeCells = [0, 4, 12];
loader.animation.presetId = 'fish-eye';
loader.animation.style = 'fisheye';
loader.animation.inactiveStyle = 'ghost';
loader.style.cellShape = 'hexagon';
const customWeb = generateExportArtifact('web',project,loader);
fs.writeFileSync('/tmp/DotMotionCustomQA.js',customWeb.content);
fs.writeFileSync('/tmp/dot-motion-custom-qa.html',webFixture(customWeb.content));
fs.writeFileSync('/tmp/DotMotionCustomQA.swift',generateExportArtifact('swift',project,loader).content);
loader.text = {...loader.text, enabled:true, content:'中文 " \\ </script><script>window.injected=true</script> 💙'};
loader.style.cellShape = 'hexagon';
const web = generateExportArtifact('web', project, loader);
assert(!web.content.includes('<script>window.injected'));
assert(web.content.includes('width:48px'),'web component should default to 48px');
assert(web.filename.endsWith('.js'),'web export should be JavaScript');
assert(web.mimeType.startsWith('text/javascript'),'web export should use a JavaScript MIME type');
assert(!web.content.includes('<!doctype html>'),'web export should not include a demo document');
fs.writeFileSync('/tmp/dot-export-edge.html',webFixture(web.content));
const swift = generateExportArtifact('swift',project,loader);
assert(!swift.content.includes('// Usage:'),'Swift output should not include usage comments');
assert(!web.content.includes('<!-- Set width with CSS.'),'JavaScript output should not include usage comments');
fs.writeFileSync('/tmp/DotMotionEdge.swift',swift.content);
for(const shape of ['rectangle','square','circle','diamond','hexagon','star']){
  loader.style.cellShape=shape;
  const data=buildMotionData(project,loader);
  assert.equal(data.scenes[0].polygon.length > 0,['diamond','hexagon','star'].includes(shape));
}
loader.sequenceId='qa';loader.sequenceIndex=1;
loader.animation.fps=6;
loader.animation.inactiveStyle='breathe';
loader.text = {...loader.text,enabled:false,content:''};
const second=structuredClone(loader);second.id='qa-2';second.sequenceIndex=0;second.pattern.activeCells=[2];
project.loaders=[loader,second];
const data=buildMotionData(project,loader);
assert(data.discrete);
assert.equal(data.duration,2/loader.animation.fps);
assert(data.scenes[0].cells[2].active);
assert(!data.scenes[0].cells[0].active);
assert.equal(data.scenes[0].cells[2].samples[0][0],1);
assert(data.scenes[0].cells[0].samples.length > 2,'sequence inactive effects need continuous samples');
assert.notEqual(
  data.scenes[0].cells[0].samples[0][2],
  data.scenes[0].cells[0].samples[Math.floor(data.scenes[0].cells[0].samples.length / 4)][2],
  'sequence breathe background must animate'
);
project.loaders=[loader];
const singleFrameSequence=buildMotionData(project,loader);
assert(singleFrameSequence.discrete,'a one-frame sequence must remain frame-based');
assert.equal(singleFrameSequence.duration,1/loader.animation.fps);
project.loaders=[loader,second];
const sequenceWeb = generateExportArtifact('web',project,loader);
fs.writeFileSync('/tmp/dot-export-sequence.html',webFixture(sequenceWeb.content));
fs.writeFileSync('/tmp/DotMotionSequence.swift',generateExportArtifact('swift',project,loader).content);
fs.writeFileSync('/tmp/DotMotionSequenceQA.js',sequenceWeb.content);
fs.writeFileSync('/tmp/dot-motion-sequence-qa.html',webFixture(sequenceWeb.content));
fs.writeFileSync('/tmp/DotMotionSequenceQA.swift',generateExportArtifact('swift',project,loader).content);
loader.sequenceId=undefined;loader.pattern.activeCells=[];loader.animation.loop=false;
assert(!buildMotionData(project,loader).scenes[0].cells.some(c=>c.active));
fs.writeFileSync('/tmp/dot-export-empty.html',webFixture(generateExportArtifact('web',project,loader).content));
console.log('PASS: escaping, Unicode, six shapes, sequence order, empty mask and non-loop fixtures.');
