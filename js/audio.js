"use strict";
// 恐龍防線：音訊系統。音效＝預先解碼的 WebAudio 緩衝；音樂＝串流 <audio> 經 GainNode 控制音量。
// 所有音檔來源與授權見 CREDITS.md。iPhone Safari 需在第一次觸控後呼叫 AUDIO.unlock()。
const AUDIO = (() => {
  const SFX_NAMES = ["click", "back", "deny", "build", "upgrade", "sell", "coin", "spear", "spearhit", "lava", "boom", "frost", "shatter",
    "zap", "venom", "amber", "hit", "roar1", "roar2", "roar3", "die1", "die2", "die3", "boss", "bossdie", "meteor", "trap", "airdrop",
    "item", "wave", "leak", "rock", "erupt", "achieve", "heal"];
  const LIMIT = { spear: 3, spearhit: 3, hit: 3, zap: 2, frost: 2, venom: 2, coin: 3, die1: 2, die2: 2, die3: 2, boom: 3, lava: 2, amber: 2 };
  let ctx = null, master = null, sfxGain = null, musicGain = null, unlocked = false;
  const buffers = {}, raw = {}, playing = {}, lastAt = {};
  let muted = false, vMusic = 0.7, vSfx = 0.9;
  let musicEl = null, musicSrc = null, curTrack = null, wantTrack = null;
  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.connect(master); musicGain = ctx.createGain(); musicGain.connect(master);
    applyVol(); return ctx;
  }
  function applyVol() {
    if (!ctx) return;
    master.gain.value = muted ? 0 : 1; sfxGain.gain.value = vSfx; musicGain.gain.value = vMusic * 0.8;
  }
  // 先把音效檔下載成 ArrayBuffer（不需要使用者手勢）；解碼可在解鎖後進行
  function preload(onEach) {
    return Promise.all(SFX_NAMES.map((n) => fetch("audio/sfx/" + n + ".mp3").then((r) => r.ok ? r.arrayBuffer() : null)
      .then((b) => { raw[n] = b; if (onEach) onEach(); }).catch(() => { if (onEach) onEach(); })));
  }
  function decodeAll() {
    if (!ctx) return;
    for (const n of SFX_NAMES) {
      if (buffers[n] || !raw[n]) continue;
      const data = raw[n]; raw[n] = null;
      try {
        const p = ctx.decodeAudioData(data, (b) => { buffers[n] = b; }, () => {});
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* 舊瀏覽器 */ }
    }
  }
  function unlock() {
    ensureCtx(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!unlocked) {
      unlocked = true;
      try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) { /* */ }
      decodeAll();
      if (wantTrack) music(wantTrack, true);
    }
  }
  function play(n, opt) {
    if (!ctx || !unlocked || muted) return;
    const b = buffers[n]; if (!b) return;
    const now = ctx.currentTime, lim = LIMIT[n] || 4;
    playing[n] = (playing[n] || []).filter((t) => t > now);
    if (playing[n].length >= lim) return;
    if (lastAt[n] && now - lastAt[n] < 0.045) return;
    lastAt[n] = now;
    const s = ctx.createBufferSource(); s.buffer = b;
    const g = ctx.createGain(); g.gain.value = (opt && opt.vol) || 1;
    if (opt && opt.rate) s.playbackRate.value = opt.rate; else s.playbackRate.value = 0.94 + Math.random() * 0.12;
    s.connect(g); g.connect(sfxGain); s.start(0);
    playing[n].push(now + b.duration / s.playbackRate.value);
  }
  const TRACKS = { menu: "menu", level1: "level1", level2: "level2", boss: "boss", win: "win", lose: "lose" };
  function music(name, force) {
    wantTrack = name;
    if (!unlocked) return;
    if (!force && curTrack === name) return;
    curTrack = name;
    if (!musicEl) {
      musicEl = new Audio(); musicEl.preload = "auto"; musicEl.crossOrigin = "anonymous";
      musicEl.setAttribute("playsinline", ""); musicEl.addEventListener("error", () => {});
      try { musicSrc = ctx.createMediaElementSource(musicEl); musicSrc.connect(musicGain); } catch (e) { musicSrc = null; }
    }
    if (!name) { musicEl.pause(); return; }
    musicEl.loop = !(name === "win" || name === "lose");
    musicEl.src = "audio/music/" + TRACKS[name] + ".mp3";
    if (!musicSrc) musicEl.volume = muted ? 0 : vMusic;
    // 淡入
    if (musicGain) { const t = ctx.currentTime; musicGain.gain.cancelScheduledValues(t); musicGain.gain.setValueAtTime(0.0001, t); musicGain.gain.linearRampToValueAtTime(vMusic * 0.8, t + 1.2); }
    const p = musicEl.play(); if (p && p.catch) p.catch(() => {});
  }
  function stopMusic() { wantTrack = null; curTrack = null; if (musicEl) musicEl.pause(); }
  function pauseMusic(b) { if (!musicEl || !curTrack) return; if (b) musicEl.pause(); else { const p = musicEl.play(); if (p && p.catch) p.catch(() => {}); } }
  function set(o) {
    if ("muted" in o) muted = !!o.muted; if ("music" in o) vMusic = o.music; if ("sfx" in o) vSfx = o.sfx;
    applyVol(); if (musicEl && !musicSrc) musicEl.volume = muted ? 0 : vMusic;
  }
  return { preload, unlock, play, music, stopMusic, pauseMusic, set, get unlocked() { return unlocked; }, count: SFX_NAMES.length,
    get ready() { return Object.keys(buffers).length; } };
})();
