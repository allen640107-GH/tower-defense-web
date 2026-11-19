"use strict";
// 恐龍防線：關卡資料。座標為 16×10 地圖格（欄, 列）；路徑從畫面外進入。
// props: rock（可破壞岩石）、amberrock（琥珀岩，獎勵較多）、mud（沼澤泥坑，路上減速）、
//        vent（火山噴氣口，定期噴發傷害附近恐龍）、egg（恐龍蛋，到時會孵出迅猛龍，可先點破）
// v2.1：16 關、7 個章節。v2.2：第 4 章起提高血量與波數。old 欄位 = v2.0 的第幾關（舊存檔對應用，見 README「關卡對應」）。
// late：[從第幾波起, 額外血量倍率]，讓終章最後幾波更硬。path：單一路線；paths：多條路線（分岔路或多入口，敵人輪流走不同路線）。bossType：章節魔王（只在章節最後一關出現）。
const CHAPTERS = [
  { name: "史前叢林", levels: [0, 1, 2], boss: "carno" },
  { name: "迷霧沼澤・海岸", levels: [3, 4, 5], boss: "croc" },
  { name: "化石峽谷・天空浮島", levels: [6, 7, 8], boss: "quetzal" },
  { name: "冰河時期", levels: [9, 10], boss: "mammoth" },
  { name: "地底洞穴・火山", levels: [11, 12], boss: "lavadrake" },
  { name: "恐龍巢穴", levels: [13, 14], boss: "queen" },
  { name: "暴龍王座", levels: [15], boss: "trex" },
];
const LEVELS = [
  // ── 第 1 章 史前叢林 ──
  { code: "1-1", ch: 0, old: 1, name: "叢林小徑", bg: "jungle", road: "dirt", tint: null, gold: 300, waves: 6, hpMul: 1.0, tier: 0, weather: "clear",
    path: [[-1, 2], [4, 2], [4, 7], [10, 7], [10, 3], [16, 3]],
    props: [["rock", 7, 5], ["rock", 13, 6], ["amberrock", 1, 8]],
    events: [{ wave: 3, type: "airdrop" }], fossil: "raptorclaw",
    tip: "先用石矛塔守住彎道，點岩石可花金幣敲碎換獎勵。" },
  { code: "1-2", ch: 0, name: "雨林岔路", bg: "jungle", road: "dirt", tint: "rgba(20,60,40,.18)", gold: 320, waves: 6, hpMul: 1.15, tier: 0.4, weather: "rain",
    paths: [[[-1, 5], [4, 5], [4, 1], [11, 1], [11, 4], [16, 4]], [[-1, 5], [4, 5], [4, 8], [11, 8], [11, 4], [16, 4]]],
    props: [["rock", 7, 4], ["amberrock", 14, 8], ["rock", 1, 1]],
    events: [{ wave: 3, type: "airdrop" }], fossil: "raptorclaw",
    tip: "岔路！恐龍會分兩路走，把塔蓋在分岔口和匯合口最划算。下雨時火系變弱、電塔變強。" },
  { code: "1-3", ch: 0, name: "牛角領地", bg: "jungle", road: "dirt", tint: "rgba(60,40,10,.15)", gold: 340, waves: 7, hpMul: 1.3, tier: 0.8, weather: "clear", boss: 900, bossType: "carno",
    paths: [[[-1, 2], [6, 2], [6, 5], [12, 5], [12, 2], [16, 2]], [[-1, 8], [9, 8], [9, 5], [12, 5], [12, 2], [16, 2]]],
    props: [["rock", 3, 5], ["amberrock", 14, 7], ["rock", 8, 0]],
    events: [{ wave: 3, type: "weather", to: "rain" }, { wave: 4, type: "airdrop" }], fossil: "raptorclaw",
    tip: "兩個入口！章節魔王「牛角暴君」會衝鋒，記得在匯合處集中火力。" },
  // ── 第 2 章 迷霧沼澤・海岸 ──
  { code: "2-1", ch: 1, old: 2, name: "迷霧沼澤", bg: "swamp", road: "dirt", tint: "rgba(70,60,30,.28)", gold: 300, waves: 7, hpMul: 1.42, tier: 1.2, weather: "fog",
    path: [[-1, 7], [3, 7], [3, 2], [7, 2], [7, 7], [12, 7], [12, 2], [16, 2]],
    props: [["mud", 5, 2], ["mud", 9, 7], ["mud", 12, 4], ["rock", 1, 4], ["rock", 14, 6]],
    events: [{ wave: 4, type: "pterostorm" }, { wave: 6, type: "airdrop" }], fossil: "pterowing",
    tip: "起霧時射程變短；泥坑會讓地面恐龍變慢，把火力集中在泥坑附近。" },
  { code: "2-2", ch: 1, name: "潮汐海岸", bg: "coast", road: "dirt", tint: null, gold: 330, waves: 7, hpMul: 1.7, tier: 1.6, weather: "clear",
    paths: [[[2, -1], [2, 3], [7, 3], [7, 6], [16, 6]], [[-1, 8], [11, 8], [11, 6], [16, 6]]],
    props: [["rock", 4, 6], ["amberrock", 13, 3], ["rock", 9, 1], ["mud", 5, 8]],
    events: [{ wave: 3, type: "weather", to: "rain" }, { wave: 5, type: "airdrop" }], fossil: "pterowing",
    tip: "上方和左方兩個入口，在右側匯合。海邊的雨會讓電塔更強！" },
  { code: "2-3", ch: 1, name: "巨鱷沼穴", bg: "swamp", road: "dirt", tint: "rgba(30,50,40,.30)", gold: 350, waves: 8, hpMul: 1.62, tier: 2.0, weather: "clear", night: true, boss: 1700, bossType: "croc",
    paths: [[[-1, 1], [4, 1], [4, 7], [13, 7], [13, 10]], [[-1, 1], [4, 1], [10, 1], [10, 4], [13, 4], [13, 7], [13, 10]]],
    props: [["mud", 7, 7], ["mud", 10, 2], ["rock", 7, 4], ["amberrock", 15, 2], ["rock", 1, 5]],
    events: [{ wave: 4, type: "pterostorm" }, { wave: 5, type: "airdrop" }], fossil: "pterowing",
    tip: "夜晚＋岔路：火把塔照亮兩條路。沼澤巨鱷會潛水（無法被攻擊）並回血。" },
  // ── 第 3 章 化石峽谷・天空浮島 ──
  { code: "3-1", ch: 2, old: 3, name: "化石峽谷", bg: "canyon", road: "stone", tint: "rgba(150,70,20,.22)", gold: 330, waves: 8, hpMul: 2.62, tier: 2.9, weather: "clear", night: true,
    path: [[3, -1], [3, 4], [7, 4], [7, 1], [11, 1], [11, 8], [14, 8], [14, 4], [16, 4]],
    props: [["amberrock", 5, 7], ["rock", 9, 3], ["rock", 1, 1], ["amberrock", 13, 1], ["rock", 9, 9]],
    events: [{ wave: 5, type: "rockslide" }, { wave: 7, type: "airdrop" }], fossil: "trikehorn",
    tip: "峽谷之夜：記得蓋火把塔照明。落石事件會砸傷路上的恐龍。" },
  { code: "3-2", ch: 2, name: "天空浮島", bg: "sky", road: "stone", tint: null, gold: 350, waves: 8, hpMul: 2.85, tier: 3.4, weather: "clear",
    paths: [[[-1, 2], [5, 2], [5, 5], [11, 5], [11, 1], [16, 1]], [[-1, 2], [5, 2], [5, 5], [5, 8], [11, 8], [11, 5], [11, 1], [16, 1]]],
    props: [["rock", 8, 7], ["amberrock", 1, 9], ["rock", 14, 4], ["rock", 8, 2]],
    events: [{ wave: 5, type: "pterostorm" }, { wave: 4, type: "airdrop" }], fossil: "trikehorn",
    tip: "浮島上翼龍特別多！路在中央分成一短一長再匯合，石矛塔和電塔可以打飛行。" },
  { code: "3-3", ch: 2, name: "風神之巔", bg: "sky", road: "stone", tint: "rgba(60,80,110,.18)", gold: 400, waves: 8, hpMul: 2.0, tier: 3.2, weather: "clear", boss: 2700, bossType: "quetzal",
    paths: [[[-1, 2], [6, 2], [6, 7], [16, 7]], [[14, -1], [14, 2], [9, 2], [9, 7], [16, 7]]],
    props: [["rock", 3, 5], ["amberrock", 12, 4], ["rock", 7, 0]],
    events: [{ wave: 4, type: "pterostorm" }, { wave: 5, type: "weather", to: "fog" }, { wave: 6, type: "airdrop" }], fossil: "trikehorn",
    tip: "雙入口，第 5 波起霧。章節魔王「風神翼龍」會用狂風吹暈附近的塔，塔要分散蓋。" },
  // ── 第 4 章 冰河時期 ──
  { code: "4-1", ch: 3, old: 4, name: "冰河時期", bg: "ice", road: "stone", tint: "rgba(120,170,230,.30)", gold: 350, waves: 9, hpMul: 4.2, tier: 5.0, weather: "snow",
    path: [[-1, 1], [13, 1], [13, 4], [2, 4], [2, 7], [14, 7], [14, 10]],
    props: [["rock", 8, 9], ["rock", 0, 6], ["amberrock", 15, 5]],
    events: [{ wave: 3, type: "blizzard" }, { wave: 6, type: "blizzard" }, { wave: 5, type: "airdrop" }], fossil: "ankyloclub",
    tip: "暴風雪讓恐龍變慢、冰晶塔更強；寒流來襲時是升級的好時機。" },
  { code: "4-2", ch: 3, name: "冰原雙道", bg: "ice", road: "stone", tint: "rgba(70,100,170,.30)", gold: 380, waves: 10, hpMul: 2.8, tier: 4.0, weather: "snow", night: true, boss: 4800, bossType: "mammoth",
    paths: [[[-1, 6], [4, 6], [4, 2], [9, 2], [9, 8], [16, 8]], [[13, -1], [13, 4], [9, 4], [9, 8], [16, 8]]],
    props: [["rock", 6, 4], ["amberrock", 15, 2], ["rock", 2, 9]],
    events: [{ wave: 4, type: "blizzard" }, { wave: 6, type: "airdrop" }], fossil: "ankyloclub",
    tip: "雪夜雙入口！長毛象王會踩地冰封附近的塔，還會披上冰甲。" },
  // ── 第 5 章 地底洞穴・火山 ──
  { code: "5-1", ch: 4, name: "地底洞穴", bg: "cave", road: "stone", tint: "rgba(20,10,40,.20)", gold: 420, waves: 10, hpMul: 2.75, tier: 4.0, weather: "clear", night: true,
    paths: [[[-1, 4], [3, 4], [3, 1], [12, 1], [12, 4], [16, 4]], [[-1, 4], [3, 4], [3, 8], [8, 8], [8, 6], [12, 6], [12, 4], [16, 4]]],
    props: [["rock", 7, 3], ["amberrock", 14, 7], ["rock", 1, 8], ["amberrock", 6, 6]],
    events: [{ wave: 5, type: "rockslide" }, { wave: 7, type: "airdrop" }], fossil: "spinosail",
    tip: "洞穴一片漆黑：路分成上下兩條再匯合，兩邊都要有火把照明。" },
  { code: "5-2", ch: 4, old: 5, name: "火山地帶", bg: "volcano", road: "stone", tint: "rgba(60,20,10,.35)", gold: 380, waves: 10, hpMul: 4.9, tier: 5.4, weather: "ash", boss: 7600, bossType: "lavadrake",
    path: [[-1, 5], [2, 5], [2, 1], [6, 1], [6, 8], [9, 8], [9, 2], [12, 2], [12, 8], [16, 8]],
    props: [["vent", 4, 4], ["vent", 10, 5], ["vent", 14, 3], ["rock", 0, 8], ["amberrock", 7, 4]],
    events: [{ wave: 6, type: "eruption" }, { wave: 8, type: "airdrop" }], fossil: "spinosail",
    tip: "火山灰讓火系更強；章節魔王「熔岩龍」的龍息會燒暈最近的塔。" },
  // ── 第 6 章 恐龍巢穴 ──
  { code: "6-1", ch: 5, name: "巢穴外圍", bg: "nest", road: "dirt", tint: "rgba(60,70,40,.18)", gold: 400, waves: 10, hpMul: 2.95, tier: 5.2, weather: "rain",
    paths: [[[-1, 1], [6, 1], [6, 5], [16, 5]], [[3, 10], [3, 7], [10, 7], [10, 5], [16, 5]]],
    props: [["egg", 8, 3], ["egg", 13, 8], ["rock", 1, 4], ["amberrock", 14, 2]],
    events: [{ wave: 4, type: "hatch" }, { wave: 5, type: "airdrop" }], fossil: "eggfossil",
    tip: "雨中的巢穴外圍：兩個入口，先點破恐龍蛋！" },
  { code: "6-2", ch: 5, old: 6, name: "恐龍巢穴", bg: "nest", road: "dirt", tint: "rgba(90,60,20,.22)", gold: 420, waves: 10, hpMul: 3.15, tier: 5.6, weather: "clear", night: true, boss: 6800, bossType: "queen",
    path: [[-1, 8], [3, 8], [3, 3], [8, 3], [8, 7], [12, 7], [12, 1], [16, 1]],
    props: [["egg", 5, 5], ["egg", 10, 5], ["egg", 14, 3], ["rock", 1, 1], ["amberrock", 6, 9]],
    events: [{ wave: 4, type: "hatch" }, { wave: 4, type: "weather", to: "rain" }, { wave: 7, type: "hatch" }, { wave: 5, type: "airdrop" }], fossil: "eggfossil",
    tip: "巢穴之夜：迅猛龍女王會召喚迅猛龍群！恐龍蛋會孵化，先點破它。" },
  // ── 終章 暴龍王座 ──
  { code: "7-1", ch: 6, old: 7, name: "暴龍王座", bg: "lair", road: "stone", tint: "rgba(80,10,10,.30)", gold: 420, waves: 12, hpMul: 3.4, late: [10, 1.4], tier: 6.0, weather: "ash", night: true, boss: 15500, bossType: "trex",
    path: [[8, -1], [8, 2], [2, 2], [2, 8], [13, 8], [13, 4], [16, 4]],
    props: [["vent", 5, 5], ["vent", 10, 5], ["rock", 11, 1], ["amberrock", 0, 5], ["rock", 15, 7]],
    events: [{ wave: 5, type: "eruption" }, { wave: 10, type: "meteorshower" }, { wave: 8, type: "airdrop" }], fossil: "trextooth",
    tip: "最終決戰：暴龍王會怒吼震暈附近的塔，分散塔的位置！" },
];
// v2.0（7 關）→ v2.1（16 關）的關卡對應：舊第 n 關 = 新索引 OLD_LEVEL_MAP[n-1]
const OLD_LEVEL_MAP = [0, 3, 6, 9, 12, 14, 15];

// 恐龍出現的關卡（第幾關起）
const UNLOCK_ENEMY = { raptor: 0, trike: 0, ptero: 0, parasaur: 3, ankylo: 3, spino: 6, brachio: 9 };
// 塔解鎖（第幾關起）
const UNLOCK_TOWER = { spear: 0, lava: 0, frost: 0, venom: 3, tesla: 6, amber: 9, torch: 0 };

function makeWave(li, w) { // w 從 0 開始
  const L = LEVELS[li], q = [], last = w === L.waves - 1, tr = L.tier !== undefined ? L.tier : li;
  const has = (t) => UNLOCK_ENEMY[t] <= li;
  const n = 6 + Math.round(w * 1.7 + tr);
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
  if (w % 3 === 2) for (let i = 0; i < 4 + Math.round(tr); i++) q.push({ t: "raptor", gap: 0.35 });
  if (last && L.bossType) q.push({ t: L.bossType, gap: 2.2 }); // 章節魔王只在章節最後一關
  else if (last) for (let i = 0; i < 2 + Math.round(tr / 2); i++) q.push({ t: has("spino") ? "spino" : "trike", gap: 1.1 }); // 一般關卡最後一波：精英群
  return q;
}
