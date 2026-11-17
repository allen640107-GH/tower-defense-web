# 恐龍防線 Dino Defense

手機（直向／橫向）與電腦都能玩的恐龍世界塔防網頁遊戲。線上試玩：https://allen640107-gh.github.io/tower-defense-web/

- 7 關：史前叢林、迷霧沼澤、化石峽谷、冰河時期、火山地帶、恐龍巢穴、暴龍王座
- 6 種塔（各 3 級，可升級／賣出 70%）：石矛塔、火山投石、冰晶塔、毒液花、特斯拉電塔、琥珀晶塔
- 8 種恐龍：迅猛龍、三角龍、甲龍、翼龍、副櫛龍、棘龍、腕龍，魔王暴龍王
- 主動技能（冷卻）：隕石、尖刺陷阱、空投補給；道具：草藥、冰凍炸彈、金幣袋、炸藥
- 環境互動：可敲碎岩石／琥珀岩、沼澤泥坑減速、火山噴氣口、恐龍蛋孵化；關卡事件：空投、翼龍群、落石、寒流、火山爆發、孵化、流星雨
- 恐龍圖鑑、10 種化石、12 項成就；存檔在 localStorage（`dino_save_v1`，會讀取並遷移舊版 `tdw_save_v1`，舊鍵保留不刪）
- 片頭動畫（可跳過、看過會記住、主選單可「重看片頭」）、會動的標題背景

## 美術與音訊
- 所有圖像與影片以 Grok Imagine 生成，原圖在 `art/src/`（不會被網頁載入），處理工具 `art/tools/process_art.py`（去背、裁切、壓成 `img/*.webp`）。
- 音樂與音效全部是免費可商用授權（CC BY 4.0 / CC0），建置工具 `art/tools/build_audio.py`。完整來源與授權見 [CREDITS.md](CREDITS.md)。

## 開發
純 HTML/CSS/JS，無建置步驟：`python3 -m http.server` 後開啟 `index.html`。
- `js/levels.js` 關卡資料、`js/game.js` 遊戲主程式、`js/audio.js` 音訊、`js/credits.js` 製作名單
- 測試（需 playwright）：`tests/play.py URL DEVICE OUT`（六種尺寸實機流程）、`tests/sim.py URL LEVEL`（平衡）、`tests/levels_shots.py URL OUT`（每關截圖）
