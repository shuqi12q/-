// 正念白噪音 + 呼吸引导 —— 全程 Web Audio 合成，不依赖外部音频文件
// v2 优化：全部白噪音重做成「柔和悦耳」版本：
//   - 底噪一律用 pink/brown noise（比 white 柔和一个量级）+ 低通削高频刺耳感
//   - 音量整体压低（0.08–0.22），避免盖过呼吸引导
//   - 音效层（雨滴/鸟鸣/噼啪/潮汐/风起）带立体声 pan 与随机化，听感更自然
//   - 海浪用慢 LFO 模拟潮汐、晚风用超慢 LFO 模拟风起风落
import type { MindAudioKey } from "./types";

type NoiseKind = "white" | "pink" | "brown";

// ---------- 白噪音生成器 ----------
class NoiseSource {
  protected ctx: AudioContext;
  protected gainNode: GainNode;
  protected nodes: AudioNode[] = [];

  constructor(ctx: AudioContext, kind: NoiseKind = "white") {
    this.ctx = ctx;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(ctx.destination);
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer(kind);
    src.loop = true;
    src.connect(this.gainNode);
    src.start();
    this.nodes.push(src);
  }

  protected makeNoiseBuffer(kind: NoiseKind, durationSec = 2): AudioBuffer {
    const sr = this.ctx.sampleRate;
    const len = sr * durationSec;
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    if (kind === "white") {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } else if (kind === "pink") {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    }
    return buf;
  }

  get gain(): GainNode {
    return this.gainNode;
  }

  setVolume(v: number, fadeSec = 0.4) {
    this.gainNode.gain.linearRampToValueAtTime(v, this.ctx.currentTime + fadeSec);
  }

  stop() {
    this.nodes.forEach((n) => {
      try {
        (n as AudioBufferSourceNode).stop();
      } catch {}
    });
    this.nodes = [];
    this.gainNode.disconnect();
  }
}

// 简易工具：立体声 pan 节点
function panNode(c: AudioContext, value = 0): StereoPannerNode {
  const p = c.createStereoPanner();
  p.pan.value = value;
  return p;
}

interface WhiteNoiseController {
  start(key: MindAudioKey): Promise<void>;
  switchTo(key: MindAudioKey): void;
  stop(): void;
}

export function createWhiteNoise(): WhiteNoiseController {
  let ctx: AudioContext | null = null;
  let currentKey: MindAudioKey = "silence";
  let cleanup: Array<() => void> = [];

  function ensureCtx(): AudioContext {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function teardown() {
    cleanup.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    cleanup = [];
  }

  function buildForKey(c: AudioContext, k: MindAudioKey): Array<() => void> {
    const fns: Array<() => void> = [];

    if (k === "rain") {
      // 雨声：pink 底噪 + 低通 900Hz 柔和 + 随机小水滴（立体声分布）
      const src = new NoiseSource(c, "pink");
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      src.gain.disconnect();
      src.gain.connect(lp);
      lp.connect(c.destination);
      src.setVolume(0.16);
      fns.push(() => src.stop());

      let dripStopped = false;
      const drip = () => {
        if (dripStopped || !ctx) return;
        const t = ctx.currentTime;
        const osc = c.createOscillator();
        osc.type = "sine";
        const f = 1400 + Math.random() * 1600;
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.09);
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        const pan = panNode(c, Math.random() * 1.4 - 0.7);
        osc.connect(g);
        g.connect(pan);
        pan.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.2);
        setTimeout(drip, 160 + Math.random() * 320);
      };
      setTimeout(drip, 300);
      fns.push(() => {
        dripStopped = true;
      });
    } else if (k === "stream") {
      // 溪流：pink 底噪 + 带通 1200Hz 水声 + 轻微 LFO 波动
      const src = new NoiseSource(c, "pink");
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1200;
      bp.Q.value = 0.5;
      src.gain.disconnect();
      src.gain.connect(bp);
      bp.connect(c.destination);
      src.setVolume(0.14);
      fns.push(() => src.stop());
      // 轻微水流起伏
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.4;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 0.05;
      lfo.connect(lfoGain);
      lfoGain.connect(src.gain.gain);
      lfo.start();
      fns.push(() => lfo.stop());
    } else if (k === "forest") {
      // 森林鸟鸣：轻 pink 底噪（树叶沙沙）+ 立体声随机鸟鸣 chirp
      const src = new NoiseSource(c, "pink");
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      src.gain.disconnect();
      src.gain.connect(lp);
      lp.connect(c.destination);
      src.setVolume(0.04);
      fns.push(() => src.stop());

      let birdStopped = false;
      const chirp = () => {
        if (birdStopped || !ctx) return;
        const t = ctx.currentTime;
        const osc = c.createOscillator();
        osc.type = "sine";
        const base = 1400 + Math.random() * 1800;
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.linearRampToValueAtTime(base * 1.6, t + 0.09);
        osc.frequency.linearRampToValueAtTime(base * 0.85, t + 0.2);
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        const pan = panNode(c, Math.random() * 1.6 - 0.8);
        osc.connect(g);
        g.connect(pan);
        pan.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.32);
        setTimeout(chirp, 1400 + Math.random() * 2600);
      };
      setTimeout(chirp, 500);
      fns.push(() => {
        birdStopped = true;
      });
    } else if (k === "campfire") {
      // 篝火：brown 底噪（低频温暖）+ 低通 240Hz + 稀疏轻柔噼啪
      const src = new NoiseSource(c, "brown");
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 240;
      src.gain.disconnect();
      src.gain.connect(lp);
      lp.connect(c.destination);
      src.setVolume(0.2);
      fns.push(() => src.stop());

      let crackStopped = false;
      const crack = () => {
        if (crackStopped || !ctx) return;
        const t = ctx.currentTime;
        const osc = c.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = 600 + Math.random() * 1400;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        const pan = panNode(c, Math.random() * 1 - 0.5);
        osc.connect(g);
        g.connect(pan);
        pan.connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.1);
        setTimeout(crack, 700 + Math.random() * 1500);
      };
      setTimeout(crack, 300);
      fns.push(() => {
        crackStopped = true;
      });
    } else if (k === "ocean") {
      // 海浪：pink 底噪 + 低通 400Hz + 慢 LFO 潮汐起伏（0.12Hz ≈ 8 秒一个浪）
      const src = new NoiseSource(c, "pink");
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 400;
      src.gain.disconnect();
      src.gain.connect(lp);
      lp.connect(c.destination);
      src.gain.gain.setValueAtTime(0.18, c.currentTime);
      fns.push(() => src.stop());
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.12;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 0.12;
      lfo.connect(lfoGain);
      lfoGain.connect(src.gain.gain);
      lfo.start();
      fns.push(() => lfo.stop());
    } else if (k === "wind") {
      // 晚风：brown 底噪 + 低通 180Hz + 超慢 LFO（0.08Hz）模拟风起风落
      const src = new NoiseSource(c, "brown");
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 180;
      src.gain.disconnect();
      src.gain.connect(lp);
      lp.connect(c.destination);
      src.gain.gain.setValueAtTime(0.1, c.currentTime);
      fns.push(() => src.stop());
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 0.07;
      lfo.connect(lfoGain);
      lfoGain.connect(src.gain.gain);
      lfo.start();
      fns.push(() => lfo.stop());
    }

    return fns;
  }

  return {
    async start(key: MindAudioKey) {
      const c = ensureCtx();
      teardown();
      currentKey = key;
      if (key === "silence") return;
      cleanup = buildForKey(c, key);
    },
    switchTo(key: MindAudioKey) {
      if (key === currentKey) return;
      this.start(key);
    },
    stop() {
      teardown();
      currentKey = "silence";
    },
  };
}

// ---------- 呼吸引导语音（Web Speech API，浏览器原生 TTS） ----------
let zhVoice: SpeechSynthesisVoice | null = null;
let voiceReady = false;

function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  voiceReady = true;
  return (
    voices.find((v) => /zh[-_]?CN|cmn[-_]?Hans/i.test(v.lang)) ||
    voices.find((v) => /zh|Chinese|Mandarin/i.test(v.name)) ||
    null
  );
}

export function prepareVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  pickChineseVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    zhVoice = pickChineseVoice();
  };
}

export function speak(text: string, opts: { rate?: number; pitch?: number } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (!voiceReady) zhVoice = pickChineseVoice();
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "zh-CN";
  utt.rate = opts.rate ?? 0.7;
  utt.pitch = opts.pitch ?? 1;
  if (zhVoice) utt.voice = zhVoice;
  window.speechSynthesis.speak(utt);
}

export function speakCancel() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}