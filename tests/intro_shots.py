# v2.2.1 片頭截圖：python3 tests/intro_shots.py URL OUTDIR — 六種尺寸：自動播放中（跳過動畫＋開聲音提示）、點一下開聲音後、跳過後主選單、自動播放失敗時的大播放鍵
import asyncio, sys, os
from playwright.async_api import async_playwright
URL, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
DEV = {"se": (375, 667, True), "iphone": (390, 844, True), "iphone_land": (844, 390, True), "foldcover": (344, 882, True), "foldopen": (884, 1104, True), "pc": (1920, 1080, False)}
FAIL_AUTOPLAY = "(()=>{const op=HTMLMediaElement.prototype.play;let n=0;HTMLMediaElement.prototype.play=function(){if(this.id==='introV'&&n++<2)return Promise.reject(new DOMException('blocked','NotAllowedError'));return op.call(this);};})()"
async def run(p, D, fail):
    W, H, T = DEV[D]; errs = []
    b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True, args=["--autoplay-policy=user-gesture-required"])
    ctx = await b.new_context(viewport={"width": W, "height": H}, has_touch=T, is_mobile=T, device_scale_factor=2 if T else 1)
    await ctx.route("**/abacus.jasoncameron.dev/**", lambda r: r.abort())
    if fail: await ctx.add_init_script(FAIL_AUTOPLAY)
    pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.reload()
    if fail:
        await pg.wait_for_selector("#iBigPlay", state="visible", timeout=30000); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f"{OUT}/{D}_4_bigplay_fallback.png")
        await (pg.tap("#iBigPlay") if T else pg.click("#iBigPlay")); await pg.wait_for_timeout(1200)
        st = await pg.evaluate("[document.querySelector('#introV').paused, document.querySelector('#introV').muted]")
        print(D, "bigplay tap -> paused,muted", st, "errs", errs)
    else:
        await pg.wait_for_selector("#iSkip", state="visible", timeout=30000); await pg.wait_for_timeout(4000)
        await pg.screenshot(path=f"{OUT}/{D}_1_intro_autoplay.png")
        if T: await pg.touchscreen.tap(W * 0.5, H * 0.45)
        else: await pg.mouse.click(W * 0.5, H * 0.45)
        await pg.wait_for_timeout(2500); await pg.screenshot(path=f"{OUT}/{D}_2_intro_sound_on.png")
        await (pg.tap("#iSkip") if T else pg.click("#iSkip")); await pg.wait_for_selector("#menu", state="visible"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f"{OUT}/{D}_3_menu_after_skip.png")
        print(D, "music", await pg.evaluate("AUDIO.state()"), "errs", errs)
    await b.close()
async def main():
    async with async_playwright() as p:
        for D in DEV:
            await run(p, D, False); await run(p, D, True)
asyncio.run(main())
