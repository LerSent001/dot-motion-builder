import { MotionData } from "./motion-data";
import { sanitizeName } from "./utils";
import { ExportArtifact } from "@/types/dot-motion";

export function exportWeb(data: MotionData, name: string): ExportArtifact {
  const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
  return {
    format: "web", filename: `${sanitizeName(name)}.js`, mimeType: "text/javascript;charset=utf-8",
    content: `(() => {
const data = ${json};
const requestedTag = document.currentScript?.dataset.dotMotionTag;
const tag = requestedTag && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(requestedTag)
  ? requestedTag
  : "dot-motion-loader";
if (customElements.get(tag)) return;
${String.raw`
class DotMotionLoader extends HTMLElement {
  static get observedAttributes() { return ['paused', 'speed']; }
  constructor() {
    super();
    this.elapsed = 0; this.last = null; this.raf = 0;
    const root = this.attachShadow({mode:'open'});
    root.innerHTML = '<style>:host{display:inline-block;width:48px;max-width:100%;line-height:0}canvas{display:block;width:100%;height:auto}</style><canvas></canvas>';
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.rate = 1;
    this.tick = now => {
      if (this.last !== null) this.elapsed += Math.max(0, now - this.last) / 1000 * this.rate;
      this.last = now; this.draw();
      if (this.running()) this.raf = requestAnimationFrame(this.tick);
      else this.last = null;
    };
    this.observer = new ResizeObserver(() => this.draw());
  }
  running() { return this.isConnected && !this.hasAttribute('paused') && (data.loop || this.elapsed < data.duration); }
  connectedCallback() { this.observer.observe(this); this.restart(); }
  disconnectedCallback() { cancelAnimationFrame(this.raf); this.last = null; this.observer.disconnect(); }
  attributeChangedCallback() {
    if (this.last !== null) this.elapsed += (performance.now() - this.last) / 1000 * this.rate;
    const value = Number(this.getAttribute('speed') ?? 1);
    this.rate = Number.isFinite(value) && value > 0 ? value : 1;
    this.restart();
  }
  restart() {
    cancelAnimationFrame(this.raf); this.last = null; this.draw();
    if (this.running()) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  }
  play() { this.removeAttribute('paused'); this.restart(); }
  pause() { this.setAttribute('paused',''); }
  seek(seconds) { this.elapsed = Math.max(0, Number(seconds) || 0); this.restart(); }
  get currentTime() { return this.elapsed; }
  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    const width = this.getBoundingClientRect().width || 48;
    const dpr = window.devicePixelRatio || 1;
    const height = width * data.height / data.width;
    const pixelWidth = Math.max(1, Math.round(width*dpr)), pixelHeight = Math.max(1, Math.round(height*dpr));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) { this.canvas.width = pixelWidth; this.canvas.height = pixelHeight; }
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    const scale = pixelWidth / data.width;
    ctx.scale(scale,scale);
    const phase = data.loop ? (this.elapsed % data.duration) / data.duration : Math.min(1,this.elapsed/data.duration);
    const scene = data.scenes[data.discrete ? Math.min(data.scenes.length-1,Math.floor(phase*data.scenes.length)) : 0];
    ctx.translate((data.width-scene.width)/2,(data.height-scene.height)/2);
    const rgba = c => 'rgba('+c.slice(0,3).map(n=>Math.round(n*255)).join(',')+','+c[3]+')';
    const cell = (item,size,alpha,color,glow) => {
      if (size <= 0 || alpha <= 0) return;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(item.x+(scene.cellSize-size)/2,item.y+(scene.cellSize-size)/2);
      ctx.beginPath();
      if (scene.polygon.length) {
        scene.polygon.forEach((n,i,a)=>{if(i%2===0){if(i===0)ctx.moveTo(n*size,a[i+1]*size);else ctx.lineTo(n*size,a[i+1]*size);}}); ctx.closePath();
      } else ctx.roundRect(0,0,size,size,Math.min(size/2,scene.radius*size/scene.cellSize));
      if(glow){ctx.shadowColor=rgba(scene.glowColor);ctx.shadowBlur=scene.glow*scale;}
      ctx.fillStyle=rgba(color);ctx.fill();ctx.restore();
    };
    for(const item of scene.cells){
      const position = phase*(item.samples.length-1), index=Math.min(item.samples.length-2,Math.floor(position));
      const mix=position-index, a=item.samples[index], b=item.samples[index+1];
      const v=a.map((n,i)=>n+(b[i]-n)*mix);
      cell(item,scene.cellSize,v[2],scene.background,false);
      if(item.active)cell(item,scene.cellSize*v[1],v[0],scene.primary,true);
    }
    if(scene.label){
      ctx.fillStyle=rgba(scene.textColor);ctx.font=scene.fontWeight+' '+scene.fontSize+'px system-ui';
      ctx.textAlign='center';ctx.textBaseline='top';ctx.letterSpacing=(scene.letterSpacing*scene.fontSize)+'px';
      const fit=Math.min(1,(scene.width-40)/Math.max(1,ctx.measureText(scene.label).width));
      ctx.save();ctx.scale(fit,fit);ctx.fillText(scene.label,scene.width/2/fit,scene.labelY/fit);ctx.restore();
    }
  }
}
customElements.define(tag,DotMotionLoader);
`}
})();`
  };
}
