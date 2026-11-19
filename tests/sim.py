# 平衡測試：python3 tests/sim.py URL LEVEL(1-16) [hero] [heroXP] — 以簡單策略自動遊玩（直接呼叫遊戲內函式，不經 UI）
# v2.1：有英雄（預設獵人，站在預設位置不操作）、不使用技能／道具；夜晚關卡會蓋火把塔；塔滿 3 級後會進化
import asyncio, sys, time
from playwright.async_api import async_playwright
URL, LV = sys.argv[1], int(sys.argv[2]); HERO = sys.argv[3] if len(sys.argv) > 3 else 'hunter'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True)
        pg = await b.new_page(viewport={"width": 1280, "height": 720}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(URL)
        await pg.evaluate("localStorage.setItem('dino_save_v1',JSON.stringify({v:5,unlocked:16,muted:true,introSeen:true,hero:'" + HERO + "',items:{potion:0,frostbomb:0,goldbag:0,dynamite:0}}))")
        await pg.reload(); await pg.wait_for_selector("#menu:not(.hidden)", timeout=30000)
        # v2.2：英雄經驗跨關累積 → 依「第一次通關到這一關」的預期經驗設定，天賦自動平均分配
        XP = float(sys.argv[4]) if len(sys.argv) > 4 else None
        await pg.evaluate(f"(()=>{{const r=heroRec('{HERO}');r.xp={'HERO_XP_START[' + str(LV-1) + ']' if XP is None else XP};r.tal={{}};heroRec('{HERO}');autoTalents('{HERO}');writeSave();}})()")
        await pg.evaluate(f"__td.startLevel({LV-1})"); await pg.wait_for_timeout(300)
        await pg.evaluate("""window.__bot=()=>{const G=__td.G,T=__td.TOWERS;const ps=new Set(__td.pathSet());
          const sc=(c,r,R)=>{let n=0;for(let dc=-4;dc<=4;dc++)for(let dr=-4;dr<=4;dr++)if(dc*dc+dr*dr<=R*R&&ps.has((c+dc)+','+(r+dr)))n++;return n};
          let order=['spear','lava','frost','spear','venom','tesla','lava','amber','spear','tesla','frost','amber','venom','lava'].filter(k=>__td.LEVELS&&({spear:0,lava:0,frost:0,venom:3,tesla:6,amber:9})[k]<=G.level);
          if(G.night)order=['torch','spear'].concat(order.slice(1,4),['torch'],order.slice(4,8),['torch'],order.slice(8));
          if(G.towers.length>=14){const ev=G.towers.find(t=>t.lvl>=2&&!t.evo&&__td.EVO[t.type]);if(ev){const k2=(G.towers.indexOf(ev)%2)?'b':'a';if(G.gold>=__td.EVO[ev.type][k2].cost){G.sel=ev;__td.evolveSel(k2);G.sel=null;}if(!G.towers.some(t=>t.lvl<2))return}}
          const k=order[G.towers.length%order.length];const cost=T[k].cost;
          const up=G.towers.filter(t=>t.lvl<2).sort((a,b)=>a.lvl-b.lvl)[0];
          const uc=up?T[up.type].up[up.lvl]:1e9;if(up&&G.towers.length>=6&&(G.towers.length>=14||G.gold>=uc+cost)){if(G.gold>=uc){G.sel=up;__td.upgradeSel();G.sel=null;}return}
          if(G.towers.length>=14)return;
          if(G.gold<cost)return;let best=null;for(let c=0;c<16;c++)for(let r=0;r<10;r++)if(__td.buildable(c,r)){const s=sc(c,r,T[k].range[0]);if(!best||s>best[0])best=[s,c,r]}
          if(best){G.build=k;const [x,y]=__td.cellCenter(best[1],best[2]);cv.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,bubbles:true}));G.build=null;}}""")
        # 機器人在頁面內每 50ms 決策一次（不受測試程式輪詢頻率與主機負載影響太多）
        await pg.evaluate("setInterval(()=>{const G=__td.G;if(G.over)return;__bot();if(!G.waveOn&&G.wave<G.waves)document.getElementById('bWave').click();},50)")
        await pg.evaluate("__td.setDebugSpeed(8)"); t0 = time.time(); trace = []; lastW = -1
        while time.time() - t0 < 400:
            st = await pg.evaluate("(()=>{const G=__td.G;return {over:G.over,lives:G.lives,wave:G.wave,gold:G.gold,tw:G.towers.length,lv:G.towers.map(t=>t.evo?t.evo:t.lvl).join(''),hl:G.hero.lvl,hx:Math.round(G.hero.xp-G.hero.xp0),hd:G.hero.deaths|0,al:G.allies.length,tm:__td.save().st.tamed|0}})()")
            if st["wave"] != lastW: trace.append(f"w{st['wave']}:{st['lives']}"); lastW = st["wave"]
            if st["over"]: break
            await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(1500)
        stars = await pg.evaluate(f"__td.save().stars['{LV-1}']|0")
        print(f"LEVEL {LV}: result={await pg.evaluate('document.querySelector(\"#oTitle\").textContent')} lives={st['lives']} stars={stars} xpGain={st['hx']} wave={st['wave']} towers={st['tw']} lv={st['lv']} hero={HERO} Lv{st['hl']} deaths={st['hd']} allies={st['al']} tamedTotal={st['tm']} {round(time.time()-t0)}s errs={errs[:3]}", flush=True)
        print("TRACE " + " ".join(trace) + f" end:{st['lives']}")
        await b.close()
asyncio.run(main())
