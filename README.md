# 守護之塔 Tower Defense（網頁版）

**直接玩：** https://allen640107-gh.github.io/tower-defense-web/

純 HTML5 Canvas + JavaScript，不需要建置工具、沒有外部素材：所有圖形都用 Canvas 向量即時繪製，音效用 WebAudio 程式合成。

## 特色
- 手機直向／橫向、Android Fold（摺疊與展開）、平板、電腦都能玩；地圖會依螢幕比例自動轉向。
- 觸控友善：用 Pointer Events，禁止雙擊縮放與頁面捲動，按鈕至少約 46px。
- 主選單、5 關（地圖與路線各不相同、難度遞增）、勝敗畫面、星數評價。
- 4 種塔（各 3 級，可升級／賣出退 70%）：
  - **箭塔**：射速快，可打空中
  - **砲塔**：範圍爆炸，打不到飛行敵人
  - **冰塔**：緩速並造成小範圍傷害
  - **雷塔**：連鎖閃電
- 5 種敵人＋魔王：步兵、疾風狼（快）、重甲兵（減傷）、夜蝠（飛行）、祭司（治療同伴）、魔王（每關最終波）。
- 暫停、×2 加速、靜音開關；進度（解鎖、星數、靜音）存在 `localStorage`（鍵名 `tdw_save_v1`）。
- 鍵盤：1–4 選塔、空白鍵暫停、Esc 取消。

## 檔案
- `index.html`、`css/style.css`
- `js/game.js`：遊戲主程式（狀態、戰鬥、繪圖、介面）
- `js/levels.js`：關卡地圖與波次產生
- `js/audio.js`：WebAudio 合成音效
- `tests/play.py`：Playwright 實機模擬測試（觸控／滑鼠放塔、升級、賣出、自動打完第 1 關、存檔驗證）
- `tests/sim.py`：各關平衡模擬

## 本機執行
```bash
python3 -m http.server 8000   # 然後打開 http://localhost:8000/
```
