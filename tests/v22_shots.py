# v2.2 驗收截圖：python3 tests/v22_shots.py URL OUTDIR — 六項改動 × 手機／Fold／PC
import asyncio, sys, os
from playwright.async_api import async_playwright
URL, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
DEV = {"se": (375, 667, True), "iphone": (390, 844, True), "foldcover": (344, 882, True), "foldopen": (884, 1104, True), "pc": (1920, 1080, False)}
SAVE = "{v:4,unlocked:9,stars:{0:3,1:3,2:2,3:3,4:1,5:2,6:3,7:1},introSeen:true,hero:'tamer',items:{potion:1,frostbomb:1,goldbag:1,dynamite:1}}"
async def shoot(p, D):
    W, H, T = DEV[D]; errs = []
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True, args=["--autoplay-policy=no-user-gesture-required"])
    ctx = await b.new_context(viewport={"width": W, "height": H}, has_touch=T, is_mobile=T, device_scale_factor=2 if T else 1)
    await ctx.route("**/abacus.jasoncameron.dev/**", lambda r: r.abort())
    pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    tap = (lambda s: pg.tap(s)) if T else (lambda s: pg.click(s))
    # 1 立刻開始
    await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.reload()
    await pg.wait_for_selector("#introStart", state="visible", timeout=30000); await pg.wait_for_timeout(400)
    await pg.screenshot(path=f"{OUT}/1_quickstart_{D}.png")
    # 4 世界地圖（v2.1 存檔轉換後自動捲到 3-3，章節分頁）
    await pg.evaluate(f"localStorage.setItem('dino_save_v1',JSON.stringify({SAVE}))"); await pg.reload()
    await pg.wait_for_selector("#menu", state="visible", timeout=30000); await tap("#mStart"); await pg.wait_for_timeout(700)
    await pg.screenshot(path=f"{OUT}/4_worldmap_{D}.png")
    # 5 英雄天賦
    await tap("#bTal"); await pg.wait_for_timeout(300); await tap("#tal_atk"); await tap("#tal_ult"); await pg.wait_for_timeout(200)
    await pg.screenshot(path=f"{OUT}/5_talents_{D}.png")
    await tap("#talDone"); await pg.wait_for_timeout(300)
    # 6 魔王提示 + 小螢幕放大 + 友軍
    await pg.evaluate("__td.startLevel(2)"); await pg.wait_for_timeout(2600)
    await pg.evaluate("(()=>{const G=__td.G;G.allies=[];__td.forceTame();const e=__td.spawn('raptor',5,0);__td.damage(e,1e6);__td.spawn('carno',3,0);})()")
    await pg.wait_for_timeout(500); await pg.evaluate("__td.setWeather('rain')"); await pg.wait_for_timeout(500)
    await pg.screenshot(path=f"{OUT}/6_boss_notices_{D}.png")
    # 3 進化面板
    await pg.evaluate("(()=>{const G=__td.G;G.gold=5000;G.enemies.length=0;})()")
    for c in range(16):
        for r in range(10):
            if await pg.evaluate("__td.G.towers.length") == 0 and await pg.evaluate(f"__td.buildable({c},{r})"):
                await tap("#tb_spear"); x, y = await pg.evaluate(f"__td.cellCenter({c},{r})")
                if T: await pg.touchscreen.tap(x, y)
                else: await pg.mouse.click(x, y)
                await pg.wait_for_timeout(100)
    await pg.evaluate("(()=>{const G=__td.G;G.build=null;G.sel=null;G.towers[0].lvl=2})()")
    c, r = await pg.evaluate("[__td.G.towers[0].c,__td.G.towers[0].r]"); x, y = await pg.evaluate(f"__td.cellCenter({c},{r})")
    if T: await pg.touchscreen.tap(x, y)
    else: await pg.mouse.click(x, y)
    await pg.wait_for_timeout(200); await tap("#bUp"); await pg.wait_for_timeout(400)
    await pg.screenshot(path=f"{OUT}/3_evolution_{D}.png")
    # 2 三星條件提示（終章，沒用技能／進化 → 2 星並提示）
    await pg.evaluate("(()=>{__td.startLevel(15);const G=__td.G;G.lives=20;G.usedSkill=false;G.usedEvo=false;G.wave=G.waves;endLevel(true);})()")
    await pg.wait_for_timeout(1500); await pg.screenshot(path=f"{OUT}/2_stars_{D}.png")
    print(D, "errs", errs); await b.close()
async def main():
    async with async_playwright() as p:
        for D in DEV: await shoot(p, D)
asyncio.run(main())
