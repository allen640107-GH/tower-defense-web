// 關卡資料：地圖 16×10 格；path 為轉折點（格座標），首尾在地圖外
const LEVELS = [
  { name: "翠綠草原", theme: "meadow", gold: 260, lives: 20, waves: 6, hpMul: 1.0, boss: 700,
    path: [[-1, 2], [4, 2], [4, 7], [10, 7], [10, 3], [16, 3]] },
  { name: "楓紅山谷", theme: "autumn", gold: 280, lives: 20, waves: 7, hpMul: 1.25, boss: 1300,
    path: [[-1, 7], [3, 7], [3, 2], [7, 2], [7, 7], [12, 7], [12, 2], [16, 2]] },
  { name: "黃沙古道", theme: "desert", gold: 300, lives: 20, waves: 8, hpMul: 1.65, boss: 2100,
    path: [[3, -1], [3, 4], [7, 4], [7, 1], [11, 1], [11, 8], [14, 8], [14, 4], [16, 4]] },
  { name: "冰封雪嶺", theme: "snow", gold: 320, lives: 20, waves: 9, hpMul: 1.9, boss: 3200,
    path: [[-1, 1], [13, 1], [13, 4], [2, 4], [2, 7], [14, 7], [14, 10]] },
  { name: "熔岩魔城", theme: "volcano", gold: 350, lives: 20, waves: 10, hpMul: 2.1, boss: 4800,
    path: [[-1, 5], [2, 5], [2, 1], [6, 1], [6, 8], [9, 8], [9, 2], [12, 2], [12, 8], [16, 8]] },
];
// 依關卡與波次產生敵人隊列：[type, 間隔秒]
function makeWave(li, w) {
  const L = LEVELS[li], N = L.waves, q = [];
  const pool = [["grunt", "runner"], ["grunt", "runner", "armor"], ["grunt", "runner", "armor", "flyer"],
    ["grunt", "runner", "armor", "flyer", "healer"], ["grunt", "runner", "armor", "flyer", "healer"]][li];
  const count = 6 + w * 2 + li * 2;
  if (w === N) {
    for (let i = 0; i < 4 + li * 2; i++) q.push([pool[i % pool.length], 0.7]);
    q.push(["boss", 1.6]);
    for (let i = 0; i < 3 + li; i++) q.push([pool[(i + 1) % pool.length], 0.8]);
    return q;
  }
  // 每波主題：前幾波單一種類，之後混合
  const focus = pool[(w - 1) % pool.length];
  for (let i = 0; i < count; i++) {
    const t = (i % 3 === 0 || w <= 2) ? focus : pool[(i * 7 + w) % pool.length];
    q.push([t, t === "runner" ? 0.45 : t === "armor" ? 0.95 : 0.7]);
  }
  return q;
}
