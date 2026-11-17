"use strict";
// 恐龍防線：關卡資料。座標為 16×10 地圖格（欄, 列）；路徑從畫面外進入。
// props: rock（可破壞岩石）、amberrock（琥珀岩，獎勵較多）、mud（沼澤泥坑，路上減速）、
//        vent（火山噴氣口，定期噴發傷害附近恐龍）、egg（恐龍蛋，到時會孵出迅猛龍，可先點破）
const LEVELS = [
  { name: "史前叢林", bg: "jungle", road: "dirt", tint: null, gold: 300, waves: 6, hpMul: 1.0, boss: 700,
    path: [[-1, 2], [4, 2], [4, 7], [10, 7], [10, 3], [16, 3]],
    props: [["rock", 7, 5], ["rock", 13, 6], ["amberrock", 1, 8]],
    events: [{ wave: 3, type: "airdrop" }], fossil: "raptorclaw",
    tip: "先用石矛塔守住彎道，點岩石可花金幣敲碎換獎勵。" },
  { name: "迷霧沼澤", bg: "swamp", road: "dirt", tint: "rgba(70,60,30,.28)", gold: 280, waves: 7, hpMul: 1.2, boss: 1300,
    path: [[-1, 7], [3, 7], [3, 2], [7, 2], [7, 7], [12, 7], [12, 2], [16, 2]],
    props: [["mud", 5, 2], ["mud", 9, 7], ["mud", 12, 4], ["rock", 1, 4], ["rock", 14, 6]],
    events: [{ wave: 4, type: "pterostorm" }, { wave: 6, type: "airdrop" }], fossil: "pterowing",
    tip: "泥坑會讓地面恐龍變慢，把火力集中在泥坑附近。" },
  { name: "化石峽谷", bg: "canyon", road: "stone", tint: "rgba(150,70,20,.22)", gold: 300, waves: 8, hpMul: 1.45, boss: 2100,
    path: [[3, -1], [3, 4], [7, 4], [7, 1], [11, 1], [11, 8], [14, 8], [14, 4], [16, 4]],
    props: [["amberrock", 5, 7], ["rock", 9, 3], ["rock", 1, 1], ["amberrock", 13, 1], ["rock", 9, 9]],
    events: [{ wave: 5, type: "rockslide" }, { wave: 7, type: "airdrop" }], fossil: "trikehorn",
    tip: "落石事件會砸傷路上的恐龍；琥珀岩可能挖出化石。" },
  { name: "冰河時期", bg: "ice", road: "stone", tint: "rgba(120,170,230,.30)", gold: 320, waves: 8, hpMul: 1.7, boss: 3200,
    path: [[-1, 1], [13, 1], [13, 4], [2, 4], [2, 7], [14, 7], [14, 10]],
    props: [["rock", 8, 9], ["rock", 0, 6], ["amberrock", 15, 5]],
    events: [{ wave: 3, type: "blizzard" }, { wave: 6, type: "blizzard" }, { wave: 5, type: "airdrop" }], fossil: "ankyloclub",
    tip: "寒流來襲時所有恐龍都會變慢，是升級的好時機。" },
  { name: "火山地帶", bg: "volcano", road: "stone", tint: "rgba(60,20,10,.35)", gold: 340, waves: 9, hpMul: 1.95, boss: 4800,
    path: [[-1, 5], [2, 5], [2, 1], [6, 1], [6, 8], [9, 8], [9, 2], [12, 2], [12, 8], [16, 8]],
    props: [["vent", 4, 4], ["vent", 10, 5], ["vent", 14, 3], ["rock", 0, 8], ["amberrock", 7, 4]],
    events: [{ wave: 6, type: "eruption" }, { wave: 8, type: "airdrop" }], fossil: "spinosail",
    tip: "火山噴氣口會定期噴發，燒傷附近的恐龍。" },
  { name: "恐龍巢穴", bg: "nest", road: "dirt", tint: "rgba(90,60,20,.22)", gold: 360, waves: 9, hpMul: 2.2, boss: 6200,
    path: [[-1, 8], [3, 8], [3, 3], [8, 3], [8, 7], [12, 7], [12, 1], [16, 1]],
    props: [["egg", 5, 5], ["egg", 10, 5], ["egg", 14, 3], ["rock", 1, 1], ["amberrock", 6, 9]],
    events: [{ wave: 4, type: "hatch" }, { wave: 7, type: "hatch" }, { wave: 5, type: "airdrop" }], fossil: "eggfossil",
    tip: "恐龍蛋會在事件時孵化！先點破蛋可以阻止並拿到金幣。" },
  { name: "暴龍王座", bg: "lair", road: "stone", tint: "rgba(80,10,10,.30)", gold: 400, waves: 10, hpMul: 2.5, boss: 9000,
    path: [[8, -1], [8, 2], [2, 2], [2, 8], [13, 8], [13, 4], [16, 4]],
    props: [["vent", 5, 5], ["vent", 10, 5], ["rock", 11, 1], ["amberrock", 0, 5], ["rock", 15, 7]],
    events: [{ wave: 5, type: "eruption" }, { wave: 10, type: "meteorshower" }, { wave: 8, type: "airdrop" }], fossil: "trextooth",
    tip: "最終決戰：暴龍王會怒吼震暈附近的塔，分散塔的位置！" },
];

// 恐龍出現的關卡（第幾關起）
const UNLOCK_ENEMY = { raptor: 0, trike: 0, ptero: 0, parasaur: 1, ankylo: 1, spino: 2, brachio: 3 };
// 塔解鎖（第幾關起）
const UNLOCK_TOWER = { spear: 0, lava: 0, frost: 0, venom: 1, tesla: 2, amber: 3 };

function makeWave(li, w) { // w 從 0 開始
  const L = LEVELS[li], q = [], last = w === L.waves - 1;
  const has = (t) => UNLOCK_ENEMY[t] <= li;
  const n = 6 + Math.round(w * 1.7) + li;
  for (let i = 0; i < n; i++) {
    let t = "raptor";
    const r = (i * 7 + w * 3 + li) % 10;
    if (w >= 1 && r < 3) t = "trike";
    if (w >= 2 && r === 3 && has("ankylo")) t = "ankylo";
    if (w >= 3 && (r === 4 || r === 5)) t = "ptero";
    if (w >= 2 && r === 6 && has("parasaur")) t = "parasaur";
    if (w >= 3 && r === 7 && has("spino")) t = "spino";
    if (w >= 4 && r === 8 && i % 3 === 0 && has("brachio")) t = "brachio";
    q.push({ t, gap: t === "raptor" ? 0.55 : t === "brachio" ? 1.6 : 0.95 });
  }
  if (w % 3 === 2) for (let i = 0; i < 4 + li; i++) q.push({ t: "raptor", gap: 0.35 });
  if (last) { q.push({ t: "trex", gap: 2.2 }); }
  return q;
}
