# 恐龍防線 製作名單與素材授權（CREDITS）

## 製作人／遊戲企劃：Allen Ho

## 美術與影片
- 所有場景地圖、恐龍、防禦塔（6 種 × 3 級）、道具與技能圖示、子彈與特效、介面圖示、石板材質、主選單背景、**片頭影片**（4 個鏡頭剪接）與**標題循環影片**，皆以 **Grok Imagine（xAI）** 生成（GenerateImage / GenerateVideo）。
- **v2.1 新增**（同樣以 Grok Imagine 生成，原始檔在 `art/src/`）：英雄「原始人獵人・岩牙」「馴龍師・翠拉」（hero_hunter.jpg、hero_tamer.jpg）、12 種進化塔（evo_*.jpg，每張左 a 右 b）、火把塔 3 級（tower_torch.jpg）、6 隻新魔王（boss_carno / croc / quetzal / mammoth / lavadrake / queen.jpg）、天氣與 HUD 圖示（sheet_weather.jpg）、英雄與進化子彈／特效（sheet_fx2.jpg）、霧氣材質（fog_tex.jpg），以及新場景地圖 海岸／天空浮島／地底洞穴（terrain_coast / sky / cave.jpg）與章節世界地圖（worldmap.jpg）。友軍沿用原恐龍圖並加綠色光環與收服圖示。
- 原始生成檔保存在 `art/src/`（圖片）與 `art/src/video/`（影片原始鏡頭）；`art/tools/process_art.py` 負責去背（色鍵）、裁切、壓縮成 `img/*.webp`。
- 標題文字為真實字型疊加，不是 AI 生成文字：**Noto Serif CJK TC Bold**（Google / Adobe，SIL Open Font License 1.1，https://github.com/notofonts/noto-cjk），以 fonttools 子集化為 `fonts/title.woff2`。

## 背景音樂（Kevin MacLeod，CC BY 4.0，需標示）
授權說明：https://incompetech.com/music/royalty-free/faq.html ・ 授權條款：https://creativecommons.org/licenses/by/4.0/
經 ffmpeg loudnorm（-18 LUFS）平衡音量並轉成 96 kbps MP3；片頭版本裁切為 24 秒並淡出。

| 用途 | 檔案 | 曲名 | 來源 |
|---|---|---|---|
| 片頭 | video/intro.mp4（音軌）、audio/music/intro.mp3 | Strength of the Titans | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Strength%20of%20the%20Titans.mp3 |
| 主選單 | audio/music/menu.mp3 | Five Armies | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Five%20Armies.mp3 |
| 一般關卡 A | audio/music/level1.mp3 | Cretaceous Dawn | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cretaceous%20Dawn.mp3 |
| 一般關卡 B | audio/music/level2.mp3 | Dentaneosuchus Hunt | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Dentaneosuchus%20Hunt.mp3 |
| 魔王戰 | audio/music/boss.mp3 | Undaunted | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Undaunted.mp3 |
| 勝利 | audio/music/win.mp3 | The Curtain Rises | https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20Curtain%20Rises.mp3 |
| 失敗 | audio/music/lose.mp3 | The Reveal | https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20Reveal.mp3 |

**標示文字（遊戲內「製作名單」畫面亦顯示）：**
```
"Strength of the Titans", "Five Armies", "Cretaceous Dawn", "Dentaneosuchus Hunt",
"Undaunted", "The Curtain Rises", "The Reveal"
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```

## 音效（全部 CC0 1.0 公眾領域，免標示；仍列出以示感謝）
授權條款：https://creativecommons.org/publicdomain/zero/1.0/ ・ 由 `art/tools/build_audio.py` 裁切、混音、峰值正規化並分類調整音量，輸出單聲道 96 kbps MP3。

| 遊戲檔（audio/sfx/） | 原始素材 | 作者 / 來源 | 授權 |
|---|---|---|---|
| click, back, deny | interface-sounds: click_002, back_002, error_004 | Kenney — https://kenney.nl/assets/interface-sounds | CC0 |
| build | impact-sounds: impactWood_heavy_001 + impactPlank_medium_002 | Kenney — https://kenney.nl/assets/impact-sounds | CC0 |
| upgrade | interface-sounds: maximize_006 + magical_2 | Kenney；JaggedStone — https://opengameart.org/content/magic-spell-sfx | CC0 |
| sell, coin | rpg-audio: handleCoins, handleCoins2 | Kenney — https://kenney.nl/assets/rpg-audio | CC0 |
| spear | swish-7 | artisticdude — https://opengameart.org/content/swishes-sound-pack | CC0 |
| spearhit, hit, leak, rock | impactPunch_medium_001, impactSoft_medium_001, impactPlate_heavy_002, impactMining_002/004 | Kenney — https://kenney.nl/assets/impact-sounds | CC0 |
| lava | swish-9 + sci-fi thrusterFire_001 | artisticdude；Kenney — https://kenney.nl/assets/sci-fi-sounds | CC0 |
| boom, meteor, erupt | sci-fi explosionCrunch_000/002, lowFrequency_explosion_000/001, thrusterFire_002/004 | Kenney — https://kenney.nl/assets/sci-fi-sounds | CC0 |
| frost | freeze.wav | artisticdude — https://opengameart.org/content/freeze-spell-0 | CC0 |
| shatter | IceShatters/LedasLuzta.ogg | IgnasD — https://opengameart.org/content/ice-breakingshattering | CC0 |
| zap, venom, amber | sci-fi forceField_001, slime_000, laserLarge_001 | Kenney — https://kenney.nl/assets/sci-fi-sounds | CC0 |
| roar1, roar2, die1–3 | roar_04, roar_02, die_01/03/04 | rubberduck — https://opengameart.org/content/80-cc0-creature-sfx 、 https://opengameart.org/content/80-cc0-creture-sfx-2 | CC0 |
| roar3 | small_dino_raspy_calls | CaveboyTup — https://opengameart.org/content/small-dino-raspy-calls | CC0 |
| boss, bossdie | t-rex_calls（4.16–7.8 秒、36.6–39.8 秒）＋ lowFrequency_explosion_000 | CaveboyTup — https://opengameart.org/content/t-rex-calls ；Kenney | CC0 |
| trap, airdrop | rpg-audio chop + impactWood_medium_002；interface maximize_008 + impactWood_heavy_003 | Kenney | CC0 |
| item, heal, achieve | magical_1, magical_6, magical_4 + interface confirmation_002 | JaggedStone；Kenney | CC0 |
| wave | impactSoft_heavy_000/002/004（部落鼓三連擊）+ roar_02 | Kenney；rubberduck | CC0 |

### v2.1 新增音效（全部 CC0 1.0）
| 遊戲檔（audio/sfx/） | 原始素材 | 作者 / 來源 | 授權 |
|---|---|---|---|
| hero_atk, hero_whip | swish-3 + impactPunch_heavy_001；swish-12 + rpg-audio knifeSlice2 | artisticdude；Kenney | CC0 |
| ult_hunter | swish-1/5/8 + impactPunch_heavy_002 + impactWood_heavy_004 + human_03 | artisticdude；Kenney；rubberduck | CC0 |
| ult_tamer | roar_05 + impactSoft_heavy_000/001/003 + small_dino_raspy_calls | rubberduck；Kenney；CaveboyTup | CC0 |
| hero_die, revive | human_06；magical_7 | rubberduck；JaggedStone | CC0 |
| tame, evolve | cute_03 + magical_3；magical_5 + maximize_006 + impactMining_003 | rubberduck；JaggedStone；Kenney | CC0 |
| torch | sci-fi thrusterFire_000 | Kenney | CC0 |
| b_carno, b_croc, b_quetzal, b_lavadrake, b_queen（魔王登場） | monster_03 / monster_12 + slime_03 / scream_01 + swish-10 / monster_16 + thrusterFire_004 / scream_02 + small_dino_raspy_calls（另混 lowFrequency_explosion_000） | rubberduck；artisticdude；Kenney；CaveboyTup | CC0 |
| b_mammoth（魔王登場） | monster_roar.wav + howl | trazzz123 — https://opengameart.org/content/cc0-deep-monster-roar ；rubberduck | CC0 |
| sk_charge, sk_submerge, sk_gust, sk_stomp, sk_fire, sk_summon（魔王技能） | stomp_01 + impactSoft_heavy；slime_06 + slime_001；swish-13/11；lowFrequency_explosion_001 + LedasLuzta；thrusterFire_003 + explosionCrunch_001；attack_02 + small_dino_raspy_calls | rubberduck；Kenney；artisticdude；IgnasD；CaveboyTup | CC0 |
| amb_rain（雨聲循環） | Rain (loopable) — rain/1.mp3 | Ylmir — https://opengameart.org/content/rain-loopable | CC0 |
| amb_wind（暴風雪風聲循環） | Winter Wind — winter-wind.mp3 | wipics — https://opengameart.org/content/winter-wind | CC0 |

片頭影片的音軌 = Strength of the Titans（CC BY 4.0）＋ 上表的 boss 吼叫音效（CC0）。
