# 實機模擬測試：python3 tests/play.py URL DEVICE OUTDIR [SHOTDIR] — 片頭（播放／跳過）、世界地圖、建塔、升級、賣出、技能、通關第 1 關、存檔、舊存檔遷移
# v2.1：英雄拖曳移動／點選移動、大招、馴服（強制）、進化、天氣、夜晚、魔王登場、分岔路與雙入口關卡、v2.0 存檔遷移
import asyncio, sys, json, time, os
from playwright.async_api import async_playwright
DEV = {"se": (375, 667, True), "iphone": (390, 844, True), "iphone_land": (844, 390, True),
       "foldcover": (344, 882, True), "foldopen": (884, 1104, True), "pc": (1920, 1080, False)}
URL, D, OUT = sys.argv[1], sys.argv[2], sys.argv[3]; W, H, T = DEV[D]; os.makedirs(OUT, exist_ok=True)
SH = sys.argv[4] if len(sys.argv) > 4 else OUT; os.makedirs(SH, exist_ok=True)
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
        counterReqs = []  # 測試不可增加計數器：任何 abacus 請求一律攔下並記錄
        await ctx.route("**/abacus.jasoncameron.dev/**", lambda r: (counterReqs.append(r.request.url), r.abort())[1])
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
        await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.evaluate("localStorage.clear()"); await pg.reload()
        await pg.wait_for_timeout(250); await pg.screenshot(path=f"{OUT}/{D}_00_loading.png")
        await pg.wait_for_selector("#introStart", state="visible", timeout=30000)
        check(await pg.evaluate("__td.imgs()") >= 74, "all images loaded before start screen")
        await pg.screenshot(path=f"{OUT}/{D}_00_start.png")
        qb = await pg.evaluate("(()=>{const e=document.querySelector('#iQuick'),r=e.getBoundingClientRect();return [!e.classList.contains('hidden'),e.textContent,r.height,parseFloat(getComputedStyle(e).fontSize)]})()")
        check(qb[0] and "立刻開始" in qb[1] and qb[2] >= 56 and qb[3] >= 22, f"v2.2 first launch shows big quick-start 1-1 button {qb}")
        await tap_sel("#iPlay"); await pg.wait_for_timeout(300)
        check(await pg.evaluate("!document.querySelector('#iSkip').classList.contains('hidden')"), "skip button visible during intro")
        full = D in ("pc", "iphone")
        if full:  # 完整看完片頭並截取影格
            for t in (2.5, 7, 12, 16.5, 20.5):
                await pg.wait_for_function(f"document.querySelector('#introV').currentTime>={t}", timeout=40000)
                await pg.screenshot(path=f"{OUT}/{D}_intro_{str(t).replace('.','_')}s.png")
            await pg.wait_for_selector("#menu", state="visible", timeout=20000)
            check(True, "intro played to the end and led to the title menu")
        else:
            await pg.wait_for_timeout(3000)
            vt = await pg.evaluate("document.querySelector('#introV').currentTime")
            check(vt > 1.0, f"intro video playing (t={vt:.1f}s)")
            await pg.screenshot(path=f"{OUT}/{D}_intro_3s.png")
            await tap_sel("#iSkip"); await pg.wait_for_timeout(500)
            check(await pg.evaluate("!document.querySelector('#menu').classList.contains('hidden')"), "skip intro -> title menu")
        check(await pg.evaluate("__td.save().introSeen===true"), "intro remembered as seen")
        await pg.wait_for_timeout(1200)
        tv = await pg.evaluate("(()=>{const v=document.querySelector('#titleV');return [v.currentSrc.split('/').pop(), v.paused, v.currentTime]})()")
        check(tv[0].startswith("title_loop") and not tv[1], f"title background video looping {tv}")
        await pg.screenshot(path=f"{OUT}/{D}_01_menu.png")
        await tap_sel("#mStart"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{OUT}/{D}_02_select.png")
        check(await pg.evaluate("document.querySelector('#lv2').classList.contains('lock')"), "level 2 locked on fresh save")
        check(await pg.evaluate("document.querySelectorAll('.wn').length===16 && !!document.querySelector('#wmapImg').naturalWidth"), "world map with 16 level nodes")
        await pg.screenshot(path=f"{SH}/{D}_worldmap.png")
        await tap_sel("#lv1"); await pg.wait_for_timeout(300)
        if not await G("G.screen==='play'"): await tap_sel("#lvGo")
        await pg.wait_for_timeout(500)
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
        a1 = await build("spear"); check(a1 is not None, f"place spear tower by tap at {a1}")
        c1 = await build("lava"); check(c1 is not None, f"place lava tower at {c1}")
        f1 = await build("frost"); check(f1 is not None, f"place frost tower at {f1}")
        check(await G("G.gold") == g0 - 205, "gold deducted correctly (50+85+70)")
        # 升級
        await tap_cell(*a1); check(await G("G.sel && G.sel.type==='spear'"), "tap tower opens info panel")
        await pg.screenshot(path=f"{OUT}/{D}_03_info.png")
        await tap_sel("#bUp"); check(await G("G.towers.find(t=>t.type==='spear').lvl===1"), "upgrade spear to Lv2 via button")
        # 賣出
        await tap_sel("#bSell"); check(await G("!G.towers.some(t=>t.type==='spear')"), "sell tower via button")
        gs = await G("G.gold"); check(gs == g0 - 205 - 60 + 77, f"sell refund 70% (gold {gs})")
        a1 = await build("spear"); check(a1 is not None, "rebuild spear")
        # 技能：隕石（瞄準）與道具：金幣袋
        await tap_sel("#sk_meteor"); check(await G("G.aim==='meteor'"), "meteor skill enters aim mode")
        await tap_xy(*(await pg.evaluate("__td.mapPoint(8,5)"))); check(await G("G.cd.meteor>0"), "meteor cast, cooldown started")
        gb = await G("G.gold"); await tap_sel("#it_goldbag"); check(await G("G.gold") == gb + 150, "gold bag item +150")
        await tap_sel("#bWave"); check(await G("G.waveOn && G.wave===1"), "start wave 1 via button")
        await tap_sel("#bSpeed"); check(await G("G.speed===2"), "speed x2 toggle")
        await tap_sel("#bPause"); check(await G("G.paused"), "pause")
        await pg.screenshot(path=f"{OUT}/{D}_04_pause.png")
        await tap_sel("#oBtns button"); check(await G("!G.paused"), "resume")
        await pg.wait_for_timeout(2500); await pg.screenshot(path=f"{OUT}/{D}_05_battle.png")
        await pg.evaluate("__td.setDebugSpeed(6)")
        plan = ["spear", "lava", "spear", "frost", "lava", "spear", "lava"]; shot_fx = False; t0 = time.time()
        while time.time() - t0 < 420:
            st = await G("({over:G.over,waveOn:G.waveOn,wave:G.wave,waves:G.waves,gold:G.gold,lives:G.lives,n:G.enemies.length,auto:G.auto})")
            if st["over"]: break
            if not st["waveOn"] and st["wave"] < st["waves"]: await tap_sel("#bWave")
            if plan and st["gold"] >= {"spear": 50, "lava": 85, "frost": 70}[plan[0]] + 10:
                if await build(plan[0]): plan.pop(0)
            elif not plan and st["gold"] >= 130:
                tws = await G("G.towers.filter(t=>t.lvl<2).map(t=>[t.c,t.r])")
                if tws:
                    await tap_cell(*tws[0]); 
                    if await G("G.sel!==null && !G.over"):
                        try: await (pg.tap("#bUp", timeout=3000) if T else pg.click("#bUp", timeout=3000))  # 關卡可能剛好結束，面板關閉
                        except Exception: pass
                        if await G("!G.over"): await tap_cell(*tws[0])
            if not shot_fx and st["wave"] >= 3 and st["n"] >= 5:
                await pg.evaluate("__td.setDebugSpeed(1)"); await pg.wait_for_timeout(600)
                await pg.screenshot(path=f"{OUT}/{D}_06_fx.png"); shot_fx = True; await pg.evaluate("__td.setDebugSpeed(6)")
            await pg.wait_for_timeout(700)
        st = await G("({over:G.over,lives:G.lives,wave:G.wave,towers:G.towers.length})")
        await pg.wait_for_timeout(1200)
        win = await pg.evaluate("document.querySelector('#oTitle').textContent")
        await pg.screenshot(path=f"{OUT}/{D}_07_result.png")
        check(win == "防線守住了！", f"level 1 cleared (result='{win}', lives={st['lives']}, towers={st['towers']}, {round(time.time()-t0)}s)")
        hz = await pg.evaluate("(()=>{const s=__td.save();return [s.v, s.heroes.hunter.xp, __td.G.usedSkill, s.stars['0'], __td.G.lives]})()")
        check(hz[0] == 5 and hz[1] > 0 and hz[2] and (hz[3] == 3) == (hz[4] >= 18), f"v2.2 hero XP saved after clear, 3-star needs skill/evo {hz}")
        sv = await pg.evaluate("__td.save()")
        check(bool(sv) and sv["unlocked"] >= 2 and sv["stars"].get("0", 0) >= 1, f"save written {json.dumps(sv)}")
        await pg.reload(); await pg.wait_for_selector("#menu", state="visible", timeout=30000)
        sv2 = await pg.evaluate("__td.save()"); check(sv2 == sv, "save persists after reload (intro skipped automatically)")
        await tap_sel("#mStart"); await pg.wait_for_timeout(300)
        check(not await pg.evaluate("document.querySelector('#lv2').classList.contains('lock')"), "level 2 unlocked in menu after reload")
        await pg.screenshot(path=f"{OUT}/{D}_08_select_after.png")
        await pg.screenshot(path=f"{SH}/{D}_worldmap_progress.png")
        # v2.2：章節分頁／箭頭、章節標籤不裁切
        wt = await pg.evaluate("""(()=>{const m=document.querySelector('#wmap').getBoundingClientRect();const tabs=[...document.querySelectorAll('.wtab')];
          const clip=[...document.querySelectorAll('.wch')].filter(l=>{const r=l.getBoundingClientRect();return r.left<m.left-1||r.right>m.right+1||r.top<m.top-1||r.bottom>m.bottom+1}).map(l=>l.textContent);
          return {n:tabs.length,sel:tabs.findIndex(t=>t.classList.contains('sel')),clip}})()""")
        check(wt["n"] == 7 and wt["sel"] == 0 and not wt["clip"], f"v2.2 world map chapter tabs, labels not clipped {wt}")
        await tap_sel("#wNext"); await pg.wait_for_timeout(500)
        nx = await pg.evaluate("[[...document.querySelectorAll('.wtab')].findIndex(t=>t.classList.contains('sel')), document.querySelector('#wChName').textContent]")
        await pg.screenshot(path=f"{SH}/{D}_worldmap_next.png")
        await tap_sel("#wPrev"); await pg.wait_for_timeout(500)
        pv = await pg.evaluate("[...document.querySelectorAll('.wtab')].findIndex(t=>t.classList.contains('sel'))")
        check(nx[0] == 1 and "第 2 章" in nx[1] and pv == 0, f"chapter arrows switch chapter {nx} back {pv}")
        # v2.2：英雄天賦
        await tap_sel("#bTal"); await pg.wait_for_timeout(300)
        tp = await pg.evaluate("[__td.G.screen, __td.talPoints('hunter')]")
        check(tp[0] == "talents" and tp[1] >= 1, f"talent screen opens with points {tp}")
        await pg.screenshot(path=f"{SH}/{D}_talents.png")
        await tap_sel("#tal_atk"); ta = await pg.evaluate("[__td.save().heroes.hunter.tal.atk, __td.talPoints('hunter')]")
        check(ta[0] == 1 and ta[1] == tp[1] - 1, f"talent point spent and saved {ta}")
        await tap_sel("#talDone"); await pg.wait_for_timeout(300)
        check(await G("G.screen==='select'"), "talent screen closes back to world map")
        await tap_sel("#lv2"); await pg.wait_for_timeout(300)
        if not await G("G.screen==='play'"): await tap_sel("#lvGo")
        await pg.wait_for_timeout(600); await pg.screenshot(path=f"{OUT}/{D}_09_level2.png")
        check(await G("G.level===1 && G.paths.length===2"), "level 1-2 (fork, 2 paths) playable")
        tbs = await pg.evaluate("[...document.querySelectorAll('.tb')].map(b=>b.id.slice(3))")
        check(len(tbs) >= 1 and await pg.evaluate(f"{json.dumps(tbs)}.length===TORDER.filter(k=>towerUnlocked(k)).length"), f"v2.2 locked towers hidden ({tbs})")
        ah = await G("G.hero.lvl"); check(ah >= 2, f"hero level carried over into next level (Lv{ah})")
        await pg.wait_for_timeout(2600); await pg.screenshot(path=f"{SH}/{D}_fork_1-2.png")
        # ---- v2.1：英雄拖曳 ----（v2.2：小螢幕戰場可上下捲動，先讓英雄出現在畫面內，目標挑畫面內的道路格）
        lay0 = await pg.evaluate("__td.layoutInfo()"); tsz = lay0["ts"]
        await pg.evaluate("__td.mapPoint(__td.G.hero.x, __td.G.hero.y)"); await pg.wait_for_timeout(150)
        hx, hy = await G("[G.hero.sx, G.hero.sy]"); hy -= tsz * 0.4
        tgt = await G("(()=>{const v=__td.view(),L=__td.layoutInfo();const ps=__td.pathSet().map(k=>k.split(',').map(Number)).filter(([c,r])=>c>=0&&r>=0&&c<16&&r<10).filter(([c,r])=>{const y=__td.screenOf(c+.5,r+.5)[1];return y>v.top+L.ts&&y<v.bot-L.ts});const h=G.hero;ps.sort((a,b)=>((b[0]-h.x)**2+(b[1]-h.y)**2)-((a[0]-h.x)**2+(a[1]-h.y)**2));return ps[Math.floor(ps.length/3)]})()")
        tx, ty = await pg.evaluate(f"__td.screenOf({tgt[0]}+.5,{tgt[1]}+.5)")
        if T:
            cdp = await ctx.new_cdp_session(pg)
            await cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": hx, "y": hy}]})
            for k in range(1, 9):
                await cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": hx + (tx - hx) * k / 8, "y": hy + (ty - hy) * k / 8}]}); await pg.wait_for_timeout(30)
            await cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        else:
            await pg.mouse.move(hx, hy); await pg.mouse.down()
            for k in range(1, 9): await pg.mouse.move(hx + (tx - hx) * k / 8, hy + (ty - hy) * k / 8); await pg.wait_for_timeout(30)
            await pg.mouse.up()
        await pg.wait_for_timeout(200)
        ht = await G("[G.hero.tx, G.hero.ty]")
        check(abs(ht[0] - (tgt[0] + 0.5)) < 0.6 and abs(ht[1] - (tgt[1] + 0.5)) < 0.6, f"hero drag-move by {'touch' if T else 'mouse'} -> target {ht} (cell {tgt})")
        await pg.wait_for_timeout(1500); await pg.screenshot(path=f"{SH}/{D}_hero_drag.png")
        # 點英雄再點地點
        await pg.evaluate("__td.mapPoint(__td.G.hero.x, __td.G.hero.y)"); await pg.wait_for_timeout(150)
        hx, hy = await G("[G.hero.sx, G.hero.sy]"); await tap_xy(hx, hy - tsz * 0.4)
        check(await G("G.heroSel===true"), "tap hero selects it")
        t2 = await G("(()=>{const ps=__td.pathSet().map(k=>k.split(',').map(Number)).filter(([c,r])=>c>=0&&r>=0&&c<16&&r<10);return ps[0]})()")
        await tap_cell(t2[0], t2[1])
        ht2 = await G("[G.hero.tx, G.hero.ty, G.heroSel]")
        check(abs(ht2[0] - (t2[0] + 0.5)) < 0.6 and abs(ht2[1] - (t2[1] + 0.5)) < 0.6 and not ht2[2], f"tap hero then tap map moves hero {ht2}")
        # 大招（獵人：瞄準）
        await G("(G.hero.ucd=0, true)"); u0 = (await pg.evaluate("__td.save()"))["st"].get("ults", 0)
        await tap_sel("#sk_ult"); check(await G("G.aim==='ult'"), "ultimate button enters aim mode (hunter)")
        ex, ey = await pg.evaluate(f"__td.cellCenter({t2[0]},{t2[1]})"); await tap_xy(ex, ey)
        await pg.wait_for_timeout(250); await pg.screenshot(path=f"{SH}/{D}_hero_ult.png")
        check(await G("G.hero.ucd>0") and (await pg.evaluate("__td.save()"))["st"].get("ults", 0) == u0 + 1, "ultimate cast, cooldown started")
        # 強制馴服
        await pg.evaluate("(()=>{const G=__td.G;G.allies=[];__td.forceTame();const e=__td.spawn('raptor',6,0);__td.damage(e,1e6);})()")
        await pg.wait_for_timeout(300)
        tm = await G("[G.allies.length, G.allies[0]&&G.allies[0].t]")
        check(tm[0] == 1 and tm[1] == "raptor" and (await pg.evaluate("__td.save()"))["tamed"].get("raptor", 0) >= 1, f"forced tame -> ally {tm}, codex count saved")
        await pg.wait_for_timeout(600); await pg.screenshot(path=f"{SH}/{D}_ally.png")
        # 進化
        await pg.evaluate("__td.addGold(2000)")
        ev = await build("spear"); check(ev is not None, f"build spear for evolution at {ev}")
        await tap_cell(*ev)
        for _ in range(2): await tap_sel("#bUp")
        check(await G("G.sel && G.sel.lvl===2") and "進化" in await pg.evaluate("document.querySelector('#bUp').textContent"), "Lv3 tower shows evolve button")
        await tap_sel("#bUp"); check(await pg.evaluate("!!document.querySelector('#evoA') && !!document.querySelector('#evoB')"), "evolution choices shown")
        es = await pg.evaluate("""(()=>{const e=document.querySelector('#evoSheet'),r=e.getBoundingClientRect(),a=document.querySelector('#evoA').getBoundingClientRect(),b=document.querySelector('#evoB').getBoundingClientRect();
          const fs=Math.min(...[...e.querySelectorAll('.evoCard td,.evoCard th')].map(x=>parseFloat(getComputedStyle(x).fontSize)));
          const ov=!(a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1);
          return {vis:!e.classList.contains('hidden'),w:Math.round(r.width),full:r.width>=Math.min(innerWidth-2,880),bottom:Math.abs(r.bottom-innerHeight)<3,inside:r.top>=0&&a.left>=0&&b.right<=innerWidth+1&&a.bottom<=innerHeight+1&&b.bottom<=innerHeight+1,overlap:ov,minFont:fs,rows:e.querySelectorAll('#evoA tr').length}})()""")
        check(es["vis"] and es["full"] and es["bottom"] and es["inside"] and not es["overlap"] and es["minFont"] >= 15 and es["rows"] >= 4, f"v2.2 evolution bottom sheet: full width, no overlap, large text, branch diff rows {es}")
        await pg.screenshot(path=f"{SH}/{D}_evo_choice.png")
        sp0 = await G("G.sel.spent"); await tap_sel("#evoA")
        check(await G(f"(()=>{{const t=G.towers.find(t=>t.c==={ev[0]}&&t.r==={ev[1]});return t&&t.evo==='a'}})()"), "tower evolved to branch A")
        refund = await G(f"Math.floor(G.towers.find(t=>t.c==={ev[0]}&&t.r==={ev[1]}).spent*0.7)")
        check(refund == int((sp0 + 240) * 0.7), f"evolved tower sell value still 70% ({refund})")
        await pg.wait_for_timeout(1200); await pg.screenshot(path=f"{SH}/{D}_evolved.png")
        # 天氣
        await pg.evaluate("__td.setWeather('rain')"); await pg.wait_for_timeout(400)
        check("下雨" in await pg.evaluate("document.querySelector('#wxT').textContent") and await pg.evaluate("!document.querySelector('#wx').classList.contains('hidden')"), "weather chip shows rain")
        await tap_sel("#wx"); check(await pg.evaluate("!document.querySelector('#banner').classList.contains('hidden')"), "tap weather chip shows info")
        await pg.wait_for_timeout(600); await pg.screenshot(path=f"{SH}/{D}_weather_rain.png")
        # 雙入口關卡 + 夜晚 + 新魔王
        await pg.evaluate("__td.startLevel(2)"); await pg.wait_for_timeout(2800)
        check(await G("G.paths.length===2 && (G.paths[0].raw[0]+'')!==(G.paths[1].raw[0]+'')"), "level 1-3 has two entrances")
        await pg.evaluate("__td.setDebugSpeed(2)"); await pg.evaluate("document.getElementById('bWave').click()"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f"{SH}/{D}_two_entrances_1-3.png"); await pg.evaluate("__td.setDebugSpeed(0)")
        await pg.evaluate("__td.startLevel(5)"); await pg.wait_for_timeout(2800)
        check(await G("G.night===true") and "夜晚" in await pg.evaluate("document.querySelector('#wxT').textContent"), "night level 2-3 (night chip)")
        await pg.evaluate("(()=>{const G=__td.G;G.gold=5000;})()")
        await build("torch"); await build("spear")
        await pg.evaluate("__td.spawn('croc',3,0)"); await pg.wait_for_timeout(700)
        check("沼澤巨鱷" in await pg.evaluate("document.querySelector('#banner').textContent"), "boss entrance name banner (沼澤巨鱷)")
        await pg.screenshot(path=f"{SH}/{D}_boss_croc_night.png")
        await pg.wait_for_timeout(1500); await pg.screenshot(path=f"{SH}/{D}_night.png")
        # 白天魔王關：風神翼龍、牛角暴君登場
        for li, bt, nm in ((8, "quetzal", "風神翼龍"), (2, "carno", "牛角暴君")):
            await pg.evaluate(f"__td.startLevel({li})"); await pg.wait_for_timeout(2700)
            await pg.evaluate(f"__td.spawn('{bt}',4,0)"); await pg.wait_for_timeout(900)
            check(nm in await pg.evaluate("document.querySelector('#banner').textContent"), f"boss entrance banner ({nm})")
            await pg.screenshot(path=f"{SH}/{D}_boss_{bt}.png")
        await pg.evaluate("__td.startLevel(5)"); await pg.wait_for_timeout(300); await pg.evaluate("(()=>{const G=__td.G;G.gold=5000;})()"); await build("torch")
        lit = await G("(()=>{computeLights();return [isLit(-5,-5), G.towers.length>0 && isLit(G.towers[0].c+0.5,G.towers[0].r+0.5)]})()")
        check(lit == [False, True], f"night lighting: dark outside, lit at towers {lit}")
        lay = await pg.evaluate("__td.layoutInfo()")
        check(lay["ts"] >= 24, f"tile size {lay['ts']}px (transposed={lay['transposed']})")
        # 版面不可超出視窗
        ov = await pg.evaluate("""[...document.querySelectorAll('#hud,#panel,.tb,#bWave')].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return [e.id||e.className,r.left,r.top,r.right,r.bottom]}).filter(a=>a[1]<-1||a[2]<-1||a[3]>innerWidth+1||a[4]>innerHeight+1)""")
        check(not ov, f"no UI overflow {ov}")
        # 舊版存檔 tdw_save_v1 相容：可讀取、遷移、不刪除舊鍵
        # v2.2：v2.1 存檔（v:4）→ v5：星數、進度、物品保留，英雄依進度補發經驗
        await pg.evaluate("__td.G.paused=true")  # 關卡中切走分頁會暫停並存英雄經驗；先暫停，避免重新整理時覆寫測試用存檔
        await pg.evaluate("localStorage.setItem('dino_save_v1',JSON.stringify({v:4,unlocked:9,stars:{0:3,1:3,2:2,3:3,4:1,5:2,6:3,7:1},muted:false,introSeen:true,hero:'tamer',tamed:{raptor:2},seen:{raptor:true},kills:{raptor:30},fossils:{raptorclaw:true},ach:{win1:true},items:{potion:1,frostbomb:2,goldbag:0,dynamite:1},st:{kills:300,built:50,meteors:9,rocks:2,eggs:1,bosses:2,ults:7},legacy7:null}))")
        await pg.reload(); await pg.wait_for_selector("#menu", state="visible", timeout=30000)
        m3 = await pg.evaluate("(()=>{const s=__td.save();return {v:s.v,u:s.unlocked,st:s.stars,hero:s.hero,tamed:s.tamed,items:s.items,ults:s.st.ults,hx:s.heroes.hunter.xp,tx:s.heroes.tamer.xp,tal:s.heroes.tamer.tal,mig:s.migratedV22,exp:__td.HERO_XP_START[8]}})()")
        check(m3["v"] == 5 and m3["u"] == 9 and m3["st"] == {"0": 3, "1": 3, "2": 2, "3": 3, "4": 1, "5": 2, "6": 3, "7": 1} and m3["hero"] == "tamer" and m3["tamed"] == {"raptor": 2}
              and m3["items"]["frostbomb"] == 2 and m3["ults"] == 7 and m3["hx"] == m3["exp"] and m3["tx"] == m3["exp"] and m3["tal"] == {"atk": 0, "hp": 0, "ult": 0} and m3["mig"], f"v2.1 save migrated to v2.2, hero XP granted {m3}")
        await tap_sel("#mStart"); await pg.wait_for_timeout(600)
        sc = await pg.evaluate("""(()=>{const w=document.querySelector('#world').getBoundingClientRect(),n=document.querySelector('#lv9').getBoundingClientRect();return [n.left>=w.left-1&&n.right<=w.right+1&&n.top>=w.top-1&&n.bottom<=w.bottom+1,[...document.querySelectorAll('.wtab')].findIndex(t=>t.classList.contains('sel'))]})()""")
        check(sc[0] and sc[1] == 2, f"world map auto-scrolls to current progress (3-3 in view, chapter 3 tab) {sc}")
        await pg.screenshot(path=f"{SH}/{D}_worldmap_autoscroll.png")
        await pg.reload(); await pg.wait_for_selector("#menu", state="visible", timeout=30000)
        check(await pg.evaluate("__td.save().heroes.tamer.xp") == m3["exp"], "v2.2 migration one-time (XP not re-granted)")
        # v2.0 恐龍防線存檔（7 關）→ v2.1（16 關）：通關進度與星數依對應表保留
        await pg.evaluate("localStorage.setItem('tdw_save_v1',JSON.stringify({unlocked:2,stars:{0:1}}));localStorage.setItem('dino_save_v1',JSON.stringify({v:2,unlocked:5,stars:{0:3,1:3,2:2,3:1},muted:true,introSeen:true,seen:{raptor:true},kills:{raptor:5,trex:1},fossils:{raptorclaw:true},ach:{win1:true},items:{potion:2,frostbomb:0,goldbag:1,dynamite:3},st:{kills:40,built:9,meteors:2,rocks:1,eggs:0,bosses:1}}))")
        await pg.reload(); await pg.wait_for_selector("#menu", state="visible", timeout=30000)
        m2 = await pg.evaluate("(()=>{const s=__td.save();return {u:s.unlocked,st:s.stars,v:s.v,hero:s.hero,tamed:s.tamed,kills:s.kills,fos:s.fossils,ach:s.ach,items:s.items,leg:s.legacy7,old:!!localStorage.getItem('tdw_save_v1')}})()")
        check(m2["u"] == 13 and m2["st"] == {"0": 3, "3": 3, "6": 2, "9": 1} and m2["v"] == 5 and m2["hero"] == "hunter" and m2["tamed"] == {} and m2["kills"].get("raptor") == 5
              and m2["fos"].get("raptorclaw") and m2["ach"].get("win1") and m2["items"]["dynamite"] == 3 and m2["leg"]["unlocked"] == 5 and m2["old"], f"v2.0 save migrated to 16 levels, nothing lost {m2}")
        await tap_sel("#mStart"); await pg.wait_for_timeout(500)
        check(await pg.evaluate("!document.querySelector('#lv13').classList.contains('lock') && document.querySelector('#lv14').classList.contains('lock')"), "migrated progress shown on world map (5-2 open, 6-1 locked)")
        await pg.screenshot(path=f"{SH}/{D}_worldmap_migrated.png")
        await pg.reload(); await pg.wait_for_selector("#menu", state="visible", timeout=30000)
        check(await pg.evaluate("__td.save().unlocked===13 && __td.save().stars['3']===3"), "migration is one-time (stable after reload)")
        # 舊版「守護之塔」tdw_save_v1 相容：可讀取、遷移、不刪除舊鍵
        await pg.evaluate("localStorage.removeItem('dino_save_v1');localStorage.setItem('tdw_save_v1',JSON.stringify({unlocked:3,stars:{0:3,1:2},muted:false}))")
        await pg.reload(); await pg.wait_for_selector("#introStart", state="visible", timeout=30000)
        mg = await pg.evaluate("[__td.save().unlocked, __td.save().stars, !!localStorage.getItem('tdw_save_v1'), !!localStorage.getItem('dino_save_v1')]")
        check(mg[0] == 7 and mg[1] == {"0": 3, "3": 2} and mg[2] and mg[3], f"old tdw_save_v1 migrated (via 7→16 map), old key kept {mg}")
        await pg.evaluate("localStorage.setItem('tdw_save_v1','{broken json')"); await pg.evaluate("localStorage.removeItem('dino_save_v1')")
        await pg.reload(); await pg.wait_for_selector("#introStart", state="visible", timeout=30000)
        check(await pg.evaluate("__td.save().unlocked===1 && localStorage.getItem('tdw_save_v1')==='{broken json'"), "corrupt old save does not crash and is not deleted")
        check(not counterReqs, f"play test never hits the counter ({len(counterReqs)}) {counterReqs[:3]}")
        check(await pg.evaluate("!!window.DinoCounter && window.DinoCounter.skip()"), "counter skips test env (webdriver/127.0.0.1)")
        check(not errs, f"no console errors ({len(errs)}) {errs[:5]}")
        await b.close()
    print(f"RESULT {D} fails={len(fails)}")
asyncio.run(main())
