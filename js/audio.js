// 程式合成音效（WebAudio），無任何外部音檔
const SFX = (() => {
  let ac = null, master = null, muted = false, noiseBuf = null;
  const last = {};
  function init() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    ac = new C(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.0, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function ok(key, gap) {
    if (!ac || muted) return false;
    const t = ac.currentTime; if (last[key] && t - last[key] < gap) return false; last[key] = t; return true;
  }
  function tone(f0, f1, dur, type = "square", vol = 0.2, delay = 0) {
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, q = 0.8, type = "lowpass", delay = 0) {
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  const P = {
    click() { if (ok("click", 0.04)) { tone(900, 600, 0.06, "square", 0.12); } },
    build() { if (ok("build", 0.05)) { noise(0.12, 0.35, 900); tone(220, 440, 0.14, "triangle", 0.25); tone(440, 660, 0.12, "triangle", 0.18, 0.08); } },
    upgrade() { if (ok("up", 0.05)) { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.12, "triangle", 0.2, i * 0.07)); } },
    sell() { if (ok("sell", 0.05)) { tone(1200, 1500, 0.08, "square", 0.12); tone(1500, 1900, 0.1, "square", 0.12, 0.07); } },
    deny() { if (ok("deny", 0.15)) tone(200, 140, 0.18, "sawtooth", 0.16); },
    arrow() { if (ok("arrow", 0.05)) { noise(0.07, 0.18, 3000, 1.5, "bandpass"); tone(1400, 700, 0.05, "triangle", 0.06); } },
    cannon() { if (ok("cannon", 0.08)) { noise(0.35, 0.6, 400); tone(120, 50, 0.25, "sine", 0.4); } },
    boom() { if (ok("boom", 0.07)) { noise(0.45, 0.5, 700); tone(90, 40, 0.35, "sine", 0.35); } },
    frost() { if (ok("frost", 0.07)) { tone(2200, 1800, 0.18, "sine", 0.1); tone(3300, 2600, 0.14, "sine", 0.06, 0.03); noise(0.15, 0.08, 6000, 2, "highpass"); } },
    zap() { if (ok("zap", 0.08)) { noise(0.18, 0.3, 2500, 4, "bandpass"); tone(880, 220, 0.16, "sawtooth", 0.1); } },
    hit() { if (ok("hit", 0.035)) tone(300, 160, 0.05, "square", 0.06); },
    die() { if (ok("die", 0.05)) { noise(0.16, 0.2, 1200); tone(400, 120, 0.16, "triangle", 0.14); } },
    coin() { if (ok("coin", 0.06)) { tone(1320, 1320, 0.05, "square", 0.07); tone(1760, 1760, 0.08, "square", 0.07, 0.05); } },
    leak() { if (ok("leak", 0.12)) { tone(330, 160, 0.3, "sawtooth", 0.2); } },
    wave() { if (ok("wave", 0.3)) { [392, 523, 659].forEach((f, i) => tone(f, f, 0.18, "sawtooth", 0.12, i * 0.12)); } },
    boss() { if (ok("boss", 1)) { tone(110, 55, 1.2, "sawtooth", 0.3); tone(116, 58, 1.2, "sawtooth", 0.25); noise(1.0, 0.3, 300); } },
    win() { if (ok("win", 1)) { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, f, 0.22, "triangle", 0.22, i * 0.13)); } },
    lose() { if (ok("lose", 1)) { [392, 349, 311, 262].forEach((f, i) => tone(f, f * 0.98, 0.35, "sawtooth", 0.16, i * 0.25)); } },
  };
  return Object.assign(P, {
    init, get muted() { return muted; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; },
  });
})();
