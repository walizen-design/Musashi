/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import AiConcierge from "./components/AiConcierge";
import MeditativeBlog from "./components/MeditativeBlog";

export default function App() {
  const [showBlog, setShowBlog] = useState(false);

  useEffect(() => {
    // Failsafe: if anything throws, never leave the page unreadable
    const emergency = () => {
      if (document.getElementById("failsafe")) return;
      const s = document.createElement("style");
      s.id = "failsafe";
      s.textContent =
        "#intro{display:none!important}#veil,#flash{opacity:0!important}" +
        "[data-reveal],[data-line],.ch,.qch,.qw,.q-src,.work,.sun-cap,.hero-rule .jp{opacity:1!important;transform:none!important;transition:none!important}" +
        "body:not(.hero-in) .site-head{transform:none!important;opacity:1!important}" +
        ".q-jp .qch{color:#e9eef3!important}.q-en .qw{color:#b7c2ce!important}";
      document.head.appendChild(s);
    };
    window.addEventListener("error", emergency);
    window.addEventListener("unhandledrejection", emergency);

    const $ = (s: string, c: HTMLElement | Document = document): HTMLElement | null => c.querySelector(s);
    const $$ = (s: string, c: HTMLElement | Document = document): HTMLElement[] => [...c.querySelectorAll(s)] as HTMLElement[];
    const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
    const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const TOUCH = matchMedia("(hover: none)").matches;

    // Split text into characters
    $$("[data-split]").forEach((el) => {
      const t = el.textContent || "";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = [...t]
        .map((c, i) => (c === " " ? " " : `<span class="ch" style="--i:${i}">${c}</span>`))
        .join("");
    });

    // ═════════════════════════ WEBGL — a world in four phases ═════════════════════════
    const canvas = $("#gl") as HTMLCanvasElement | null;
    let gl: WebGLRenderingContext | null = null;
    if (canvas) {
      try {
        gl = canvas.getContext("webgl", {
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        });
      } catch (e) {
        console.error(e);
      }
    }
    let glOK = !!gl;
    const uni: { [key: string]: WebGLUniformLocation | null } = {};
    const startT = performance.now();

    const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uStrike;
uniform float uStrikeX;
uniform float uSeed;
uniform float uFade;
uniform float uPhase;   /* 0 storm · 1 calm dawn · 2 forest · 3 blinding sun */

float hash(float n){ return fract(sin(n)*43758.5453123); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = hash2(i);
  float b = hash2(i+vec2(1.0,0.0));
  float c = hash2(i+vec2(0.0,1.0));
  float d = hash2(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.03; a *= 0.55; }
  return v;
}

vec3 seaScene(vec2 uv, vec2 p, float aspect, float t, float calm){
  float horizon = 0.60;

  /* ——— sky: night → shinonome dawn ——— */
  float skyY = clamp((uv.y-horizon)/(1.0-horizon), 0.0, 1.0);
  vec3 nTop = vec3(0.024,0.031,0.049), nHor = vec3(0.043,0.058,0.086);
  vec3 dTop = vec3(0.140,0.170,0.235), dHor = vec3(0.470,0.335,0.270);
  vec3 sky = mix( mix(nHor,nTop,pow(skyY,1.3)), mix(dHor,dTop,pow(skyY,1.15)), calm );
  sky += vec3(0.55,0.33,0.20) * exp(-skyY*4.5) * calm * 0.5;
  float cl = fbm(vec2(p.x*1.5 + t*0.013, uv.y*2.6 - t*0.004));
  float clouds = smoothstep(0.34 + 0.28*calm, 0.9, cl);
  vec3 cloudCol = mix(vec3(0.085,0.112,0.165), vec3(0.42,0.30,0.27), calm);
  sky = mix(sky, cloudCol, clouds*0.75);

  /* moon + halo, fading at dawn */
  vec2 mpos = vec2(0.76*aspect, 0.865);
  float md = length(p-mpos);
  float moonI = 1.0-calm;
  float moon  = (1.0 - smoothstep(0.043, 0.052, md)) * moonI;
  float halo  = (exp(-md*4.2)*0.32 + exp(-md*13.0)*0.30) * moonI;
  vec3 moonCol = vec3(0.86,0.91,0.97);
  sky += moonCol*(moon*0.9 + halo)*(1.0-clouds*0.55);

  /* ——— sea: waves flatten to a mirror ——— */
  float oy = clamp((horizon-uv.y)/horizon, 0.0, 1.0);
  float amp = 1.0 - 0.85*calm;
  float freq  = mix(30.0, 7.0, oy);
  float drift = t*mix(0.32, 0.10, calm);
  float wob   = fbm(vec2(p.x*mix(3.2,1.3,oy) + drift*0.28, oy*4.0 - drift*0.12));
  float band  = sin(oy*freq + wob*5.2*amp - drift)*0.5 + 0.5;
  float crest = smoothstep(0.70, 0.985, band)*amp;
  float shade = fbm(vec2(p.x*2.1 - drift*0.10, oy*6.0));
  vec3 sDeep = mix(vec3(0.015,0.028,0.051), vec3(0.075,0.085,0.105), calm);
  vec3 sMid  = mix(vec3(0.052,0.096,0.161), vec3(0.235,0.185,0.165), calm);
  vec3 sea = mix(sDeep, sMid, shade*mix(0.9,0.45,calm) + oy*0.12);
  float sparkle = 0.6 + 0.4*noise(vec2(p.x*34.0, oy*34.0 + t*1.4));
  sea += vec3(0.21,0.34,0.47) * crest * (0.22 + 0.55*oy) * sparkle;
  /* dawn sky mirrored in the still water */
  vec3 mir = mix(dHor, dTop, pow(clamp(oy*1.4,0.0,1.0),1.2)) * 0.55;
  sea = mix(sea, mir, calm*0.55*(0.4 + 0.6*(1.0-oy)));
  /* light lanes: moon at night, sun column at dawn */
  float lane = exp(-abs(p.x-mpos.x)*5.5) * exp(-oy*2.6);
  sea += moonCol * lane * 0.22 * (0.55 + 0.45*sin(oy*70.0 + t*2.2)) * moonI;
  float dl = exp(-abs(p.x-0.5*aspect)*4.0) * exp(-oy*2.0);
  sea += vec3(0.9,0.55,0.32) * dl * 0.10 * calm;

  float shoreMix = 1.0 - smoothstep(horizon-0.012, horizon+0.012, uv.y);
  vec3 col = mix(sky, sea, shoreMix);
  col += mix(vec3(0.10,0.14,0.20), vec3(0.45,0.30,0.22), calm) * exp(-abs(uv.y-horizon)*46.0) * 0.5;

  /* ——— lightning, dying away with the calm ——— */
  float lgt = 1.0 - smoothstep(0.15, 0.5, calm);
  float age = t - uStrike;
  if(age > 0.0 && age < 1.5 && lgt > 0.01){
    float env   = exp(-age*3.1);
    float gate  = step(0.28, hash(floor(age*26.0)+uSeed*7.0));
    float flick = (0.55 + 0.45*sin(age*95.0 + uSeed*20.0)) * mix(0.12,1.0,gate);
    float sx = uStrikeX*aspect + (uMouse.x-0.5)*0.05;
    float I  = env*flick*lgt;

    if(uv.y > horizon-0.02){
      float yy = clamp((uv.y-horizon)/(1.0-horizon), 0.0, 1.0);
      float wig = (fbm(vec2(yy*6.0,  uSeed*41.0))-0.5)*0.26*(1.0-yy*0.35)
                + (fbm(vec2(yy*22.0, uSeed*93.0))-0.5)*0.055;
      float bx = sx + wig;
      float d  = abs(p.x-bx);
      float bolt = exp(-d*260.0)*1.35 + exp(-d*30.0)*0.5;
      float side = sign(hash(uSeed*3.3)-0.5);
      float b2x  = bx + side*max(0.0, 0.5-yy)*0.42 + (fbm(vec2(yy*18.0,uSeed*57.0))-0.5)*0.05;
      float d2   = abs(p.x-b2x);
      bolt += (exp(-d2*300.0)*0.8 + exp(-d2*40.0)*0.28) * (1.0 - smoothstep(0.15,0.55,yy));
      col += vec3(0.78,0.87,1.0) * bolt * I;
    } else {
      float ry = oy;
      float rx = sx + (fbm(vec2(ry*9.0 + t*1.5, uSeed*41.0))-0.5)*0.16;
      float rd = abs(p.x-rx);
      col += vec3(0.55,0.70,0.95) * (exp(-rd*38.0)*0.4) * I * exp(-ry*2.6);
    }
    float flash = I*0.20;
    col += vec3(0.50,0.62,0.86) * flash * (0.45 + clouds*1.1);
    col += vec3(0.30,0.40,0.60) * flash * shoreMix * 0.5;
  }
  return col;
}

vec3 forestScene(vec2 uv, vec2 p, float aspect, float t, float sunp){
  float y = clamp(uv.y, 0.0, 1.0);
  vec2 sun = vec2(0.5*aspect, mix(0.30, 0.54, sunp));

  /* warm dawn air */
  vec3 low  = mix(vec3(0.62,0.30,0.16), vec3(1.02,0.62,0.34), sunp);
  vec3 high = mix(vec3(0.16,0.13,0.16), vec3(0.99,0.86,0.68), sunp);
  vec3 col = mix(low, high, pow(y, 1.15));

  /* the red sun */
  float d = length(p-sun);
  float rad = mix(0.075, 0.33, pow(sunp,1.3));
  vec3 sunCore = mix(vec3(0.85,0.22,0.14), vec3(1.05,0.55,0.30), sunp*0.7);
  float disc = 1.0 - smoothstep(rad*0.82, rad, d);
  col = mix(col, sunCore, disc*0.96);
  col += vec3(0.95,0.42,0.22) * exp(-d*mix(6.5,2.2,sunp)) * (0.55 + 0.45*sunp);
  col += vec3(1.00,0.75,0.45) * exp(-max(d-rad,0.0)*9.0) * 0.5;

  /* komorebi — diagonal shafts of light */
  float s = (p.x - sun.x) - (p.y - sun.y)*0.42;
  float beams = smoothstep(0.45, 0.95, fbm(vec2(s*5.0 + t*0.02, 2.7)));
  float bmask = exp(-d*1.6) * clamp(1.0 - y*0.25, 0.0, 1.0);
  col += vec3(1.0,0.72,0.42) * beams * bmask * mix(0.55, 0.15, sunp);

  /* cedar silhouettes, three depths, dissolving into the light */
  float dissolve = clamp(1.0 - sunp*1.35, 0.0, 1.0);
  for(int i=0;i<3;i++){
    float fi = float(i);
    float sc = mix(2.4, 5.4, fi*0.5);
    float wobx = (fbm(vec2(p.y*3.2 + fi*4.0, fi*9.0)) - 0.5) * 0.10;
    float n = noise(vec2((p.x + wobx)*sc + fi*13.7, fi*7.0 + 0.5));
    float trunk = smoothstep(0.58, 0.63, n) * (1.0 - smoothstep(0.70, 0.75, n));
    float leaf = smoothstep(0.52, 0.64, fbm(p*vec2(2.6,2.6) + vec2(fi*17.0, t*0.008)))
               * smoothstep(0.42, 0.85, y);
    float sil = clamp(trunk + leaf, 0.0, 1.0) * dissolve * (0.45 + 0.275*fi);
    vec3 silCol = mix(col*0.55, vec3(0.035,0.028,0.030), 0.35 + 0.325*fi);
    col = mix(col, silCol, sil);
  }

  /* drifting motes in the shafts */
  vec2 gp = vec2(p.x, y + t*0.02)*26.0;
  vec2 id = floor(gp);
  vec2 fp = fract(gp) - 0.5;
  vec2 off = vec2(hash2(id) - 0.5, hash2(id + vec2(7.7,3.1)) - 0.5)*0.6;
  float dm = length(fp - off);
  float mote = exp(-dm*dm*70.0) * step(0.84, hash2(id + vec2(3.3,9.2)));
  col += vec3(1.0,0.85,0.60) * mote * (0.25 + beams*0.45) * (1.0 - sunp*0.8);

  /* ground mist, then everything toward the blinding */
  col += vec3(0.9,0.55,0.30) * exp(-y*7.0) * 0.28 * (1.0 - sunp*0.5);
  col = mix(col, vec3(1.0,0.95,0.86), smoothstep(0.55,1.0,sunp)*0.8);
  return col;
}

void main(){
  vec2 uv = vUv;                       /* y = 0 bottom */
  float aspect = uRes.x/uRes.y;
  vec2 p = vec2(uv.x*aspect, uv.y);
  p.x += (uMouse.x-0.5)*0.05;          /* gentle parallax */
  p.y += (uMouse.y-0.5)*0.025;
  float t = uTime;
  float ph = uPhase;

  vec3 col;
  if(ph <= 1.0){
    col = seaScene(uv, p, aspect, t, smoothstep(0.0, 1.0, ph));
  } else if(ph < 2.0){
    float m = smoothstep(0.0, 1.0, ph-1.0);
    col = mix(seaScene(uv, p, aspect, t, 1.0), forestScene(uv, p, aspect, t, 0.0), m);
  } else {
    col = forestScene(uv, p, aspect, t, clamp(ph-2.0, 0.0, 1.0));
  }

  /* grain + vignette + fade — both relax as the light takes over */
  float day = clamp(ph-2.0, 0.0, 1.0);
  col += (hash2(uv*uRes + vec2(fract(t)*61.0))-0.5)*0.035*(1.0-0.5*day);
  float vg = length(uv-vec2(0.5,0.46));
  col *= 1.0 - (0.34*(1.0-0.7*day))*pow(vg*1.25, 2.4);
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}`;

    const VERT = `
attribute vec2 aPos; varying vec2 vUv;
void main(){ vUv = aPos*0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

    function makeGL() {
      if (!gl) return;
      const sh = (type: number, src: string) => {
        const s = gl!.createShader(type);
        if (!s) return null;
        gl!.shaderSource(s, src);
        gl!.compileShader(s);
        if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
          console.warn(gl!.getShaderInfoLog(s));
          glOK = false;
        }
        return s;
      };
      const prog = gl.createProgram();
      if (!prog) return;
      const vs = sh(gl.VERTEX_SHADER, VERT);
      const fs = sh(gl.FRAGMENT_SHADER, FRAG);
      if (vs) gl.attachShader(prog, vs);
      if (fs) gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      const loc = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      ["uRes", "uTime", "uMouse", "uStrike", "uStrikeX", "uSeed", "uFade", "uPhase"].forEach((n) => {
        uni[n] = gl!.getUniformLocation(prog, n);
      });
    }

    function resize() {
      if (!glOK || !gl || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, TOUCH ? 1.25 : 1.75);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uni.uRes) {
        gl.uniform2f(uni.uRes, canvas.width, canvas.height);
      }
    }

    if (glOK) makeGL();
    if (glOK) {
      resize();
      window.addEventListener("resize", resize);
    } else if (canvas) {
      canvas.style.display = "none";
      document.body.style.background =
        "radial-gradient(120% 90% at 70% 0%, #101a2b, #070b12)";
    }

    /* state */
    const state = {
      mx: 0.5,
      my: 0.5,
      tmx: 0.5,
      tmy: 0.5,
      fade: 0,
      fadeT: 0,
      strike: -10,
      strikeX: 0.5,
      seed: 0,
      nextAuto: 1e9,
      phase: 0,
      nextBird: 0,
    };

    const handlePointerMove = (e: PointerEvent) => {
      state.tmx = e.clientX / window.innerWidth;
      state.tmy = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    /* ═════════════════════════ AUDIO — procedural storm ═════════════════════════ */
    interface AudType {
      ctx: AudioContext | null;
      master: GainNode | null;
      on: boolean;
      seaBus: GainNode | null;
      windBus: GainNode | null;
      buf: AudioBuffer | null;
      droneF: BiquadFilterNode | null;
      noiseBuf: () => AudioBuffer;
      loopNoise: (
        dest: AudioNode,
        filterType: BiquadFilterType,
        freq: number,
        q: number,
        base: number,
        lfoRate: number,
        lfoDepth: number,
      ) => void;
      init: () => void;
      set: (on: boolean) => void;
      setPhase: (p: number) => void;
      chirp: () => void;
      bowl: () => void;
      thunder: (delay: number, power: number) => void;
    }

    const Aud: AudType = {
      ctx: null,
      master: null,
      on: false,
      seaBus: null,
      windBus: null,
      buf: null,
      droneF: null,
      noiseBuf() {
        if (!this.ctx) return {} as AudioBuffer;
        const len = this.ctx.sampleRate * 2.5,
          b = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const d = b.getChannelData(ch);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        }
        return b;
      },
      loopNoise(dest, filterType, freq, q, base, lfoRate, lfoDepth) {
        if (!this.ctx || !this.buf) return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.buf;
        src.loop = true;
        const f = this.ctx.createBiquadFilter();
        f.type = filterType;
        f.frequency.value = freq;
        f.Q.value = q;
        const g = this.ctx.createGain();
        g.gain.value = base;
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = lfoRate;
        const lg = this.ctx.createGain();
        lg.gain.value = lfoDepth;
        lfo.connect(lg).connect(g.gain);
        src.connect(f).connect(g).connect(dest);
        src.start();
        lfo.start();
      },
      init() {
        if (this.ctx) return;
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
        this.seaBus = this.ctx.createGain();
        this.seaBus.connect(this.master);
        this.windBus = this.ctx.createGain();
        this.windBus.connect(this.master);
        this.buf = this.noiseBuf();
        /* ocean washes — two offset swells */
        this.loopNoise(this.seaBus, "lowpass", 340, 0.6, 0.16, 0.07, 0.085);
        this.loopNoise(this.seaBus, "lowpass", 820, 0.7, 0.05, 0.043, 0.03);
        /* high wind */
        this.loopNoise(this.windBus, "highpass", 2200, 0.5, 0.012, 0.11, 0.009);
        /* drone — a low pentatonic breath */
        const df = (this.droneF = this.ctx.createBiquadFilter());
        df.type = "lowpass";
        df.frequency.value = 220;
        const dg = this.ctx.createGain();
        dg.gain.value = 0.05;
        df.connect(dg).connect(this.master);
        [
          [55, "sine", 0],
          [82.41, "sine", 4],
          [110, "triangle", -3],
        ].forEach(([f, t, det]) => {
          if (!this.ctx) return;
          const o = this.ctx.createOscillator();
          o.type = t as OscillatorType;
          o.frequency.value = f as number;
          o.detune.value = det as number;
          const og = this.ctx.createGain();
          og.gain.value = 0.5;
          o.connect(og).connect(df);
          o.start();
        });
        const dl = this.ctx.createOscillator();
        dl.frequency.value = 0.02;
        const dlg = this.ctx.createGain();
        dlg.gain.value = 70;
        dl.connect(dlg).connect(df.frequency);
        dl.start();
      },
      set(on) {
        this.on = on;
        if (!this.ctx || !this.master) return;
        if (this.ctx.state === "suspended") this.ctx.resume();
        const t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setTargetAtTime(on ? 0.85 : 0, t, 0.5);
      },
      setPhase(p) {
        if (!this.ctx || !this.seaBus || !this.windBus || !this.droneF) return;
        const t = this.ctx.currentTime;
        const sea =
          p < 1
            ? 1 - 0.2 * p
            : p < 2
              ? 0.8 - 0.62 * (p - 1)
              : Math.max(0.05, 0.18 - 0.13 * (p - 2));
        const wind = Math.max(0, 1 - p * 0.85);
        this.seaBus.gain.setTargetAtTime(sea, t, 0.4);
        this.windBus.gain.setTargetAtTime(wind, t, 0.4);
        if (this.droneF) this.droneF.frequency.setTargetAtTime(220 + p * 160, t, 0.6);
      },
      chirp() {
        if (!this.on || !this.ctx || !this.master) return;
        const t0 = this.ctx.currentTime + 0.02;
        const notes = 2 + ((Math.random() * 3) | 0);
        const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        const out = pan || this.master;
        if (pan) {
          pan.pan.value = (Math.random() * 2 - 1) * 0.8;
          pan.connect(this.master);
        }
        for (let i = 0; i < notes; i++) {
          if (!this.ctx) return;
          const st = t0 + i * 0.14 + Math.random() * 0.03;
          const f = 1900 + Math.random() * 1300;
          const o = this.ctx.createOscillator();
          o.type = "sine";
          o.frequency.setValueAtTime(f, st);
          o.frequency.exponentialRampToValueAtTime(f * 0.8, st + 0.09);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, st);
          g.gain.exponentialRampToValueAtTime(0.04, st + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, st + 0.11);
          o.connect(g).connect(out);
          o.start(st);
          o.stop(st + 0.14);
        }
      },
      bowl() {
        if (!this.on || !this.ctx || !this.master) return;
        const t0 = this.ctx.currentTime + 0.02,
          f0 = 214;
        [
          [1, 0.13],
          [2.76, 0.05],
          [5.4, 0.018],
        ].forEach(([m, amp]) => {
          if (!this.ctx || !this.master) return;
          const o = this.ctx.createOscillator();
          o.type = "sine";
          o.frequency.value = f0 * m;
          o.detune.value = (Math.random() * 2 - 1) * 4;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(amp, t0 + 0.02);
          g.gain.setTargetAtTime(0.0001, t0 + 0.06, 1.7);
          o.connect(g).connect(this.master);
          o.start(t0);
          o.stop(t0 + 9);
        });
      },
      thunder(delay, power) {
        if (!this.on || !this.ctx || !this.master || !this.buf) return;
        const t0 = this.ctx.currentTime + delay;
        const roll = (t: number, pow: number, dur: number) => {
          if (!this.ctx || !this.buf || !this.master) return;
          const src = this.ctx.createBufferSource();
          src.buffer = this.buf;
          src.loop = true;
          const f = this.ctx.createBiquadFilter();
          f.type = "lowpass";
          f.Q.value = 0.9;
          f.frequency.setValueAtTime(950, t);
          f.frequency.exponentialRampToValueAtTime(52, t + dur * 0.9);
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(pow, t + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          const pan = this.ctx.createStereoPanner
            ? this.ctx.createStereoPanner()
            : null;
          if (pan) {
            pan.pan.value = (Math.random() * 2 - 1) * 0.6;
            src.connect(f).connect(g).connect(pan).connect(this.master);
          } else src.connect(f).connect(g).connect(this.master);
          src.start(t);
          src.stop(t + dur + 0.1);
        };
        roll(t0, 0.8 * power, 2.4 + Math.random()); /* crack + body */
        roll(t0 + 0.55, 0.3 * power, 3.8 + Math.random() * 1.5); /* rolling tail */
        const o = this.ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(36, t0);
        const og = this.ctx.createGain();
        og.gain.setValueAtTime(0.0001, t0);
        og.gain.exponentialRampToValueAtTime(0.4 * power, t0 + 0.05);
        og.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
        o.connect(og).connect(this.master);
        o.start(t0);
        o.stop(t0 + 1.5);
      },
    };

    const toggleBtn = $("#soundToggle");
    function setSound(on: boolean, viaInit?: boolean) {
      if (on) {
        Aud.init();
      }
      Aud.set(on);
      if (on) Aud.setPhase(state.phase);
      if (toggleBtn) {
        toggleBtn.classList.toggle("is-on", on);
        toggleBtn.setAttribute("aria-pressed", String(on));
      }
      if (!viaInit && on && Aud.ctx) Aud.thunder(0.2, 0.35);
    }
    const handleSoundToggleClick = () => setSound(!Aud.on);
    if (toggleBtn) {
      toggleBtn.addEventListener("click", handleSoundToggleClick);
    }

    /* ═════════════════════════ LIGHTNING conductor ═════════════════════════ */
    const heroTitle = $(".hero-title");
    function strike(x: number, closeness: number = Math.random()) {
      const now = (performance.now() - startT) / 1000;
      state.strike = now;
      state.strikeX = x;
      state.seed = Math.random() * 100;
      Aud.thunder(0.25 + (1 - closeness) * 1.5, 0.55 + closeness * 0.45);
      if (!RM && heroTitle) {
        heroTitle.classList.remove("flick");
        void heroTitle.offsetWidth;
        heroTitle.classList.add("flick");
      }
      state.nextAuto = now + 7 + Math.random() * 9;
    }
    const heroSec = $("#hero");
    const handleHeroPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("a,button")) return;
      strike(e.clientX / window.innerWidth, 0.9);
    };
    if (heroSec) {
      heroSec.addEventListener("pointerdown", handleHeroPointerDown as EventListener);
    }

    /* ═════════════════════════ INTRO GATE ═════════════════════════ */
    const intro = $("#intro");
    let entered = false;
    const loadNum = $("#loadNum");
    const c0 = performance.now();
    let countAnimFrameId: number;

    const count = () => {
      const p = RM ? 1 : clamp((performance.now() - c0) / 1700, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      if (loadNum) {
        loadNum.textContent = String(Math.round(e * 100)).padStart(2, "0");
      }
      if (p < 1) countAnimFrameId = requestAnimationFrame(count);
    };
    count();

    function enter(withSound: boolean) {
      if (entered) return;
      entered = true;
      setSound(withSound, true);
      if (!TOUCH) document.body.classList.add("cursor-on");
      if (intro) {
        intro.classList.add("leave");
      }
      setTimeout(() => intro?.remove(), RM ? 60 : 1250);
      state.fadeT = 1;
      if (RM) state.fade = 1;
      document.body.classList.add("hero-in");
      $$("#hero [data-reveal]").forEach((el, i) => {
        if (!RM) (el as HTMLElement).style.transitionDelay = 1.05 + i * 0.09 + "s";
        el.classList.add("in");
        el.addEventListener(
          "transitionend",
          () => ((el as HTMLElement).style.transitionDelay = ""),
          { once: true },
        );
      });
      const rl = $(".hero-rule .line");
      if (rl) {
        if (!RM) rl.style.transitionDelay = ".9s";
        rl.classList.add("in");
      }
      setTimeout(() => document.body.classList.add("head-ready"), RM ? 0 : 2300);
      if (!RM) setTimeout(() => strike(0.34, 0.95), 1500);
    }

    const enterSoundBtn = $("#enterSound");
    const enterSilentBtn = $("#enterSilent");
    const handleEnterSound = () => enter(true);
    const handleEnterSilent = () => enter(false);
    if (enterSoundBtn) {
      enterSoundBtn.addEventListener("click", handleEnterSound);
    }
    if (enterSilentBtn) {
      enterSilentBtn.addEventListener("click", handleEnterSilent);
    }

    /* ═════════════════════════ REVEALS (IntersectionObserver) ═════════════════════════ */
    const revealTargets = [
      ...$$("[data-reveal]").filter((el) => !el.closest("#hero")),
      ...$$("[data-line]").filter((el) => !el.closest("#hero")),
      ...$$(".sec h2"),
      $("#workList"),
    ].filter(Boolean) as HTMLElement[];

    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (es) =>
          es.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add("in");
              observer?.unobserve(en.target);
            }
          }),
        { rootMargin: "0px 0px -10% 0px" },
      );
      revealTargets.forEach((el) => observer?.observe(el));
    } else {
      revealTargets.forEach((el) => el.classList.add("in"));
    }

    /* Musashi — the words and their reflection in the still water */
    const mq = $("#mQuote");
    const mRefl = $(".m-refl");
    if (mq && mRefl) {
      mRefl.innerHTML = mq.innerHTML;
    }

    /* quote split */
    const qJp = $("#qJp");
    const qEn = $("#qEn");
    if (qJp) {
      const content = qJp.textContent || "";
      qJp.innerHTML = [...content].map((c) => `<span class="qch">${c}</span>`).join("");
    }
    if (qEn) {
      const content = qEn.textContent || "";
      qEn.innerHTML = content
        .split(" ")
        .map((w) => `<span class="qw">${w}</span>`)
        .join(" ");
    }
    const qch = $$(".q-jp .qch");
    const qw = $$(".q-en .qw");
    const qSrc = $("#qSrc");

    /* work rows — placeholder links shouldn't jump the page */
    const workListEl = $("#workList");
    const handleWorkListClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".work")) e.preventDefault();
    };
    if (workListEl) {
      workListEl.addEventListener("click", handleWorkListClick);
    }

    /* ═════════════════════════ POINTER FX (desktop) ═════════════════════════ */
    let fxTick = () => {};
    let cx = state.mx;
    let cy = state.my;
    let rx = state.mx;
    let ry = state.my;
    let handleOnPointerMove: ((e: PointerEvent) => void) | null = null;
    const anchorEnterListeners: Array<{
      el: HTMLElement;
      name: "pointerenter" | "pointerleave";
      listener: EventListener;
    }> = [];

    if (!TOUCH) {
      /* floating work preview */
      const wpv = document.createElement("div");
      wpv.className = "wpv";
      wpv.innerHTML = `<div class="wpv-inner"><div class="wpv-bg"></div><div class="wpv-waves"></div><span class="wpv-k"></span><div class="wpv-cap"><span class="c1"></span><span class="c2"></span></div></div>`;
      document.body.appendChild(wpv);
      const bg = $(".wpv-bg", wpv) as HTMLElement | null;
      const kEl = $(".wpv-k", wpv) as HTMLElement | null;
      const c1 = $(".c1", wpv) as HTMLElement | null;
      const c2 = $(".c2", wpv) as HTMLElement | null;
      let tx = window.innerWidth / 2,
        ty = window.innerHeight / 2,
        wx = tx,
        wy = ty,
        rot = 0,
        vr = 0,
        px = 0,
        wo = 0,
        ws = 0.85,
        hov = false;
      /* cursor */
      const cur = $("#cursor");
      const ring = $(".ring", cur as HTMLElement);
      const dot = $(".dot", cur as HTMLElement);

      handleOnPointerMove = (e: PointerEvent) => {
        tx = cx = e.clientX;
        ty = cy = e.clientY;
        vr = clamp((e.clientX - px) * 0.35, -9, 9);
        px = e.clientX;
        if (dot) {
          dot.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
        }
      };
      window.addEventListener("pointermove", handleOnPointerMove, { passive: true });

      $$("#workList .work").forEach((a, i) => {
        const enterHandler = () => {
          if (bg) {
            bg.style.background = `linear-gradient(160deg, ${a.dataset.g2}, ${a.dataset.g1} 70%)`;
          }
          if (kEl) kEl.textContent = a.dataset.k || "";
          if (c1) c1.textContent = a.dataset.cap || "";
          if (c2) c2.textContent = String(i + 1).padStart(2, "0") + " / 05";
          hov = true;
        };
        const leaveHandler = () => (hov = false);

        a.addEventListener("pointerenter", enterHandler);
        a.addEventListener("pointerleave", leaveHandler);
        anchorEnterListeners.push({ el: a, name: "pointerenter", listener: enterHandler });
        anchorEnterListeners.push({ el: a, name: "pointerleave", listener: leaveHandler });
      });

      $$("a, button").forEach((el) => {
        const enterHandler = () => cur?.classList.add("is-hover");
        const leaveHandler = () => cur?.classList.remove("is-hover");

        el.addEventListener("pointerenter", enterHandler);
        el.addEventListener("pointerleave", leaveHandler);
        anchorEnterListeners.push({ el, name: "pointerenter", listener: enterHandler });
        anchorEnterListeners.push({ el, name: "pointerleave", listener: leaveHandler });
      });

      /* magnetic mail */
      const magnet = $("[data-magnet]") as HTMLElement | null;
      let mtx = 0,
        mty = 0,
        mx = 0,
        my = 0;
      let handleMagnetPointerMove: ((e: PointerEvent) => void) | null = null;
      let handleMagnetPointerLeave: (() => void) | null = null;

      if (magnet && !RM) {
        handleMagnetPointerMove = (e: PointerEvent) => {
          const r = magnet.getBoundingClientRect();
          mtx = (e.clientX - r.left - r.width / 2) * 0.18;
          mty = (e.clientY - r.top - r.height / 2) * 0.35;
        };
        handleMagnetPointerLeave = () => {
          mtx = 0;
          mty = 0;
        };
        magnet.addEventListener("pointermove", handleMagnetPointerMove as EventListener);
        magnet.addEventListener("pointerleave", handleMagnetPointerLeave);
      }

      fxTick = () => {
        wx += (tx - wx) * 0.16;
        wy += (ty - wy) * 0.16;
        rot += (vr - rot) * 0.1;
        vr *= 0.9;
        wo += ((hov ? 1 : 0) - wo) * 0.12;
        ws += ((hov ? 1 : 0.85) - ws) * 0.12;
        if (wpv) {
          wpv.style.opacity = wo.toFixed(3);
          wpv.style.transform = `translate3d(${(wx - 165).toFixed(1)}px,${(wy - 235).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${ws.toFixed(3)})`;
        }
        rx += (cx - rx) * 0.18;
        ry += (cy - ry) * 0.18;
        if (ring) {
          ring.style.transform = `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px) translate(-50%,-50%)`;
        }
        if (magnet) {
          mx += (mtx - mx) * 0.14;
          my += (mty - my) * 0.14;
          magnet.style.transform = `translate(${mx.toFixed(1)}px,${my.toFixed(1)}px)`;
        }
      };
    }

    /* ═════════════════════════ MAIN LOOP — render + scroll choreography ═════════════════════════ */
    const veilEl = $("#veil");
    const flashEl = $("#flash");
    const philosophy = $("#philosophy");
    const nagi = $("#nagi");
    const forest = $("#forest");
    const sunWrap = $("#sunrise");
    const sunCap = $(".sun-cap");
    const satori = $("#satori");
    const quoteWrap = $("#quote");
    const head = $("#siteHead");
    const ensoWrap = $(".enso-close");
    const ensoC = $("#ensoFinal circle") as unknown as SVGGeometryElement | null;
    const heroDrift = [
      $(".hero-title"),
      $(".hero-rule"),
      $(".hero-foot"),
    ].filter(Boolean) as HTMLElement[];
    const wms = $$("[data-wm]");
    let lastY = 0,
      lastPh = -1,
      bowlDone = false,
      running = true;

    const handleVisibilityChange = () => {
      running = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const spanP = (el: HTMLElement, a: number, b: number) => {
      const r = el.getBoundingClientRect();
      return clamp(
        (a * window.innerHeight - r.top) / ((a - b) * window.innerHeight),
        0,
        1,
      );
    };
    const stickyP = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return clamp(
        -r.top / Math.max(1, r.height - window.innerHeight),
        0,
        1,
      );
    };

    let frameId: number;

    function frame() {
      frameId = requestAnimationFrame(frame);
      if (!running) return;
      const now = (performance.now() - startT) / 1000;
      const vh = window.innerHeight;

      /* pointer + fade easing */
      const kFactor = RM ? 1 : 0.06;
      state.mx += (state.tmx - state.mx) * kFactor;
      state.my += (state.tmy - state.my) * kFactor;
      state.fade += (state.fadeT - state.fade) * (RM ? 1 : 0.03);

      /* ——— scroll choreography ——— */
      const yScroll = window.scrollY;
      if (head) {
        head.classList.toggle("is-hidden", yScroll > lastY && yScroll > 140);
      }
      lastY = yScroll;

      if (!RM) {
        const hp = clamp(yScroll / vh, 0, 1);
        const tyv = (-14 * hp).toFixed(2),
          opv = (1 - 0.75 * hp).toFixed(3);
        for (const el of heroDrift) {
          el.style.transform = `translateY(${tyv}%)`;
          el.style.opacity = opv;
        }
      }

      /* veil + world phase */
      const pPhil = philosophy ? spanP(philosophy, 1, 0.42) : 0;
      const nR = nagi ? nagi.getBoundingClientRect() : null;
      const pNagi = nR
        ? clamp((0.85 * vh - nR.top) / Math.max(1, nR.height - 0.3 * vh), 0, 1)
        : 0;
      const pForest = forest ? spanP(forest, 0.95, 0.15) : 0;
      const sp = sunWrap ? stickyP(sunWrap) : 0;
      const p23 = clamp(sp / 0.7, 0, 1);
      state.phase = pNagi + pForest + p23;
      const vN = nagi ? spanP(nagi, 0.85, 0.25) : 0;
      const vF = forest ? spanP(forest, 0.9, 0.4) : 0;
      let veil = 0.93 * pPhil;
      veil += (0.16 - veil) * vN;
      veil += (0 - veil) * vF;
      if (veilEl) {
        veilEl.style.opacity = veil.toFixed(3);
      }
      if (Math.abs(state.phase - lastPh) > 0.015) {
        Aud.setPhase(state.phase);
        lastPh = state.phase;
      }

      /* the first sun caption */
      const capIn = clamp((sp - 0.05) / 0.18, 0, 1),
        capOut = clamp((sp - 0.5) / 0.15, 0, 1);
      if (sunCap) {
        sunCap.style.opacity = (capIn * (1 - capOut)).toFixed(3);
      }

      /* the blinding → satori */
      const fu = Math.pow(clamp((sp - 0.62) / 0.35, 0, 1), 2);
      const fd = satori ? Math.pow(1 - spanP(satori, 0.85, 0.25), 2) : 1;
      const fl = fu * fd;
      if (flashEl) {
        flashEl.style.opacity = fl.toFixed(3);
      }
      if (fl > 0.96 && !bowlDone) {
        bowlDone = true;
        Aud.bowl();
      }
      if (fl < 0.4) bowlDone = false;
      if (satori) {
        document.body.classList.toggle(
          "is-light",
          satori.getBoundingClientRect().top < 0.65 * vh,
        );
      }

      /* quote — words charge like a slow storm front */
      if (!RM) {
        const qp = quoteWrap ? stickyP(quoteWrap) : 0;
        for (let i = 0; i < qch.length; i++) {
          qch[i].classList.toggle("lit", qp > 0.04 + (i / qch.length) * 0.5);
        }
        for (let i = 0; i < qw.length; i++) {
          qw[i].classList.toggle("lit", qp > 0.42 + (i / qw.length) * 0.42);
        }
        if (qSrc) {
          qSrc.classList.toggle("in", qp > 0.88);
        }
      }

      /* closing enso draws itself */
      if (ensoWrap && ensoC) {
        ensoC.style.strokeDashoffset = (100 - 97 * spanP(ensoWrap, 0.92, 0.45)).toFixed(2);
      }

      /* watermark parallax */
      if (!RM) {
        for (const wm of wms) {
          const parent = wm.parentElement;
          if (!parent) continue;
          const pr = parent.getBoundingClientRect();
          const t = clamp((vh - pr.top) / (vh + pr.height), 0, 1);
          wm.style.transform = `translateY(${(14 - 28 * t).toFixed(2)}%)`;
        }
      }

      /* storm scheduling + forest birdsong */
      if (!RM && now > state.nextAuto) {
        if (state.phase < 0.25) strike(0.15 + Math.random() * 0.7);
        else state.nextAuto = now + 4;
      }
      if (
        Aud.on &&
        state.phase > 1.15 &&
        state.phase < 2.3 &&
        now > state.nextBird
      ) {
        Aud.chirp();
        state.nextBird = now + 3.5 + Math.random() * 6;
      }

      fxTick();

      /* ——— draw the world ——— */
      if (glOK && gl) {
        gl.uniform1f(uni.uTime, RM ? now * 0.18 : now);
        gl.uniform2f(uni.uMouse, state.mx, state.my);
        gl.uniform1f(uni.uStrike, state.strike);
        gl.uniform1f(uni.uStrikeX, state.strikeX);
        gl.uniform1f(uni.uSeed, state.seed);
        gl.uniform1f(uni.uFade, state.fade);
        gl.uniform1f(uni.uPhase, state.phase);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }
    frame();

    /* ═════════════════════════ CLOCK ═════════════════════════ */
    const jst = $("#jst");
    const tickClock = () => {
      if (jst) {
        jst.textContent = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date());
      }
    };
    tickClock();
    const clockInterval = setInterval(tickClock, 1000);

    // Unmount Cleanups
    return () => {
      window.removeEventListener("error", emergency);
      window.removeEventListener("unhandledrejection", emergency);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      if (handleOnPointerMove) {
        window.removeEventListener("pointermove", handleOnPointerMove);
      }
      if (toggleBtn) {
        toggleBtn.removeEventListener("click", handleSoundToggleClick);
      }
      if (heroSec) {
        heroSec.removeEventListener("pointerdown", handleHeroPointerDown as EventListener);
      }
      if (enterSoundBtn) {
        enterSoundBtn.removeEventListener("click", handleEnterSound);
      }
      if (enterSilentBtn) {
        enterSilentBtn.removeEventListener("click", handleEnterSilent);
      }
      if (workListEl) {
        workListEl.removeEventListener("click", handleWorkListClick);
      }
      if (observer) {
        observer.disconnect();
      }
      anchorEnterListeners.forEach(({ el, name, listener }) => {
        el.removeEventListener(name, listener);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(countAnimFrameId);
      cancelAnimationFrame(frameId);
      clearInterval(clockInterval);

      const fs = document.getElementById("failsafe");
      if (fs) fs.remove();
      const wpv = document.querySelector(".wpv");
      if (wpv) wpv.remove();
    };
  }, []);

  return (
    <>
      <canvas id="gl" aria-hidden="true"></canvas>
      <div id="veil" aria-hidden="true"></div>
      <div id="flash" aria-hidden="true"></div>
      <div className="grain" aria-hidden="true"></div>
      <div id="cursor" aria-hidden="true">
        <div className="ring"></div>
        <div className="dot"></div>
      </div>

      {/* intro gate */}
      <div id="intro" role="dialog" aria-label="Welcome">
        <svg className="enso" viewBox="0 0 120 120" aria-hidden="true">
          <circle
            className="ghost"
            cx="60"
            cy="60"
            r="53"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset="100"
          />
          <circle
            className="main"
            cx="60"
            cy="60"
            r="52"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset="100"
          />
        </svg>
        <p className="intro-name">REN AOKI</p>
        <p className="intro-jp">嵐と凪のあいだに</p>
        <div className="intro-choices">
          <button className="intro-choice" id="enterSound">
            <small>音と共に</small>Enter with sound
          </button>
          <button className="intro-choice" id="enterSilent">
            <small>静寂のまま</small>Enter in silence
          </button>
        </div>
        <p className="intro-load">
          <span id="loadNum">00</span> / 100
        </p>
      </div>

      <header className="site-head" id="siteHead">
        <a className="seal" href="#top" aria-label="Ren Aoki — home">
          蓮
        </a>
        <nav className="head-nav" aria-label="Primary">
          <a href="#philosophy">Philosophy</a>
          <a href="#work">Work</a>
          <button 
            onClick={() => setShowBlog(true)} 
            className="hover:text-orange-400 cursor-pointer text-gray-300 uppercase tracking-widest text-[11px] transition-colors bg-transparent border-none font-sans font-medium"
          >
            Satori Scroll
          </button>
          <a href="#contact">Contact</a>
        </nav>
        <button id="soundToggle" aria-pressed="false" aria-label="Toggle ambient sound">
          <span className="bars" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </span>
          <span className="slabel">Sound</span>
        </button>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero" id="hero">
          <p className="hero-eyebrow" data-reveal="">
            Portfolio ’26 — <b>Creative developer, Tokyo</b>
          </p>
          <h1 className="hero-title" aria-label="Ren Aoki">
            <span className="row" data-split="">
              REN
            </span>
            <span className="row indent" data-split="">
              AOKI
            </span>
          </h1>
          <div className="hero-rule">
            <span className="line" data-line=""></span>
            <span className="jp">静けさと、稲妻。</span>
          </div>
          <div className="hero-foot">
            <p className="hero-sub" data-reveal="">
              I build digital experiences that move like water and strike like light — WebGL,
              motion and sound, composed with Japanese restraint.
            </p>
            <div className="scroll-cue" data-reveal="">
              <span>Scroll</span>
              <span className="stem"></span>
            </div>
            <p className="strike-hint" data-reveal="">
              ↯ <em>Click the sky</em>
              <br />
              to summon lightning
            </p>
          </div>
          <div className="tategaki" data-reveal="">
            波は静かに、雷は一瞬に。
          </div>
        </section>

        {/* PHILOSOPHY */}
        <section className="sec" id="philosophy">
          <div className="watermark" data-wm="">
            間
          </div>
          <div className="mark">
            <span className="mark-k">間</span>
            <span className="mark-line" data-line=""></span>
            <span className="mark-en">Ma — the pause</span>
          </div>
          <h2>
            <span className="row" data-split="">
              Stillness,
            </span>
            <span className="row" data-split="">
              <em>then the strike.</em>
            </span>
          </h2>
          <div className="phil-grid">
            <div>
              <p data-reveal="">
                My work begins with <em>ma</em> — the Japanese sense of the meaningful pause.
                Empty space is not absence; it is the held breath before the wave breaks. I
                compose interfaces the way a garden is raked: every element placed, every silence
                deliberate.
              </p>
              <p data-reveal="">
                Then, the storm. Motion, sound and code arrive with intent — a single flash that
                makes the calm legible. Serenity and force are not opposites; one gives the other
                its meaning. Ten years of building for studios and brands taught me when to hold the
                water still, and when to let it strike.
              </p>
              <p className="jpline" data-reveal="">
                静中の動、動中の静。
              </p>
            </div>
            <dl className="facts">
              <div className="fact" data-reveal="">
                <dt>Base</dt>
                <dd>Tokyo — working worldwide</dd>
              </div>
              <div className="fact" data-reveal="">
                <dt>Practice</dt>
                <dd>WebGL · Motion · Web Audio</dd>
              </div>
              <div className="fact" data-reveal="">
                <dt>Recognition</dt>
                <dd>14 × Awwwards · 9 × FWA</dd>
              </div>
              <div className="fact" data-reveal="">
                <dt>Season</dt>
                <dd>Booking from autumn ’26</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* CRAFT */}
        <section className="sec" id="craft">
          <div className="mark">
            <span className="mark-k">技</span>
            <span className="mark-line" data-line=""></span>
            <span className="mark-en">The craft</span>
          </div>
          <div className="craft-list">
            <div className="craft" data-reveal="">
              <span className="ck">導</span>
              <h3>Creative direction</h3>
              <p>Concept, art direction and narrative for digital-first brands.</p>
            </div>
            <div className="craft" data-reveal="">
              <span className="ck">海</span>
              <h3>WebGL {"&"} shaders</h3>
              <p>Real-time oceans, weather and generative worlds in the browser.</p>
            </div>
            <div className="craft" data-reveal="">
              <span className="ck">雷</span>
              <h3>Motion {"&"} interaction</h3>
              <p>Choreographed reveals and micro-moments, timed to the frame.</p>
            </div>
            <div className="craft" data-reveal="">
              <span className="ck">音</span>
              <h3>Sound for the web</h3>
              <p>Procedural ambience and interface audio, synthesized live.</p>
            </div>
          </div>
        </section>

        {/* WORKS */}
        <section className="sec" id="work">
          <div className="watermark" data-wm="">
            作
          </div>
          <div className="mark">
            <span className="mark-k">作</span>
            <span className="mark-line" data-line=""></span>
            <span className="mark-en">Selected work — ’24 → ’26</span>
          </div>
          <h2>
            <span className="row" data-split="">
              Five tides,
            </span>
            <span className="row" data-split="">
              <em>five storms.</em>
            </span>
          </h2>
          <ul className="work-list" id="workList">
            <li>
              <a
                className="work"
                href="#"
                data-k="潮"
                data-g1="#0a2233"
                data-g2="#12475c"
                data-cap="WebGL Journey"
              >
                <span className="w-line" data-line=""></span>
                <span className="w-idx">01</span>
                <span className="w-title">
                  Kuroshio<span className="wk">潮</span>
                </span>
                <span className="w-meta">Immersive WebGL · 2026</span>
                <span className="w-arrow">→</span>
              </a>
            </li>
            <li>
              <a
                className="work"
                href="#"
                data-k="雷"
                data-g1="#0b1226"
                data-g2="#28407a"
                data-cap="Audio-reactive"
              >
                <span className="w-line" data-line=""></span>
                <span className="w-idx">02</span>
                <span className="w-title">
                  Raijin<span className="wk">雷</span>
                </span>
                <span className="w-meta">Installation · 2025</span>
                <span className="w-arrow">→</span>
              </a>
            </li>
            <li>
              <a
                className="work"
                href="#"
                data-k="灯"
                data-g1="#141018"
                data-g2="#4a3b2a"
                data-cap="Brand &amp; Motion"
              >
                <span className="w-line" data-line=""></span>
                <span className="w-idx">03</span>
                <span className="w-title">
                  Shiranui<span className="wk">灯</span>
                </span>
                <span className="w-meta">Identity system · 2025</span>
                <span className="w-arrow">→</span>
              </a>
            </li>
            <li>
              <a
                className="work"
                href="#"
                data-k="月"
                data-g1="#0d1420"
                data-g2="#3d4f66"
                data-cap="Editorial commerce"
              >
                <span className="w-line" data-line=""></span>
                <span className="w-idx">04</span>
                <span className="w-title">
                  Tsukiyo<span className="wk">月</span>
                </span>
                <span className="w-meta">E-commerce · 2024</span>
                <span className="w-arrow">→</span>
              </a>
            </li>
            <li>
              <a
                className="work"
                href="#"
                data-k="光"
                data-g1="#0c1712"
                data-g2="#2e5546"
                data-cap="Generative art"
              >
                <span className="w-line" data-line=""></span>
                <span className="w-idx">05</span>
                <span className="w-title">
                  Komorebi<span className="wk">光</span>
                </span>
                <span className="w-meta">Art direction · 2024</span>
                <span className="w-arrow">→</span>
              </a>
            </li>
          </ul>
        </section>

        {/* QUOTE */}
        <section className="quote-wrap" id="quote">
          <div className="quote-stage">
            <div className="quote">
              <p className="q-jp" id="qJp">
                静けさの中に嵐を宿し、嵐の中に静けさを聴く。
              </p>
              <p className="q-en" id="qEn">
                Hold the storm inside your stillness. Hear the stillness inside the storm.
              </p>
              <p className="q-src" id="qSrc">
                — studio note, aboard the Enoshima ferry
              </p>
            </div>
          </div>
        </section>

        {/* NAGI — the stillness after */}
        <section className="calm" id="nagi">
          <div className="calm-inner">
            <div className="mark">
              <span className="mark-k">凪</span>
              <span className="mark-line" data-line=""></span>
              <span className="mark-en">Nagi — the stillness after</span>
            </div>
            <p className="calm-zengo" data-reveal="">
              明鏡止水
            </p>
            <p className="calm-en" data-reveal="">
              Clear mirror, still water
            </p>
            <p className="calm-line" data-reveal="">
              The storm passes. The sea keeps no record of it — only depth, and a surface that
              finally shows the sky. Every project of mine ends here: quiet enough to reflect.
            </p>
          </div>
        </section>

        {/* MUSASHI — a moment of insight */}
        <section className="musashi" id="musashi">
          <figure data-reveal="">
            <blockquote id="mQuote">
              <p className="m-jp">一を以て、万を知る。</p>
              <p className="m-en">From one thing, know ten thousand things.</p>
            </blockquote>
            <div className="m-horizon" aria-hidden="true"></div>
            <div className="m-refl" aria-hidden="true"></div>
            <figcaption>
              宮本武蔵 『五輪書』 — Miyamoto Musashi, <em>The Book of Five Rings</em>, 1645
            </figcaption>
          </figure>
        </section>

        {/* FOREST — first light */}
        <section className="forest" id="forest">
          <div className="forest-cap">
            <div className="mark">
              <span className="mark-k">森</span>
              <span className="mark-line" data-line=""></span>
              <span className="mark-en">Komorebi — light through leaves</span>
            </div>
            <p data-reveal="">
              Dawn walks through the cedars one shaft at a time. Every idea has this hour — when it
              first slips, sideways and golden, between the trunks.
            </p>
          </div>
        </section>

        {/* SUNRISE — the red sun */}
        <section className="sunrise" id="sunrise" aria-label="The rising sun">
          <div className="sun-stage">
            <div className="sun-cap">
              <span className="sc-jp">初日の出</span>
              <span className="sc-en">The first sun</span>
            </div>
          </div>
        </section>

        <div className="daylight">
          {/* SATORI */}
          <section className="sec satori" id="satori">
            <div className="hinomaru" aria-hidden="true"></div>
            <div className="watermark" data-wm="">
              悟
            </div>
            <div className="mark">
              <span className="mark-k">悟</span>
              <span className="mark-line" data-line=""></span>
              <span className="mark-en">Satori — the awakening</span>
            </div>
            <h2>
              <span className="row" data-split="">
                And then —
              </span>
              <span className="row" data-split="">
                <em>clarity.</em>
              </span>
            </h2>
            <div className="satori-grid">
              <div className="dogen">
                <p className="d-jp" data-reveal="">
                  仏道をならふといふは、自己をならふなり。
                  <br />
                  自己をならふといふは、自己をわするるなり。
                </p>
                <p className="d-en" data-reveal="">
                  To study the Way is to study the self. To study the self is to forget the self.
                </p>
                <p className="d-cite" data-reveal="">
                  — Dōgen, <em>Genjōkōan</em>, c. 1233
                </p>
              </div>
              <div className="zengo-row">
                <div className="zcol" data-reveal="">
                  <span className="z-jp">雲外蒼天</span>
                  <span className="z-en">Beyond the clouds, blue sky</span>
                </div>
                <div className="zcol" data-reveal="">
                  <span className="z-jp">日々是好日</span>
                  <span className="z-en">Every day, a good day</span>
                </div>
                <div className="zcol" data-reveal="">
                  <span className="z-jp">一期一会</span>
                  <span className="z-en">One time, one meeting</span>
                </div>
              </div>
            </div>
            <div className="enso-close" data-reveal="">
              <svg id="ensoFinal" viewBox="0 0 120 120" aria-hidden="true">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset="100"
                />
              </svg>
              <p>円相 — the circle, almost closed</p>
            </div>
          </section>

          {/* CONTACT */}
          <section className="sec contact" id="contact">
            <div className="watermark" data-wm="">
              縁
            </div>
            <div className="mark">
              <span className="mark-k">縁</span>
              <span className="mark-line" data-line=""></span>
              <span className="mark-en">En — a chance connection</span>
            </div>
            <h2>
              <span className="row" data-split="">
                Let’s make
              </span>
              <span className="row" data-split="">
                <em>weather together.</em>
              </span>
            </h2>
            <a className="big-mail" href="mailto:ceo@walizen.com" data-magnet="">
              ceo@walizen.com
            </a>
            <div className="contact-meta">
              <span className="avail" data-reveal="">
                <i></i>Open for autumn ’26
              </span>
              <a href="#" data-reveal="">
                Awwwards
              </a>
              <a href="https://github.com/walizen" target="_blank" rel="noopener noreferrer" data-reveal="">
                GitHub
              </a>
              <a href="#" data-reveal="">
                Instagram
              </a>
              <a href="https://x.com/walizen" target="_blank" rel="noopener noreferrer" data-reveal="">
                X / Twitter
              </a>
            </div>
          </section>

          <footer className="site-foot">
            <span>© 2026 Ren Aoki — 青木 蓮</span>
            <svg className="enso-mini" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="46" />
            </svg>
            <span>
              Tokyo <span id="jst">--:--:--</span> JST
            </span>
            <span>Built with WebGL, Web Audio {"&"} the Pacific</span>
          </footer>
        </div>
        {/* /daylight */}
      </main>

      {/* AI Concierge floating advisor */}
      <AiConcierge />

      {/* Full-screen Meditative Scroll Section */}
      <AnimatePresence>
        {showBlog && <MeditativeBlog onClose={() => setShowBlog(false)} />}
      </AnimatePresence>
    </>
  );
}
