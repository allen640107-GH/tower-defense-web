"use strict";
// 恐龍防線 Dino Defense — Canvas 2D 塔防。所有主要圖像為 Grok Imagine 生成的貼圖（img/），程式只負責合成、動畫與特效。
const COLS = 16, ROWS = 10, SAVE_KEY = "dino_save_v1", OLD_SAVE_KEY = "tdw_save_v1";
const $ = (id) => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");
const TAU = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FF = '"PingFang TC","Noto Sans TC","Noto Sans CJK TC","Microsoft JhengHei",sans-serif';

// ---------------- 資料 ----------------
const TOWERS = {
  spear: { name: "石矛塔", short: "石矛", cost: 50, up: [60, 110], air: true, img: "t_spear", proj: "p_spear", snd: "spear",
    dmg: [12, 20, 34], rate: [0.55, 0.46, 0.36], range: [2.6, 2.9, 3.3], desc: "射速快・可打飛行" },
  lava: { name: "火山投石", short: "投石", cost: 85, up: [95, 160], air: false, img: "t_lava", proj: "p_lava", snd: "lava",
    dmg: [34, 58, 96], rate: [1.6, 1.45, 1.3], range: [2.4, 2.65, 2.95], splash: [0.95, 1.1, 1.3], desc: "範圍爆炸・不打飛行" },
  frost: { name: "冰晶塔", short: "冰晶", cost: 70, up: [80, 130], air: true, img: "t_frost", proj: "p_ice", snd: "frost",
    dmg: [6, 11, 18], rate: [1.0, 0.9, 0.8], range: [2.2, 2.45, 2.7], slow: [0.4, 0.5, 0.6], splash: [0.8, 0.95, 1.1], desc: "緩速・小範圍" },
  venom: { name: "毒液花", short: "毒花", cost: 75, up: [85, 140], air: true, img: "t_venom", proj: "p_venom", snd: "venom",
    dmg: [5, 8, 13], rate: [0.9, 0.8, 0.7], range: [2.3, 2.5, 2.8], poison: [9, 15, 26], desc: "持續毒傷・無視護甲" },
  tesla: { name: "特斯拉電塔", short: "電塔", cost: 110, up: [125, 190], air: true, img: "t_tesla", proj: "p_zap", snd: "zap",
    dmg: [22, 38, 60], rate: [1.15, 1.0, 0.85], range: [2.5, 2.75, 3.0], chain: [3, 4, 6], desc: "連鎖閃電" },
  amber: { name: "琥珀晶塔", short: "琥珀", cost: 130, up: [140, 210], air: true, img: "t_amber", proj: "p_amber", snd: "amber",
    dmg: [70, 120, 200], rate: [2.2, 2.0, 1.8], range: [3.6, 4.0, 4.5], desc: "超遠程・專打血最多・穿甲" },
};
TOWERS.torch = { name: "火把塔", short: "火把", cost: 45, up: [45, 70], air: true, img: "t_torch", proj: "p_lava", snd: "torch",
  dmg: [7, 12, 18], rate: [1.1, 1.0, 0.9], range: [2.0, 2.3, 2.6], light: [3.0, 3.6, 4.4], desc: "照亮周圍・夜晚必備" };
const TORDER = ["spear", "lava", "frost", "venom", "tesla", "amber", "torch"];
const ENEMIES = {
  raptor: { name: "迅猛龍", hp: 45, spd: 1.9, armor: 0, reward: 6, life: 1, size: 0.78, img: "d_raptor", roar: "roar3", desc: "速度極快、成群出沒的掠食者。" },
  trike: { name: "三角龍", hp: 150, spd: 0.8, armor: 2, reward: 12, life: 2, size: 0.95, img: "d_trike", charge: true, roar: "roar1", desc: "會低頭衝撞，短時間爆發加速。" },
  ankylo: { name: "甲龍", hp: 190, spd: 0.65, armor: 6, reward: 14, life: 2, size: 0.98, img: "d_ankylo", roar: "roar2", desc: "全身骨甲，大幅減少每次受到的傷害。" },
  ptero: { name: "翼龍", hp: 55, spd: 1.4, armor: 0, reward: 8, life: 1, size: 0.95, img: "d_ptero", air: true, roar: "roar3", desc: "飛越一切地形，投石塔打不到。" },
  parasaur: { name: "副櫛龍", hp: 100, spd: 0.85, armor: 0, reward: 12, life: 1, size: 0.9, img: "d_parasaur", heal: true, roar: "roar1", desc: "頭冠發出治癒之聲，替周圍恐龍回血。" },
  spino: { name: "棘龍", hp: 260, spd: 0.85, armor: 3, reward: 20, life: 2, size: 1.12, img: "d_spino", regen: 0.015, roar: "roar2", desc: "背帆吸收熱能，持續自我再生。" },
  brachio: { name: "腕龍", hp: 520, spd: 0.5, armor: 1, reward: 30, life: 3, size: 1.3, img: "d_brachio", roar: "roar1", desc: "體型巨大、血量超厚的移動堡壘。" },
  trex: { name: "暴龍王", hp: 1000, spd: 0.42, armor: 7, reward: 150, life: 10, size: 2.0, img: "d_trex", boss: true, roar: "boss", desc: "魔王。半血時怒吼，震暈附近的塔並狂暴加速。" },
};
ENEMIES.trex.skName = "王者怒吼"; ENEMIES.trex.name = "暴龍王";
Object.assign(ENEMIES, BOSS_ENEMIES);
const EORDER = ["raptor", "trike", "ankylo", "ptero", "parasaur", "spino", "brachio", "carno", "croc", "quetzal", "mammoth", "lavadrake", "queen", "trex"];
const SKILLS = {
  meteor: { name: "隕石", img: "i_meteor", cd: 35, aim: true, desc: "點地圖砸下隕石" },
  trap: { name: "尖刺陷阱", img: "i_trap", cd: 28, aim: true, path: true, desc: "放在道路上，刺傷並定住路過的恐龍" },
  airdrop: { name: "空投補給", img: "i_airdrop", cd: 55, desc: "立即獲得金幣，可能附帶道具" },
};
const ITEMS = {
  potion: { name: "草藥", img: "i_potion", desc: "生命 +5" },
  frostbomb: { name: "冰凍炸彈", img: "i_frostbomb", desc: "凍住全場恐龍 3 秒" },
  goldbag: { name: "金幣袋", img: "i_goldbag", desc: "金幣 +150" },
  dynamite: { name: "炸藥", img: "i_dynamite", aim: true, desc: "點地圖引爆" },
};
const IORDER = ["potion", "frostbomb", "goldbag", "dynamite"];
const FOSSILS = {
  raptorclaw: { name: "迅猛龍爪", img: "i_bone" }, pterowing: { name: "翼龍翼骨", img: "i_bone" }, trikehorn: { name: "三角龍角", img: "i_bone" },
  ankyloclub: { name: "甲龍尾錘", img: "digsite" }, spinosail: { name: "棘龍背帆", img: "i_bone" }, eggfossil: { name: "恐龍蛋化石", img: "i_egg" },
  trextooth: { name: "暴龍牙", img: "digsite" }, ammonite: { name: "黃金菊石", img: "ammonite" }, amberbug: { name: "琥珀蚊子", img: "i_amber" },
  brachioneck: { name: "腕龍頸椎", img: "i_bone" },
};
const ACH = [
  { id: "win1", name: "初次勝利", desc: "通過第 1 關", img: "i_star" },
  { id: "hunter", name: "恐龍獵人", desc: "累積擊倒 500 隻恐龍", img: "i_bone" },
  { id: "kingfall", name: "王者殞落", desc: "擊敗暴龍王", img: "i_horn" },
  { id: "bossall", name: "魔王獵人", desc: "擊敗全部 7 種魔王", img: "i_horn" },
  { id: "tamer10", name: "馴龍大師", desc: "累積收服 10 隻恐龍", img: "i_tame" },
  { id: "evolve1", name: "進化！", desc: "第一次讓塔進化", img: "i_evolve" },
  { id: "herolv5", name: "傳奇英雄", desc: "英雄在關卡中升到 Lv.5", img: "i_star" },
  { id: "perfect", name: "完美防線", desc: "任一關無漏網通關", img: "i_heart" },
  { id: "allstars", name: "全三星", desc: "所有關卡皆 3 星", img: "i_star" },
  { id: "builder", name: "建築大師", desc: "累積建造 100 座塔", img: "i_coin" },
  { id: "maxlvl", name: "頂級工匠", desc: "把一座塔升到 3 級", img: "i_amber" },
  { id: "meteor10", name: "天降隕石", desc: "累積施放隕石 10 次", img: "i_meteor" },
  { id: "geo", name: "地質學家", desc: "累積敲碎 15 塊岩石", img: "boulder" },
  { id: "fossil6", name: "化石收藏家", desc: "收集 6 種化石", img: "ammonite" },
  { id: "codex", name: "圖鑑完成", desc: "發現全部 14 種恐龍與魔王", img: "i_egg" },
  { id: "egg", name: "護巢終結者", desc: "在蛋孵化前點破 10 顆恐龍蛋", img: "i_egg" },
];

// ---------------- 圖片 ----------------
const IMG = {};
const IMG_LIST = ["menu_bg", "menu_bg_portrait", "road_dirt", "road_stone", "panel_stone",
  "bg_jungle", "bg_swamp", "bg_canyon", "bg_ice", "bg_volcano", "bg_nest", "bg_lair", "bg_coast", "bg_sky", "bg_cave",
  "boulder", "amberrock", "vent", "cave", "gate", "digsite", "mud", "totem", "ammonite",
  "p_spear", "p_lava", "p_ice", "p_zap", "p_venom", "p_amber", "x_boom", "x_frost", "x_poison",
  "i_coin", "i_heart", "i_star", "i_pause", "i_speed", "i_sound", "i_horn", "i_bone", "i_amber",
  "i_meteor", "i_trap", "i_airdrop", "i_potion", "i_frostbomb", "i_goldbag", "i_drum", "i_dynamite", "i_egg"];
for (const k of EORDER) IMG_LIST.push(ENEMIES[k].img);
for (const k of TORDER) for (let i = 1; i <= 3; i++) IMG_LIST.push(TOWERS[k].img + i);
for (const n of V21_IMAGES) if (!IMG_LIST.includes(n)) IMG_LIST.push(n);
const TINT = {}; // 白色／藍色／綠色剪影（受擊閃光、緩速、中毒）
function tinted(name, col) {
  const k = name + col; if (TINT[k]) return TINT[k];
  const im = IMG[name]; if (!im) return null;
  const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
  const g = c.getContext("2d"); g.drawImage(im, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return (TINT[k] = c);
}

// ---------------- 存檔 ----------------
function newSave() {
  return { v: 4, hero: "hunter", tamed: {}, unlocked: 1, stars: {}, muted: false, music: 0.7, sfx: 0.9, introSeen: false, seen: {}, kills: {}, fossils: {}, ach: {},
    items: { potion: 1, frostbomb: 1, goldbag: 1, dynamite: 1 }, st: { kills: 0, built: 0, meteors: 0, rocks: 0, eggs: 0, bosses: 0, tamed: 0, evolved: 0, ults: 0 } };
}
let save = newSave();
function loadSave() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (e) { s = null; }
  if (!s || typeof s !== "object") {
    // 從舊版「守護之塔」存檔遷移（舊鍵保留不刪）
    try {
      const o = JSON.parse(localStorage.getItem(OLD_SAVE_KEY) || "null");
      if (o && typeof o === "object") {
        s = newSave(); s.unlocked = clamp((o.unlocked | 0) || 1, 1, LEVELS.length); s.muted = !!o.muted;
        if (o.stars && typeof o.stars === "object") for (const k in o.stars) if (+k < LEVELS.length) s.stars[k] = clamp(o.stars[k] | 0, 0, 3);
        s.migrated = true; s.v = 1;
      }
    } catch (e) { /* 舊存檔損壞就略過 */ }
  }
  const oldV = s && typeof s === "object" ? (s.v | 0) : 4; // 沒有存檔＝新玩家，不需遷移
  const d = newSave();
  if (s && typeof s === "object") {
    save = Object.assign(newSave(), s);
    for (const k of ["stars", "seen", "kills", "fossils", "ach", "items", "st", "tamed"]) save[k] = Object.assign(d[k], s[k] && typeof s[k] === "object" ? s[k] : {});
  } else save = d;
  save.unlocked = clamp(save.unlocked | 0, 1, LEVELS.length);
  if (oldV < 3) save.migratedV2 = true; // v2.0 → v2.1：補上英雄與收服欄位（newSave 已帶預設值）
  if (oldV < 4) { // v2.0（7 關）→ v2.1（16 關）：舊關卡進度依 OLD_LEVEL_MAP 對應，原值另存 legacy7 備查
    const os = s && s.stars && typeof s.stars === "object" ? s.stars : {}, ou = clamp((s && s.unlocked) | 0 || 1, 1, 7);
    save.legacy7 = { unlocked: ou, stars: Object.assign({}, os) };
    const ns = {};
    for (const k in os) { const i = +k; if (i >= 0 && i < 7 && (os[k] | 0) > 0) ns[OLD_LEVEL_MAP[i]] = clamp(os[k] | 0, 0, 3); }
    save.stars = ns;
    save.unlocked = clamp(OLD_LEVEL_MAP[ou - 1] + 1, 1, LEVELS.length);
    save.v = 4; save.migratedV21 = true;
  }
  if (!HEROES[save.hero]) save.hero = "hunter";
  save.music = clamp(+save.music || 0, 0, 1); save.sfx = clamp(+save.sfx || 0, 0, 1);
  writeSave();
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 隱私模式 */ } }

// ---------------- 版面 ----------------
let W = 0, H = 0, DPR = 1, portrait = false, transposed = false, ts = 40, ox = 0, oy = 0, mapW = 0, mapH = 0, UI = null;
let bgCanvas = null;
function layout() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const m = Math.min(W, H);
  const hud = clamp(Math.round(m * 0.12), 48, 64);
  function calc(ui) {
    let sk, pan, ax, ay, aw, ah;
    if (ui === "portrait") {
      sk = clamp(Math.round(Math.min(W / 7.6, 62)), 44, 62); pan = clamp(Math.round(H * 0.2), 150, 220);
      ax = 6; ay = hud + sk + 6; aw = W - 12; ah = H - hud - sk - pan - 12;
    } else {
      sk = clamp(Math.round(Math.min((H - hud) / 7.4, 64)), 44, 64); pan = clamp(Math.round(W * 0.22), 180, W > 1400 ? 340 : 270);
      ax = sk + 6; ay = hud + 6; aw = W - sk - pan - 12; ah = H - hud - 12;
    }
    const tL = Math.min(aw / COLS, ah / ROWS), tP = Math.min(aw / ROWS, ah / COLS), tr = tP > tL * 1.04;
    return { ui, sk, pan, ax, ay, aw, ah, tr, t: Math.min(112, Math.floor(tr ? tP : tL)) };
  }
  const a = calc("portrait"), b = calc("landscape");
  UI = a.t > b.t || (a.t === b.t && H > W) ? a : b;
  portrait = UI.ui === "portrait"; transposed = UI.tr; ts = Math.max(8, UI.t);
  document.body.classList.toggle("portrait", portrait); document.body.classList.toggle("landscape", !portrait);
  document.body.classList.toggle("wide", W / H > 1.5 && W / H < 2.0);
  mapW = (transposed ? ROWS : COLS) * ts; mapH = (transposed ? COLS : ROWS) * ts;
  ox = Math.round(UI.ax + (UI.aw - mapW) / 2); oy = Math.round(UI.ay + (UI.ah - mapH) / 2);
  const r = document.documentElement.style, hb = hud - 8, hf = clamp(Math.round(hud * 0.42), 19, 27);
  r.setProperty("--hud", hud + "px"); r.setProperty("--hb", hb + "px"); r.setProperty("--hf", hf + "px"); r.setProperty("--pan", UI.pan + "px");
  r.setProperty("--sk", UI.sk + "px");
  const nSk = 8, skb = portrait ? Math.min(UI.sk - 8, Math.floor((W - 12 - 6 * nSk - 6) / nSk)) : Math.min(UI.sk - 10, Math.floor((H - hud - 16 - 6 * nSk - 6) / nSk));
  r.setProperty("--skb", Math.max(34, skb) + "px");
  const tf = clamp(Math.round(m * 0.042), 15, 20); r.setProperty("--tf", tf + "px"); r.setProperty("--tf2", (tf + 3) + "px");
  r.setProperty("--tbh", clamp(Math.floor((H - hud - 16 - 62 - 22) / 4), 52, 120) + "px");
  bgCanvas = null;
}
// 地圖座標（格，浮點）→ 螢幕座標（CSS px）
function S(x, y) { return transposed ? [ox + y * ts, oy + x * ts] : [ox + x * ts, oy + y * ts]; }
function screenToMap(px, py) {
  const u = (px - ox) / ts, v = (py - oy) / ts;
  return transposed ? [v, u] : [u, v];
}

// ---------------- 遊戲狀態 ----------------
const G = {
  screen: "loading", level: -1, L: null, gold: 0, lives: 0, wave: 0, waves: 0, enemies: [], towers: [], projs: [], fx: [], parts: [], bolts: [], texts: [],
  queue: [], spawnT: 0, waveOn: false, auto: -1, speed: 1, dbgSpeed: 0, paused: false, sel: null, build: null, aim: null, time: 0, shake: 0, over: false,
  path: [], segLen: [], total: 0, paths: [], spawnN: 0, pathSet: new Set(), props: [], traps: [], drops: [], cd: {}, slowAll: 0, freezeAll: 0, hover: null, leaked: 0, kills: 0,
  events: [], evT: [], bossOn: false, startLives: 20,
  hero: null, allies: [], pools: [], stampede: null, weather: "clear", night: false, heroSel: false, drag: null, dragPos: null, forceTame: false, evoPick: false,
};
function key(c, r) { return c + "," + r; }
// v2.1：支援多條路徑（分岔路、多個入口）。G.paths[i] = { pts, seg, total }；G.path/G.segLen/G.total 保留為第 0 條（相容舊程式）
function buildPaths(list) {
  G.pathSet = new Set();
  G.paths = list.map((pts) => {
    const P = { raw: pts, pts: pts.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 })), seg: [], total: 0 };
    for (let i = 0; i < pts.length - 1; i++) {
      const [c0, r0] = pts[i], [c1, r1] = pts[i + 1];
      const n = Math.abs(c1 - c0) + Math.abs(r1 - r0), dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
      for (let k = 0; k <= n; k++) G.pathSet.add(key(c0 + dc * k, r0 + dr * k));
      P.seg.push(n); P.total += n;
    }
    return P;
  });
  G.path = G.paths[0].pts; G.segLen = G.paths[0].seg; G.total = G.paths[0].total;
}
function buildPath(pts) { buildPaths([pts]); }
function pathTotal(pi) { return (G.paths[pi | 0] || G.paths[0]).total; }
function posAt(d, pi) {
  const P = G.paths[pi | 0] || G.paths[0]; let i = 0; d = clamp(d, 0, P.total);
  while (i < P.seg.length - 1 && d > P.seg[i]) { d -= P.seg[i]; i++; }
  const a = P.pts[i], b = P.pts[i + 1], f = P.seg[i] ? d / P.seg[i] : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
function nearestDP(x, y) { // 所有路徑上離 (x,y) 最近的點：{ d, pi, q }
  let best = { d: 0, pi: 0, q: 1e9 };
  G.paths.forEach((P, pi) => { for (let d = 0; d <= P.total; d += 0.25) { const p = posAt(d, pi), q = (p.x - x) ** 2 + (p.y - y) ** 2; if (q < best.q) best = { d, pi, q }; } });
  return best;
}
function nearestD(x, y) { return nearestDP(x, y).d; }
function randPathPoint() { const pi = Math.floor(Math.random() * G.paths.length); return posAt(rand(1, pathTotal(pi) - 1), pi); }
function propAt(c, r) { return G.props.find((p) => p.c === c && p.r === r && !p.gone); }
function towerAt(c, r) { return G.towers.find((t) => t.c === c && t.r === r); }
function buildable(c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
  if (G.pathSet.has(key(c, r))) return false;
  const p = propAt(c, r); if (p && p.type !== "mud") return false;
  return !towerAt(c, r);
}
function towerUnlocked(t) { return UNLOCK_TOWER[t] <= G.level; }

// ---------------- 關卡流程 ----------------
function startLevel(li) {
  try { window.DinoCounter && window.DinoCounter.levelStart(); } catch (e) {}
  const L = LEVELS[li];
  Object.assign(G, { level: li, L, gold: L.gold, lives: 20, startLives: 20, wave: 0, waves: L.waves, enemies: [], towers: [], projs: [], fx: [], parts: [], bolts: [], texts: [],
    queue: [], spawnT: 0, waveOn: false, auto: -1, speed: 1, paused: false, sel: null, build: null, aim: null, time: 0, shake: 0, over: false,
    traps: [], drops: [], cd: { meteor: 0, trap: 0, airdrop: 0 }, slowAll: 0, freezeAll: 0, leaked: 0, kills: 0, evT: [], bossOn: false,
    allies: [], pools: [], stampede: null, heroSel: false, drag: null, dragPos: null, forceTame: false, evoPick: false, night: !!L.night });
  $("spdTxt").textContent = "×1"; $("bSpeed").classList.remove("on"); $("bPause").classList.remove("on");
  buildPaths(L.paths || [L.path]); G.spawnN = 0;
  G.props = L.props.map(([type, c, r]) => ({ type, c, r, gone: false, t: rand(0, 10), vent: type === "vent" ? rand(6, 14) : 0, warn: 0 }));
  G.events = L.events.map((e) => ({ ...e, done: false }));
  G.hero = makeHero(save.hero);
  setWeather(L.weather || "clear", false);
  bgCanvas = null;
  showScreen("play"); buildTowerButtons(); buildSkillBar(); updateHud(); updatePanel();
  AUDIO.music(li % 2 === 0 ? "level1" : "level2");
  const wx = WEATHER[G.weather] || WEATHER.clear;
  banner(L.code + " " + L.name, (L.bossType ? "章節魔王關・" : "") + (G.weather !== "clear" ? wx.name + "：" + wx.desc + "・" : "") + (G.night ? "夜晚：記得蓋火把塔照明・" : "") + L.tip);
  updateWeatherChip();
}
function startWave() {
  if (G.over || G.waveOn || G.wave >= G.waves) return;
  if (G.auto > 0 && G.wave > 0) { const bonus = Math.round(G.auto * 2); if (bonus > 0) { G.gold += bonus; floatText("提早 +" + bonus, ox + mapW / 2, oy + 30, "#ffd25e"); } }
  G.queue = makeWave(G.level, G.wave).map((q) => (q.t === "trex" && G.L.bossType ? { t: G.L.bossType, gap: q.gap } : q)); G.wave++; G.waveOn = true; G.spawnT = 0.3; G.auto = -1;
  AUDIO.play("wave");
  for (const e of G.events) if (!e.done && e.wave === G.wave) { e.done = true; triggerEvent(e.type, e.to); }
  updateHud(); updatePanel();
}
function triggerEvent(type) {
  const hm = G.L.hpMul;
  if (type === "weather") { setWeather(arguments[1] || "rain", true); return; }
  if (type === "airdrop") { banner("空投補給！", "點一下地圖上的補給箱領取"); spawnDrop(); }
  if (type === "pterostorm") { banner("翼龍群來襲！", "準備防空火力"); for (let i = 0; i < 6 + Math.round(G.L.tier || 0); i++) G.queue.splice(Math.min(G.queue.length, 2 + i * 2), 0, { t: "ptero", gap: 0.5 }); }
  if (type === "rockslide") { banner("峽谷落石！", "落石砸傷路上的恐龍"); for (let i = 0; i < 7; i++) G.evT.push({ t: 1.5 + i * 0.45, f: () => fallingRock(60 * hm) }); }
  if (type === "blizzard") { banner("寒流來襲！", "所有恐龍減速 12 秒"); G.slowAll = 12; AUDIO.play("frost"); }
  if (type === "eruption") {
    banner("火山爆發！", "熔岩彈從天而降"); G.shake = 0.8; AUDIO.play("erupt");
    for (let i = 0; i < 10; i++) G.evT.push({ t: 1 + i * 0.7, f: () => lavaBomb(70 * hm) });
    for (const p of G.props) if (p.type === "vent") p.vent = 0.5;
  }
  if (type === "hatch") {
    const eggs = G.props.filter((p) => p.type === "egg" && !p.gone);
    if (eggs.length) { banner("恐龍蛋孵化了！", "迅猛龍從巢中衝出"); AUDIO.play("roar3"); }
    for (const p of eggs) { p.gone = true; const np = nearestDP(p.c + 0.5, p.r + 0.5); for (let i = 0; i < 3; i++) G.evT.push({ t: 0.3 + i * 0.4, f: () => spawnEnemy("raptor", np.d, np.pi) }); fxAt("x_boom", p.c + 0.5, p.r + 0.5, 1.2); }
    bgCanvas = null;
  }
  if (type === "meteorshower") {
    banner("流星雨！", "上天站在你這邊");
    for (let i = 0; i < 12; i++) G.evT.push({ t: 1 + i * 0.5, f: () => { const e = G.enemies[Math.floor(Math.random() * G.enemies.length)]; if (e) meteorAt(e.x, e.y, 120 * hm, 1.3); } });
  }
}
function spawnDrop() {
  for (let k = 0; k < 40; k++) {
    const c = 2 + Math.floor(Math.random() * 12), r = 1 + Math.floor(Math.random() * 8);
    if (buildable(c, r) && !G.drops.some((d) => d.c === c && d.r === r)) { G.drops.push({ c, r, t: 0, life: 18 }); AUDIO.play("airdrop"); return; }
  }
}
function fallingRock(dmg) {
  const p = randPathPoint();
  G.fx.push({ img: "boulder", x: p.x, y: p.y, s: 0.9, t: 0, life: 0.5, fall: true });
  G.evT.push({ t: 0.5, f: () => { splash(p.x, p.y, 0.9, dmg, true); fxAt("x_boom", p.x, p.y, 1.1); AUDIO.play("rock"); G.shake = Math.max(G.shake, 0.25); } });
}
function lavaBomb(dmg) {
  const p = randPathPoint();
  G.fx.push({ img: "p_lava", x: p.x, y: p.y, s: 0.8, t: 0, life: 0.6, fall: true });
  G.evT.push({ t: 0.6, f: () => { splash(p.x, p.y, 1.1, dmg, true); fxAt("x_boom", p.x, p.y, 1.4); AUDIO.play("boom"); } });
}
function meteorAt(x, y, dmg, rad) {
  G.fx.push({ img: "i_meteor", x, y, s: 1.4, t: 0, life: 0.7, fall: true });
  AUDIO.play("meteor");
  G.evT.push({ t: 0.7, f: () => { splash(x, y, rad, dmg, true, true); fxAt("x_boom", x, y, rad * 1.9); G.shake = Math.max(G.shake, 0.45); burst(x, y, "#ffb040", 22); } });
}
function spawnEnemy(t, d0, pi) {
  if (pi === undefined || pi === null) pi = (G.spawnN++) % G.paths.length;
  const E = ENEMIES[t], wf = G.waves > 1 ? (G.wave - 1) / (G.waves - 1) : 1, hm = Math.pow(G.L.hpMul, 0.5 + 0.5 * wf) * (1 + 0.1 * (G.wave - 1));
  const hp = E.boss ? G.L.boss : Math.round(E.hp * hm);
  const e = { t, E, hp, max: hp, d: d0 || 0.5, pi, x: 0, y: 0, slow: 0, slowT: 0, stun: 0, poison: 0, poisonT: 0, flash: 0, face: 1, healT: 1.5, chargeT: rand(2, 4), charging: 0,
    raged: false, rageT: 0, bob: rand(0, 6), dead: false, sx: 0, sy: 0 };
  const p = posAt(e.d, pi); e.x = p.x; e.y = p.y; const s = S(p.x, p.y); e.sx = s[0]; e.sy = s[1];
  const p3 = posAt(e.d + 0.3, pi), p2 = S(p3.x, p3.y); e.face = p2[0] >= e.sx ? 1 : -1;
  G.enemies.push(e);
  if (!save.seen[t]) { save.seen[t] = true; writeSave(); toast("圖鑑新發現：" + E.name, 2); checkAch(); }
  if (E.boss) { G.bossOn = true; banner(E.name + " 登場！", (E.skName ? "技能「" + E.skName + "」：" : "") + E.desc); AUDIO.play(E.roar === "boss" ? "boss" : E.roar); AUDIO.music("boss"); G.shake = 1.0; }
  else if (Math.random() < 0.18) AUDIO.play(E.roar, { vol: 0.55 });
  return e;
}
function damage(e, amt, opt) {
  if (e.dead) return;
  let a = amt;
  if (opt && opt.fire && e.E.fireRes) a *= e.E.fireRes;
  if (e.sub > 0) a *= 0.3;
  if (!(opt && opt.pure)) { const armor = e.E.armor + (e.iceArmor > 0 ? 8 : 0), arm = (opt && opt.pierce) ? armor * 0.5 : armor; a = Math.max(a * 0.25, a - arm); }
  e.hp -= a; if (!(opt && opt.pure)) e.flash = 0.09;
  if (e.t === "trex" && !e.raged && e.hp < e.max * 0.5 && e.hp > 0) bossRage(e);
  if (e.hp <= 0) kill(e);
}
function bossRage(e) {
  e.raged = true; e.rageT = 4; AUDIO.play("boss"); G.shake = 0.9; banner("暴龍王怒吼！", "附近的塔被震暈");
  for (const t of G.towers) { const dx = t.c + 0.5 - e.x, dy = t.r + 0.5 - e.y; if (dx * dx + dy * dy < 2.3 * 2.3) t.stun = 2.5; }
  G.fx.push({ img: "x_frost", x: e.x, y: e.y, s: 4.6, t: 0, life: 0.6, ring: true });
}
function kill(e) {
  e.dead = true; G.kills++;
  heroXP(e.E.reward * 0.6);
  if (e.eng) e.eng = null;
  const rw = e.E.reward; G.gold += rw;
  floatText("+" + rw, e.sx, e.sy - ts * 0.4, "#ffd25e");
  save.kills[e.t] = (save.kills[e.t] || 0) + 1; save.st.kills++;
  if (e.E.boss) {
    save.st.bosses++; AUDIO.play("bossdie"); G.shake = 1.0; burst(e.x, e.y, "#ff7a2a", 40); fxAt("x_boom", e.x, e.y, 3);
    if (!save.fossils.trextooth && G.level !== LEVELS.length - 1 && Math.random() < 0.5) gainFossil("trextooth");
    if (e.t === "trex") unlockAch("kingfall");
    if (["trex"].concat(BORDER).every((b) => (save.kills[b] | 0) > 0)) unlockAch("bossall");
  } else { AUDIO.play(["die1", "die2", "die3"][Math.floor(Math.random() * 3)], { vol: 0.7 }); burst(e.x, e.y, "#c84a2a", 10); AUDIO.play("coin", { vol: 0.5 }); if (tryTame(e)) return; }
  G.fx.push({ dino: e.E.img, x: e.x, y: e.y, s: e.E.size, t: 0, life: 0.5, face: e.face, death: true, air: !!e.E.air });
}
function splash(x, y, rad, dmg, ground, pure) {
  for (const e of G.enemies) {
    if (e.dead || (ground && e.E.air && !pure)) continue;
    const dx = e.x - x, dy = e.y - y;
    if (dx * dx + dy * dy <= rad * rad) damage(e, dmg);
  }
}

// ---------------- 更新 ----------------
function update(dt) {
  if (G.over) return;
  G.time += dt;
  for (const k in G.cd) if (G.cd[k] > 0) G.cd[k] = Math.max(0, G.cd[k] - dt);
  if (G.slowAll > 0) G.slowAll -= dt;
  if (G.freezeAll > 0) G.freezeAll -= dt;
  for (let i = G.evT.length - 1; i >= 0; i--) { const v = G.evT[i]; v.t -= dt; if (v.t <= 0) { G.evT.splice(i, 1); v.f(); if (G.over) return; } }
  if (G.waveOn && G.queue.length) {
    G.spawnT -= dt;
    if (G.spawnT <= 0) { const q = G.queue.shift(); spawnEnemy(q.t); G.spawnT = q.gap; }
  }
  for (const p of G.props) {
    if (p.gone) continue; p.t += dt;
    if (p.type === "vent") {
      p.vent -= dt; p.warn = p.vent < 1.4 ? 1 : 0;
      if (p.vent <= 0) { p.vent = 16; splash(p.c + 0.5, p.r + 0.5, 1.6, 40 * G.L.hpMul, true); fxAt("x_boom", p.c + 0.5, p.r + 0.5, 2.2); AUDIO.play("erupt", { vol: 0.6 }); burst(p.c + 0.5, p.r + 0.5, "#ff8a2a", 16); }
    }
  }
  const mudSet = new Set(G.props.filter((p) => p.type === "mud").map((p) => key(p.c, p.r)));
  const BL = blockers(); for (const b of BL) b.n = 0;
  for (const e of G.enemies) if (e.eng && !e.dead) e.eng.n = (e.eng.n | 0) + 1;
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.bob += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.stun > 0) e.stun -= dt;
    if (e.poisonT > 0) { e.poisonT -= dt; damage(e, e.poison * dt, { pure: true }); if (e.dead) continue; }
    if (e.E.regen && e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.max * e.E.regen * dt);
    if (e.E.heal) {
      e.healT -= dt;
      if (e.healT <= 0) {
        e.healT = 1.5; let any = false;
        for (const o of G.enemies) if (!o.dead && o !== e && !o.E.heal && !o.E.boss && o.hp < o.max && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 2.0) { o.hp = Math.min(o.max, o.hp + o.max * 0.07); any = true; }
        if (any) { G.fx.push({ img: "x_poison", x: e.x, y: e.y, s: 2.2, t: 0, life: 0.5, ring: true }); AUDIO.play("heal", { vol: 0.5 }); }
      }
    }
    if (e.E.charge) { e.chargeT -= dt; if (e.chargeT <= 0) { e.charging = 0.8; e.chargeT = rand(3.5, 5); } if (e.charging > 0) { e.charging -= dt; if (Math.random() < 0.5) dust(e.x, e.y); } }
    if (e.rageT > 0) e.rageT -= dt;
    if (e.iced > 0) e.iced -= dt; if (e.amber > 0) e.amber -= dt;
    bossSkill(e, dt);
    let spd = e.E.spd * (1 - e.slow);
    if (WEATHER[G.weather] && WEATHER[G.weather].spd) spd *= WEATHER[G.weather].spd;
    if (blockStep(e, dt, BL)) spd = 0;
    if (e.charging > 0) spd *= 2.4;
    if (e.rageT > 0) spd *= 1.5;
    if (G.slowAll > 0) spd *= 0.7;
    if (!e.E.air && mudSet.has(key(Math.floor(e.x), Math.floor(e.y)))) spd *= 0.65;
    if (e.stun > 0 || G.freezeAll > 0) spd = 0;
    e.d += spd * dt;
    const p = posAt(e.d, e.pi), s = S(p.x, p.y);
    const dxs = s[0] - e.sx; if (Math.abs(dxs) > 0.01) e.face = dxs >= 0 ? 1 : -1;
    e.x = p.x; e.y = p.y; e.sx = s[0]; e.sy = s[1];
    if (!e.E.air) for (const tr of G.traps) if (tr.n > 0 && !e.trapped && Math.abs(tr.x - e.x) < 0.5 && Math.abs(tr.y - e.y) < 0.5) {
      e.trapped = true; tr.n--; damage(e, tr.dmg); e.stun = Math.max(e.stun, 1.0); AUDIO.play("trap", { vol: 0.7 }); burst(e.x, e.y, "#d9b38a", 6);
    }
    if (!e.dead && e.d >= pathTotal(e.pi) - 0.5) {
      e.dead = true; G.lives = Math.max(0, G.lives - e.E.life); G.leaked++; G.shake = Math.max(G.shake, 0.35); AUDIO.play("leak");
      floatText("-" + e.E.life, e.sx, e.sy, "#ff6b6b");
      if (G.lives <= 0) { endLevel(false); return; }
    }
  }
  for (const tr of G.traps) tr.life -= dt;
  G.traps = G.traps.filter((t) => t.n > 0 && t.life > 0);
  G.enemies = G.enemies.filter((e) => !e.dead);
  for (const d of G.drops) d.t += dt;
  G.drops = G.drops.filter((d) => d.t < d.life);
  computeLights();
  updateHero(dt); updateAllies(dt); updateStampede(dt); updatePools(dt);
  for (const t of G.towers) {
    t.cd -= dt; if (t.kick > 0) t.kick -= dt; if (t.stun > 0) { t.stun -= dt; continue; }
    if (t.cd > 0) continue;
    const st = tstat(t);
    if (fireTower(t, st)) { t.cd = st.rate; t.kick = 0.15; }
  }
  for (const p of G.projs) {
    if (p.tg && !p.tg.dead) { p.tx = p.tg.x; p.ty = p.tg.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy), step = p.spd * dt;
    p.t += dt; p.h = Math.max(0.3, p.h - dt * 1.2);
    if (dist <= step) { p.done = true; hitProj(p); } else { p.x += dx / dist * step; p.y += dy / dist * step; }
  }
  G.projs = G.projs.filter((p) => !p.done);
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter((f) => f.t < f.life);
  for (const b of G.bolts) b.t -= dt;
  G.bolts = G.bolts.filter((b) => b.t > 0);
  for (const q of G.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; }
  G.parts = G.parts.filter((q) => q.t < q.life);
  for (const q of G.texts) { q.t += dt; q.y -= 26 * dt; }
  G.texts = G.texts.filter((q) => q.t < 1.1);
  if (G.shake > 0) G.shake -= dt;
  if (G.waveOn && !G.queue.length && !G.enemies.length && !G.evT.length) {
    G.waveOn = false;
    if (G.wave >= G.waves) { endLevel(true); return; }
    G.auto = 10; const bonus = 20 + G.wave * 4 + Math.round((G.L.tier || 0) * 2); G.gold += bonus; toast("第 " + G.wave + " 波完成！獎勵 +" + bonus, 1.6);
    if (G.bossOn) G.bossOn = false;
    updatePanel();
  }
  if (!G.waveOn && G.auto > 0 && G.wave > 0) { G.auto -= dt; if (G.auto <= 0) startWave(); }
}

// ---------------- 特效小工具 ----------------
function fxAt(img, x, y, s, life) { G.fx.push({ img, x, y, s, t: 0, life: life || 0.45 }); }
function burst(x, y, col, n) {
  const s = S(x, y);
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(30, 140); G.parts.push({ x: s[0], y: s[1] - ts * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 260, t: 0, life: rand(0.35, 0.8), col, r: rand(1.5, 3.5) }); }
}
function dust(x, y) { const s = S(x, y); G.parts.push({ x: s[0] + rand(-6, 6), y: s[1] + ts * 0.25, vx: rand(-20, 20), vy: rand(-30, -10), g: 0, t: 0, life: 0.5, col: "rgba(200,170,120,.7)", r: rand(3, 6) }); }
function floatText(txt, x, y, col) { G.texts.push({ txt, x, y, col, t: 0 }); }

// ---------------- 繪圖 ----------------
function drawCover(g, im, x, y, w, h) {
  if (!im) return; const r = Math.max(w / im.width, h / im.height), iw = im.width * r, ih = im.height * r;
  g.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}
function bake() {
  const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height;
  const g = c.getContext("2d"), L = G.L, bg = IMG["bg_" + L.bg], D = DPR;
  g.setTransform(D, 0, 0, D, 0, 0);
  drawCover(g, bg, 0, 0, W, H); g.fillStyle = "rgba(8,5,2,.62)"; g.fillRect(0, 0, W, H);
  g.save(); g.beginPath(); g.rect(ox, oy, mapW, mapH); g.clip();
  if (transposed) g.setTransform(0, ts * D, ts * D, 0, ox * D, oy * D); else g.setTransform(ts * D, 0, 0, ts * D, ox * D, oy * D);
  if (bg) g.drawImage(bg, 0, 0, COLS, ROWS);
  const all = G.paths.map((P) => P.raw.map(([a, b]) => [a + 0.5, b + 0.5]));
  const line = () => { g.beginPath(); for (const pts of all) { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); } };
  g.lineJoin = "round"; g.lineCap = "round";
  line(); g.strokeStyle = "rgba(25,14,6,.55)"; g.lineWidth = 1.08; g.stroke();
  const rim = IMG["road_" + L.road];
  if (rim) { const pat = g.createPattern(rim, "repeat"); if (pat.setTransform && window.DOMMatrix) pat.setTransform(new DOMMatrix().scale(1 / 300)); line(); g.strokeStyle = pat; g.lineWidth = 0.86; g.stroke(); }
  line(); g.strokeStyle = "rgba(255,240,200,.10)"; g.lineWidth = 0.5; g.stroke();
  for (const p of G.props) if (p.type === "mud" && IMG.mud) g.drawImage(IMG.mud, p.c - 0.15, p.r - 0.15, 1.3, 1.3);
  if (L.tint) { g.fillStyle = L.tint; g.fillRect(-1, -1, COLS + 2, ROWS + 2); }
  g.restore();
  g.setTransform(D, 0, 0, D, 0, 0);
  g.strokeStyle = "rgba(0,0,0,.7)"; g.lineWidth = 3; g.strokeRect(ox - 1.5, oy - 1.5, mapW + 3, mapH + 3);
  const vg = g.createRadialGradient(ox + mapW / 2, oy + mapH / 2, Math.min(mapW, mapH) * 0.45, ox + mapW / 2, oy + mapH / 2, Math.max(mapW, mapH) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.35)"); g.fillStyle = vg; g.fillRect(ox, oy, mapW, mapH);
  bgCanvas = c;
}
function sprite(name, sx, sy, h, opt) { // 以底部中心為錨點
  const im = (opt && opt.tint) ? tinted(name, opt.tint) : IMG[name]; if (!im) return;
  const w = h * im.width / im.height;
  ctx.save(); ctx.translate(sx, sy);
  if (opt && opt.flip) ctx.scale(-1, 1);
  if (opt && opt.rot) ctx.rotate(opt.rot);
  if (opt && opt.alpha != null) ctx.globalAlpha = opt.alpha;
  ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
}
function centered(name, sx, sy, sz, rot, alpha) {
  const im = IMG[name]; if (!im) return; const r = sz / Math.max(im.width, im.height), w = im.width * r, h = im.height * r;
  ctx.save(); ctx.translate(sx, sy); if (rot) ctx.rotate(rot); if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
}
function shadow(sx, sy, rx) { ctx.fillStyle = "rgba(0,0,0,.32)"; ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx * 0.36, 0, 0, TAU); ctx.fill(); }
function hpBar(sx, sy, w, f, col) {
  ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(sx - w / 2 - 1, sy - 1, w + 2, 6);
  ctx.fillStyle = col || (f > 0.5 ? "#6fe04a" : f > 0.25 ? "#f2c033" : "#ff4d3a"); ctx.fillRect(sx - w / 2, sy, w * clamp(f, 0, 1), 4);
}
function towerH(t) { return ts * (1.18 + t.lvl * 0.12 + (t.evo ? 0.14 : 0)); }
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.screen !== "play" || !G.L) { ctx.clearRect(0, 0, W, H); return; }
  if (!bgCanvas) bake();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bgCanvas, 0, 0); ctx.restore();
  ctx.save();
  if (G.shake > 0) ctx.translate(rand(-1, 1) * G.shake * 7, rand(-1, 1) * G.shake * 7);
  // 可建造格提示
  if (G.build) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (buildable(c, r)) {
      const s = S(c, r); ctx.fillStyle = "rgba(140,255,120,.10)"; ctx.fillRect(s[0] + 2, s[1] + 2, ts - 4, ts - 4);
      ctx.strokeStyle = "rgba(190,255,170,.28)"; ctx.lineWidth = 1; ctx.strokeRect(s[0] + 2.5, s[1] + 2.5, ts - 5, ts - 5);
    }
  }
  renderPools();
  for (const tr of G.traps) { const s = S(tr.x, tr.y); centered("i_trap", s[0], s[1], ts * 0.85, 0, tr.life < 3 ? 0.5 + 0.5 * Math.sin(G.time * 12) : 1); }
  // 排序後的立體物件
  const list = [];
  const ends = new Set();
  G.paths.forEach((P, pi) => {
    const cave = posAt(0.7, pi), gate = posAt(P.total - 0.7, pi), ck = Math.round(cave.x) + "," + Math.round(cave.y), gk = Math.round(gate.x) + "," + Math.round(gate.y);
    if (!ends.has("c" + ck)) { ends.add("c" + ck); list.push({ y: S(cave.x, cave.y)[1], f: () => { const s = S(cave.x, cave.y); sprite("cave", s[0], s[1] + ts * 0.45, ts * 1.5); } }); }
    if (!ends.has("g" + gk)) { ends.add("g" + gk); list.push({ y: S(gate.x, gate.y)[1], f: () => { const s = S(gate.x, gate.y); sprite("gate", s[0], s[1] + ts * 0.5, ts * 1.6); } }); }
  });
  for (const p of G.props) {
    if (p.gone || p.type === "mud") continue;
    const s = S(p.c + 0.5, p.r + 0.5);
    list.push({ y: s[1], f: () => {
      if (p.type === "rock") { shadow(s[0], s[1] + ts * 0.3, ts * 0.42); sprite("boulder", s[0], s[1] + ts * 0.38, ts * 0.92); }
      else if (p.type === "amberrock") { shadow(s[0], s[1] + ts * 0.3, ts * 0.42); sprite("amberrock", s[0], s[1] + ts * 0.38, ts * 0.98); }
      else if (p.type === "vent") {
        if (p.warn) { ctx.fillStyle = "rgba(255,90,20," + (0.25 + 0.2 * Math.sin(G.time * 18)) + ")"; ctx.beginPath(); ctx.arc(s[0], s[1], ts * 1.6, 0, TAU); ctx.fill(); }
        sprite("vent", s[0], s[1] + ts * 0.42, ts * 1.05);
        if (Math.random() < 0.08) G.parts.push({ x: s[0] + rand(-5, 5), y: s[1] - ts * 0.2, vx: rand(-6, 6), vy: -rand(20, 40), g: 0, t: 0, life: 1.2, col: "rgba(90,80,70,.45)", r: rand(4, 8) });
      } else if (p.type === "egg") { const w = Math.sin(p.t * 6) * (0.05 + (p.t % 4 < 0.6 ? 0.18 : 0)); shadow(s[0], s[1] + ts * 0.3, ts * 0.3); sprite("i_egg", s[0], s[1] + ts * 0.36, ts * 0.85, { rot: w }); }
    } });
  }
  for (const t of G.towers) {
    const s = S(t.c + 0.5, t.r + 0.5);
    list.push({ y: s[1], f: () => {
      shadow(s[0], s[1] + ts * 0.32, ts * 0.42);
      const k = t.kick > 0 ? 1 - t.kick * 0.25 : 1, h = towerH(t);
      ctx.save(); ctx.translate(s[0], s[1] + ts * 0.4); ctx.scale(1 + (1 - k) * 0.5, k); sprite(towerImg(t), 0, 0, h); ctx.restore();
      if (t.stun > 0) {
        if (t.stunK === "ice") centered("x_ice", s[0], s[1] - h * 0.3, h * 0.9, 0, 0.75);
        else if (t.stunK === "fire") centered("x_lava", s[0], s[1] + ts * 0.1, ts * 1.2, 0, 0.85);
        else if (t.stunK === "wind") centered("x_wind", s[0], s[1] - h * 0.4, h * 0.8, Math.sin(G.time * 10) * 0.2, 0.7);
        ctx.fillStyle = "#ffe27a"; ctx.font = "900 " + Math.round(ts * 0.36) + "px " + FF; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "#000"; ctx.strokeText("★暈", s[0], s[1] - h * 0.8); ctx.fillText("★暈", s[0], s[1] - h * 0.8);
      }
      if (G.sel === t) { ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(s[0], s[1] + ts * 0.32, ts * 0.5, ts * 0.2, 0, 0, TAU); ctx.stroke(); }
      if (t.evo) centered("i_evolve", s[0], s[1] + ts * 0.4, ts * 0.34); else for (let i = 0; i <= t.lvl; i++) centered("i_star", s[0] + (i - t.lvl / 2) * ts * 0.22, s[1] + ts * 0.42, ts * 0.24);
    } });
  }
  for (const e of G.enemies) {
    const air = !!e.E.air, lift = air ? ts * (0.75 + Math.sin(e.bob * 4) * 0.08) : Math.abs(Math.sin(e.bob * 9 * e.E.spd)) * ts * 0.05;
    list.push({ y: e.sy, f: () => {
      const h = ts * e.E.size * 1.12;
      shadow(e.sx, e.sy + ts * 0.25, ts * 0.38 * e.E.size * (air ? 0.7 : 1));
      const by = e.sy + ts * 0.3 - lift;
      sprite(e.E.img, e.sx, by, h, { flip: e.face < 0, alpha: e.sub > 0 ? 0.28 : 1 });
      if (e.sub > 0) centered("x_swamp", e.sx, e.sy + ts * 0.2, ts * 1.6, 0, 0.8);
      if (e.iced > 0) centered("x_ice", e.sx, by - h * 0.4, h * 0.9, 0, 0.7);
      if (e.amber > 0) sprite(e.E.img, e.sx, by, h, { flip: e.face < 0, tint: "#ffb020", alpha: 0.5 });
      if (e.iceArmor > 0) sprite(e.E.img, e.sx, by, h, { flip: e.face < 0, tint: "#bfeaff", alpha: 0.35 });
      if (e.flash > 0) sprite(e.E.img, e.sx, by, h, { flip: e.face < 0, tint: "#ffffff", alpha: 0.75 });
      else if (G.freezeAll > 0 || e.slow > 0) sprite(e.E.img, e.sx, by, h, { flip: e.face < 0, tint: "#7fd8ff", alpha: 0.38 });
      else if (e.poisonT > 0) sprite(e.E.img, e.sx, by, h, { flip: e.face < 0, tint: "#7cff3a", alpha: 0.32 });
      if (e.rageT > 0) sprite(e.E.img, e.sx, by, h, { flip: e.face < 0, tint: "#ff2a1a", alpha: 0.25 + 0.15 * Math.sin(G.time * 20) });
      if (e.stun > 0 && !G.freezeAll) { ctx.fillStyle = "#ffe27a"; ctx.font = "900 " + Math.round(ts * 0.3) + "px " + FF; ctx.textAlign = "center"; ctx.fillText("✦", e.sx, by - h - 2); }
      if (!e.E.boss && e.hp < e.max) hpBar(e.sx, by - h - 4, ts * 0.8, e.hp / e.max);
    } });
  }
  for (const d of G.drops) {
    const s = S(d.c + 0.5, d.r + 0.5), drop = Math.max(0, 1 - d.t * 2);
    list.push({ y: s[1], f: () => {
      shadow(s[0], s[1] + ts * 0.3, ts * 0.4);
      const a = d.life - d.t < 4 ? 0.5 + 0.5 * Math.sin(G.time * 12) : 1;
      sprite("i_airdrop", s[0], s[1] + ts * 0.4 - drop * ts * 4 + Math.sin(G.time * 4) * 2, ts * 1.1, { alpha: a });
      if (drop <= 0) { ctx.strokeStyle = "rgba(255,230,120," + (0.5 + 0.4 * Math.sin(G.time * 8)) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], ts * 0.62, 0, TAU); ctx.stroke(); }
    } });
  }
  for (const f of G.fx) if (f.death) {
    const s = S(f.x, f.y);
    list.push({ y: s[1], f: () => { const k = f.t / f.life; sprite(f.dino, s[0], s[1] + ts * 0.3 - (f.air ? ts * 0.75 * (1 - k) : 0), ts * f.s * 1.12, { flip: f.face < 0, rot: f.face * k * 1.3, alpha: 1 - k }); } });
  }
  v21Sprites(list);
  list.sort((a, b) => a.y - b.y);
  for (const o of list) o.f();
  // 投射物
  for (const p of G.projs) {
    const s = S(p.x, p.y), sy = s[1] - p.h * ts * 0.7, tg = S(p.tx, p.ty), rot = Math.atan2(tg[1] - ts * 0.3 - sy, tg[0] - s[0]);
    centered(p.img, s[0], sy, ts * (p.type === "lava" ? 0.62 : 0.55), p.type === "spear" ? rot : p.type === "lava" ? p.t * 9 : rot);
  }
  // 閃電／琥珀光束
  for (const b of G.bolts) {
    const a = S(b.a.x, b.a.y), c = S(b.b.x, b.b.y), y0 = a[1] - b.a.h * ts, y1 = c[1] - b.b.h * ts;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = b.rail ? (k ? "#f6e8ff" : "rgba(180,90,255,.8)") : b.sun ? (k ? "#ffffff" : "rgba(255,240,150,.85)") : b.amber ? (k ? "#fff2b0" : "rgba(255,170,40,.75)") : (k ? "#e8fbff" : "rgba(120,200,255,.75)"); ctx.lineWidth = k ? (b.rail || b.sun ? 3 : 1.6) : (b.rail ? 11 : b.sun ? 10 : b.amber ? 7 : 5);
      ctx.beginPath(); ctx.moveTo(a[0], y0);
      const n = b.amber ? 1 : 6;
      for (let i = 1; i < n; i++) { const f = i / n; ctx.lineTo(a[0] + (c[0] - a[0]) * f + rand(-6, 6), y0 + (y1 - y0) * f + rand(-6, 6)); }
      ctx.lineTo(c[0], y1); ctx.stroke();
    }
    ctx.restore();
  }
  // 特效
  for (const f of G.fx) {
    if (f.death || f.t < 0) continue;
    if (f.streak) { const k2 = f.t / f.life, a = S(f.a.x, f.a.y), b = S(f.b.x, f.b.y); centered(f.streak, a[0] + (b[0] - a[0]) * k2, a[1] - ts * 0.6 + (b[1] - a[1]) * k2, ts * 0.9, Math.atan2(b[1] - a[1], b[0] - a[0])); continue; }
    const k = f.t / f.life, s = S(f.x, f.y);
    if (f.fall) { const y = s[1] - (1 - k) * ts * 5; centered(f.img, s[0] + (1 - k) * ts * 1.5, y, ts * f.s, f.img === "boulder" ? k * 6 : (f.rot || 0)); }
    else if (f.ring) centered(f.img, s[0], s[1], ts * f.s * (0.3 + k), 0, 1 - k);
    else { ctx.save(); ctx.globalCompositeOperation = f.img === "x_boom" ? "source-over" : "lighter"; centered(f.img, s[0], s[1] - ts * 0.2, ts * f.s * (0.6 + 0.5 * k), 0, 1 - k * k); ctx.restore(); }
  }
  for (const q of G.parts) { ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (G.freezeAll > 0) { ctx.fillStyle = "rgba(140,210,255,.16)"; ctx.fillRect(ox, oy, mapW, mapH); }
  if (G.slowAll > 0) { ctx.fillStyle = "rgba(220,240,255,.10)"; ctx.fillRect(ox, oy, mapW, mapH); for (let i = 0; i < 40; i++) { const x = ox + ((i * 97 + G.time * 60) % mapW), y = oy + ((i * 53 + G.time * 90 + i * i) % mapH); ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillRect(x, y, 2.5, 2.5); } }
  renderNight();
  renderWeather();
  // 射程／瞄準
  const showRange = (c, r, R, ok) => { const s = S(c + 0.5, r + 0.5); ctx.fillStyle = ok ? "rgba(255,240,170,.12)" : "rgba(255,80,60,.14)"; ctx.strokeStyle = ok ? "rgba(255,236,150,.85)" : "rgba(255,90,70,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], R * ts, 0, TAU); ctx.fill(); ctx.stroke(); };
  if (G.sel) showRange(G.sel.c, G.sel.r, tstat(G.sel).range, true);
  renderHeroUI();
  if (G.build && G.hover) {
    const [c, r] = G.hover, ok = buildable(c, r) && G.gold >= TOWERS[G.build].cost;
    if (c >= 0 && r >= 0 && c < COLS && r < ROWS) { showRange(c, r, TOWERS[G.build].range[0], ok); const s = S(c + 0.5, r + 0.5); sprite(TOWERS[G.build].img + "1", s[0], s[1] + ts * 0.4, ts * 1.18, { alpha: 0.6 }); }
  }
  if (G.aim && G.hover) {
    const s = S(G.hoverF[0], G.hoverF[1]), R = G.aim === "meteor" ? 1.6 : G.aim === "dynamite" ? 1.3 : 0.5;
    ctx.strokeStyle = "rgba(255,120,60,.95)"; ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s[0], s[1], R * ts, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  // 浮動文字
  ctx.textAlign = "center"; ctx.font = "900 " + clamp(Math.round(ts * 0.42), 16, 30) + "px " + FF; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.85)";
  for (const q of G.texts) { ctx.globalAlpha = 1 - q.t / 1.1; ctx.strokeText(q.txt, q.x, q.y); ctx.fillStyle = q.col; ctx.fillText(q.txt, q.x, q.y); }
  ctx.globalAlpha = 1;
  ctx.restore();
  // 魔王血條
  const boss = G.enemies.find((e) => e.E.boss);
  if (boss) {
    const bw = Math.min(mapW - 20, 520), bx = ox + (mapW - bw) / 2, by = oy + 10, f = boss.hp / boss.max;
    ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(bx - 4, by - 4, bw + 8, 30);
    ctx.fillStyle = "#3a0a06"; ctx.fillRect(bx, by, bw, 22);
    const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, "#ff3a1a"); gr.addColorStop(1, "#ffb02a");
    ctx.fillStyle = gr; ctx.fillRect(bx, by, bw * clamp(f, 0, 1), 22);
    ctx.font = "900 18px " + FF; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#000"; const bt = boss.E.name + " " + Math.ceil(boss.hp); ctx.strokeText(bt, bx + bw / 2, by + 18); ctx.fillStyle = "#fff"; ctx.fillText(bt, bx + bw / 2, by + 18);
  }
  if (G.auto > 0 && !G.waveOn && G.wave > 0 && G.wave < G.waves) {
    ctx.font = "900 20px " + FF; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#000";
    const t = "下一波 " + Math.ceil(G.auto) + " 秒"; ctx.strokeText(t, ox + mapW / 2, oy + mapH - 14); ctx.fillStyle = "#ffe27a"; ctx.fillText(t, ox + mapW / 2, oy + mapH - 14);
  }
}

// ---------------- UI ----------------
let toastT = 0, bannerT = 0;
function toast(msg, sec) { const t = $("toast"); t.textContent = msg; t.classList.remove("hidden"); toastT = sec || 1.6; }
function banner(title, sub) { const b = $("banner"); b.innerHTML = ""; b.append(document.createTextNode(title)); if (sub) { const s = document.createElement("small"); s.textContent = sub; b.append(s); } b.classList.remove("hidden"); b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; bannerT = 2.6; }
const SCREENS = ["loading", "intro", "menu", "select", "codex", "ach", "settings", "help", "credits"];
function showScreen(s) {
  G.screen = s;
  for (const id of SCREENS) $(id).classList.toggle("hidden", id !== s);
  const play = s === "play";
  for (const id of ["hud", "skills", "panel"]) $(id).classList.toggle("hidden", !play);
  if ($("wx")) $("wx").classList.toggle("hidden", !play);
  if (!play) AUDIO.ambient(null);
  $("overlay").classList.add("hidden");
  if (!play) { $("banner").classList.add("hidden"); }
  const tv = $("titleV");
  if (s === "menu" || s === "select" || s === "codex" || s === "ach" || s === "settings" || s === "help" || s === "credits") {
    if (s === "menu") playTitleLoop(); if (G.screen !== "play") AUDIO.music("menu");
  } else if (tv && !tv.paused) tv.pause();
}
function playTitleLoop() {
  const tv = $("titleV"), src = (H > W ? "video/title_loop_portrait.mp4" : "video/title_loop.mp4");
  tv.poster = H > W ? "img/menu_bg_portrait.webp" : "img/menu_bg.webp";
  if (tv.dataset.src !== src) { tv.dataset.src = src; tv.src = src; tv.load(); }
  tv.muted = true; const p = tv.play(); if (p && p.catch) p.catch(() => {});
}
let lastHud = "";
function updateHud() {
  const h = G.lives + "|" + G.gold + "|" + G.wave;
  if (h === lastHud) return; lastHud = h;
  $("sLives").textContent = G.lives; $("sGold").textContent = G.gold; $("sWave").textContent = Math.max(1, G.wave) + "/" + G.waves;
  for (const k of TORDER) { const b = $("tb_" + k); if (b) b.classList.toggle("poor", towerUnlocked(k) && G.gold < TOWERS[k].cost); }
  if (G.sel) updatePanel();
}
function buildTowerButtons() {
  const box = $("towerBtns"); box.innerHTML = "";
  for (const k of TORDER) {
    const T = TOWERS[k], b = document.createElement("button"); b.className = "tb"; b.id = "tb_" + k;
    if (!towerUnlocked(k)) b.classList.add("lock");
    b.innerHTML = '<img src="img/' + T.img + '1.webp" alt=""><span class="nm">' + T.short + '</span><span class="co">' + T.cost + "</span>";
    b.onclick = () => {
      if (!towerUnlocked(k)) { AUDIO.play("deny"); toast(T.name + " 第 " + (UNLOCK_TOWER[k] + 1) + " 關解鎖"); return; }
      G.sel = null; G.aim = null; G.build = G.build === k ? null : k; AUDIO.play("click");
      if (G.build) toast(T.name + "：" + T.desc, 1.6);
      refreshSel(); updatePanel();
    };
    box.append(b);
  }
}
function refreshSel() {
  for (const k of TORDER) { const b = $("tb_" + k); if (b) b.classList.toggle("sel", G.build === k); }
  for (const b of document.querySelectorAll("#skills .sk")) b.classList.toggle("sel", G.aim === b.dataset.k);
}
function buildSkillBar() {
  const box = $("skills"); box.innerHTML = "";
  if (G.hero) {
    const H = G.hero.H, b = document.createElement("button"); b.className = "sk hero"; b.id = "sk_ult"; b.dataset.k = "ult"; b.title = H.ult.name + "：" + H.ult.desc;
    b.innerHTML = '<img src="img/' + H.img + '.webp" alt=""><div class="cd"></div><div class="cdt"></div>';
    b.onclick = () => useUlt(); box.append(b);
  }
  for (const k of ["meteor", "trap", "airdrop"]) {
    const b = document.createElement("button"); b.className = "sk"; b.id = "sk_" + k; b.dataset.k = k; b.title = SKILLS[k].name + "：" + SKILLS[k].desc;
    b.innerHTML = '<img src="img/' + SKILLS[k].img + '.webp" alt=""><div class="cd"></div><div class="cdt"></div>';
    b.onclick = () => useSkill(k); box.append(b);
  }
  IORDER.forEach((k, i) => {
    const b = document.createElement("button"); b.className = "sk item" + (i === 0 ? " sep" : ""); b.id = "it_" + k; b.dataset.k = k; b.title = ITEMS[k].name + "：" + ITEMS[k].desc;
    b.innerHTML = '<img src="img/' + ITEMS[k].img + '.webp" alt=""><span class="cnt"></span>';
    b.onclick = () => useItem(k); box.append(b);
  });
  updateSkillBar();
}
function useUlt() {
  const h = G.hero; if (!h || G.over || G.paused) return;
  if (h.dead > 0) { AUDIO.play("deny"); toast(h.H.name + " " + Math.ceil(h.dead) + " 秒後復活"); return; }
  if (h.ucd > 0) { AUDIO.play("deny"); toast(h.H.ult.name + " 冷卻中"); return; }
  if (h.H.ult.aim) { G.build = null; G.sel = null; G.heroSel = false; G.aim = G.aim === "ult" ? null : "ult"; AUDIO.play("click"); if (G.aim) toast(h.H.ult.name + "：點地圖選擇落點", 1.6); refreshSel(); updatePanel(); return; }
  heroUlt(h.x, h.y); updateSkillBar();
}
function updateSkillBar() {
  const ub = $("sk_ult"), h = G.hero;
  if (ub && h) {
    const dead = h.dead > 0, cd = dead ? h.dead : h.ucd, max = dead ? HERO_RESPAWN : h.H.ult.cd;
    ub.querySelector(".cd").style.height = (cd / max * 100) + "%"; ub.querySelector(".cdt").textContent = dead ? "復活" + Math.ceil(cd) : cd > 0 ? Math.ceil(cd) : "";
    ub.classList.toggle("off", cd > 0); ub.classList.toggle("dead", dead);
  }
  for (const k of ["meteor", "trap", "airdrop"]) {
    const b = $("sk_" + k); if (!b) continue; const cd = G.cd[k] || 0;
    b.querySelector(".cd").style.height = (cd / SKILLS[k].cd * 100) + "%"; b.querySelector(".cdt").textContent = cd > 0 ? Math.ceil(cd) : "";
    b.classList.toggle("off", cd > 0);
  }
  for (const k of IORDER) { const b = $("it_" + k); if (!b) continue; const n = save.items[k] | 0; b.querySelector(".cnt").textContent = n; b.classList.toggle("off", n <= 0); }
}
function useSkill(k) {
  if (G.over || G.paused) return;
  if (G.cd[k] > 0) { AUDIO.play("deny"); toast(SKILLS[k].name + " 冷卻中"); return; }
  if (SKILLS[k].aim) { G.build = null; G.sel = null; G.aim = G.aim === k ? null : k; AUDIO.play("click"); if (G.aim) toast(k === "trap" ? "點道路放置陷阱" : "點地圖選擇落點", 1.6); refreshSel(); updatePanel(); return; }
  if (k === "airdrop") {
    G.cd.airdrop = SKILLS.airdrop.cd; const g = 80 + Math.round((G.L.tier || 0) * 15); G.gold += g; AUDIO.play("airdrop"); floatText("+" + g, ox + mapW / 2, oy + mapH / 2, "#ffd25e");
    if (Math.random() < 0.4) { const it = IORDER[Math.floor(Math.random() * 4)]; save.items[it]++; writeSave(); toast("空投：金幣 +" + g + "、" + ITEMS[it].name + " +1", 2); } else toast("空投：金幣 +" + g, 1.6);
    updateSkillBar();
  }
}
function useItem(k) {
  if (G.over || G.paused) return;
  if ((save.items[k] | 0) <= 0) { AUDIO.play("deny"); toast(ITEMS[k].name + " 用完了"); return; }
  if (ITEMS[k].aim) { G.build = null; G.sel = null; G.aim = G.aim === k ? null : k; AUDIO.play("click"); if (G.aim) toast("點地圖選擇爆破位置", 1.6); refreshSel(); updatePanel(); return; }
  save.items[k]--; writeSave(); AUDIO.play("item");
  if (k === "potion") { G.lives += 5; toast("生命 +5"); }
  if (k === "frostbomb") { G.freezeAll = 3; AUDIO.play("shatter"); for (const e of G.enemies) fxAt("x_frost", e.x, e.y, 1.2, 0.5); toast("全場冰凍 3 秒！"); }
  if (k === "goldbag") { G.gold += 150; AUDIO.play("coin"); toast("金幣 +150"); }
  updateSkillBar(); updateHud();
}
function doAim(mx, my) {
  const k = G.aim; G.aim = null; refreshSel();
  if (k === "ult") { heroUlt(mx, my); updateSkillBar(); return; }
  if (k === "meteor") { G.cd.meteor = SKILLS.meteor.cd; meteorAt(mx, my, 160 * G.L.hpMul, 1.6); save.st.meteors++; writeSave(); checkAch(); }
  else if (k === "trap") {
    const np = nearestDP(mx, my), p = posAt(np.d, np.pi);
    if ((p.x - mx) ** 2 + (p.y - my) ** 2 > 0.8) { AUDIO.play("deny"); toast("陷阱要放在道路上"); G.aim = "trap"; refreshSel(); return; }
    G.cd.trap = SKILLS.trap.cd; G.traps.push({ x: p.x, y: p.y, n: 8, dmg: 30 * G.L.hpMul, life: 40 }); AUDIO.play("trap");
  } else if (k === "dynamite") {
    save.items.dynamite--; writeSave(); AUDIO.play("boom"); splash(mx, my, 1.3, 200 * G.L.hpMul, false, true); fxAt("x_boom", mx, my, 2.6, 0.6); G.shake = 0.6; burst(mx, my, "#ffb040", 20);
  }
  updateSkillBar();
}
function updatePanel() {
  const info = $("info"), tb = $("towerBtns"), t = G.sel;
  info.classList.toggle("hidden", !t); tb.classList.toggle("hidden", !!t);
  if (t) {
    const T = TOWERS[t.type], lv = t.lvl, st = tstat(t), up = $("bUp");
    const canEvo = lv >= 2 && !t.evo && EVO[t.type];
    $("infoTitle").textContent = t.evo ? EVO[t.type][t.evo].name + "（進化）" : T.name + " Lv." + (lv + 1);
    if (canEvo && G.evoPick) {
      const E2 = EVO[t.type], ek = t.c + "," + t.r + ":" + (G.gold >= E2.a.cost) + (G.gold >= E2.b.cost);
      if (G._evoKey !== ek || !$("evoA")) { G._evoKey = ek;
      $("infoStats").innerHTML = ["a", "b"].map((k) => '<button class="evo" id="evo' + k.toUpperCase() + '"' + (G.gold < E2[k].cost ? " disabled" : "") + '><img src="img/' + E2[k].img + '.webp" alt=""><span><b>' + E2[k].name + "</b><i>" + E2[k].cost + " 金</i><small>" + E2[k].desc + "</small></span></button>").join("");
      $("evoA").onclick = () => evolveSel("a"); $("evoB").onclick = () => evolveSel("b"); }
      $("infoStats").classList.add("evos");
      up.textContent = "取消"; up.disabled = false;
    } else {
      G._evoKey = null; $("infoStats").classList.remove("evos");
      let tx = "傷害 " + Math.round(st.dmg) + "・射程 " + st.range.toFixed(1) + "<br>" + (t.evo ? EVO[t.type][t.evo].desc : T.desc);
      if (lv < 2) tx += "<br>升級後傷害 " + T.dmg[lv + 1];
      else if (canEvo) tx += "<br>可進化：" + EVO[t.type].a.name + " / " + EVO[t.type].b.name;
      $("infoStats").innerHTML = tx;
      if (canEvo) { up.textContent = "進化 ▸"; up.disabled = false; }
      else if (lv >= 2) { up.textContent = t.evo ? "已進化" : "已滿級"; up.disabled = true; }
      else { up.textContent = "升級 " + T.up[lv]; up.disabled = G.gold < T.up[lv]; }
    }
    $("bSell").textContent = "賣出 +" + Math.floor(t.spent * 0.7);
  }
  const w = $("bWave");
  if (G.waveOn) { w.textContent = "第 " + G.wave + " 波進行中"; w.classList.remove("pulse"); w.disabled = true; }
  else if (G.wave >= G.waves) { w.textContent = "最後一波"; w.disabled = true; }
  else { w.disabled = false; w.textContent = G.wave === 0 ? "開始第 1 波" : "召喚第 " + (G.wave + 1) + " 波"; w.classList.toggle("pulse", G.wave === 0); }
}
function placeTower(type, c, r) {
  const T = TOWERS[type];
  if (!buildable(c, r) || G.gold < T.cost) { AUDIO.play("deny"); if (G.gold < T.cost) toast("金幣不足"); return false; }
  G.gold -= T.cost; const t = { type, c, r, lvl: 0, cd: 0, spent: T.cost, kick: 0, stun: 0 }; G.towers.push(t);
  AUDIO.play("build"); burst(c + 0.5, r + 0.5, "#d9b38a", 10); save.st.built++; writeSave(); checkAch();
  if (G.gold < T.cost) { G.build = null; refreshSel(); }
  updateHud(); updatePanel(); return true;
}
function evolveSel(k) {
  const t = G.sel; if (!t || t.lvl < 2 || t.evo || !EVO[t.type]) return false;
  const E2 = EVO[t.type][k], c = E2.cost; if (G.gold < c) { AUDIO.play("deny"); toast("金幣不足（需要 " + c + "）"); return false; }
  G.gold -= c; t.spent += c; t.evo = k; G.evoPick = false; t.cd = 0.3;
  AUDIO.play("evolve"); G.fx.push({ img: "i_evolve", x: t.c + 0.5, y: t.r + 0.3, s: 1.8, t: 0, life: 0.9, ring: true }); burst(t.c + 0.5, t.r + 0.5, "#fff3a0", 24);
  banner("進化：" + E2.name, E2.desc); save.st.evolved = (save.st.evolved | 0) + 1; writeSave(); unlockAch("evolve1");
  updateHud(); updatePanel(); return true;
}
function upgradeSel() {
  const t = G.sel; if (!t) return;
  if (t.lvl >= 2) { if (!t.evo && EVO[t.type]) { G.evoPick = !G.evoPick; AUDIO.play("click"); updatePanel(); } return; }
  const c = TOWERS[t.type].up[t.lvl]; if (G.gold < c) { AUDIO.play("deny"); toast("金幣不足"); return; }
  G.gold -= c; t.spent += c; t.lvl++; AUDIO.play("upgrade"); fxAt("p_amber", t.c + 0.5, t.r + 0.2, 1.2, 0.5); burst(t.c + 0.5, t.r + 0.5, "#ffe27a", 14);
  if (t.lvl === 2 && !save.ach.maxlvl) { unlockAch("maxlvl"); }
  updateHud(); updatePanel();
}
function sellSel() {
  const t = G.sel; if (!t) return;
  G.gold += Math.floor(t.spent * 0.7); G.towers = G.towers.filter((x) => x !== t); G.sel = null; AUDIO.play("sell"); burst(t.c + 0.5, t.r + 0.5, "#ffd25e", 10);
  updateHud(); updatePanel();
}
function gainFossil(id) {
  if (save.fossils[id]) return false; save.fossils[id] = true; writeSave(); AUDIO.play("achieve"); toast("獲得化石：" + FOSSILS[id].name, 2.4); checkAch(); return true;
}
function breakProp(p) {
  if (p.type === "egg") { p.gone = true; G.gold += 15; save.st.eggs++; writeSave(); AUDIO.play("shatter"); floatText("+15", ...S(p.c + 0.5, p.r + 0.3), "#ffd25e"); burst(p.c + 0.5, p.r + 0.5, "#f4e6c0", 14); checkAch(); return; }
  const cost = p.type === "amberrock" ? 40 : 20;
  if (G.gold < cost) { AUDIO.play("deny"); toast("敲碎岩石需要 " + cost + " 金幣"); return; }
  G.gold -= cost; p.gone = true; AUDIO.play("rock"); fxAt("x_boom", p.c + 0.5, p.r + 0.5, 1.4); burst(p.c + 0.5, p.r + 0.5, p.type === "amberrock" ? "#ffb030" : "#9a8a78", 16);
  const rw = p.type === "amberrock" ? 90 : 40; G.gold += rw; floatText("+" + rw, ...S(p.c + 0.5, p.r + 0.2), "#ffd25e");
  save.st.rocks++; writeSave();
  if (p.type === "amberrock" || Math.random() < 0.25) {
    const pool = ["ammonite", "amberbug", "brachioneck"].filter((f) => !save.fossils[f]);
    if (pool.length && (p.type === "amberrock" || Math.random() < 0.5)) gainFossil(pool[Math.floor(Math.random() * pool.length)]);
    else if (Math.random() < 0.5) { const it = IORDER[Math.floor(Math.random() * 4)]; save.items[it]++; writeSave(); toast("挖到道具：" + ITEMS[it].name); updateSkillBar(); }
  }
  checkAch(); updateHud();
}
function unlockAch(id) {
  if (save.ach[id]) return; const a = ACH.find((x) => x.id === id); if (!a) return;
  save.ach[id] = Date.now(); writeSave(); AUDIO.play("achieve"); toast("成就解鎖：" + a.name, 2.6);
}
function checkAch() {
  const s = save.st;
  if (s.kills >= 500) unlockAch("hunter");
  if (s.built >= 100) unlockAch("builder");
  if (s.meteors >= 10) unlockAch("meteor10");
  if (s.rocks >= 15) unlockAch("geo");
  if (s.eggs >= 10) unlockAch("egg");
  if (Object.keys(save.fossils).filter((k) => save.fossils[k]).length >= 6) unlockAch("fossil6");
  if (EORDER.every((k) => save.seen[k])) unlockAch("codex");
  if (LEVELS.every((_, i) => (save.stars[i] | 0) >= 3)) unlockAch("allstars");
}
function endLevel(win) {
  if (G.over) return; G.over = true; G.build = null; G.aim = null; G.sel = null;
  const li = G.level;
  let stars = 0;
  if (win) {
    stars = G.lives >= 18 ? 3 : G.lives >= 10 ? 2 : 1;
    save.stars[li] = Math.max(save.stars[li] | 0, stars);
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, li + 2));
    if (li === 0) unlockAch("win1");
    if (G.leaked === 0) unlockAch("perfect");
    const it = IORDER[li % 4]; save.items[it]++;
    writeSave();
    gainFossil(LEVELS[li].fossil);
    checkAch();
    AUDIO.music("win"); AUDIO.play("achieve");
  } else { writeSave(); AUDIO.music("lose"); AUDIO.play("leak"); }
  setTimeout(() => {
    $("oTitle").textContent = win ? "防線守住了！" : "營地失守…"; $("oTitle").classList.toggle("lose", !win);
    $("oStars").innerHTML = win ? [0, 1, 2].map((i) => '<img src="img/i_star.webp" class="' + (i < stars ? "" : "off") + '" alt="">').join("") : "";
    $("oText").innerHTML = win ? "剩餘生命 " + G.lives + "・擊倒 " + G.kills + " 隻恐龍<br>獲得化石：" + FOSSILS[LEVELS[li].fossil].name + "、道具：" + ITEMS[IORDER[li % 4]].name + " +1" : "擊倒 " + G.kills + " 隻恐龍。調整塔的位置再試一次！";
    const btns = [];
    if (win && li + 1 < LEVELS.length) btns.push(["下一關", () => startLevel(li + 1), "nextBtn"]);
    btns.push(["重新挑戰", () => startLevel(li), "retryBtn"]);
    btns.push(["回到選單", () => { showScreen("menu"); }, "menuBtn"]);
    overlayBtns(btns);
    $("overlay").classList.remove("hidden");
  }, win ? 900 : 700);
}
function overlayBtns(list) {
  const box = $("oBtns"); box.innerHTML = "";
  list.forEach(([txt, fn, id], i) => { const b = document.createElement("button"); b.className = "big" + (i ? " alt" : ""); b.textContent = txt; if (id) b.id = id; b.onclick = () => { AUDIO.play("click"); fn(); }; box.append(b); });
}
function setPaused(p) {
  if (G.over) return; G.paused = p; $("bPause").classList.toggle("on", p);
  if (p) {
    $("oTitle").textContent = "暫停"; $("oTitle").classList.remove("lose"); $("oStars").innerHTML = ""; $("oText").textContent = LEVELS[G.level].name + "・第 " + Math.max(1, G.wave) + "/" + G.waves + " 波";
    overlayBtns([["繼續", () => setPaused(false), "resumeBtn"], ["重新開始", () => startLevel(G.level), "restartBtn"], ["回到選單", () => { G.paused = false; showScreen("menu"); }, "quitBtn"]]);
    $("overlay").classList.remove("hidden"); AUDIO.pauseMusic(true);
  } else { $("overlay").classList.add("hidden"); AUDIO.pauseMusic(false); }
}

// ---------------- 選單畫面 ----------------
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function buildHeroPick() {
  const box = $("heroPick"); if (!box) return; box.innerHTML = "";
  for (const k of HORDER) {
    const H = HEROES[k], b = document.createElement("button"); b.className = "hp" + (save.hero === k ? " sel" : ""); b.id = "hero_" + k;
    b.innerHTML = '<img src="img/' + H.img + '.webp" alt=""><span><b><span class="hpl">' + H.title + "・" + H.name + '</span><span class="hps">' + (k === "hunter" ? "獵人" : "馴龍師") + "</span></b><small>" + H.desc + "<br>大招「" + H.ult.name + "」：" + H.ult.desc + "</small></span>";
    b.onclick = () => { save.hero = k; writeSave(); AUDIO.play("click"); buildHeroPick(); };
    box.append(b);
  }
}
// v2.1 世界地圖：節點座標為地圖圖片的百分比
const WNODE = [[0.08, 0.83], [0.18, 0.66], [0.12, 0.46], [0.33, 0.6], [0.38, 0.86], [0.5, 0.68], [0.29, 0.37], [0.36, 0.14], [0.52, 0.2],
  [0.63, 0.34], [0.73, 0.21], [0.69, 0.5], [0.83, 0.41], [0.66, 0.82], [0.79, 0.7], [0.92, 0.25]];
const WCH = [[0.1, 0.3], [0.44, 0.97], [0.22, 0.06], [0.63, 0.06], [0.87, 0.56], [0.92, 0.84], [0.92, 0.07]];
let selLv = 0;
function lvTags(i) {
  const L = LEVELS[i], W2 = WEATHER[L.weather] || WEATHER.clear, t = [];
  t.push('<span class="ch">第 ' + (L.ch + 1) + " 章・" + esc(CHAPTERS[L.ch].name) + "</span>");
  t.push('<span><img src="img/' + W2.icon + '.webp" alt="">' + W2.name + "</span>");
  if (L.night) t.push('<span><img src="img/w_night.webp" alt="">夜晚</span>');
  const np = (L.paths || [L.path]).length;
  if (np > 1) { const P = L.paths, same = P[0][0][0] === P[1][0][0] && P[0][0][1] === P[1][0][1]; t.push("<span>" + (same ? "分岔路" : "雙入口") + "</span>"); }
  t.push("<span>" + L.waves + " 波</span>");
  if (L.bossType) t.push('<span class="boss">魔王：' + esc(ENEMIES[L.bossType].name) + "</span>");
  return t.join("");
}
function selectLevel(i, quiet) {
  selLv = i; const L = LEVELS[i], lock = i + 1 > save.unlocked, st = save.stars[i] | 0;
  document.querySelectorAll(".wn").forEach((b) => b.classList.toggle("sel", b.id === "lv" + (i + 1)));
  $("liName").textContent = L.code + "　" + L.name;
  $("liStars").innerHTML = [0, 1, 2].map((k) => '<img src="img/i_star.webp" class="' + (k < st ? "" : "off") + '" alt="">').join("");
  $("liTags").innerHTML = lvTags(i);
  const go = $("lvGo"); go.disabled = lock; go.textContent = lock ? "未解鎖" : "出發！";
  if (!quiet) AUDIO.play(lock ? "deny" : "click");
}
function layoutWorld() {
  const box = $("world"), m = $("wmap"); if (!box || G.screen !== "select") return;
  const cw = box.clientWidth - 6, ch = box.clientHeight - 6; let w, h;
  if (portrait) { h = ch; w = h * 16 / 9; if (w < cw) { w = cw; h = w * 9 / 16; } } else { w = cw; h = w * 9 / 16; if (h > ch) { h = ch; w = h * 16 / 9; } }
  m.style.width = Math.floor(w) + "px"; m.style.height = Math.floor(h) + "px";
  m.style.setProperty("--wn", clamp(Math.round(Math.min(w, h * 1.78) * 0.05), 46, 66) + "px");
  const svg = $("wroute"); svg.setAttribute("viewBox", "0 0 " + Math.floor(w) + " " + Math.floor(h));
  let d = ""; WNODE.forEach(([x, y], i) => { d += (i ? "L" : "M") + (x * w).toFixed(1) + " " + (y * h).toFixed(1); });
  const done = Math.max(0, save.unlocked - 1); let d2 = ""; WNODE.slice(0, done + 1).forEach(([x, y], i) => { d2 += (i ? "L" : "M") + (x * w).toFixed(1) + " " + (y * h).toFixed(1); });
  svg.innerHTML = '<path d="' + d + '" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="' + d + '" fill="none" stroke="rgba(255,240,200,.55)" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round"/>' +
    (done ? '<path d="' + d2 + '" fill="none" stroke="#ffd25e" stroke-width="5" stroke-dasharray="2 9" stroke-linecap="round"/>' : "");
  if (portrait) { const [x] = WNODE[selLv]; box.scrollLeft = clamp(x * w - box.clientWidth / 2, 0, w); }
}
function buildLevels() {
  buildHeroPick();
  const box = $("wnodes"); box.innerHTML = "";
  CHAPTERS.forEach((C, ci) => { const l = document.createElement("div"); l.className = "wch"; l.style.left = WCH[ci][0] * 100 + "%"; l.style.top = WCH[ci][1] * 100 + "%"; l.textContent = (ci === 6 ? "終章" : "第 " + (ci + 1) + " 章") + "・" + C.name; box.append(l); });
  LEVELS.forEach((L, i) => {
    const b = document.createElement("button"), lock = i + 1 > save.unlocked, st = save.stars[i] | 0;
    b.className = "wn" + (lock ? " lock" : "") + (L.bossType ? " boss" : "") + (st ? " done" : ""); b.id = "lv" + (i + 1);
    b.style.left = WNODE[i][0] * 100 + "%"; b.style.top = WNODE[i][1] * 100 + "%"; b.setAttribute("aria-label", L.code + " " + L.name);
    b.innerHTML = L.code + (st ? '<span class="ws">' + [0, 1, 2].map((k) => '<img src="img/i_star.webp" class="' + (k < st ? "" : "off") + '" alt="">').join("") + "</span>" : "");
    b.onclick = () => { if (selLv === i && !lock) { startLevel(i); return; } selectLevel(i); };
    box.append(b);
  });
  let cur = Math.min(LEVELS.length - 1, save.unlocked - 1);
  for (let i = 0; i < save.unlocked && i < LEVELS.length; i++) if (!(save.stars[i] | 0)) { cur = i; break; }
  selectLevel(cur, true);
  requestAnimationFrame(layoutWorld);
}
function buildCodex() {
  const box = $("codexList"); box.innerHTML = ""; let n = 0;
  for (const k of EORDER) {
    const E = ENEMIES[k], seen = !!save.seen[k]; if (seen) n++;
    const d = document.createElement("div"); d.className = "cx" + (seen ? "" : " unk");
    const tm = save.tamed[k] | 0, tameTxt = E.boss ? "無法收服（魔王）" : !TAME[k] ? "無法收服（飛行）" : tm ? "已收服 " + tm + " 次" : "尚未收服（機率 " + Math.round(TAME[k] * 100) + "%）";
    const tags = [E.air ? "飛行" : "地面", E.boss ? "魔王・技能「" + E.skName + "」" : "生命 " + E.hp, "護甲 " + E.armor, "擊倒 " + (save.kills[k] | 0), tameTxt];
    d.innerHTML = '<div class="pic"><img src="img/' + E.img + '.webp" alt=""></div><div><div class="nm">' + (seen ? E.name : "？？？") + '</div><div class="ds">' + (seen ? esc(E.desc) + "<br>" + tags.join("・") : "尚未遭遇") + "</div></div>";
    box.append(d);
  }
  $("codexCount").textContent = n + " / " + EORDER.length;
}
function buildAch() {
  const fl = $("fosList"); fl.innerHTML = ""; let nf = 0;
  for (const k in FOSSILS) { const has = !!save.fossils[k]; if (has) nf++; const d = document.createElement("div"); d.className = "fos" + (has ? "" : " no"); d.innerHTML = '<img src="img/' + FOSSILS[k].img + '.webp" alt=""><span>' + (has ? FOSSILS[k].name : "？？？") + "</span>"; fl.append(d); }
  $("fosCount").textContent = nf + " / " + Object.keys(FOSSILS).length;
  const al = $("achList"); al.innerHTML = ""; let na = 0;
  for (const a of ACH) { const has = !!save.ach[a.id]; if (has) na++; const d = document.createElement("div"); d.className = "ac" + (has ? "" : " no"); d.innerHTML = '<img src="img/' + a.img + '.webp" alt=""><div>' + a.name + "<small>" + a.desc + (has ? "　✔ 已達成" : "") + "</small></div>"; al.append(d); }
  $("achCount").textContent = na + " / " + ACH.length;
}
function buildCredits() {
  const c = CREDITS;
  let h = "<h3>美術與影片</h3><p>" + esc(c.art) + "</p><h3>音樂（CC BY 4.0）</h3>";
  for (const [t, u] of c.music) h += '<p class="cr">"' + esc(t) + '" Kevin MacLeod (incompetech.com)<br>Licensed under Creative Commons: By Attribution 4.0 License<br>http://creativecommons.org/licenses/by/4.0/ ——' + esc(u) + "</p>";
  h += "<h3>音效（CC0）</h3>";
  for (const [t, u, l] of c.sfx) h += '<p class="cr">' + esc(t) + "<br>" + esc(u) + "・" + esc(l) + "</p>";
  h += "<h3>程式與遊戲設計</h3><p>恐龍防線 — 原始碼：github.com/allen640107-GH/tower-defense-web（完整來源與授權見 CREDITS.md）</p>";
  $("creditsBox").innerHTML = h;
}
function syncSettings() {
  $("vMusic").value = Math.round(save.music * 100); $("vSfx").value = Math.round(save.sfx * 100);
  $("vMusicT").textContent = Math.round(save.music * 100); $("vSfxT").textContent = Math.round(save.sfx * 100);
  $("sMute").textContent = "全部靜音：" + (save.muted ? "開" : "關");
  document.body.classList.toggle("muted", save.muted);
  AUDIO.set({ muted: save.muted, music: save.music, sfx: save.sfx });
}

// ---------------- 輸入 ----------------
function cellFromEvent(ev) {
  const r = cv.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
  const [mx, my] = screenToMap(px, py); return { mx, my, c: Math.floor(mx), r: Math.floor(my), px, py };
}
function onMapTap(ev) {
  if (G.screen !== "play" || G.over || G.paused) return;
  const p = cellFromEvent(ev);
  const inMap = p.mx >= 0 && p.my >= 0 && p.mx < COLS && p.my < ROWS;
  if (!inMap) { if (G.build || G.aim || G.sel) { G.build = null; G.aim = null; G.sel = null; refreshSel(); updatePanel(); } return; }
  if (G.aim) { doAim(p.mx, p.my); return; }
  if (G.heroSel && !G.build) { moveHero(p.mx, p.my); G.heroSel = false; return; }
  const drop = G.drops.find((d) => d.c === p.c && d.r === p.r && d.t > 0.5);
  if (drop) {
    G.drops = G.drops.filter((d) => d !== drop); const g = 70 + Math.round((G.L.tier || 0) * 10); G.gold += g; AUDIO.play("coin"); floatText("+" + g, ...S(p.c + 0.5, p.r), "#ffd25e");
    if (Math.random() < 0.5) { const it = IORDER[Math.floor(Math.random() * 4)]; save.items[it]++; writeSave(); toast("補給箱：" + ITEMS[it].name + " +1"); updateSkillBar(); }
    updateHud(); return;
  }
  const t = towerAt(p.c, p.r);
  if (G.build && !t) {
    const pr = propAt(p.c, p.r);
    if (pr && pr.type !== "mud") { breakProp(pr); return; }
    placeTower(G.build, p.c, p.r); return;
  }
  if (t) { G.build = null; G.evoPick = false; G.sel = G.sel === t ? null : t; AUDIO.play("click"); refreshSel(); updatePanel(); return; }
  const pr = propAt(p.c, p.r);
  if (pr && pr.type !== "mud") { breakProp(pr); return; }
  if (G.sel) { G.sel = null; updatePanel(); }
}
function heroHit(px, py) {
  const h = G.hero; if (!h || h.dead > 0) return false;
  return Math.abs(px - h.sx) < ts * 0.6 && py > h.sy - ts * 1.25 && py < h.sy + ts * 0.5;
}
function moveHero(mx, my) {
  const h = G.hero; if (!h || h.dead > 0) return;
  h.tx = clamp(mx, 0.3, COLS - 0.3); h.ty = clamp(my, 0.3, ROWS - 0.3); h.home = { x: h.tx, y: h.ty }; AUDIO.play("click");
}
cv.addEventListener("pointerdown", (ev) => {
  AUDIO.unlock();
  if (G.screen === "play" && !G.over && !G.paused && !G.build && !G.aim) {
    const p = cellFromEvent(ev);
    if (heroHit(p.px, p.py)) { G.drag = { x: p.px, y: p.py, moved: false }; G.dragPos = [p.mx, p.my]; try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* */ } return; }
  }
  onMapTap(ev);
});
cv.addEventListener("pointermove", (ev) => {
  if (G.screen !== "play") return; const p = cellFromEvent(ev); G.hover = [p.c, p.r]; G.hoverF = [p.mx, p.my];
  if (G.drag) { if (Math.hypot(p.px - G.drag.x, p.py - G.drag.y) > 10) G.drag.moved = true; G.dragPos = [p.mx, p.my]; }
});
function endDrag() {
  if (!G.drag) return; const d = G.drag; G.drag = null;
  if (d.moved && G.dragPos) { moveHero(G.dragPos[0], G.dragPos[1]); G.heroSel = false; }
  else { G.heroSel = !G.heroSel; AUDIO.play("click"); if (G.heroSel) toast("已選取英雄：點地圖任意位置移動（也可直接拖曳）", 2); }
}
window.addEventListener("pointerup", endDrag); window.addEventListener("pointercancel", endDrag);
cv.addEventListener("pointerleave", () => { G.hover = null; });
window.addEventListener("keydown", (ev) => {
  if (G.screen === "intro" && !$("iSkip").classList.contains("hidden") && (ev.key === "Escape" || ev.key === " " || ev.key === "Enter")) { finishIntro(); return; }
  if (G.screen !== "play") return;
  if (ev.key === "Escape") { if (G.build || G.aim || G.sel) { G.build = null; G.aim = null; G.sel = null; refreshSel(); updatePanel(); } else setPaused(!G.paused); }
  if (ev.key === " ") { ev.preventDefault(); startWave(); }
  const n = parseInt(ev.key, 10); if (n >= 1 && n <= 6) { const b = $("tb_" + TORDER[n - 1]); if (b) b.click(); }
});
document.addEventListener("pointerdown", () => AUDIO.unlock(), { capture: true });
document.addEventListener("click", (ev) => { const b = ev.target.closest && ev.target.closest("button"); if (b && b.classList.contains("back")) { AUDIO.play("back"); showScreen("menu"); } });

$("bWave").onclick = () => { AUDIO.play("click"); startWave(); };
$("bUp").onclick = upgradeSel; $("bSell").onclick = sellSel;
$("bPause").onclick = () => { AUDIO.play("click"); setPaused(!G.paused); };
$("bSpeed").onclick = () => { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1; $("spdTxt").textContent = "×" + G.speed; $("bSpeed").classList.toggle("on", G.speed > 1); AUDIO.play("click"); };
$("bMute").onclick = () => { save.muted = !save.muted; writeSave(); syncSettings(); AUDIO.play("click"); };
$("mStart").onclick = () => { AUDIO.play("click"); buildLevels(); showScreen("select"); };
$("sBack").onclick = () => { AUDIO.play("back"); showScreen("menu"); };
$("lvGo").onclick = () => { if (selLv + 1 > save.unlocked) { AUDIO.play("deny"); toast("先通過前一關"); return; } AUDIO.play("click"); startLevel(selLv); };
$("mCodex").onclick = () => { AUDIO.play("click"); buildCodex(); showScreen("codex"); };
$("mAch").onclick = () => { AUDIO.play("click"); buildAch(); showScreen("ach"); };
$("mSet").onclick = () => { AUDIO.play("click"); syncSettings(); showScreen("settings"); };
$("mHelp").onclick = () => { AUDIO.play("click"); showScreen("help"); };
$("mCredits").onclick = () => { AUDIO.play("click"); buildCredits(); showScreen("credits"); };
$("mIntro").onclick = () => { AUDIO.play("click"); playIntro(); };
$("mReset").onclick = () => {
  if (!confirm("確定要重置恐龍防線的進度、圖鑑與成就嗎？（舊版守護之塔存檔不受影響）")) return;
  const keep = { muted: save.muted, music: save.music, sfx: save.sfx, introSeen: save.introSeen };
  save = Object.assign(newSave(), keep); writeSave(); toast("存檔已重置");
};
$("vMusic").oninput = (e) => { save.music = e.target.value / 100; writeSave(); syncSettings(); };
$("vSfx").oninput = (e) => { save.sfx = e.target.value / 100; writeSave(); syncSettings(); };
$("vSfx").onchange = () => AUDIO.play("coin");
$("sMute").onclick = () => { save.muted = !save.muted; writeSave(); syncSettings(); AUDIO.play("click"); };

// ---------------- 片頭 ----------------
const iv = $("introV");
let introTitleTimer = 0;
function showIntroStart() {
  showScreen("intro"); $("introStart").classList.remove("hidden"); $("iSkip").classList.add("hidden"); $("introTitle").classList.add("hidden");
  $("iEnter").classList.toggle("hidden", !save.introSeen);
}
function playIntro() {
  AUDIO.unlock(); AUDIO.stopMusic();
  showScreen("intro"); $("introStart").classList.add("hidden"); $("iSkip").classList.remove("hidden"); $("introTitle").classList.add("hidden");
  try { iv.currentTime = 0; } catch (e) { /* */ }
  iv.muted = !!save.muted; iv.volume = save.muted ? 0 : Math.max(0.3, save.music);
  const p = iv.play();
  if (p && p.catch) p.catch(() => { iv.muted = true; const q = iv.play(); if (q && q.catch) q.catch(() => finishIntro()); });
  clearInterval(introTitleTimer);
  introTitleTimer = setInterval(() => { if (iv.currentTime >= 18.4) { $("introTitle").classList.remove("hidden"); clearInterval(introTitleTimer); } }, 200);
}
function finishIntro() {
  if (G.screen !== "intro") return;
  clearInterval(introTitleTimer); iv.pause();
  save.introSeen = true; writeSave();
  showScreen("menu");
}
iv.addEventListener("ended", finishIntro);
iv.addEventListener("error", () => { if (G.screen === "intro" && $("introStart").classList.contains("hidden")) finishIntro(); });
iv.addEventListener("click", () => { if (!$("iSkip").classList.contains("hidden")) finishIntro(); });
$("iSkip").onclick = (e) => { e.stopPropagation(); AUDIO.play("click"); finishIntro(); };
$("iPlay").onclick = () => playIntro();
$("iEnter").onclick = () => { AUDIO.unlock(); save.introSeen = true; writeSave(); G.screen = "intro"; finishIntro(); };

// ---------------- 載入 ----------------
function loadAll() {
  const fontP = document.fonts && document.fonts.load ? document.fonts.load('900 40px "DinoTitle"', "恐龍防線").catch(() => {}) : Promise.resolve();
  const total = IMG_LIST.length + AUDIO.count + 1; let done = 0;
  const tick = () => { done++; const f = Math.min(1, done / total); $("lfill").style.width = Math.round(f * 100) + "%"; $("ltext").textContent = "載入中 " + Math.round(f * 100) + "%"; };
  const imgs = IMG_LIST.map((n) => new Promise((res) => {
    const im = new Image(); im.decoding = "async";
    im.onload = () => { IMG[n] = im; tick(); res(); }; im.onerror = () => { tick(); res(); };
    im.src = "img/" + n + ".webp";
  }));
  return Promise.all([Promise.all(imgs), AUDIO.preload(tick), fontP.then(tick)]);
}
let last = 0;
function frame(ts0) {
  const dt = Math.min(0.05, (ts0 - last) / 1000 || 0); last = ts0;
  if (G.screen === "play" && !G.paused && !G.over) {
    const sp = G.dbgSpeed || G.speed, n = Math.ceil(sp);
    for (let i = 0; i < n; i++) update(dt * sp / n);
    updateHud(); if ((G.time * 10 | 0) % 2 === 0) updateSkillBar();
    if ((G.time * 4 | 0) !== G._amb) { G._amb = G.time * 4 | 0; AUDIO.ambient((WEATHER[G.weather] || {}).amb || null); }
    if (!G.waveOn) { const w = $("bWave"); const want = G.wave === 0 ? "開始第 1 波" : G.wave >= G.waves ? "最後一波" : "召喚第 " + (G.wave + 1) + " 波"; if (w.textContent !== want || w.disabled !== (G.wave >= G.waves)) updatePanel(); }
  } else if (G.screen === "play" && G.over) { for (const q of G.parts) { q.t += dt; } }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $("toast").classList.add("hidden"); }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $("banner").classList.add("hidden"); }
  render();
  requestAnimationFrame(frame);
}
let resizeT = 0;
window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { layout(); if (G.screen === "menu") playTitleLoop(); layoutWorld(); }, 60); });
document.addEventListener("visibilitychange", () => { if (document.hidden && G.screen === "play" && !G.paused && !G.over) setPaused(true); });

// 測試掛鉤（playwright 用）
if ($("wx")) $("wx").onclick = () => { AUDIO.play("click"); banner($("wxT").textContent, weatherInfo().replace(/\n/g, " ／ ")); };
window.__td = {
  G, save: () => JSON.parse(JSON.stringify(save)), cellCenter: (c, r) => S(c + 0.5, r + 0.5), mapPoint: (x, y) => S(x, y),
  buildable, pathSet: () => [...G.pathSet], setDebugSpeed: (v) => { G.dbgSpeed = v; }, addGold: (v) => { G.gold += v; },
  layoutInfo: () => ({ W, H, ts, ox, oy, mapW, mapH, portrait, transposed }), imgs: () => Object.keys(IMG).length, audioReady: () => AUDIO.ready,
  startLevel, finishIntro, upgradeSel, sellSel, evolveSel, TOWERS, ENEMIES, LEVELS, EVO, WEATHER,
  hero: () => G.hero, forceTame: () => { G.forceTame = true; }, setWeather: (w) => setWeather(w, true), setNight: (v) => { G.night = !!v; updateWeatherChip(); },
  spawn: (t, d, pi) => spawnEnemy(t, d, pi), damage: (e, a) => damage(e, a), selectLevel, layoutWorld, CHAPTERS, OLD_LEVEL_MAP, heroUlt: (x, y) => heroUlt(x, y), tstat: (t) => tstat(t),
};

loadSave(); layout(); syncSettings(); showScreen("loading");
requestAnimationFrame(frame);
loadAll().then(() => {
  $("ltext").textContent = "載入完成";
  setTimeout(() => { if (save.introSeen) { showScreen("menu"); } else showIntroStart(); }, 250);
});
