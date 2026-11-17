"use strict";
// 恐龍防線 v2.1：英雄、馴服友軍、塔的進化分支、天氣與晝夜、各關專屬魔王。
// 本檔在 game.js 之前載入：只定義資料與函式，執行時才使用 game.js 的 G、S、ts 等全域變數。

// ---------------- 資料 ----------------
const HEROES = {
  hunter: { name: "岩牙", title: "原始人獵人", img: "h_hunter", hp: 260, dmg: 20, rate: 0.75, range: 2.5, air: true, proj: "p_hspear", snd: "hero_atk",
    desc: "遠程投矛，能打飛行恐龍。", ult: { name: "萬矛齊發", cd: 40, aim: true, snd: "ult_hunter", desc: "點地圖：長矛雨重創範圍內恐龍並暈眩 1.5 秒" } },
  tamer: { name: "翠拉", title: "馴龍師", img: "h_tamer", hp: 230, dmg: 15, rate: 0.6, range: 1.9, air: false, whip: true, snd: "hero_whip",
    desc: "藤鞭一次打 2 隻；收服機率 ×1.8、友軍上限 +1。", ult: { name: "群龍衝鋒", cd: 45, aim: false, snd: "ult_tamer", desc: "召喚恐龍群沿路逆衝，撞傷並擊退所有地面恐龍" } },
};
const HORDER = ["hunter", "tamer"];
const HERO_XP = [0, 50, 140, 280, 480];
const HERO_RESPAWN = 14;
// 收服機率（魔王與翼龍不可收服）
const TAME = { raptor: 0.05, trike: 0.045, ankylo: 0.04, parasaur: 0.045, spino: 0.03, brachio: 0.025 };
const ALLY_CAP = 3;

// 6 種塔 × 2 個進化分支（第 3 級後可選）
const EVO = {
  spear: {
    a: { name: "連射弩", img: "e_speara", cost: 240, kind: "multi", n: 2, dmg: 24, rate: 0.16, range: 3.4, proj: "p_hspear", air: true, snd: "spear", desc: "超高射速，一次射 2 隻" },
    b: { name: "重型長矛", img: "e_spearb", cost: 260, kind: "line", dmg: 170, rate: 1.5, range: 4.0, proj: "p_lance", air: true, pierce: true, snd: "amber", desc: "貫穿整排恐龍・穿甲" } },
  lava: {
    a: { name: "熔岩迫擊砲", img: "e_lavaa", cost: 290, kind: "proj", dmg: 160, rate: 1.7, range: 3.8, splash: 1.6, pool: 3, proj: "p_lava", air: false, fire: true, snd: "lava", desc: "超大爆炸，留下熔岩池持續燒傷" },
    b: { name: "火山噴泉", img: "e_lavab", cost: 280, kind: "aura", dmg: 20, rate: 0.3, range: 2.1, air: false, fire: true, snd: "sk_fire", desc: "持續噴火，燒傷射程內所有地面恐龍" } },
  frost: {
    a: { name: "冰封牢籠", img: "e_frosta", cost: 270, kind: "proj", dmg: 38, rate: 0.9, range: 3.0, splash: 1.2, slow: 0.6, freeze: 0.25, proj: "p_ice", air: true, snd: "frost", desc: "緩速，並有機率把恐龍整隻凍住" },
    b: { name: "暴雪圖騰", img: "e_frostb", cost: 260, kind: "aura", dmg: 7, rate: 0.3, range: 3.0, slow: 0.55, air: true, snd: "frost", desc: "暴風雪光環：射程內全部減速" } },
  venom: {
    a: { name: "瘴氣花", img: "e_venoma", cost: 260, kind: "proj", dmg: 12, rate: 1.0, range: 3.0, splash: 1.4, poison: 42, proj: "p_venom", air: true, snd: "venom", desc: "毒霧範圍中毒，無視護甲" },
    b: { name: "食龍花", img: "e_venomb", cost: 270, kind: "bite", dmg: 240, rate: 1.7, range: 1.9, swallow: 320, air: false, snd: "venom", desc: "近身巨口，血少的恐龍一口吞掉" } },
  tesla: {
    a: { name: "雷暴尖塔", img: "e_teslaa", cost: 330, kind: "chain", dmg: 75, rate: 0.8, range: 3.3, chain: 9, air: true, snd: "zap", desc: "閃電連鎖 9 隻" },
    b: { name: "電磁砲", img: "e_teslab", cost: 340, kind: "line", dmg: 340, rate: 2.2, range: 4.6, proj: "p_rail", air: true, pierce: true, rail: true, snd: "zap", desc: "直線貫穿電磁光束・穿甲" } },
  amber: {
    a: { name: "琥珀封印", img: "e_ambera", cost: 360, kind: "beam", dmg: 210, rate: 2.0, range: 4.4, entomb: 2.5, air: true, snd: "amber", desc: "把恐龍封進琥珀定身 2.5 秒" },
    b: { name: "太陽水晶", img: "e_amberb", cost: 380, kind: "beam", dmg: 290, rate: 1.5, range: 4.8, light: 4.6, air: true, sun: true, snd: "amber", desc: "強力光束，夜晚照亮大範圍" } },
};
// 天氣：影響塔的數值
const WEATHER = {
  clear: { name: "晴朗", icon: "w_sun", desc: "沒有特殊效果" },
  rain: { name: "下雨", icon: "w_rain", desc: "火系塔 -30%・電塔 +30%（連鎖 +1）", fire: 0.7, zap: 1.3, amb: "amb_rain" },
  fog: { name: "濃霧", icon: "w_fog", desc: "所有塔與英雄射程 -25%", range: 0.75 },
  snow: { name: "暴風雪", icon: "w_snow", desc: "恐龍速度 -15%・冰系 +30%・塔攻速 -13%", spd: 0.85, ice: 1.3, rate: 1.15, amb: "amb_wind" },
  ash: { name: "火山灰", icon: "w_ash", desc: "火系塔 +25%・射程 -10%", fire: 1.25, range: 0.9 },
};
// 各關專屬魔王（暴龍王保留為第 7 關最終魔王）
const BOSS_ENEMIES = {
  carno: { name: "牛角暴君", hp: 1000, spd: 0.5, armor: 5, reward: 150, life: 10, size: 1.85, img: "b_carno", boss: true, roar: "b_carno", skill: "charge", skCd: 7,
    skName: "狂暴衝鋒", desc: "叢林霸主。定期低頭狂衝，撞暈沿途的塔與英雄。" },
  croc: { name: "沼澤巨鱷", hp: 1000, spd: 0.45, armor: 6, reward: 150, life: 10, size: 2.0, img: "b_croc", boss: true, roar: "b_croc", skill: "submerge", skCd: 9,
    skName: "潛入泥沼", desc: "潛進泥沼 2.5 秒無法被鎖定，並回復生命。" },
  quetzal: { name: "風神翼龍", hp: 1000, spd: 0.6, armor: 3, reward: 150, life: 10, size: 2.1, img: "b_quetzal", boss: true, air: true, roar: "b_quetzal", skill: "gust", skCd: 8,
    skName: "狂風", desc: "天空巨翼。拍出狂風吹停附近所有的塔。投石塔打不到。" },
  mammoth: { name: "長毛象王", hp: 1000, spd: 0.38, armor: 8, reward: 150, life: 10, size: 2.1, img: "b_mammoth", boss: true, roar: "b_mammoth", skill: "stomp", skCd: 8,
    skName: "冰霜踐踏", desc: "踐踏凍住附近的塔，並長出冰甲大幅減傷。" },
  lavadrake: { name: "熔岩龍", hp: 1000, spd: 0.45, armor: 7, reward: 150, life: 10, size: 2.0, img: "b_lavadrake", boss: true, roar: "b_lavadrake", skill: "breath", skCd: 6, fireRes: 0.3,
    skName: "熔岩吐息", desc: "吐出熔岩封住最近的塔 3 秒。火系傷害只剩 30%。" },
  queen: { name: "迅猛龍女王", hp: 1000, spd: 0.7, armor: 4, reward: 150, life: 10, size: 1.75, img: "b_queen", boss: true, roar: "b_queen", skill: "summon", skCd: 6,
    skName: "呼喚幼龍", desc: "巢穴之母。不斷呼喚迅猛龍從身後衝出。" },
};
const BORDER = ["carno", "croc", "quetzal", "mammoth", "lavadrake", "queen"];
const V21_IMAGES = ["h_hunter", "h_tamer", "t_torch1", "t_torch2", "t_torch3", "fog", "i_tame", "i_evolve",
  "w_rain", "w_fog", "w_snow", "w_ash", "w_night", "w_torch", "w_sun", "p_hspear", "p_whip", "p_lance", "p_xbow", "p_rail", "x_wind", "x_swamp", "x_ice", "x_lava"]
  .concat(BORDER.map((b) => "b_" + b));
for (const k in EVO) for (const v of ["a", "b"]) V21_IMAGES.push(EVO[k][v].img);

// ---------------- 塔數值（含進化與天氣） ----------------
function tstat(t) {
  const T = TOWERS[t.type], lv = t.lvl, A = (k) => (T[k] ? T[k][lv] : undefined);
  const s = t.evo ? Object.assign({}, EVO[t.type][t.evo]) :
    { dmg: T.dmg[lv], rate: T.rate[lv], range: T.range[lv], splash: A("splash"), slow: A("slow"), poison: A("poison"), chain: A("chain"), light: A("light"),
      air: T.air, proj: T.proj, snd: T.snd, kind: { spear: "proj", lava: "proj", frost: "proj", venom: "proj", tesla: "chain", amber: "beam", torch: "proj" }[t.type],
      fire: t.type === "lava" || t.type === "torch" };
  if (t.type === "amber" && !t.evo) s.pierceArmor = true;
  const w = WEATHER[G.weather] || WEATHER.clear;
  if (s.fire && w.fire) s.dmg *= w.fire;
  if (t.type === "tesla" && w.zap) { s.dmg *= w.zap; if (s.chain) s.chain += 1; }
  if (t.type === "frost" && w.ice) { s.dmg *= w.ice; if (s.slow) s.slow = Math.min(0.8, s.slow * 1.15); }
  if (w.range) s.range *= w.range;
  if (w.rate) s.rate *= w.rate;
  return s;
}
function towerImg(t) { return t.evo ? EVO[t.type][t.evo].img : TOWERS[t.type].img + (t.lvl + 1); }

// ---------------- 夜晚照明 ----------------
let LIGHTS = [];
function computeLights() {
  LIGHTS = [];
  if (!G.night) return;
  for (const t of G.towers) { const s = tstat(t); LIGHTS.push({ x: t.c + 0.5, y: t.r + 0.5, r: s.light || 1.5, warm: !!s.light }); }
  const h = G.hero; if (h && h.dead <= 0) LIGHTS.push({ x: h.x, y: h.y, r: 2.4, warm: true });
  for (const a of G.allies) LIGHTS.push({ x: a.x, y: a.y, r: 1.0 });
  for (const p of G.props) if (!p.gone && p.type === "vent") LIGHTS.push({ x: p.c + 0.5, y: p.r + 0.5, r: 1.6, warm: true });
  for (const p of G.pools) LIGHTS.push({ x: p.x, y: p.y, r: 1.3, warm: true });
  for (const f of G.fx) if (f.img === "x_boom" && !f.death) LIGHTS.push({ x: f.x, y: f.y, r: 1.8 * (1 - f.t / f.life), warm: true });
  G.paths.forEach((P, pi) => { const g = posAt(P.total - 0.7, pi), c = posAt(0.7, pi); LIGHTS.push({ x: g.x, y: g.y, r: 1.8, warm: true }); LIGHTS.push({ x: c.x, y: c.y, r: 1.0, warm: true }); });
}
function isLit(x, y) {
  if (!G.night) return true;
  for (const l of LIGHTS) if ((l.x - x) ** 2 + (l.y - y) ** 2 < (l.r * 0.95) ** 2) return true;
  return false;
}
function targetable(e, air) { return !e.dead && (air || !e.E.air) && !(e.sub > 0) && isLit(e.x, e.y); }

// ---------------- 塔攻擊 ----------------
function fireTower(t, s) {
  const cx = t.c + 0.5, cy = t.r + 0.5, R = s.range;
  const cands = G.enemies.filter((e) => targetable(e, s.air) && (e.x - cx) ** 2 + (e.y - cy) ** 2 <= R * R);
  if (!cands.length) return false;
  const far = (a, b) => (b.d > a.d ? b : a);
  const kind = s.kind;
  if (kind === "aura") {
    for (const e of cands) {
      damage(e, s.dmg, { fire: s.fire });
      if (s.slow) { e.slow = Math.max(e.slow, s.slow); e.slowT = 0.6; }
    }
    if (s.fire) for (let i = 0; i < 5; i++) { const a = rand(0, TAU), r = rand(0.3, R); const p = S(cx + Math.cos(a) * r, cy + Math.sin(a) * r); G.parts.push({ x: p[0], y: p[1], vx: rand(-10, 10), vy: -rand(30, 70), g: 0, t: 0, life: 0.5, col: "rgba(255," + (110 + Math.random() * 90 | 0) + ",30,.85)", r: rand(3, 6) }); }
    else G.fx.push({ img: "x_frost", x: cx, y: cy, s: R * 2.2, t: 0, life: 0.5, ring: true });
    if (Math.random() < 0.25) AUDIO.play(s.snd, { vol: 0.35 });
    return true;
  }
  const tg = t.type === "amber" ? cands.reduce((a, b) => (b.hp > a.hp ? b : a)) : cands.reduce(far);
  AUDIO.play(s.snd, { vol: 0.6 });
  if (kind === "chain") {
    let cur = tg, from = { x: cx, y: cy, h: 1.0 }; const hit = new Set();
    for (let i = 0; i < s.chain && cur; i++) {
      hit.add(cur); G.bolts.push({ a: from, b: { x: cur.x, y: cur.y, h: cur.E.air ? 0.9 : 0.35 }, t: 0.18 });
      damage(cur, s.dmg * (1 - i * 0.08)); fxAt("p_zap", cur.x, cur.y, 0.6, 0.18);
      from = { x: cur.x, y: cur.y, h: cur.E.air ? 0.9 : 0.35 };
      let nx = null, nd = 2.2 * 2.2;
      for (const o of G.enemies) if (!o.dead && !hit.has(o) && !(o.sub > 0)) { const q = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2; if (q < nd) { nd = q; nx = o; } }
      cur = nx;
    }
  } else if (kind === "beam") {
    G.bolts.push({ a: { x: cx, y: cy, h: 1.25 }, b: { x: tg.x, y: tg.y, h: tg.E.air ? 0.9 : 0.35 }, t: 0.22, amber: true, sun: !!s.sun });
    damage(tg, s.dmg, { pierce: true }); fxAt("p_amber", tg.x, tg.y, 0.9, 0.25); burst(tg.x, tg.y, s.sun ? "#fff3b0" : "#ffc040", 8);
    if (s.entomb && !tg.dead) { tg.stun = Math.max(tg.stun, tg.E.boss ? 0.8 : s.entomb); tg.amber = tg.E.boss ? 0.8 : s.entomb; }
  } else if (kind === "line") {
    const dx = tg.x - cx, dy = tg.y - cy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ex = cx + ux * R, ey = cy + uy * R;
    for (const e of G.enemies) {
      if (e.dead || (!s.air && e.E.air) || e.sub > 0) continue;
      const px = e.x - cx, py = e.y - cy, along = px * ux + py * uy; if (along < 0 || along > R) continue;
      if (Math.abs(px * uy - py * ux) < 0.5) damage(e, s.dmg, { pierce: true });
    }
    if (s.rail) G.bolts.push({ a: { x: cx, y: cy, h: 1.0 }, b: { x: ex, y: ey, h: 0.4 }, t: 0.25, rail: true });
    else G.fx.push({ streak: s.proj, a: { x: cx, y: cy }, b: { x: ex, y: ey }, t: 0, life: 0.22 });
  } else if (kind === "bite") {
    const near = cands.reduce((a, b) => ((b.x - cx) ** 2 + (b.y - cy) ** 2 < (a.x - cx) ** 2 + (a.y - cy) ** 2 ? b : a));
    if (!near.E.boss && near.hp <= s.swallow) { floatText("吞掉！", near.sx, near.sy - ts * 0.6, "#9cff6a"); damage(near, near.hp + 1, { pure: true }); }
    else damage(near, s.dmg);
    fxAt("x_poison", near.x, near.y, 1.1, 0.3);
  } else {
    const shots = kind === "multi" ? cands.sort((a, b) => b.d - a.d).slice(0, s.n) : [tg];
    for (const e of shots) G.projs.push({ st: s, type: t.type, x: cx, y: cy, h: 0.9, tg: e, tx: e.x, ty: e.y, spd: t.type === "lava" ? 6 : 10, img: s.proj, t: 0 });
  }
  return true;
}
function hitProj(p) {
  const s = p.st;
  if (s.hero) { if (p.tg && !p.tg.dead) { damage(p.tg, s.dmg); AUDIO.play("spearhit", { vol: 0.5 }); } return; }
  if (s.splash) {
    for (const e of G.enemies) {
      if (e.dead || (!s.air && e.E.air) || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 > s.splash * s.splash) continue;
      damage(e, s.dmg, { fire: s.fire });
      if (e.dead) continue;
      if (s.slow) { e.slow = Math.max(e.slow, s.slow); e.slowT = 1.6; }
      if (s.poison) { e.poison = Math.max(e.poison, s.poison); e.poisonT = 4; }
      if (s.freeze && !e.E.boss && Math.random() < s.freeze) { e.stun = Math.max(e.stun, 1.8); e.iced = 1.8; }
    }
    if (p.type === "lava") { fxAt("x_boom", p.x, p.y, s.splash * 1.6); AUDIO.play("boom", { vol: 0.55 }); burst(p.x, p.y, "#ff8a2a", 8); G.shake = Math.max(G.shake, 0.1); }
    else if (p.type === "frost") fxAt(s.freeze ? "x_ice" : "x_frost", p.x, p.y, s.splash * 1.5, 0.35);
    else fxAt("x_poison", p.x, p.y, s.splash * 1.4, 0.4);
    if (s.pool) G.pools.push({ x: p.x, y: p.y, r: 0.9, t: s.pool, dps: 30 * Math.sqrt(G.L.hpMul) });
  } else if (p.tg && !p.tg.dead) {
    damage(p.tg, s.dmg, { fire: s.fire });
    if (s.poison && !p.tg.dead) { p.tg.poison = Math.max(p.tg.poison, s.poison); p.tg.poisonT = 3; fxAt("x_poison", p.x, p.y, 0.9, 0.35); }
    else AUDIO.play("spearhit", { vol: 0.5 });
  }
}

// ---------------- 魔王技能 ----------------
function stunTowers(x, y, r, sec, kind) {
  let n = 0;
  for (const t of G.towers) if ((t.c + 0.5 - x) ** 2 + (t.r + 0.5 - y) ** 2 < r * r) { t.stun = Math.max(t.stun, sec); t.stunK = kind; n++; }
  return n;
}
function bossSkill(e, dt) {
  if (!e.E.skill) return;
  if (e.sub > 0) { e.sub -= dt; if (e.sub <= 0) { fxAt("x_swamp", e.x, e.y, 2.2, 0.5); } }
  if (e.iceArmor > 0) e.iceArmor -= dt;
  e.skT = (e.skT == null ? e.E.skCd * 0.6 : e.skT) - dt;
  if (e.skT > 0 || e.stun > 0) return;
  e.skT = e.E.skCd;
  const sk = e.E.skill;
  toast(e.E.name + "：" + e.E.skName + "！", 1.4);
  if (sk === "charge") { e.charging = 1.4; AUDIO.play("sk_charge"); G.shake = Math.max(G.shake, 0.5); }
  if (sk === "submerge") { e.sub = 2.5; e.hp = Math.min(e.max, e.hp + e.max * 0.05); fxAt("x_swamp", e.x, e.y, 2.4, 0.6); AUDIO.play("sk_submerge"); }
  if (sk === "gust") { stunTowers(e.x, e.y, 2.6, 2.0, "wind"); G.fx.push({ img: "x_wind", x: e.x, y: e.y, s: 3.2, t: 0, life: 0.9, ring: true }); AUDIO.play("sk_gust"); }
  if (sk === "stomp") { stunTowers(e.x, e.y, 2.3, 2.5, "ice"); e.iceArmor = 4; G.fx.push({ img: "x_ice", x: e.x, y: e.y, s: 4.6, t: 0, life: 0.7, ring: true }); AUDIO.play("sk_stomp"); G.shake = 0.6; }
  if (sk === "breath") {
    let best = null, bd = 3.5 * 3.5;
    for (const t of G.towers) { const q = (t.c + 0.5 - e.x) ** 2 + (t.r + 0.5 - e.y) ** 2; if (q < bd) { bd = q; best = t; } }
    if (best) { best.stun = Math.max(best.stun, 3); best.stunK = "fire"; G.fx.push({ streak: "p_lava", a: { x: e.x, y: e.y }, b: { x: best.c + 0.5, y: best.r + 0.5 }, t: 0, life: 0.35 }); fxAt("x_lava", best.c + 0.5, best.r + 0.6, 1.4, 0.8); }
    const h = G.hero; if (h && h.dead <= 0 && (h.x - e.x) ** 2 + (h.y - e.y) ** 2 < 4) heroHurt(60 * Math.sqrt(G.L.hpMul));
    AUDIO.play("sk_fire");
  }
  if (sk === "summon") { for (let i = 0; i < 3; i++) G.evT.push({ t: i * 0.3, f: () => { if (!e.dead) spawnEnemy("raptor", Math.max(0.3, e.d - 0.4), e.pi); } }); AUDIO.play("sk_summon"); }
}

// ---------------- 擋路（英雄與友軍） ----------------
function blockers() { const b = G.allies.filter((a) => a.hp > 0); if (G.hero && G.hero.dead <= 0) b.push(G.hero); return b; }
function blockStep(e, dt, B) {
  if (e.E.air) return false;
  if (e.E.boss) { // 魔王不會被擋：踐踏經過的英雄與友軍
    for (const b of B) if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < 0.45) { if (b.isHero) heroHurt(45 * dt * Math.sqrt(G.L.hpMul)); else b.hp -= 45 * dt * Math.sqrt(G.L.hpMul); }
    return false;
  }
  if (e.eng) { const b = e.eng; const alive = b.isHero ? b.dead <= 0 : b.hp > 0; if (!alive || (b.x - e.x) ** 2 + (b.y - e.y) ** 2 > 0.6) e.eng = null; }
  if (!e.eng) for (const b of B) if (b.n < b.cap && (b.x - e.x) ** 2 + (b.y - e.y) ** 2 < 0.3) { e.eng = b; b.n++; break; }
  if (!e.eng) return false;
  const dps = (3 + e.E.hp * 0.05) * Math.sqrt(G.L.hpMul);
  if (e.eng.isHero) heroHurt(dps * dt); else e.eng.hp -= dps * dt;
  return true;
}

// ---------------- 英雄 ----------------
function makeHero(type) {
  const H = HEROES[type], d = G.total * 0.55, p = posAt(d);
  return { isHero: true, type, H, x: p.x, y: p.y, tx: p.x, ty: p.y, home: { x: p.x, y: p.y }, hp: H.hp, max: H.hp, lvl: 1, xp: 0, cd: 0, ucd: 6, dead: 0, face: 1, n: 0, cap: 2, kick: 0, sx: 0, sy: 0, hitT: 0 };
}
function heroStat(h) { const k = 1 + 0.22 * (h.lvl - 1), w = WEATHER[G.weather] || WEATHER.clear; return { dmg: h.H.dmg * k, range: h.H.range * (w.range || 1), rate: h.H.rate }; }
function heroHurt(a) {
  const h = G.hero; if (!h || h.dead > 0) return;
  h.hp -= a; h.hitT = 0.12;
  if (h.hp <= 0) {
    h.hp = 0; h.deaths = (h.deaths | 0) + 1; h.dead = HERO_RESPAWN; AUDIO.play("hero_die"); toast(h.H.name + " 倒下了！" + HERO_RESPAWN + " 秒後復活", 2);
    burst(h.x, h.y, "#c84a2a", 14); for (const e of G.enemies) if (e.eng === h) e.eng = null; G.heroSel = false;
  }
}
function heroXP(v) {
  const h = G.hero; if (!h) return; h.xp += v;
  while (h.lvl < 5 && h.xp >= HERO_XP[h.lvl]) {
    h.lvl++; const old = h.max; h.max = Math.round(h.H.hp * (1 + 0.18 * (h.lvl - 1))); h.hp = Math.min(h.max, h.hp + (h.max - old) + h.max * 0.3);
    AUDIO.play("upgrade"); toast(h.H.name + " 升到 Lv." + h.lvl + "！", 1.8); burst(h.x, h.y, "#ffe27a", 18);
    if (h.lvl >= 5) unlockAch("herolv5");
  }
}
function updateHero(dt) {
  const h = G.hero; if (!h) return;
  if (h.ucd > 0) h.ucd = Math.max(0, h.ucd - dt);
  if (h.dead > 0) {
    h.dead -= dt;
    if (h.dead <= 0) { h.dead = 0; h.hp = h.max; h.x = h.tx = h.home.x; h.y = h.ty = h.home.y; AUDIO.play("revive"); toast(h.H.name + " 復活了！", 1.4); G.fx.push({ img: "i_evolve", x: h.x, y: h.y, s: 1.6, t: 0, life: 0.8, ring: true }); }
    return;
  }
  if (h.hitT > 0) h.hitT -= dt;
  const dx = h.tx - h.x, dy = h.ty - h.y, dist = Math.hypot(dx, dy), step = 2.8 * dt;
  if (dist > 0.03) { const k = Math.min(1, step / dist); h.x += dx * k; h.y += dy * k; const sd = S(h.tx, h.ty)[0] - S(h.x, h.y)[0]; if (Math.abs(sd) > 1) h.face = sd > 0 ? 1 : -1; if (Math.random() < 0.3) dust(h.x, h.y); }
  const s = S(h.x, h.y); h.sx = s[0]; h.sy = s[1];
  let engaged = false; for (const e of G.enemies) if (e.eng === h) { engaged = true; break; }
  if (!engaged) h.hp = Math.min(h.max, h.hp + h.max * 0.025 * dt);
  h.cd -= dt; if (h.kick > 0) h.kick -= dt;
  if (h.cd > 0) return;
  const st = heroStat(h), R = st.range;
  const c = G.enemies.filter((e) => !e.dead && !(e.sub > 0) && (h.H.air || !e.E.air) && (e.x - h.x) ** 2 + (e.y - h.y) ** 2 <= R * R && isLit(e.x, e.y));
  if (!c.length) return;
  c.sort((a, b) => (a.eng === h ? -1 : 0) - (b.eng === h ? -1 : 0) || b.d - a.d);
  h.cd = st.rate; h.kick = 0.15; AUDIO.play(h.H.snd, { vol: 0.6 });
  const fs = S(c[0].x, c[0].y)[0]; h.face = fs >= h.sx ? 1 : -1;
  if (h.H.whip) for (const e of c.slice(0, 2)) { damage(e, st.dmg); fxAt("p_whip", e.x, e.y, 0.9, 0.25); }
  else G.projs.push({ st: { hero: true, dmg: st.dmg }, type: "hero", x: h.x, y: h.y, h: 0.8, tg: c[0], tx: c[0].x, ty: c[0].y, spd: 11, img: "p_hspear", t: 0 });
}
function heroUlt(x, y) {
  const h = G.hero; if (!h || h.dead > 0 || h.ucd > 0) return false;
  h.ucd = h.H.ult.cd; AUDIO.play(h.H.ult.snd); save.st.ults = (save.st.ults | 0) + 1;
  const k = (1 + 0.25 * (h.lvl - 1)) * Math.sqrt(G.L.hpMul);
  if (h.type === "hunter") {
    for (let i = 0; i < 14; i++) { const a = rand(0, TAU), r = rand(0, 1.8); G.fx.push({ img: "p_hspear", x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, s: 0.8, t: -i * 0.04, life: 0.55, fall: true, rot: Math.PI / 2 }); }
    G.evT.push({ t: 0.55, f: () => { for (const e of G.enemies) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 < 2.0 * 2.0) { damage(e, 150 * k); if (!e.dead && !e.E.boss) e.stun = Math.max(e.stun, 1.5); } G.shake = 0.5; burst(x, y, "#d9b38a", 24); } });
  } else {
    G.stampede = { lanes: G.paths.map((P, pi) => ({ pi, d: P.total - 0.3 })), hit: new Set(), dmg: 130 * k, t: 0 };
    banner("群龍衝鋒！", "恐龍群逆衝撞飛敵人");
  }
  return true;
}
function updateStampede(dt) {
  const st = G.stampede; if (!st) return;
  st.t += dt;
  for (const ln of st.lanes) { ln.d -= 5.5 * dt; ln.p = posAt(ln.d, ln.pi); }
  for (const e of G.enemies) if (!e.dead && !e.E.air && !st.hit.has(e) && st.lanes.some((ln) => ln.d > 0.2 && (ln.p.x - e.x) ** 2 + (ln.p.y - e.y) ** 2 < 0.6)) {
    st.hit.add(e); damage(e, st.dmg); if (!e.dead && !e.E.boss) { e.d = Math.max(0.3, e.d - 1.2); e.stun = Math.max(e.stun, 0.6); } burst(e.x, e.y, "#d9b38a", 6);
  }
  for (const ln of st.lanes) if (ln.d > 0.2 && Math.random() < 0.5) dust(ln.p.x, ln.p.y);
  if (st.lanes.every((ln) => ln.d <= 0.2)) G.stampede = null;
}

// ---------------- 馴服友軍 ----------------
function allyCap() { return ALLY_CAP + (G.hero && G.hero.type === "tamer" ? 1 : 0); }
function tryTame(e) {
  if (e.E.boss || !TAME[e.t] || G.allies.length >= allyCap()) return false;
  const ch = TAME[e.t] * (G.hero && G.hero.type === "tamer" ? 1.8 : 1);
  if (!G.forceTame && Math.random() >= ch) return false;
  G.forceTame = false;
  const hm = Math.pow(G.L.hpMul, 0.7), E = e.E;
  const a = { t: e.t, E, x: e.x, y: e.y, d: e.d, pi: e.pi | 0, hp: E.hp * 1.3 * hm, max: E.hp * 1.3 * hm, dmg: (6 + E.hp * 0.08) * Math.sqrt(G.L.hpMul), cd: 0.5, n: 0, cap: E.hp >= 180 ? 2 : 1, born: G.time, kick: 0 };
  G.allies.push(a);
  save.tamed[e.t] = (save.tamed[e.t] | 0) + 1; save.st.tamed = (save.st.tamed | 0) + 1; writeSave();
  AUDIO.play("tame"); floatText("收服 " + E.name + "！", e.sx, e.sy - ts * 0.8, "#9cff6a");
  G.fx.push({ img: "i_tame", x: e.x, y: e.y, s: 1.3, t: 0, life: 0.9, ring: true });
  if (save.st.tamed >= 10) unlockAch("tamer10");
  return true;
}
function updateAllies(dt) {
  for (const a of G.allies) {
    if (a.kick > 0) a.kick -= dt;
    a.cd -= dt; if (a.cd > 0) continue;
    let tg = G.enemies.find((e) => e.eng === a && !e.dead);
    if (!tg) { let bd = 1.4 * 1.4; for (const e of G.enemies) { if (e.dead || e.sub > 0) continue; const q = (e.x - a.x) ** 2 + (e.y - a.y) ** 2; if (q < bd) { bd = q; tg = e; } } }
    if (!tg) continue;
    a.cd = 1.0; a.kick = 0.2; damage(tg, a.dmg); fxAt("p_venom", tg.x, tg.y, 0.4, 0.15);
    if (Math.random() < 0.3) AUDIO.play("hit", { vol: 0.5 });
  }
  const dead = G.allies.filter((a) => a.hp <= 0);
  for (const a of dead) { burst(a.x, a.y, "#6fe04a", 12); for (const e of G.enemies) if (e.eng === a) e.eng = null; }
  if (dead.length) G.allies = G.allies.filter((a) => a.hp > 0);
}
// 熔岩池
function updatePools(dt) {
  for (const p of G.pools) { p.t -= dt; for (const e of G.enemies) if (!e.dead && !e.E.air && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < p.r * p.r) damage(e, p.dps * dt, { pure: true, fire: true }); }
  G.pools = G.pools.filter((p) => p.t > 0);
}
// 天氣切換
function setWeather(w, announce) {
  G.weather = w; const W2 = WEATHER[w] || WEATHER.clear;
  if (announce && w !== "clear") banner("天氣變化：" + W2.name, W2.desc);
  updateWeatherChip();
}
function updateWeatherChip() {
  const el = $("wx"); if (!el) return;
  const W2 = WEATHER[G.weather] || WEATHER.clear, parts = [];
  $("wxI").src = "img/" + W2.icon + ".webp";
  $("wxN").classList.toggle("hidden", !G.night);
  if (G.weather !== "clear") parts.push(W2.name); if (G.night) parts.push("夜晚");
  $("wxT").textContent = parts.length ? parts.join("・") : "晴朗";
  el.classList.toggle("hidden", G.screen !== "play");
}
function weatherInfo() {
  const W2 = WEATHER[G.weather] || WEATHER.clear, t = [];
  t.push(W2.name + "：" + W2.desc);
  if (G.night) t.push("夜晚：視野縮小，塔只能打照明範圍內的恐龍（火把塔、英雄、熔岩可照明）");
  return t.join("\n");
}

// ---------------- 繪圖：英雄／友軍／衝鋒／熔岩池／夜晚／天氣 ----------------
function v21Sprites(list) {
  const h = G.hero;
  if (h) {
    if (h.dead > 0) {
      const s = S(h.home.x, h.home.y);
      list.push({ y: s[1], f: () => {
        ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.beginPath(); ctx.arc(s[0], s[1], ts * 0.55, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s[0], s[1], ts * 0.55, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - h.dead / HERO_RESPAWN)); ctx.stroke();
        sprite(h.H.img, s[0], s[1] + ts * 0.3, ts * 0.9, { alpha: 0.35 });
        ctx.font = "900 " + clamp(Math.round(ts * 0.4), 15, 26) + "px " + FF; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#000";
        const tx = "復活 " + Math.ceil(h.dead); ctx.strokeText(tx, s[0], s[1] - ts * 0.7); ctx.fillStyle = "#ffe27a"; ctx.fillText(tx, s[0], s[1] - ts * 0.7);
      } });
    } else {
      list.push({ y: h.sy, f: () => {
        const hh = ts * 1.2, by = h.sy + ts * 0.3;
        if (G.heroSel || G.drag) { ctx.strokeStyle = "#7dff6a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(h.sx, h.sy + ts * 0.28, ts * 0.5, ts * 0.2, 0, 0, TAU); ctx.stroke(); }
        else { ctx.strokeStyle = "rgba(255,226,122,.85)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(h.sx, h.sy + ts * 0.28, ts * 0.42, ts * 0.16, 0, 0, TAU); ctx.stroke(); }
        shadow(h.sx, h.sy + ts * 0.28, ts * 0.32);
        const k = h.kick > 0 ? 1 + h.kick * 0.4 : 1;
        ctx.save(); ctx.translate(h.sx, by); ctx.scale(k, 1 / k); sprite(h.H.img, 0, 0, hh, { flip: h.face < 0 }); if (h.hitT > 0) sprite(h.H.img, 0, 0, hh, { flip: h.face < 0, tint: "#ff4030", alpha: 0.45 }); ctx.restore();
        hpBar(h.sx, by - hh - 6, ts * 0.9, h.hp / h.max, "#5ad1ff");
        ctx.font = "900 " + clamp(Math.round(ts * 0.3), 12, 20) + "px " + FF; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "#000";
        ctx.strokeText("Lv" + h.lvl, h.sx, by - hh - 9); ctx.fillStyle = "#fff"; ctx.fillText("Lv" + h.lvl, h.sx, by - hh - 9);
      } });
    }
  }
  for (const a of G.allies) {
    const bp = posAt(Math.max(0, a.d - 0.3), a.pi), s = S(a.x, a.y), back = S(bp.x, bp.y), face = back[0] >= s[0] ? 1 : -1;
    list.push({ y: s[1], f: () => {
      const hh = ts * a.E.size * 1.0, by = s[1] + ts * 0.3 - (a.kick > 0 ? ts * 0.06 : 0);
      ctx.fillStyle = "rgba(90,255,110,.22)"; ctx.beginPath(); ctx.ellipse(s[0], s[1] + ts * 0.26, ts * 0.5, ts * 0.2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(120,255,120,.9)"; ctx.lineWidth = 2; ctx.stroke();
      sprite(a.E.img, s[0], by, hh, { flip: face < 0 });
      sprite(a.E.img, s[0], by, hh, { flip: face < 0, tint: "#4dff6a", alpha: 0.22 + 0.08 * Math.sin(G.time * 4) });
      centered("i_tame", s[0], by - hh - 4, ts * 0.38);
      hpBar(s[0], by - hh + 6, ts * 0.7, a.hp / a.max, "#6fe04a");
    } });
  }
  if (G.stampede) {
    const st = G.stampede, kinds = ["d_trike", "d_raptor", "d_raptor", "d_trike"];
    for (const ln of st.lanes) kinds.forEach((im, i) => {
      const d = ln.d + i * 0.55; if (d > pathTotal(ln.pi) || ln.d <= 0.2) return; const p = posAt(d, ln.pi), s = S(p.x, p.y), qp = posAt(Math.max(0, d - 0.3), ln.pi), q = S(qp.x, qp.y);
      list.push({ y: s[1], f: () => { const by = s[1] + ts * 0.3 - Math.abs(Math.sin(st.t * 14 + i)) * ts * 0.12; sprite(im, s[0], by, ts * 0.95, { flip: q[0] < s[0] }); sprite(im, s[0], by, ts * 0.95, { flip: q[0] < s[0], tint: "#ffd25e", alpha: 0.35 }); } });
    });
  }
}
function renderPools() { for (const p of G.pools) { const s = S(p.x, p.y); centered("x_lava", s[0], s[1], ts * p.r * 2.2, 0, Math.min(1, p.t)); } }
let nightCv = null;
function renderNight() {
  if (!G.night) return;
  if (!nightCv || nightCv.width !== cv.width || nightCv.height !== cv.height) { nightCv = document.createElement("canvas"); nightCv.width = cv.width; nightCv.height = cv.height; }
  const g = nightCv.getContext("2d"), D = DPR;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, nightCv.width, nightCv.height);
  g.fillStyle = "rgba(3,6,24,.68)"; g.fillRect(ox * D, oy * D, mapW * D, mapH * D);
  g.globalCompositeOperation = "destination-out";
  for (const l of LIGHTS) {
    const s = S(l.x, l.y), r = l.r * ts * D * (l.warm ? 1 + 0.03 * Math.sin(G.time * 9 + l.x) : 1);
    if (r <= 1) continue;
    const gr = g.createRadialGradient(s[0] * D, s[1] * D, 0, s[0] * D, s[1] * D, r);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.62, "rgba(0,0,0,.92)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(s[0] * D, s[1] * D, r, 0, TAU); g.fill();
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(nightCv, 0, 0); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const l of LIGHTS) if (l.warm) { const s = S(l.x, l.y), r = l.r * ts * 0.7; const gr = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], r); gr.addColorStop(0, "rgba(255,150,50,.16)"); gr.addColorStop(1, "rgba(255,120,30,0)"); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(s[0], s[1], r, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function renderWeather() {
  const w = G.weather, t = G.time; if (!w || w === "clear") return;
  ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, mapW, mapH); ctx.clip();
  const n = Math.min(260, Math.round(mapW * mapH / 2600));
  if (w === "rain") {
    ctx.fillStyle = "rgba(20,35,70,.13)"; ctx.fillRect(ox, oy, mapW, mapH);
    ctx.strokeStyle = "rgba(185,210,255,.5)"; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let i = 0; i < n; i++) { const sp = 600 + hash(i) * 300, x = ox + ((hash(i + 7) * (mapW + 60) - t * 90) % (mapW + 60) + mapW + 60) % (mapW + 60) - 30, y = oy + ((hash(i + 3) * (mapH + 60) + t * sp) % (mapH + 60)) - 30; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 16); }
    ctx.stroke();
  } else if (w === "snow") {
    ctx.fillStyle = "rgba(225,238,255,.12)"; ctx.fillRect(ox, oy, mapW, mapH);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    for (let i = 0; i < n; i++) { const sp = 50 + hash(i) * 70, x = ox + ((hash(i + 11) * (mapW + 40) + t * 120 + Math.sin(t * 2 + i) * 12) % (mapW + 40)) - 20, y = oy + ((hash(i + 5) * (mapH + 40) + t * sp) % (mapH + 40)) - 20, r = 1.2 + hash(i + 2) * 2.4; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 12; i++) { const y = oy + hash(i + 40) * mapH, x = ox + ((hash(i + 50) * mapW + t * 420) % (mapW + 200)) - 100; ctx.moveTo(x, y); ctx.lineTo(x + 90, y - 6); }
    ctx.stroke();
  } else if (w === "ash") {
    ctx.fillStyle = "rgba(80,40,20,.16)"; ctx.fillRect(ox, oy, mapW, mapH);
    for (let i = 0; i < n; i++) {
      const ember = i % 6 === 0, sp = ember ? -40 - hash(i) * 30 : 30 + hash(i) * 40;
      const x = ox + ((hash(i + 13) * (mapW + 40) + t * 25 + Math.sin(t + i) * 10) % (mapW + 40)) - 20, y = oy + (((hash(i + 9) * (mapH + 40) + t * sp) % (mapH + 40)) + mapH + 40) % (mapH + 40) - 20;
      ctx.fillStyle = ember ? "rgba(255," + (120 + (i % 5) * 20) + ",40,.9)" : "rgba(70,65,60,.75)"; ctx.fillRect(x, y, ember ? 2.5 : 3, ember ? 2.5 : 2);
    }
  } else if (w === "fog" && IMG.fog) {
    for (let k = 0; k < 2; k++) {
      const fw = mapW * 1.4, fh = mapH * 1.4, x = ox - ((t * (14 + k * 9)) % fw), y = oy - fh * 0.15 + Math.sin(t * 0.2 + k) * 10;
      ctx.globalAlpha = k ? 0.32 : 0.45;
      ctx.drawImage(IMG.fog, x, y, fw, fh); ctx.drawImage(IMG.fog, x + fw, y, fw, fh);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function renderHeroUI() {
  const h = G.hero; if (!h) return;
  if (G.drag && G.drag.moved && G.dragPos) { const s = S(G.dragPos[0], G.dragPos[1]); ctx.strokeStyle = "#7dff6a"; ctx.setLineDash([6, 5]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.sx, h.sy); ctx.lineTo(s[0], s[1]); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(s[0], s[1], ts * 0.35, 0, TAU); ctx.stroke(); }
  if (h.dead <= 0 && Math.hypot(h.tx - h.x, h.ty - h.y) > 0.1) { const s = S(h.tx, h.ty); ctx.strokeStyle = "rgba(125,255,106,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], ts * 0.25 + Math.sin(G.time * 8) * 2, 0, TAU); ctx.stroke(); }
  if (G.heroSel && h.dead <= 0) { const s = S(h.x, h.y), R = heroStat(h).range * ts; ctx.strokeStyle = "rgba(125,255,106,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], R, 0, TAU); ctx.stroke(); }
}
