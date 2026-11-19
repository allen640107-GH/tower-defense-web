# 製作名單截圖：python3 tests/credits_shots.py URL OUTDIR
import asyncio, sys, os
from playwright.async_api import async_playwright
DEV = {"se": (375, 667, True), "iphone": (390, 844, True), "foldcover": (344, 882, True), "foldopen": (884, 1104, True), "pc": (1920, 1080, False)}
URL, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
async def main():
    fails = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True)
        for d, (w, h, t) in DEV.items():
            ctx = await b.new_context(viewport={"width": w, "height": h}, has_touch=t, is_mobile=t, device_scale_factor=2 if t else 1)
            pg = await ctx.new_page(); errs = []
            pg.on("console", lambda m: errs.append(m.text) if m.type in ("error", "warning") else None)
            pg.on("pageerror", lambda e: errs.append(str(e)))
            await ctx.route("**/abacus.jasoncameron.dev/**", lambda r: r.abort())
            await pg.goto(URL); await pg.wait_for_selector("#introStart", state="visible", timeout=30000)
            await pg.evaluate("__td.finishIntro()"); await pg.wait_for_selector("#menu", state="visible", timeout=20000)
            await pg.click("#mCredits"); await pg.wait_for_timeout(600)
            info = await pg.evaluate("""(()=>{const e=document.querySelector('#creditsBox .prod');if(!e)return null;const r=e.getBoundingClientRect(),b=document.getElementById('creditsBox').getBoundingClientRect();
              return {txt:e.textContent, first:document.getElementById('creditsBox').firstElementChild===e, top:r.top>=b.top-1, inView:r.bottom<=innerHeight&&r.right<=innerWidth+1,
              pn:parseFloat(getComputedStyle(e.querySelector('.pn')).fontSize), pl:parseFloat(getComputedStyle(e.querySelector('.pl')).fontSize), wrap:e.scrollWidth<=e.clientWidth+1}})()""")
            ok = info and info["txt"] == "製作人／遊戲企劃：Allen Ho" and info["first"] and info["inView"] and info["wrap"] and info["pl"] >= 20 and not errs
            fails += not ok
            print(("PASS " if ok else "FAIL ") + d, info, errs[:3])
            await pg.screenshot(path=f"{OUT}/{d}_credits.png"); await ctx.close()
        await b.close()
    print(f"RESULT credits fails={fails}")
asyncio.run(main())
