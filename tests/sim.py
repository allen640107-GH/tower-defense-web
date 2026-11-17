# 平衡測試：python3 tests/sim.py URL LEVEL(1-7) — 以簡單策略自動遊玩（直接呼叫遊戲內函式，不經 UI）
import asyncio, sys, time
from playwright.async_api import async_playwright
URL, LV = sys.argv[1], int(sys.argv[2])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True)
        pg = await b.new_page(viewport={"width": 1280, "height": 720}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(URL)
        await pg.evaluate("localStorage.setItem('dino_save_v1',JSON.stringify({unlocked:7,muted:true,introSeen:true,items:{potion:0,frostbomb:0,goldbag:0,dynamite:0}}))")
        await pg.reload(); await pg.wait_for_selector("#menu:not(.hidden)", timeout=30000)
        await pg.evaluate(f"__td.startLevel({LV-1})"); await pg.wait_for_timeout(300)
        await pg.evaluate("""window.__bot=()=>{const G=__td.G,T=__td.TOWERS;const ps=new Set(__td.pathSet());
          const sc=(c,r,R)=>{let n=0;for(let dc=-4;dc<=4;dc++)for(let dr=-4;dr<=4;dr++)if(dc*dc+dr*dr<=R*R&&ps.has((c+dc)+','+(r+dr)))n++;return n};
          let order=['spear','lava','frost','spear','venom','tesla','lava','amber','spear','tesla','frost','amber','venom','lava'].filter(k=>__td.LEVELS&&({spear:0,lava:0,frost:0,venom:1,tesla:2,amber:3})[k]<=G.level);
          const k=order[G.towers.length%order.length];const cost=T[k].cost;
          const up=G.towers.filter(t=>t.lvl<2).sort((a,b)=>a.lvl-b.lvl)[0];
          const uc=up?T[up.type].up[up.lvl]:1e9;if(up&&G.towers.length>=6&&(G.towers.length>=14||G.gold>=uc+cost)){if(G.gold>=uc){G.sel=up;__td.upgradeSel();G.sel=null;}return}
          if(G.gold<cost)return;let best=null;for(let c=0;c<16;c++)for(let r=0;r<10;r++)if(__td.buildable(c,r)){const s=sc(c,r,T[k].range[0]);if(!best||s>best[0])best=[s,c,r]}
          if(best){G.build=k;const [x,y]=__td.cellCenter(best[1],best[2]);cv.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,bubbles:true}));G.build=null;}}""")
        await pg.evaluate("__td.setDebugSpeed(8)"); t0 = time.time()
        while time.time() - t0 < 400:
            st = await pg.evaluate("(()=>{const G=__td.G;__bot();if(!G.waveOn&&G.wave<G.waves&&!G.over)document.getElementById('bWave').click();return {over:G.over,lives:G.lives,wave:G.wave,gold:G.gold,tw:G.towers.length,lv:G.towers.map(t=>t.lvl).join('')}})()")
            if st["over"]: break
            await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(1500)
        print(f"LEVEL {LV}: result={await pg.evaluate('document.querySelector(\"#oTitle\").textContent')} lives={st['lives']} wave={st['wave']} towers={st['tw']} lv={st['lv']} {round(time.time()-t0)}s errs={errs[:3]}", flush=True)
        await b.close()
asyncio.run(main())
