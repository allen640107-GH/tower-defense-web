# 實機模擬測試：python3 tests/play.py URL DEVICE OUTDIR
import asyncio, sys, json, time, os
from playwright.async_api import async_playwright
DEV = {"se": (375, 667, True), "iphone": (390, 844, True), "iphone_land": (844, 390, True),
       "foldcover": (344, 882, True), "foldopen": (884, 1104, True), "pc": (1920, 1080, False)}
URL, D, OUT = sys.argv[1], sys.argv[2], sys.argv[3]; W, H, T = DEV[D]; os.makedirs(OUT, exist_ok=True)
fails = []
def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg, flush=True)
    if not cond: fails.append(msg)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True, args=["--autoplay-policy=no-user-gesture-required"])
        ctx = await b.new_context(viewport={"width": W, "height": H}, has_touch=T, is_mobile=T, device_scale_factor=2 if T else 1)
        pg = await ctx.new_page(); errs = []
        pg.on("console", lambda m: errs.append("console." + m.type + ": " + m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        async def tap_sel(sel):
            if T: await pg.tap(sel)
            else: await pg.click(sel)
            await pg.wait_for_timeout(120)
        async def tap_xy(x, y):
            if T: await pg.touchscreen.tap(x, y)
            else: await pg.mouse.click(x, y)
            await pg.wait_for_timeout(120)
        async def tap_cell(c, r):
            x, y = await pg.evaluate(f"__td.cellCenter({c},{r})"); await tap_xy(x, y)
        G = lambda expr: pg.evaluate("(()=>{const G=__td.G;return " + expr + "})()")
        await pg.goto(URL); await pg.wait_for_timeout(800)
        await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(800)
        await pg.screenshot(path=f"{OUT}/{D}_01_menu.png")
        await tap_sel("#mStart"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{OUT}/{D}_02_select.png")
        check(await pg.evaluate("document.querySelector('#lv2').classList.contains('lock')"), "level 2 locked on fresh save")
        await tap_sel("#lv1"); await pg.wait_for_timeout(500)
        check(await G("G.screen==='play' && G.level===0"), "level 1 started by touch/click")
        # 依道路覆蓋率挑選建塔點
        spots = await pg.evaluate("""(()=>{const ps=new Set(__td.pathSet());const out=[];
          for(let c=0;c<16;c++)for(let r=0;r<10;r++){if(!__td.buildable(c,r))continue;let n=0;
            for(let dc=-3;dc<=3;dc++)for(let dr=-3;dr<=3;dr++){if(dc*dc+dr*dr<=6.8&&ps.has((c+dc)+','+(r+dr)))n++;}out.push([n,c,r]);}
          out.sort((a,b)=>b[0]-a[0]);return out.map(o=>[o[1],o[2]]);})()""")
        used = []
        async def build(kind):
            for c, r in spots:
                if (c, r) in used: continue
                if not await pg.evaluate(f"__td.buildable({c},{r})"): used.append((c, r)); continue
                n0 = await G("G.towers.length")
                await tap_sel(f"#tb_{kind}")
                if not await G(f"G.build==='{kind}'"): await tap_sel(f"#tb_{kind}")
                await tap_cell(c, r); used.append((c, r))
                ok = await G("G.towers.length") == n0 + 1
                if await G("G.build!==null"): await tap_sel(f"#tb_{kind}")  # 取消建造模式
                return (c, r) if ok else None
            return None
        g0 = await G("G.gold")
        a1 = await build("arrow"); check(a1 is not None, f"place arrow tower by tap at {a1}")
        c1 = await build("cannon"); check(c1 is not None, f"place cannon tower at {c1}")
        f1 = await build("frost"); check(f1 is not None, f"place frost tower at {f1}")
        check(await G("G.gold") == g0 - 200, "gold deducted correctly (50+80+70)")
        # 升級
        await tap_cell(*a1); check(await G("G.sel && G.sel.type==='arrow'"), "tap tower opens info panel")
        await pg.screenshot(path=f"{OUT}/{D}_03_info.png")
        await tap_sel("#bUp"); check(await G("G.towers.find(t=>t.type==='arrow').lvl===1"), "upgrade arrow to Lv2 via button")
        # 賣出
        await tap_sel("#bSell"); check(await G("!G.towers.some(t=>t.type==='arrow')"), "sell tower via button")
        gs = await G("G.gold"); check(gs == g0 - 200 - 60 + 77, f"sell refund 70% (gold {gs})")
        a1 = await build("arrow"); check(a1 is not None, "rebuild arrow")
        await tap_sel("#bWave"); check(await G("G.waveOn && G.wave===1"), "start wave 1 via button")
        await tap_sel("#bSpeed"); check(await G("G.speed===2"), "speed x2 toggle")
        await tap_sel("#bPause"); check(await G("G.paused"), "pause")
        await pg.screenshot(path=f"{OUT}/{D}_04_pause.png")
        await tap_sel("#oBtns button"); check(await G("!G.paused"), "resume")
        await pg.wait_for_timeout(2500); await pg.screenshot(path=f"{OUT}/{D}_05_battle.png")
        await pg.evaluate("__td.setDebugSpeed(6)")
        plan = ["arrow", "tesla", "cannon", "arrow", "frost", "tesla", "arrow", "cannon"]; shot_fx = False; t0 = time.time()
        while time.time() - t0 < 420:
            st = await G("({over:G.over,waveOn:G.waveOn,wave:G.wave,waves:G.waves,gold:G.gold,lives:G.lives,n:G.enemies.length,auto:G.auto})")
            if st["over"]: break
            if not st["waveOn"] and st["wave"] < st["waves"]: await tap_sel("#bWave")
            if plan and st["gold"] >= {"arrow": 50, "cannon": 80, "frost": 70, "tesla": 110}[plan[0]] + 10:
                if await build(plan[0]): plan.pop(0)
            elif not plan and st["gold"] >= 130:
                tws = await G("G.towers.filter(t=>t.lvl<2).map(t=>[t.c,t.r])")
                if tws:
                    await tap_cell(*tws[0]); 
                    if await G("G.sel!==null"): await tap_sel("#bUp"); await tap_cell(*tws[0])
            if not shot_fx and st["wave"] >= 3 and st["n"] >= 5:
                await pg.evaluate("__td.setDebugSpeed(1)"); await pg.wait_for_timeout(600)
                await pg.screenshot(path=f"{OUT}/{D}_06_fx.png"); shot_fx = True; await pg.evaluate("__td.setDebugSpeed(6)")
            await pg.wait_for_timeout(700)
        st = await G("({over:G.over,lives:G.lives,wave:G.wave,towers:G.towers.length})")
        await pg.wait_for_timeout(1200)
        win = await pg.evaluate("document.querySelector('#oTitle').textContent")
        await pg.screenshot(path=f"{OUT}/{D}_07_result.png")
        check(win == "勝利！", f"level 1 cleared (result='{win}', lives={st['lives']}, towers={st['towers']}, {round(time.time()-t0)}s)")
        sv = await pg.evaluate("__td.save()")
        check(bool(sv) and sv["unlocked"] >= 2 and sv["stars"].get("0", 0) >= 1, f"save written {json.dumps(sv)}")
        await pg.reload(); await pg.wait_for_timeout(800)
        sv2 = await pg.evaluate("__td.save()"); check(sv2 == sv, "save persists after reload")
        await tap_sel("#mStart"); await pg.wait_for_timeout(300)
        check(not await pg.evaluate("document.querySelector('#lv2').classList.contains('lock')"), "level 2 unlocked in menu after reload")
        await pg.screenshot(path=f"{OUT}/{D}_08_select_after.png")
        await tap_sel("#lv2"); await pg.wait_for_timeout(600); await pg.screenshot(path=f"{OUT}/{D}_09_level2.png")
        check(await G("G.level===1"), "level 2 playable")
        lay = await pg.evaluate("__td.layoutInfo()")
        check(lay["ts"] >= 24, f"tile size {lay['ts']}px (transposed={lay['transposed']})")
        # 版面不可超出視窗
        ov = await pg.evaluate("""[...document.querySelectorAll('#hud,#panel,.tb,#bWave')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return [e.id||e.className,r.left,r.top,r.right,r.bottom]}).filter(a=>a[1]<-1||a[2]<-1||a[3]>innerWidth+1||a[4]>innerHeight+1)""")
        check(not ov, f"no UI overflow {ov}")
        check(not errs, f"no console errors ({len(errs)}) {errs[:5]}")
        await b.close()
    print(f"RESULT {D} fails={len(fails)}")
asyncio.run(main())
