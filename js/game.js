"use strict";
// 守護之塔：純 Canvas 2D 塔防。全部圖形以向量程式繪製。
const COLS = 16, ROWS = 10, SAVE_KEY = "tdw_save_v1";
const $ = (id) => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");
if (!CanvasRenderingContext2D.prototype.roundRect) { // 舊版 Safari 補丁
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(Math.abs(r) || 0, Math.abs(w) / 2, Math.abs(h) / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); return this; };
}
const FF = getComputedStyle(document.body).fontFamily;
const TAU = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------- 塔與敵人定義 ----------------
const TOWERS = {
  arrow:  { name: "箭塔", cost: 50, col: "#ffd27a", up: [60, 110], air: true,
            dmg: [13, 22, 36], rate: [0.55, 0.45, 0.34], range: [2.6, 2.9, 3.3], desc: "射速快・可打空中" },
  cannon: { name: "砲塔", cost: 80, col: "#ff9a6a", up: [95, 160], air: false,
            dmg: [34, 60, 100], rate: [1.6, 1.45, 1.3], range: [2.4, 2.65, 2.9], splash: [0.95, 1.1, 1.3], desc: "範圍爆炸・不打空中" },
  frost:  { name: "冰塔", cost: 70, col: "#8fe3ff", up: [80, 130], air: true,
            dmg: [6, 11, 18], rate: [1.0, 0.9, 0.8], range: [2.2, 2.45, 2.7], slow: [0.4, 0.5, 0.6], splash: [0.8, 0.95, 1.1], desc: "緩速・小範圍" },
  tesla:  { name: "雷塔", cost: 110, col: "#d4a6ff", up: [125, 190], air: true,
            dmg: [24, 40, 64], rate: [1.15, 1.0, 0.85], range: [2.5, 2.75, 3.0], chain: [3, 4, 6], desc: "連鎖閃電" },
};
const TORDER = ["arrow", "cannon", "frost", "tesla"];
const ENEMIES = {
  grunt:  { name: "步兵", hp: 60, spd: 1.0, armor: 0, reward: 6, life: 1, r: 0.27, col: "#c8553d" },
  runner: { name: "疾風狼", hp: 42, spd: 1.85, armor: 0, reward: 6, life: 1, r: 0.25, col: "#9a9a9a" },
  armor:  { name: "重甲兵", hp: 170, spd: 0.68, armor: 5, reward: 12, life: 2, r: 0.32, col: "#7f8fa6" },
  flyer:  { name: "夜蝠", hp: 55, spd: 1.35, armor: 0, reward: 8, life: 1, r: 0.26, col: "#7a4fb0", air: true },
  healer: { name: "祭司", hp: 95, spd: 0.85, armor: 0, reward: 12, life: 1, r: 0.27, col: "#3fb07a", heal: true },
  boss:   { name: "魔王", hp: 1000, spd: 0.45, armor: 7, reward: 150, life: 10, r: 0.55, col: "#a01f2c", boss: true },
};
const THEMES = {
  meadow:  { g1: "#4d8a3a", g2: "#5f9f46", path: "#cfa96c", edge: "#7d5a30", deco: "tree", leaf: ["#2f6b2a", "#3f8a34"], bg: "#1d2a14" },
  autumn:  { g1: "#7f6a2e", g2: "#93803a", path: "#c9a46a", edge: "#6a4a26", deco: "tree", leaf: ["#c4561e", "#e08a26"], bg: "#2a1c0e" },
  desert:  { g1: "#d4ae66", g2: "#e1bf7c", path: "#a9824e", edge: "#7a5a32", deco: "cactus", leaf: ["#4f8a3a", "#62a046"], bg: "#3a2a14" },
  snow:    { g1: "#d7e3ee", g2: "#e8f0f7", path: "#8e9cb0", edge: "#5f6c80", deco: "pine", leaf: ["#2e5a4a", "#3a6e5a"], bg: "#1a2430" },
  volcano: { g1: "#3b2a28", g2: "#4a3330", path: "#6e4c3a", edge: "#2a1a14", deco: "rock", leaf: ["#5a4a44", "#6e5a52"], bg: "#120a08" },
};

// ---------------- 存檔 ----------------
let save = { unlocked: 1, stars: {}, muted: false };
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s && typeof s === "object") save = Object.assign(save, s); } catch (e) { /* 損壞存檔：沿用預設 */ }
  save.unlocked = clamp(save.unlocked | 0, 1, LEVELS.length);
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 隱私模式 */ } }

// ---------------- 版面 ----------------
let W = 0, H = 0, DPR = 1, portrait = false, transposed = false, ts = 40, ox = 0, oy = 0, mapW = 0, mapH = 0;
let bgCanvas = null;
function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  portrait = H > W * 1.02;
  document.body.classList.toggle("portrait", portrait); document.body.classList.toggle("landscape", !portrait);
  const m = Math.min(W, H);
  const hud = clamp(Math.round(m * 0.12), 48, 64);
  const hb = hud - 10, hf = clamp(Math.round(hud * 0.42), 19, 26);
  const pan = portrait ? clamp(Math.round(H * 0.2), 150, 210) : clamp(Math.round(W * 0.22), 170, W > 1400 ? 330 : 260);
  const r = document.documentElement.style;
  r.setProperty("--hud", hud + "px"); r.setProperty("--hb", hb + "px"); r.setProperty("--hf", hf + "px"); r.setProperty("--pan", pan + "px");
  const tf = clamp(Math.round(m * 0.042), 15, 19); r.setProperty("--tf", tf + "px"); r.setProperty("--tf2", (tf + 3) + "px");
  r.setProperty("--ti", clamp(Math.round((portrait ? pan * 0.28 : pan * 0.24)), 30, 54) + "px");
  // 地圖可用區
  const ax = 6, ay = hud + 6, aw = (portrait ? W : W - pan) - 12, ah = (portrait ? H - hud - pan : H - hud) - 12;
  const tL = Math.min(aw / COLS, ah / ROWS), tP = Math.min(aw / ROWS, ah / COLS);
  transposed = tP > tL * 1.04;
  ts = Math.floor(transposed ? tP : tL);
  mapW = (transposed ? ROWS : COLS) * ts; mapH = (transposed ? COLS : ROWS) * ts;
  ox = Math.round(ax + (aw - mapW) / 2); oy = Math.round(ay + (ah - mapH) / 2);
  bgCanvas = null;
  if (G.level >= 0) renderTowerIcons();
}
// 地圖座標（格，浮點）→ 螢幕座標
function S(x, y) { return transposed ? [ox + y * ts, oy + x * ts] : [ox + x * ts, oy + y * ts]; }
function screenToCell(px, py) {
  const u = (px - ox) / ts, v = (py - oy) / ts;
  const x = transposed ? v : u, y = transposed ? u : v;
  return [Math.floor(x), Math.floor(y)];
}

// ---------------- 遊戲狀態 ----------------
const G = {
  screen: "menu", level: -1, L: null, gold: 0, lives: 0, wave: 0, waves: 0, enemies: [], towers: [], projs: [], parts: [], bolts: [], texts: [], rings: [],
  queue: [], spawnT: 0, waveOn: false, auto: -1, speed: 1, dbgSpeed: 0, paused: false, sel: null, build: null, time: 0, shake: 0, over: false,
  path: [], segLen: [], total: 0, pathSet: new Set(), deco: new Map(), hover: null, kills: 0, leaked: 0,
};
function key(c, r) { return c + "," + r; }
function buildPath(pts) {
  G.path = pts.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 }));
  G.segLen = []; G.total = 0; G.pathSet = new Set();
  for (let i = 0; i < pts.length - 1; i++) {
    const [c0, r0] = pts[i], [c1, r1] = pts[i + 1];
    const n = Math.abs(c1 - c0) + Math.abs(r1 - r0), dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
    for (let k = 0; k <= n; k++) G.pathSet.add(key(c0 + dc * k, r0 + dr * k));
    G.segLen.push(n); G.total += n;
  }
}
function posAt(d) {
  let i = 0;
  while (i < G.segLen.length - 1 && d > G.segLen[i]) { d -= G.segLen[i]; i++; }
  const a = G.path[i], b = G.path[i + 1], t = clamp(d / (G.segLen[i] || 1), 0, 1);
  return [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, Math.atan2(b.y - a.y, b.x - a.x)];
}
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function buildable(c, r) {
  return c >= 0 && r >= 0 && c < COLS && r < ROWS && !G.pathSet.has(key(c, r)) && !G.deco.has(key(c, r)) && !G.towers.some((t) => t.c === c && t.r === r);
}

function startLevel(li) {
  const L = LEVELS[li];
  Object.assign(G, { screen: "play", level: li, L, gold: L.gold, lives: L.lives, wave: 0, waves: L.waves, enemies: [], towers: [], projs: [], parts: [], bolts: [], texts: [], rings: [],
    queue: [], spawnT: 0, waveOn: false, auto: -1, speed: 1, paused: false, sel: null, build: null, time: 0, shake: 0, over: false, kills: 0, leaked: 0 });
  buildPath(L.path);
  G.deco = new Map();
  const rnd = seeded(li * 7919 + 17);
  let tries = 0;
  while (G.deco.size < 14 && tries++ < 400) {
    const c = Math.floor(rnd() * COLS), r = Math.floor(rnd() * ROWS), k = key(c, r);
    if (G.pathSet.has(k) || G.deco.has(k)) continue;
    // 不要擋住道路緊鄰的好位置太多：與道路距離至少 1 格的機率較高
    let near = false; for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (G.pathSet.has(key(c + dc, r + dr))) near = true;
    if (near && rnd() < 0.75) continue;
    G.deco.set(k, { kind: rnd() < 0.7 ? "a" : "b", s: 0.75 + rnd() * 0.35, ph: rnd() * TAU });
  }
  bgCanvas = null;
  showScreen(null); $("hud").classList.remove("hidden"); $("panel").classList.remove("hidden");
  selectBuild(null); selectTower(null); renderTowerIcons(); updateHud();
  toast(`第 ${li + 1} 關　${L.name}`, 1.8);
}

function spawn(type) {
  const D = ENEMIES[type], L = G.L, w = G.wave;
  let hp = D.hp * L.hpMul * (1 + 0.11 * (w - 1));
  if (D.boss) { hp = L.boss; SFX.boss(); G.shake = 0.5; toast("魔王來襲！", 2); }
  const [x, y] = posAt(0.5);
  G.enemies.push({ type, D, hp, maxhp: hp, d: 0.5, x, y, ang: 0, slow: 0, slowT: 0, flash: 0, healT: 1, bob: Math.random() * TAU, alive: true, air: !!D.air });
}
function startWave() {
  if (G.waveOn || G.wave >= G.waves || G.over) return;
  G.wave++; G.queue = makeWave(G.level, G.wave); G.spawnT = 0.3; G.waveOn = true; G.auto = -1;
  SFX.wave(); toast(G.wave === G.waves ? "最終波！" : `第 ${G.wave} 波`, 1.3); updateHud();
}

// ---------------- 戰鬥 ----------------
function hurt(e, dmg, kind) {
  if (!e.alive) return;
  const eff = Math.max(dmg * 0.25, dmg - e.D.armor);
  e.hp -= eff; e.flash = 0.11;
  if (e.hp <= 0) kill(e);
  else if (kind !== "frost") SFX.hit();
}
function kill(e) {
  e.alive = false; G.kills++;
  const rw = e.D.reward; G.gold += rw;
  const [sx, sy] = S(e.x, e.y);
  addText("+" + rw, e.x, e.y - 0.3, "#ffd84a");
  const n = e.D.boss ? 70 : 16;
  for (let i = 0; i < n; i++) G.parts.push({ x: e.x, y: e.y, vx: rand(-2.6, 2.6) * (e.D.boss ? 1.6 : 1), vy: rand(-2.6, 2.6) * (e.D.boss ? 1.6 : 1), life: rand(0.35, 0.8), max: 0.8, col: i % 3 ? e.D.col : "#fff3c0", sz: rand(0.04, 0.1) * (e.D.boss ? 1.8 : 1), g: 0 });
  G.rings.push({ x: e.x, y: e.y, r: 0.1, max: e.D.boss ? 2.2 : 0.7, life: 0.35, t: 0.35, col: e.D.boss ? "#ffcf5a" : "#ffffff" });
  if (e.D.boss) { G.shake = 0.7; SFX.boom(); }
  SFX.die(); SFX.coin(); updateHud();
}
function inRange(t, e, R) { const dx = e.x - t.x, dy = e.y - t.y; return dx * dx + dy * dy <= R * R; }
function pickTarget(t, R, air) {
  let best = null;
  for (const e of G.enemies) if (e.alive && (air || !e.air) && inRange(t, e, R) && (!best || e.d > best.d)) best = e;
  return best;
}
function fire(t) {
  const T = TOWERS[t.type], lv = t.lvl, R = T.range[lv];
  const e = pickTarget(t, R, T.air); if (!e) return false;
  t.ang = Math.atan2(e.y - t.y, e.x - t.x); t.kick = 1;
  const dmg = T.dmg[lv];
  if (t.type === "arrow") { G.projs.push({ k: "arrow", x: t.x, y: t.y - 0.25, tg: e, spd: 10, dmg, trail: [] }); SFX.arrow(); }
  else if (t.type === "cannon") {
    const lead = Math.min(0.8, Math.hypot(e.x - t.x, e.y - t.y) / 6);
    const v = (e.D.spd * (e.slowT > 0 ? 1 - e.slow : 1)); const [px, py] = posAt(Math.min(G.total, e.d + v * lead));
    G.projs.push({ k: "ball", x0: t.x, y0: t.y - 0.2, x1: px, y1: py, t: 0, dur: lead + 0.05, dmg, sp: T.splash[lv], trail: [] }); SFX.cannon();
    for (let i = 0; i < 6; i++) G.parts.push({ x: t.x + Math.cos(t.ang) * 0.4, y: t.y + Math.sin(t.ang) * 0.4 - 0.2, vx: Math.cos(t.ang) * rand(0.5, 1.5) + rand(-0.4, 0.4), vy: Math.sin(t.ang) * rand(0.5, 1.5) + rand(-0.4, 0.4), life: 0.5, max: 0.5, col: "#d8d0c4", sz: 0.1, g: -0.3, smoke: true });
  }
  else if (t.type === "frost") { G.projs.push({ k: "shard", x: t.x, y: t.y - 0.3, tg: e, spd: 7, dmg, slow: T.slow[lv], sp: T.splash[lv], trail: [] }); SFX.frost(); }
  else if (t.type === "tesla") {
    let cur = e, hit = new Set(), pts = [[t.x, t.y - 0.45]], d = dmg;
    for (let i = 0; i < T.chain[lv] && cur; i++) {
      hit.add(cur); pts.push([cur.x, cur.y]); hurt(cur, d, "tesla"); d *= 0.82;
      for (let k = 0; k < 4; k++) G.parts.push({ x: cur.x, y: cur.y, vx: rand(-2, 2), vy: rand(-2, 2), life: 0.25, max: 0.25, col: "#e6d2ff", sz: 0.05, g: 0 });
      let nx = null, nd = 1.8 * 1.8;
      for (const o of G.enemies) if (o.alive && !hit.has(o)) { const dd = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2; if (dd < nd) { nd = dd; nx = o; } }
      cur = nx;
    }
    G.bolts.push({ pts, life: 0.22, max: 0.22, seed: Math.random() * 1000 }); SFX.zap();
  }
  return true;
}
function explode(x, y, sp, dmg, col) {
  for (const e of G.enemies) if (e.alive && !e.air && (e.x - x) ** 2 + (e.y - y) ** 2 <= sp * sp) hurt(e, dmg, "cannon");
  G.rings.push({ x, y, r: 0.1, max: sp, life: 0.3, t: 0.3, col });
  for (let i = 0; i < 22; i++) { const a = rand(0, TAU), v = rand(0.6, 3.2); G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.25, 0.6), max: 0.6, col: i % 2 ? "#ffb347" : "#ffe9a8", sz: rand(0.05, 0.11), g: 0 }); }
  for (let i = 0; i < 8; i++) G.parts.push({ x: x + rand(-0.3, 0.3), y: y + rand(-0.3, 0.3), vx: rand(-0.4, 0.4), vy: rand(-0.8, -0.2), life: rand(0.6, 1.1), max: 1.1, col: "#5a524a", sz: rand(0.12, 0.22), g: 0, smoke: true });
  G.shake = Math.max(G.shake, 0.12); SFX.boom();
}
function addText(s, x, y, col) { G.texts.push({ s, x, y, col, life: 0.9, max: 0.9 }); }

function update(dt) {
  G.time += dt;
  if (G.over) { stepFx(dt); return; }
  // 出怪
  if (G.waveOn) {
    if (G.queue.length) { G.spawnT -= dt; if (G.spawnT <= 0) { const [ty, gap] = G.queue.shift(); spawn(ty); G.spawnT = gap; } }
    else if (!G.enemies.some((e) => e.alive)) {
      G.waveOn = false;
      if (G.wave >= G.waves) { finish(true); return; }
      G.gold += 20 + G.wave * 5; addText(`波次獎勵 +${20 + G.wave * 5}`, COLS / 2, ROWS / 2, "#ffd84a"); G.auto = 12; updateHud();
    }
  } else if (G.auto > 0) { G.auto -= dt; if (G.auto <= 0) startWave(); }
  // 敵人
  for (const e of G.enemies) {
    if (!e.alive) continue;
    e.flash = Math.max(0, e.flash - dt); e.bob += dt * 8;
    if (e.slowT > 0) e.slowT -= dt;
    let v = e.D.spd * (e.slowT > 0 ? 1 - e.slow : 1);
    if (e.D.boss && e.hp < e.maxhp * 0.5) v *= 1.35;
    e.d += v * dt;
    if (e.D.heal) {
      e.healT -= dt;
      if (e.healT <= 0) {
        e.healT = 1.5; let any = false;
        for (const o of G.enemies) if (o.alive && o !== e && !o.D.boss && !o.D.heal && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 2.0 && o.hp < o.maxhp) { o.hp = Math.min(o.maxhp, o.hp + o.maxhp * 0.07); any = true; for (let i = 0; i < 4; i++) G.parts.push({ x: o.x + rand(-0.2, 0.2), y: o.y, vx: 0, vy: -1.2, life: 0.6, max: 0.6, col: "#7dffb0", sz: 0.06, g: 0, plus: true }); }
        if (any) G.rings.push({ x: e.x, y: e.y, r: 0.2, max: 1.5, life: 0.5, t: 0.5, col: "#6dffa8" });
      }
    }
    if (e.d >= G.total - 0.5) {
      e.alive = false; G.lives = Math.max(0, G.lives - e.D.life); G.leaked += e.D.life; G.shake = 0.3; SFX.leak(); updateHud();
      if (G.lives <= 0) { finish(false); return; }
      continue;
    }
    const [x, y, a] = posAt(e.d); e.x = x; e.y = y; e.ang = a;
  }
  G.enemies = G.enemies.filter((e) => e.alive);
  // 塔
  for (const t of G.towers) {
    t.cd -= dt; t.kick = Math.max(0, (t.kick || 0) - dt * 5);
    if (t.cd <= 0 && fire(t)) t.cd = TOWERS[t.type].rate[t.lvl];
  }
  // 射彈
  for (const p of G.projs) {
    if (p.k === "ball") {
      p.t += dt / p.dur; const u = Math.min(1, p.t);
      p.x = p.x0 + (p.x1 - p.x0) * u; p.y = p.y0 + (p.y1 - p.y0) * u; p.h = Math.sin(u * Math.PI) * 1.1;
      p.trail.push([p.x, p.y - p.h]); if (p.trail.length > 8) p.trail.shift();
      if (u >= 1) { p.dead = true; explode(p.x1, p.y1, p.sp, p.dmg, "#ffb347"); }
      continue;
    }
    const tg = p.tg; if (!tg.alive) { p.tx = p.tx ?? tg.x; p.ty = p.ty ?? tg.y; }
    const tx = tg.alive ? tg.x : p.tx, ty = tg.alive ? tg.y : p.ty;
    const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy), step = p.spd * dt;
    p.trail.push([p.x, p.y]); if (p.trail.length > 6) p.trail.shift();
    p.ang = Math.atan2(dy, dx);
    if (dist <= step + 0.05) {
      p.dead = true;
      if (p.k === "arrow") { if (tg.alive) hurt(tg, p.dmg, "arrow"); for (let i = 0; i < 5; i++) G.parts.push({ x: tx, y: ty, vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), life: 0.25, max: 0.25, col: "#fff1b8", sz: 0.04, g: 0 }); }
      else if (p.k === "shard") {
        for (const e of G.enemies) if (e.alive && (e.x - tx) ** 2 + (e.y - ty) ** 2 <= p.sp * p.sp) { e.slow = Math.max(e.slowT > 0 ? e.slow : 0, p.slow); e.slowT = 1.6; hurt(e, p.dmg, "frost"); }
        G.rings.push({ x: tx, y: ty, r: 0.1, max: p.sp, life: 0.35, t: 0.35, col: "#bff2ff" });
        for (let i = 0; i < 12; i++) { const a = rand(0, TAU); G.parts.push({ x: tx, y: ty, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 0.4, max: 0.4, col: "#dff8ff", sz: 0.05, g: 0, shard: true }); }
      }
    } else { p.x += dx / dist * step; p.y += dy / dist * step; }
  }
  G.projs = G.projs.filter((p) => !p.dead);
  stepFx(dt);
}
function stepFx(dt) {
  for (const q of G.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * 2.5; q.vy = q.vy * (1 - dt * 2.5) + (q.g || 0) * dt; }
  G.parts = G.parts.filter((q) => q.life > 0); if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
  for (const b of G.bolts) b.life -= dt; G.bolts = G.bolts.filter((b) => b.life > 0);
  for (const r of G.rings) r.t -= dt; G.rings = G.rings.filter((r) => r.t > 0);
  for (const t of G.texts) { t.life -= dt; t.y -= dt * 0.7; } G.texts = G.texts.filter((t) => t.life > 0);
  G.shake = Math.max(0, G.shake - dt);
}
function finish(win) {
  G.over = true; G.sel = null; G.build = null;
  const L = G.L, ratio = G.lives / L.lives;
  const stars = win ? (ratio >= 0.9 ? 3 : ratio >= 0.5 ? 2 : 1) : 0;
  if (win) {
    const k = String(G.level); save.stars[k] = Math.max(save.stars[k] || 0, stars);
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, G.level + 2)); writeSave(); SFX.win();
  } else SFX.lose();
  setTimeout(() => showResult(win, stars), 700);
}

// ---------------- 繪圖 ----------------
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => clamp(Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k)), 0, 255);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function drawBackground() {
  const th = THEMES[G.L.theme];
  bgCanvas = document.createElement("canvas"); bgCanvas.width = cv.width; bgCanvas.height = cv.height;
  const b = bgCanvas.getContext("2d"); b.setTransform(DPR, 0, 0, DPR, 0, 0);
  const gr = b.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  gr.addColorStop(0, shade(th.bg, 0.12)); gr.addColorStop(1, th.bg); b.fillStyle = gr; b.fillRect(0, 0, W, H);
  // 地圖底與陰影
  b.save(); b.shadowColor = "rgba(0,0,0,.6)"; b.shadowBlur = 24; b.shadowOffsetY = 8; b.fillStyle = th.g1; b.fillRect(ox, oy, mapW, mapH); b.restore();
  const rnd = seeded(G.level * 31 + 5);
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const [x, y] = S(c, r);
    b.fillStyle = (c + r) % 2 ? th.g1 : th.g2; b.globalAlpha = 0.55; b.fillRect(x, y, ts, ts); b.globalAlpha = 1;
    for (let i = 0; i < 5; i++) { b.fillStyle = rnd() < 0.5 ? shade(th.g1, -0.12) : shade(th.g2, 0.12); b.globalAlpha = 0.5; b.fillRect(x + rnd() * ts, y + rnd() * ts, ts * 0.06, ts * 0.06); }
    b.globalAlpha = 1;
    if (th.deco !== "rock" && G.L.theme !== "snow" && rnd() < 0.45) { // 草叢
      b.strokeStyle = shade(th.g1, -0.25); b.lineWidth = Math.max(1, ts * 0.03);
      const gx = x + rnd() * ts * 0.8 + ts * 0.1, gy = y + rnd() * ts * 0.8 + ts * 0.15;
      for (let k = -1; k <= 1; k++) { b.beginPath(); b.moveTo(gx, gy); b.lineTo(gx + k * ts * 0.06, gy - ts * 0.12); b.stroke(); }
    }
    if (G.L.theme === "volcano" && rnd() < 0.12) { // 熔岩裂縫
      b.strokeStyle = "rgba(255,110,30,.75)"; b.lineWidth = Math.max(1.5, ts * 0.04); b.shadowColor = "#ff6a00"; b.shadowBlur = ts * 0.3;
      b.beginPath(); let px = x + ts * 0.2, py = y + ts * rnd(); b.moveTo(px, py); for (let k = 0; k < 3; k++) { px += ts * 0.22; py += (rnd() - 0.5) * ts * 0.4; b.lineTo(px, py); } b.stroke(); b.shadowBlur = 0;
    }
  }
  // 道路：外緣 → 本體 → 內部碎石
  const pathPts = G.path.map((p) => S(p.x, p.y));
  b.save(); b.beginPath(); b.rect(ox, oy, mapW, mapH); b.clip();
  b.lineCap = "round"; b.lineJoin = "round";
  b.strokeStyle = "rgba(0,0,0,.28)"; b.lineWidth = ts * 0.98; b.beginPath(); pathPts.forEach(([x, y], i) => (i ? b.lineTo(x + 3, y + 4) : b.moveTo(x + 3, y + 4))); b.stroke();
  b.strokeStyle = th.edge; b.lineWidth = ts * 0.92; b.beginPath(); pathPts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); b.stroke();
  b.strokeStyle = th.path; b.lineWidth = ts * 0.74; b.beginPath(); pathPts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); b.stroke();
  b.strokeStyle = shade(th.path, 0.18); b.lineWidth = ts * 0.2; b.globalAlpha = 0.5; b.beginPath(); pathPts.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); b.stroke(); b.globalAlpha = 1;
  for (const k of G.pathSet) {
    const [c, r] = k.split(",").map(Number); if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
    for (let i = 0; i < 4; i++) { const [x, y] = S(c + 0.2 + rnd() * 0.6, r + 0.2 + rnd() * 0.6); b.fillStyle = rnd() < 0.5 ? shade(th.path, -0.25) : shade(th.path, 0.25); b.beginPath(); b.ellipse(x, y, ts * 0.045, ts * 0.03, 0, 0, TAU); b.fill(); }
  }
  b.restore();
  // 地圖外框
  b.strokeStyle = "rgba(0,0,0,.55)"; b.lineWidth = 4; b.strokeRect(ox - 2, oy - 2, mapW + 4, mapH + 4);
  b.strokeStyle = "#c9963f"; b.lineWidth = 2; b.strokeRect(ox - 5, oy - 5, mapW + 10, mapH + 10);
  // 光照：左上暖光、右下暗角
  const lg = b.createLinearGradient(ox, oy, ox + mapW, oy + mapH); lg.addColorStop(0, "rgba(255,240,200,.14)"); lg.addColorStop(1, "rgba(0,0,30,.22)");
  b.fillStyle = lg; b.fillRect(ox, oy, mapW, mapH);
}
function drawDeco(c, r, d) {
  const th = THEMES[G.L.theme], [x, y] = S(c + 0.5, r + 0.5), s = ts * d.s;
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x + s * 0.08, y + s * 0.3, s * 0.36, s * 0.14, 0, 0, TAU); ctx.fill();
  const kind = d.kind === "b" ? "rock" : th.deco;
  if (kind === "tree") {
    ctx.fillStyle = "#5a3a1e"; ctx.fillRect(x - s * 0.06, y, s * 0.12, s * 0.3);
    const sw = Math.sin(G.time * 1.3 + d.ph) * s * 0.02;
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 2 ? shade(th.leaf[1], 0.15) : th.leaf[i % 2]; ctx.beginPath(); ctx.arc(x + sw + (i - 1) * s * 0.12, y - s * 0.12 - (i === 2 ? s * 0.1 : 0), s * (i === 2 ? 0.2 : 0.24), 0, TAU); ctx.fill(); }
  } else if (kind === "pine") {
    for (let i = 0; i < 3; i++) { const yy = y + s * 0.2 - i * s * 0.2, w = s * (0.36 - i * 0.08); ctx.fillStyle = th.leaf[i % 2]; ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x + w, yy); ctx.lineTo(x, yy - s * 0.32); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.moveTo(x - w * 0.4, yy - s * 0.18); ctx.lineTo(x + w * 0.4, yy - s * 0.18); ctx.lineTo(x, yy - s * 0.32); ctx.fill(); }
  } else if (kind === "cactus") {
    ctx.fillStyle = th.leaf[0]; ctx.strokeStyle = shade(th.leaf[0], -0.3); ctx.lineWidth = 1.5;
    const rr = (x0, y0, w, h) => { ctx.beginPath(); ctx.roundRect(x0, y0, w, h, w / 2); ctx.fill(); ctx.stroke(); };
    rr(x - s * 0.08, y - s * 0.35, s * 0.16, s * 0.6); rr(x - s * 0.28, y - s * 0.18, s * 0.12, s * 0.25); rr(x + s * 0.16, y - s * 0.25, s * 0.12, s * 0.22);
  } else {
    const g = ctx.createLinearGradient(x - s * 0.3, y - s * 0.3, x + s * 0.3, y + s * 0.2); g.addColorStop(0, shade(th.leaf[1], 0.35)); g.addColorStop(1, shade(th.leaf[0], -0.35));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - s * 0.32, y + s * 0.22); ctx.lineTo(x - s * 0.2, y - s * 0.12); ctx.lineTo(x + s * 0.05, y - s * 0.24); ctx.lineTo(x + s * 0.3, y - s * 0.05); ctx.lineTo(x + s * 0.34, y + s * 0.22); ctx.closePath(); ctx.fill();
  }
}
function drawPortal(t) {
  const [ex, ey] = posAt(0.75);
  const [x, y] = S(ex, ey), r = ts * 0.42;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6); g.addColorStop(0, "rgba(200,80,255,.9)"); g.addColorStop(0.5, "rgba(120,30,200,.45)"); g.addColorStop(1, "rgba(80,0,140,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(230,180,255,.9)"; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, r * (0.4 + i * 0.25), t * (1.5 + i) , t * (1.5 + i) + 4); ctx.stroke(); }
  // 城門
  const [gx, gy] = posAt(G.total - 1.0);
  const [cx, cy] = S(gx, gy), s = ts;
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(cx + 4, cy + s * 0.35, s * 0.5, s * 0.15, 0, 0, TAU); ctx.fill();
  const sg = ctx.createLinearGradient(cx - s * 0.45, 0, cx + s * 0.45, 0); sg.addColorStop(0, "#9a9a9a"); sg.addColorStop(1, "#5a5a5a");
  ctx.fillStyle = sg; ctx.fillRect(cx - s * 0.45, cy - s * 0.45, s * 0.9, s * 0.8);
  for (let i = 0; i < 4; i++) ctx.fillRect(cx - s * 0.45 + i * s * 0.26, cy - s * 0.58, s * 0.14, s * 0.15);
  ctx.fillStyle = "#3a2410"; ctx.beginPath(); ctx.moveTo(cx - s * 0.18, cy + s * 0.35); ctx.lineTo(cx - s * 0.18, cy); ctx.arc(cx, cy, s * 0.18, Math.PI, 0); ctx.lineTo(cx + s * 0.18, cy + s * 0.35); ctx.fill();
  ctx.fillStyle = "#2d6cdf"; ctx.fillRect(cx - s * 0.02, cy - s * 0.95, s * 0.04, s * 0.4); ctx.beginPath(); ctx.moveTo(cx + s * 0.02, cy - s * 0.95); ctx.lineTo(cx + s * 0.3 + Math.sin(t * 4) * s * 0.03, cy - s * 0.85); ctx.lineTo(cx + s * 0.02, cy - s * 0.75); ctx.fill();
}
// 塔的繪製（地圖與按鈕圖示共用）
function drawTower(g, type, lvl, x, y, s, ang, t, kick) {
  const T = TOWERS[type];
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(x + s * 0.06, y + s * 0.3, s * 0.42, s * 0.16, 0, 0, TAU); g.fill();
  const bg = g.createLinearGradient(x, y - s * 0.1, x, y + s * 0.35); bg.addColorStop(0, "#b8a88e"); bg.addColorStop(1, "#6e604c");
  g.fillStyle = bg; g.beginPath(); g.ellipse(x, y + s * 0.18, s * 0.4, s * 0.17, 0, 0, TAU); g.fill();
  g.fillRect(x - s * 0.4, y + s * 0.05, s * 0.8, s * 0.13);
  g.fillStyle = "#cfc1a6"; g.beginPath(); g.ellipse(x, y + s * 0.05, s * 0.4, s * 0.16, 0, 0, TAU); g.fill();
  g.strokeStyle = "rgba(60,45,30,.6)"; g.lineWidth = Math.max(1, s * 0.02);
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * s * 0.16, y + s * 0.1); g.lineTo(x + i * s * 0.16, y + s * 0.28); g.stroke(); }
  const k = (kick || 0) * s * 0.06;
  if (type === "arrow") {
    const wg = g.createLinearGradient(x - s * 0.22, 0, x + s * 0.22, 0); wg.addColorStop(0, "#8a5a2a"); wg.addColorStop(1, "#5a3816");
    g.fillStyle = wg; g.beginPath(); g.moveTo(x - s * 0.24, y + s * 0.05); g.lineTo(x - s * 0.18, y - s * 0.38); g.lineTo(x + s * 0.18, y - s * 0.38); g.lineTo(x + s * 0.24, y + s * 0.05); g.fill();
    g.fillStyle = "#c0392b"; g.beginPath(); g.moveTo(x - s * 0.26, y - s * 0.36); g.lineTo(x, y - s * 0.58); g.lineTo(x + s * 0.26, y - s * 0.36); g.fill();
    g.save(); g.translate(x, y - s * 0.3); g.rotate(ang);
    g.strokeStyle = "#3a2410"; g.lineWidth = s * 0.05; g.beginPath(); g.arc(-k, 0, s * 0.2, -1.1, 1.1); g.stroke();
    g.fillStyle = "#e0c08a"; g.fillRect(-s * 0.05 - k, -s * 0.025, s * 0.34, s * 0.05); g.restore();
  } else if (type === "cannon") {
    const cg = g.createRadialGradient(x - s * 0.1, y - s * 0.15, s * 0.02, x, y - s * 0.05, s * 0.3); cg.addColorStop(0, "#7a7a82"); cg.addColorStop(1, "#2a2a30");
    g.fillStyle = cg; g.beginPath(); g.arc(x, y - s * 0.08, s * 0.26, 0, TAU); g.fill();
    g.save(); g.translate(x, y - s * 0.1); g.rotate(ang);
    const bgd = g.createLinearGradient(0, -s * 0.1, 0, s * 0.1); bgd.addColorStop(0, "#6a6a72"); bgd.addColorStop(0.5, "#2c2c33"); bgd.addColorStop(1, "#18181c");
    g.fillStyle = bgd; g.fillRect(-k, -s * 0.1, s * (0.42 + 0.04 * lvl), s * 0.2);
    g.fillStyle = "#c9963f"; g.fillRect(s * (0.36 + 0.04 * lvl) - k, -s * 0.12, s * 0.07, s * 0.24); g.restore();
  } else if (type === "frost") {
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    g.fillStyle = "#5a7a90"; g.fillRect(x - s * 0.16, y - s * 0.12, s * 0.32, s * 0.2);
    const glow = g.createRadialGradient(x, y - s * 0.4, 0, x, y - s * 0.4, s * 0.5); glow.addColorStop(0, `rgba(170,240,255,${0.5 + pulse * 0.3})`); glow.addColorStop(1, "rgba(120,220,255,0)");
    g.fillStyle = glow; g.beginPath(); g.arc(x, y - s * 0.4, s * 0.5, 0, TAU); g.fill();
    const cg = g.createLinearGradient(x - s * 0.15, y - s * 0.7, x + s * 0.15, y - s * 0.1); cg.addColorStop(0, "#f2fdff"); cg.addColorStop(0.5, "#8fe3ff"); cg.addColorStop(1, "#2f8ac0");
    g.fillStyle = cg; g.beginPath(); g.moveTo(x, y - s * (0.72 + 0.03 * pulse)); g.lineTo(x + s * 0.16, y - s * 0.38); g.lineTo(x, y - s * 0.1); g.lineTo(x - s * 0.16, y - s * 0.38); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = Math.max(1, s * 0.02); g.beginPath(); g.moveTo(x, y - s * 0.7); g.lineTo(x, y - s * 0.12); g.stroke();
    for (const sd of [-1, 1]) { g.fillStyle = "#bdefff"; g.beginPath(); g.moveTo(x + sd * s * 0.2, y - s * 0.4); g.lineTo(x + sd * s * 0.3, y - s * 0.3); g.lineTo(x + sd * s * 0.2, y - s * 0.16); g.lineTo(x + sd * s * 0.14, y - s * 0.3); g.fill(); }
  } else if (type === "tesla") {
    g.fillStyle = "#4a3a5a"; g.beginPath(); g.moveTo(x - s * 0.18, y + s * 0.05); g.lineTo(x - s * 0.08, y - s * 0.38); g.lineTo(x + s * 0.08, y - s * 0.38); g.lineTo(x + s * 0.18, y + s * 0.05); g.fill();
    g.strokeStyle = "#c9963f"; g.lineWidth = s * 0.04; for (let i = 0; i < 4; i++) { const yy = y - s * 0.02 - i * s * 0.09; g.beginPath(); g.moveTo(x - s * (0.16 - i * 0.025), yy); g.lineTo(x + s * (0.16 - i * 0.025), yy); g.stroke(); }
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    const og = g.createRadialGradient(x, y - s * 0.5, 0, x, y - s * 0.5, s * 0.36); og.addColorStop(0, "#ffffff"); og.addColorStop(0.3, `rgba(212,166,255,${0.8 + pulse * 0.2})`); og.addColorStop(1, "rgba(150,80,255,0)");
    g.fillStyle = og; g.beginPath(); g.arc(x, y - s * 0.5, s * 0.36, 0, TAU); g.fill();
    g.strokeStyle = "rgba(240,220,255,.9)"; g.lineWidth = Math.max(1, s * 0.025);
    for (let i = 0; i < 2; i++) { g.beginPath(); let a = t * 9 + i * 3, px = x, py = y - s * 0.5; g.moveTo(px, py); for (let j = 0; j < 3; j++) { px += Math.cos(a + j) * s * 0.09; py += Math.sin(a * 1.3 + j) * s * 0.09; g.lineTo(px, py); } g.stroke(); }
  }
  // 等級星
  for (let i = 0; i <= lvl; i++) {
    const sx = x + (i - lvl / 2) * s * 0.2, sy = y + s * 0.32;
    g.fillStyle = "#ffd84a"; g.strokeStyle = "#5a3a00"; g.lineWidth = Math.max(1, s * 0.02); g.beginPath();
    for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? s * 0.035 : s * 0.08; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
  }
}
function drawEnemy(e, t) {
  const [x, y0] = S(e.x, e.y), D = e.D, s = ts * D.r * 2.3, bob = Math.sin(e.bob) * s * 0.06;
  const y = e.air ? y0 - ts * 0.35 + Math.sin(e.bob * 0.6) * ts * 0.05 : y0;
  // 影子
  ctx.fillStyle = "rgba(0,0,0,.33)"; ctx.beginPath(); ctx.ellipse(x, y0 + s * 0.38, s * 0.42, s * 0.14, 0, 0, TAU); ctx.fill();
  if (D.boss) { const a = ctx.createRadialGradient(x, y, 0, x, y, s * 1.1); a.addColorStop(0, "rgba(255,60,40,.35)"); a.addColorStop(1, "rgba(255,0,0,0)"); ctx.fillStyle = a; ctx.beginPath(); ctx.arc(x, y, s * 1.1, 0, TAU); ctx.fill(); }
  const fl = e.flash > 0, sl = e.slowT > 0;
  const base = fl ? "#ffffff" : D.col;
  const body = (c, k) => fl ? "#ffffff" : shade(c, k);
  ctx.save(); ctx.translate(x, y + bob);
  // 面向（螢幕方向）
  const [ax, ay] = S(e.x + Math.cos(e.ang), e.y + Math.sin(e.ang)); const face = Math.sign((ax - x) || 1);
  ctx.scale(face, 1);
  if (e.type === "flyer") {
    const fw = Math.sin(e.bob * 2.2) * 0.5 + 0.5;
    ctx.fillStyle = body(D.col, -0.2);
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sd * s * 0.5, -s * (0.5 * fw + 0.1), sd * s * 0.75, -s * 0.05 * fw); ctx.quadraticCurveTo(sd * s * 0.45, s * 0.05, sd * s * 0.4, s * 0.15); ctx.quadraticCurveTo(sd * s * 0.2, s * 0.05, 0, s * 0.1); ctx.fill(); }
    ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.2, s * 0.24, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffdd33"; ctx.fillRect(s * 0.03, -s * 0.08, s * 0.06, s * 0.05); ctx.fillRect(-s * 0.09, -s * 0.08, s * 0.06, s * 0.05);
  } else if (e.type === "runner") {
    const leg = Math.sin(e.bob * 1.6) * s * 0.12;
    ctx.fillStyle = body(D.col, -0.3); for (const lx of [-0.25, 0.2]) { ctx.fillRect(s * lx + leg * (lx > 0 ? 1 : -1) * 0.5, s * 0.1, s * 0.08, s * 0.28); }
    const g = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.2); g.addColorStop(0, body(D.col, 0.25)); g.addColorStop(1, body(D.col, -0.25));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.3, -s * 0.12); ctx.lineTo(s * 0.62, -s * 0.05); ctx.lineTo(s * 0.32, s * 0.12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.3, -s * 0.15); ctx.lineTo(s * 0.36, -s * 0.36); ctx.lineTo(s * 0.44, -s * 0.12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.05); ctx.quadraticCurveTo(-s * 0.7, -s * 0.3, -s * 0.62, -s * 0.05); ctx.fill();
    ctx.fillStyle = "#ffdd33"; ctx.fillRect(s * 0.4, -s * 0.1, s * 0.06, s * 0.05);
  } else {
    // 人形：步兵／重甲／祭司／魔王
    const g = ctx.createLinearGradient(0, -s * 0.45, 0, s * 0.4); g.addColorStop(0, body(D.col, 0.3)); g.addColorStop(1, body(D.col, -0.35));
    ctx.fillStyle = body(D.col, -0.45); const leg = Math.sin(e.bob) * s * 0.06; ctx.fillRect(-s * 0.16, s * 0.15 + leg, s * 0.12, s * 0.24); ctx.fillRect(s * 0.04, s * 0.15 - leg, s * 0.12, s * 0.24);
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-s * 0.24, -s * 0.18, s * 0.48, s * 0.4, s * 0.1); ctx.fill();
    ctx.fillStyle = fl ? "#fff" : (e.type === "armor" || D.boss ? shade(D.col, 0.2) : "#f2c9a0"); ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.16, 0, TAU); ctx.fill();
    if (e.type === "armor") { ctx.fillStyle = body("#c8d2e0", 0); ctx.fillRect(-s * 0.18, -s * 0.33, s * 0.36, s * 0.06); ctx.fillStyle = body("#8a96a8", -0.2); ctx.beginPath(); ctx.roundRect(s * 0.14, -s * 0.12, s * 0.2, s * 0.34, s * 0.05); ctx.fill(); }
    else if (e.type === "healer") { ctx.fillStyle = body("#e8f7ee", 0); ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.32); ctx.lineTo(0, -s * 0.56); ctx.lineTo(s * 0.2, -s * 0.32); ctx.fill(); ctx.strokeStyle = "#ffe17a"; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(s * 0.3, -s * 0.4); ctx.lineTo(s * 0.3, s * 0.3); ctx.stroke(); ctx.fillStyle = "#7dffb0"; ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.44, s * 0.08 + Math.sin(t * 6) * s * 0.02, 0, TAU); ctx.fill(); }
    else if (D.boss) {
      ctx.fillStyle = body("#e8e0d0", 0); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * s * 0.1, -s * 0.42); ctx.quadraticCurveTo(sd * s * 0.35, -s * 0.6, sd * s * 0.3, -s * 0.75); ctx.quadraticCurveTo(sd * s * 0.2, -s * 0.55, sd * s * 0.04, -s * 0.38); ctx.fill(); }
      ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.moveTo(-s * 0.14, -s * 0.42); for (let i = 0; i < 5; i++) { ctx.lineTo(-s * 0.14 + i * s * 0.07, -s * (i % 2 ? 0.48 : 0.58)); } ctx.lineTo(s * 0.14, -s * 0.42); ctx.fill();
      ctx.strokeStyle = "#555"; ctx.lineWidth = s * 0.06; ctx.beginPath(); ctx.moveTo(s * 0.3, s * 0.3); ctx.lineTo(s * 0.45, -s * 0.4); ctx.stroke(); ctx.fillStyle = "#bfc4cc"; ctx.beginPath(); ctx.moveTo(s * 0.45, -s * 0.4); ctx.lineTo(s * 0.62, -s * 0.5); ctx.lineTo(s * 0.55, -s * 0.25); ctx.fill();
    } else { ctx.strokeStyle = "#8a8a8a"; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(s * 0.26, s * 0.2); ctx.lineTo(s * 0.34, -s * 0.36); ctx.stroke(); ctx.fillStyle = body("#8a6a3a", 0); ctx.fillRect(-s * 0.2, -s * 0.44, s * 0.4, s * 0.08); }
    ctx.fillStyle = D.boss ? "#ffef5a" : "#1a1a1a"; ctx.fillRect(s * 0.05, -s * 0.33, s * 0.05, s * 0.05);
  }
  ctx.restore();
  if (sl) { ctx.fillStyle = "rgba(150,225,255,.35)"; ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.fill(); }
  // 血條
  const bw = Math.max(ts * 0.7, s * 0.9), bh = Math.max(5, ts * 0.1), bx = x - bw / 2, by = y - s * 0.62 - (D.boss ? s * 0.25 : 0);
  if (e.hp < e.maxhp || D.boss) {
    ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);
    const f = clamp(e.hp / e.maxhp, 0, 1); ctx.fillStyle = f > 0.5 ? "#4ee06a" : f > 0.25 ? "#ffcc33" : "#ff4d4d"; ctx.fillRect(bx, by, bw * f, bh);
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(bx, by, bw * f, bh * 0.4);
  }
}
function bolt(pts, seed, w, col, alpha) {
  const r = seeded(seed | 0); ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.lineWidth = w; ctx.beginPath();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = S(...pts[i]), [bx, by] = S(...pts[i + 1]);
    if (i === 0) ctx.moveTo(ax, ay);
    for (let k = 1; k <= 5; k++) { const u = k / 5, j = k === 5 ? 0 : (r() - 0.5) * ts * 0.35; ctx.lineTo(ax + (bx - ax) * u + j, ay + (by - ay) * u + j); }
  }
  ctx.stroke(); ctx.globalAlpha = 1;
}
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.screen !== "play" || !G.L) { drawMenuBg(); return; }
  if (!bgCanvas) drawBackground();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bgCanvas, 0, 0);
  let sx = 0, sy = 0; if (G.shake > 0) { sx = rand(-1, 1) * G.shake * 14; sy = rand(-1, 1) * G.shake * 14; }
  ctx.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);
  const t = G.time;
  // 建造提示格
  if (G.build) {
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (buildable(c, r)) { const [x, y] = S(c, r); ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4); ctx.strokeStyle = "rgba(255,240,180,.35)"; ctx.lineWidth = 1; ctx.strokeRect(x + 2.5, y + 2.5, ts - 5, ts - 5); }
  }
  drawPortal(t);
  // 依 y 排序：裝飾、塔、敵人
  const items = [];
  for (const [k, d] of G.deco) { const [c, r] = k.split(",").map(Number); items.push([S(c + 0.5, r + 0.5)[1], 0, () => drawDeco(c, r, d)]); }
  for (const tw of G.towers) { const [x, y] = S(tw.x, tw.y); items.push([y, 1, () => drawTower(ctx, tw.type, tw.lvl, x, y, ts, screenAng(tw), t, tw.kick)]); }
  for (const e of G.enemies) items.push([S(e.x, e.y)[1] + (e.air ? ts : 0), 2, () => drawEnemy(e, t)]);
  items.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  // 選取範圍
  const showR = (x, y, R, ok) => { const [cx, cy] = S(x, y); ctx.fillStyle = ok ? "rgba(120,200,255,.14)" : "rgba(255,80,80,.16)"; ctx.strokeStyle = ok ? "rgba(170,225,255,.85)" : "rgba(255,120,120,.85)"; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(cx, cy, R * ts, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); };
  if (G.sel) showR(G.sel.x, G.sel.y, TOWERS[G.sel.type].range[G.sel.lvl], true);
  if (G.build && G.hover) { const [c, r] = G.hover; if (c >= 0 && r >= 0 && c < COLS && r < ROWS) { const ok = buildable(c, r) && G.gold >= TOWERS[G.build].cost; showR(c + 0.5, r + 0.5, TOWERS[G.build].range[0], ok); if (ok) { ctx.globalAlpha = 0.6; const [x, y] = S(c + 0.5, r + 0.5); drawTower(ctx, G.build, 0, x, y, ts, 0, t, 0); ctx.globalAlpha = 1; } } }
  for (const it of items) it[2]();
  // 射彈
  for (const p of G.projs) {
    if (p.k === "ball") {
      const [gx, gy] = S(p.x, p.y); ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(gx, gy, ts * 0.12, ts * 0.05, 0, 0, TAU); ctx.fill();
      p.trail.forEach(([tx, ty], i) => { const [a, b] = S(tx, ty); ctx.fillStyle = `rgba(200,190,170,${i / p.trail.length * 0.4})`; ctx.beginPath(); ctx.arc(a, b, ts * 0.06 * (i / p.trail.length), 0, TAU); ctx.fill(); });
      const [x, y] = S(p.x, p.y - p.h); const bg = ctx.createRadialGradient(x - ts * 0.03, y - ts * 0.03, 1, x, y, ts * 0.11); bg.addColorStop(0, "#8a8a92"); bg.addColorStop(1, "#16161a");
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, ts * 0.1, 0, TAU); ctx.fill();
    } else {
      if (p.trail.length > 1) { ctx.strokeStyle = p.k === "arrow" ? "rgba(255,240,190,.55)" : "rgba(170,240,255,.7)"; ctx.lineWidth = p.k === "arrow" ? 2 : 4; ctx.lineCap = "round"; ctx.beginPath(); p.trail.forEach(([tx, ty], i) => { const [a, b] = S(tx, ty); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); const [a, b] = S(p.x, p.y); ctx.lineTo(a, b); ctx.stroke(); }
      const [x, y] = S(p.x, p.y), [x2, y2] = S(p.x + Math.cos(p.ang || 0), p.y + Math.sin(p.ang || 0)), a = Math.atan2(y2 - y, x2 - x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      if (p.k === "arrow") { ctx.fillStyle = "#f4e2b8"; ctx.fillRect(-ts * 0.22, -1.2, ts * 0.3, 2.4); ctx.fillStyle = "#e8e8f0"; ctx.beginPath(); ctx.moveTo(ts * 0.14, 0); ctx.lineTo(ts * 0.06, -ts * 0.05); ctx.lineTo(ts * 0.06, ts * 0.05); ctx.fill(); }
      else { ctx.shadowColor = "#8fe3ff"; ctx.shadowBlur = 12; ctx.fillStyle = "#e9fbff"; ctx.beginPath(); ctx.moveTo(ts * 0.16, 0); ctx.lineTo(0, -ts * 0.07); ctx.lineTo(-ts * 0.12, 0); ctx.lineTo(0, ts * 0.07); ctx.fill(); ctx.shadowBlur = 0; }
      ctx.restore();
    }
  }
  // 閃電
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const b of G.bolts) { const a = b.life / b.max; ctx.shadowColor = "#c9a0ff"; ctx.shadowBlur = 16; bolt(b.pts, b.seed + Math.floor(t * 30), 5, "#a070ff", a * 0.7); ctx.shadowBlur = 0; bolt(b.pts, b.seed + Math.floor(t * 30), 2, "#ffffff", a); }
  // 環／粒子（加算光）
  ctx.globalCompositeOperation = "lighter";
  for (const r of G.rings) { const u = 1 - r.t / r.life, [x, y] = S(r.x, r.y); ctx.strokeStyle = r.col; ctx.globalAlpha = (1 - u) * 0.9; ctx.lineWidth = Math.max(2, ts * 0.08 * (1 - u)); ctx.beginPath(); ctx.arc(x, y, (r.r + (r.max - r.r) * u) * ts, 0, TAU); ctx.stroke(); }
  for (const q of G.parts) {
    if (q.smoke) continue; const a = clamp(q.life / q.max, 0, 1), [x, y] = S(q.x, q.y); ctx.globalAlpha = a; ctx.fillStyle = q.col;
    if (q.plus) { const w = ts * 0.12; ctx.fillRect(x - w / 2, y - w / 6, w, w / 3); ctx.fillRect(x - w / 6, y - w / 2, w / 3, w); }
    else { ctx.beginPath(); ctx.arc(x, y, q.sz * ts * (0.5 + a * 0.5), 0, TAU); ctx.fill(); }
  }
  ctx.globalCompositeOperation = "source-over";
  for (const q of G.parts) { if (!q.smoke) continue; const a = clamp(q.life / q.max, 0, 1), [x, y] = S(q.x, q.y); ctx.globalAlpha = a * 0.45; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(x, y, q.sz * ts * (1.6 - a * 0.6), 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  // 飄字
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const tx of G.texts) { const [x, y] = S(tx.x, tx.y); const fs = Math.round(clamp(ts * 0.42, 15, 26)); ctx.font = `900 ${fs}px ${FF}`; ctx.globalAlpha = clamp(tx.life / tx.max * 1.5, 0, 1); ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.strokeText(tx.s, x, y); ctx.fillStyle = tx.col; ctx.fillText(tx.s, x, y); }
  ctx.globalAlpha = 1;
  if (G.paused && !G.over) { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(ox, oy, mapW, mapH); }
}
function screenAng(tw) { const [x, y] = S(tw.x, tw.y), [x2, y2] = S(tw.x + Math.cos(tw.ang), tw.y + Math.sin(tw.ang)); return Math.atan2(y2 - y, x2 - x); }
// 選單背景：緩動的星光與塔剪影
const menuMotes = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.05, s: 1 + Math.random() * 2.5 }));
function drawMenuBg() {
  const t = performance.now() / 1000;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1b1530"); g.addColorStop(0.55, "#6a3a2a"); g.addColorStop(1, "#1a120c"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(W * 0.5, H * 0.58, 0, W * 0.5, H * 0.58, Math.max(W, H) * 0.5); sun.addColorStop(0, "rgba(255,190,90,.55)"); sun.addColorStop(1, "rgba(255,120,40,0)"); ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
  for (let L = 0; L < 3; L++) { ctx.fillStyle = ["#3a2420", "#2a1a16", "#150d0a"][L]; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, H * (0.7 + L * 0.08) + Math.sin(x * 0.01 * (L + 1) + L * 2) * H * 0.03); ctx.lineTo(W, H); ctx.fill(); }
  // 城堡剪影
  const bx = W * 0.5, by = H * 0.86, s = Math.min(W, H) * 0.12; ctx.fillStyle = "#0e0806";
  ctx.fillRect(bx - s * 1.6, by - s * 0.8, s * 3.2, s * 0.8); for (const dx of [-1.6, -0.35, 0.9]) { ctx.fillRect(bx + dx * s, by - s * 1.6, s * 0.7, s * 1.6); for (let i = 0; i < 3; i++) ctx.fillRect(bx + dx * s + i * s * 0.26, by - s * 1.75, s * 0.18, s * 0.15); }
  ctx.fillStyle = "rgba(255,200,90,.85)"; for (const [dx, dy] of [[-1.35, -1.2], [-0.1, -1.25], [1.15, -1.2], [0.2, -0.5]]) ctx.fillRect(bx + dx * s, by + dy * s, s * 0.12, s * 0.2);
  ctx.globalCompositeOperation = "lighter";
  for (const m of menuMotes) { m.y -= m.v / 60; if (m.y < 0) { m.y = 1; m.x = Math.random(); } ctx.fillStyle = `rgba(255,200,120,${0.4 + 0.4 * Math.sin(t * 2 + m.x * 20)})`; ctx.beginPath(); ctx.arc(m.x * W, m.y * H, m.s, 0, TAU); ctx.fill(); }
  ctx.globalCompositeOperation = "source-over";
}

// ---------------- 介面 ----------------
function showScreen(id) {
  for (const s of ["menu", "select", "help", "overlay"]) $(s).classList.toggle("hidden", s !== id);
  if (id === "menu" || id === "select" || id === "help") { $("hud").classList.add("hidden"); $("panel").classList.add("hidden"); G.screen = id; G.L = null; }
}
let toastT = 0;
function toast(s, sec) { const el = $("toast"); el.textContent = s; el.classList.remove("hidden"); toastT = sec; }
function updateHud() {
  if (!G.L) return;
  $("sLives").textContent = G.lives; $("sGold").textContent = G.gold; $("sWave").textContent = `${G.wave}/${G.waves}`;
  const bw = $("bWave");
  if (G.waveOn || G.over) { bw.disabled = true; bw.textContent = G.over ? "—" : `第 ${G.wave} 波進行中`; bw.classList.remove("pulse"); }
  else { bw.disabled = false; bw.textContent = G.wave === 0 ? "開始第 1 波" : (G.auto > 0 ? `下一波（${Math.ceil(G.auto)}）` : `開始第 ${G.wave + 1} 波`); bw.classList.toggle("pulse", G.wave === 0); }
  document.querySelectorAll(".tb").forEach((b) => b.classList.toggle("poor", G.gold < TOWERS[b.dataset.t].cost));
  if (G.sel) fillInfo();
}
const iconCanvases = {};
function renderTowerIcons() {
  const box = $("towerBtns");
  if (!box.children.length) {
    for (const k of TORDER) {
      const b = document.createElement("button"); b.className = "tb"; b.dataset.t = k; b.id = "tb_" + k;
      const c = document.createElement("canvas"); iconCanvases[k] = c; b.appendChild(c);
      const n = document.createElement("div"); n.className = "nm"; n.textContent = TOWERS[k].name; b.appendChild(n);
      const co = document.createElement("div"); co.className = "co"; co.textContent = TOWERS[k].cost; b.appendChild(co);
      b.addEventListener("pointerup", (ev) => { ev.preventDefault(); SFX.init(); SFX.click(); selectBuild(G.build === k ? null : k); });
      box.appendChild(b);
    }
  }
  for (const k of TORDER) {
    const c = iconCanvases[k], sz = 96; c.width = sz; c.height = sz; const g = c.getContext("2d"); g.clearRect(0, 0, sz, sz);
    drawTower(g, k, 0, sz / 2, sz * 0.62, sz * 0.78, -0.5, 0.5, 0);
  }
}
function selectBuild(k) {
  G.build = k; if (k) selectTower(null);
  document.querySelectorAll(".tb").forEach((b) => b.classList.toggle("sel", b.dataset.t === k));
  if (k) toast(`${TOWERS[k].name}：${TOWERS[k].desc}　點空地建造`, 2.2);
}
function selectTower(t) {
  G.sel = t;
  $("info").classList.toggle("hidden", !t); $("towerBtns").classList.toggle("hidden", !!t);
  if (t) fillInfo();
}
function fillInfo() {
  const t = G.sel, T = TOWERS[t.type], lv = t.lvl;
  $("infoTitle").textContent = `${T.name}　Lv.${lv + 1}`;
  let s = `傷害 ${T.dmg[lv]}　射程 ${T.range[lv].toFixed(1)}`;
  if (T.splash && t.type === "cannon") s += `　爆炸 ${T.splash[lv]}`;
  if (T.slow) s += `　緩速 ${Math.round(T.slow[lv] * 100)}%`;
  if (T.chain) s += `　連鎖 ${T.chain[lv]}`;
  $("infoStats").textContent = s;
  const up = $("bUp"), cost = lv < 2 ? T.up[lv] : 0;
  up.textContent = lv < 2 ? `升級 ${cost}` : "已滿級"; up.disabled = lv >= 2 || G.gold < cost;
  $("bSell").textContent = `賣出 +${Math.floor(t.spent * 0.7)}`;
}
function placeTower(c, r) {
  const T = TOWERS[G.build];
  if (!buildable(c, r)) { SFX.deny(); return false; }
  if (G.gold < T.cost) { SFX.deny(); toast("金幣不足", 1.2); return false; }
  G.gold -= T.cost;
  const tw = { type: G.build, c, r, x: c + 0.5, y: r + 0.5, lvl: 0, cd: 0.2, ang: -Math.PI / 2, spent: T.cost, kick: 0 };
  G.towers.push(tw); SFX.build();
  for (let i = 0; i < 14; i++) G.parts.push({ x: tw.x + rand(-0.35, 0.35), y: tw.y + 0.25, vx: rand(-0.8, 0.8), vy: rand(-1.2, -0.3), life: 0.6, max: 0.6, col: "#b8a888", sz: rand(0.08, 0.16), g: 0, smoke: true });
  G.rings.push({ x: tw.x, y: tw.y, r: 0.2, max: 0.8, life: 0.3, t: 0.3, col: "#ffe9a8" });
  updateHud(); return true;
}
function upgradeSel() {
  const t = G.sel; if (!t || t.lvl >= 2) return; const cost = TOWERS[t.type].up[t.lvl];
  if (G.gold < cost) { SFX.deny(); return; }
  G.gold -= cost; t.spent += cost; t.lvl++; SFX.upgrade();
  G.rings.push({ x: t.x, y: t.y, r: 0.2, max: 1.0, life: 0.45, t: 0.45, col: "#ffd84a" });
  for (let i = 0; i < 18; i++) G.parts.push({ x: t.x + rand(-0.3, 0.3), y: t.y + rand(-0.2, 0.3), vx: rand(-0.3, 0.3), vy: rand(-2, -0.8), life: 0.7, max: 0.7, col: "#ffe37a", sz: 0.05, g: 0 });
  updateHud();
}
function sellSel() {
  const t = G.sel; if (!t) return; const v = Math.floor(t.spent * 0.7);
  G.gold += v; G.towers = G.towers.filter((o) => o !== t); SFX.sell(); addText("+" + v, t.x, t.y - 0.3, "#ffd84a");
  for (let i = 0; i < 12; i++) G.parts.push({ x: t.x, y: t.y, vx: rand(-1.5, 1.5), vy: rand(-1.5, 1.5), life: 0.5, max: 0.5, col: "#ffd84a", sz: 0.06, g: 0 });
  selectTower(null); updateHud();
}
function showResult(win, stars) {
  showScreen("overlay");
  const t = $("oTitle"); t.textContent = win ? "勝利！" : "城門失守"; t.classList.toggle("lose", !win);
  $("oStars").innerHTML = win ? "★".repeat(stars) + "<i>" + "★".repeat(3 - stars) + "</i>" : "";
  $("oText").textContent = win ? `剩餘生命 ${G.lives}/${G.L.lives}　擊倒 ${G.kills}` : `撐到第 ${G.wave} 波　擊倒 ${G.kills}`;
  const btns = [];
  if (win && G.level + 1 < LEVELS.length) btns.push(["下一關", "big", () => startLevel(G.level + 1)]);
  btns.push([win ? "再玩一次" : "重新挑戰", win ? "big alt" : "big", () => startLevel(G.level)]);
  btns.push(["關卡選單", "big alt", () => openSelect()]);
  setButtons(btns);
}
function setButtons(list) {
  const box = $("oBtns"); box.innerHTML = "";
  for (const [label, cls, fn] of list) { const b = document.createElement("button"); b.className = cls; b.textContent = label; b.addEventListener("click", () => { SFX.click(); fn(); }); box.appendChild(b); }
}
function pauseGame(on) {
  if (G.over || G.screen !== "play") return;
  G.paused = on; $("bPause").classList.toggle("on", on);
  if (on) {
    showScreen("overlay"); $("oTitle").textContent = "暫停"; $("oTitle").classList.remove("lose"); $("oStars").innerHTML = ""; $("oText").textContent = `第 ${G.level + 1} 關　${G.L.name}`;
    setButtons([["繼續", "big", () => pauseGame(false)], ["重新開始", "big alt", () => startLevel(G.level)], ["關卡選單", "big alt", () => openSelect()]]);
  } else showScreen(null);
}
function openSelect() {
  G.over = true; showScreen("select");
  const box = $("levels"); box.innerHTML = "";
  LEVELS.forEach((L, i) => {
    const lock = i + 1 > save.unlocked, st = save.stars[String(i)] || 0;
    const b = document.createElement("button"); b.className = "lv" + (lock ? " lock" : ""); b.id = "lv" + (i + 1);
    b.innerHTML = `<div class="n">${lock ? "未解鎖" : "第 " + (i + 1) + " 關"}</div><div class="t">${L.name}</div><div class="st">${"★".repeat(st)}<i>${"★".repeat(3 - st)}</i></div><div class="t" style="font-size:16px;color:#e8d6b0">${L.waves} 波</div>`;
    b.addEventListener("click", () => { SFX.init(); if (lock) { SFX.deny(); toast("先通過前一關", 1.4); return; } SFX.click(); startLevel(i); });
    box.appendChild(b);
  });
}
function syncMute() {
  $("muteWave").style.display = save.muted ? "none" : ""; $("muteX").style.display = save.muted ? "" : "none";
  $("mSound").textContent = "音效：" + (save.muted ? "關" : "開"); SFX.setMuted(save.muted);
}

// ---------------- 輸入（Pointer Events，支援觸控／滑鼠） ----------------
cv.addEventListener("pointerdown", (ev) => {
  ev.preventDefault(); SFX.init();
  if (G.screen !== "play" || G.over || G.paused) return;
  const [c, r] = screenToCell(ev.clientX, ev.clientY); G.hover = [c, r];
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) { selectBuild(null); selectTower(null); return; }
  const tw = G.towers.find((t) => t.c === c && t.r === r);
  if (tw) { selectBuild(null); selectTower(G.sel === tw ? null : tw); SFX.click(); return; }
  if (G.build) { if (placeTower(c, r) && G.gold < TOWERS[G.build].cost) selectBuild(null); return; }
  selectTower(null);
});
cv.addEventListener("pointermove", (ev) => { if (G.screen === "play" && ev.pointerType === "mouse") G.hover = screenToCell(ev.clientX, ev.clientY); });
for (const ev of ["gesturestart", "gesturechange", "dblclick"]) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener("touchmove", (e) => { if (!e.target.closest(".helpbox, #levels")) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener("touchend", (e) => { const n = Date.now(); if (n - lastTouchEnd < 320 && e.target === cv) e.preventDefault(); lastTouchEnd = n; }, { passive: false });
window.addEventListener("keydown", (e) => {
  if (G.screen !== "play") return;
  if (e.key === " " || e.key === "p") { e.preventDefault(); pauseGame(!G.paused); }
  if (e.key === "Escape") { selectBuild(null); selectTower(null); }
  const n = "1234".indexOf(e.key); if (n >= 0) selectBuild(TORDER[n]);
});
$("bUp").addEventListener("click", () => { SFX.init(); upgradeSel(); });
$("bSell").addEventListener("click", () => { SFX.init(); sellSel(); });
$("bWave").addEventListener("click", () => { SFX.init(); startWave(); });
$("bPause").addEventListener("click", () => { SFX.init(); SFX.click(); pauseGame(!G.paused); });
$("bSpeed").addEventListener("click", () => { SFX.init(); SFX.click(); G.speed = G.speed === 1 ? 2 : 1; $("bSpeed").textContent = "×" + G.speed; $("bSpeed").classList.toggle("on", G.speed === 2); });
$("bMute").addEventListener("click", () => { SFX.init(); save.muted = !save.muted; writeSave(); syncMute(); SFX.click(); });
$("mStart").addEventListener("click", () => { SFX.init(); SFX.click(); openSelect(); });
$("mHelp").addEventListener("click", () => { SFX.init(); SFX.click(); showScreen("help"); });
$("mSound").addEventListener("click", () => { SFX.init(); save.muted = !save.muted; writeSave(); syncMute(); SFX.click(); });
$("mReset").addEventListener("click", () => { if (confirm("確定要清除所有關卡進度？")) { save = { unlocked: 1, stars: {}, muted: save.muted }; writeSave(); toast("存檔已重置", 1.5); } });
$("sBack").addEventListener("click", () => { SFX.click(); showScreen("menu"); });
$("hBack").addEventListener("click", () => { SFX.click(); showScreen("menu"); });
document.addEventListener("visibilitychange", () => { if (document.hidden && G.screen === "play" && !G.paused && !G.over) pauseGame(true); });

// ---------------- 主迴圈 ----------------
let lastT = performance.now(), hudT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (G.screen === "play" && G.L && !G.paused) {
    const n = G.dbgSpeed || G.speed; for (let i = 0; i < n; i++) update(dt);
    hudT -= dt; if (hudT <= 0) { hudT = 0.25; if (G.auto > 0 && !G.waveOn) updateHud(); }
  }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $("toast").classList.add("hidden"); }
  try { render(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
window.addEventListener("resize", layout);
window.addEventListener("orientationchange", () => setTimeout(layout, 200));
loadSave(); syncMute(); layout(); showScreen("menu"); requestAnimationFrame(frame);

// 自動測試用的唯讀查詢介面（不影響一般遊玩）
window.__td = {
  G, save: () => JSON.parse(localStorage.getItem(SAVE_KEY) || "null"),
  cellCenter: (c, r) => S(c + 0.5, r + 0.5),
  buildable: (c, r) => buildable(c, r), pathSet: () => [...G.pathSet], cols: COLS, rows: ROWS,
  setDebugSpeed: (n) => { G.dbgSpeed = n | 0; },
  layoutInfo: () => ({ portrait, transposed, ts, ox, oy, mapW, mapH, W, H }),
};
