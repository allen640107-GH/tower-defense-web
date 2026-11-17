# 每關場景截圖：python3 tests/levels_shots.py URL OUTDIR
import asyncio, sys, os
from playwright.async_api import async_playwright
URL, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True)
        for name, w, h, t in [("pc", 1920, 1080, False), ("iphone", 390, 844, True)]:
            ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=t, is_mobile=t, device_scale_factor=2 if t else 1)
            pg = await ctx.new_page(); errs = []
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: errs.append(str(e)))
            await pg.goto(URL)
            await pg.evaluate("localStorage.setItem('dino_save_v1',JSON.stringify({unlocked:7,muted:true,introSeen:true}))")
            await pg.reload(); await pg.wait_for_selector("#menu", state="visible", timeout=30000)
            for li in range(7):
                await pg.evaluate(f"__td.startLevel({li})"); await pg.wait_for_timeout(300)
                await pg.evaluate("""(()=>{const G=__td.G,T=['spear','lava','frost','venom','tesla','amber'].filter(k=>({spear:0,lava:0,frost:0,venom:1,tesla:2,amber:3})[k]<=G.level);
                  __td.addGold(3000);const ps=new Set(__td.pathSet());let n=0;
                  const cells=[];for(let c=0;c<16;c++)for(let r=0;r<10;r++)if(__td.buildable(c,r)){let s=0;for(let dc=-2;dc<=2;dc++)for(let dr=-2;dr<=2;dr++)if(ps.has((c+dc)+','+(r+dr)))s++;cells.push([s,c,r]);}
                  cells.sort((a,b)=>b[0]-a[0]);for(const [s,c,r] of cells.slice(0,9)){G.build=T[n%T.length];const [x,y]=__td.cellCenter(c,r);cv.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,bubbles:true}));const t=G.towers[G.towers.length-1];if(t)t.lvl=n%3;n++;}
                  G.build=null;G.wave=G.waves-1;document.getElementById('bWave').click();})()""")
                await pg.evaluate("__td.setDebugSpeed(2)"); await pg.wait_for_timeout(5200 if li < 6 else 9000); await pg.evaluate("__td.setDebugSpeed(1)")
                await pg.wait_for_timeout(400)
                await pg.screenshot(path=f"{OUT}/level{li+1}_{name}.png")
            print(name, "errors:", errs)
            await ctx.close()
        await b.close()
asyncio.run(main())
