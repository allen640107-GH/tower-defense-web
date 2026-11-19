# 計數器測試：python3 tests/counter_test.py BASE_URL [SHOTDIR] [--real]
# 1) 一般測試環境（webdriver/127.0.0.1）完全不發計數請求
# 2) ?counttest=1 強制走計數流程，但封鎖計數網域（abort / DNS 失敗 / 卡住逾時）→ 遊戲照常、主控台 0 錯誤
# 3) stats.html 在網域被封鎖時顯示提示、主控台 0 錯誤
# 4) --real：只打「測試命名空間」allen-dino-defense-test，確認 +1，正式數字不變
import asyncio, sys, os, json, urllib.request
from playwright.async_api import async_playwright
BASE = sys.argv[1].rstrip("/") + "/"; SHOT = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else None
REAL = "--real" in sys.argv
AB = "https://abacus.jasoncameron.dev"
fails = []
def check(c, m):
    print(("PASS " if c else "FAIL ") + m, flush=True)
    if not c: fails.append(m)
def get(ns, key):
    for _ in range(3):
        try:
            with urllib.request.urlopen(f"{AB}/get/{ns}/{key}", timeout=20) as r: return json.loads(r.read())["value"]
        except urllib.error.HTTPError as e:
            if e.code == 404: return 0
        except Exception: pass
    return None
async def page(b, url, mode, vp=(390, 844)):
    ctx = await b.new_context(viewport={"width": vp[0], "height": vp[1]}, is_mobile=True, has_touch=True, device_scale_factor=2)
    pg = await ctx.new_page(); errs = []; reqs = []
    pg.on("console", lambda m: errs.append(m.type + ": " + m.text) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    async def handler(r):
        reqs.append(r.request.url)
        if mode == "abort": await r.abort()
        elif mode == "dns": await r.abort("namenotresolved")
        elif mode == "hang": await asyncio.sleep(9); await r.abort("timedout")
        elif mode == "real": await r.continue_()
    if mode != "none": await ctx.route("**/abacus.jasoncameron.dev/**", handler)
    else: ctx.on("request", lambda q: reqs.append(q.url) if "abacus" in q.url else None)
    await pg.goto(url); return ctx, pg, errs, reqs
async def play_level(pg):
    await pg.wait_for_selector("#iSkip", state="visible", timeout=30000)  # v2.2.1：自動播片頭
    await pg.evaluate("__td.finishIntro()"); await pg.wait_for_timeout(500)
    await pg.evaluate("__td.startLevel(1)"); await pg.wait_for_timeout(600)
    await pg.evaluate("__td.setDebugSpeed(4)")
    w0 = await pg.evaluate("__td.G.wave")
    await pg.evaluate("__td.spawn('raptor',1,0)")
    await pg.wait_for_timeout(4000)
    return await pg.evaluate("({lives:__td.G.lives, wave:__td.G.wave, t:__td.G.time, over:__td.G.over})"), w0
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True, args=["--autoplay-policy=no-user-gesture-required"])
        # 1) 測試環境不計數
        ctx, pg, errs, reqs = await page(b, BASE, "none")
        base, _ = await play_level(pg); await pg.wait_for_timeout(1500)
        print("baseline (no counter)", base)
        check(not reqs, f"test env sends no counter request ({len(reqs)})"); check(not errs, f"no console errors {errs[:3]}")
        await ctx.close()
        # 2) 封鎖網域
        for mode in ("abort", "dns", "hang"):
            ctx, pg, errs, reqs = await page(b, BASE + "?counttest=1", mode)
            st, _ = await play_level(pg); await pg.wait_for_timeout(5500 if mode == "hang" else 1500)
            check(len(reqs) >= 2, f"[{mode}] counter attempted open+level ({len(reqs)})")
            check(st["t"] >= base["t"] * 0.8 and st["wave"] == base["wave"] and not st["over"], f"[{mode}] game runs same as baseline {st}")
            check(not errs, f"[{mode}] blocked counter → 0 console errors {errs[:3]}")
            if SHOT and mode == "dns": await pg.screenshot(path=os.path.join(SHOT, "counter_blocked_game.png"))
            await ctx.close()
        # 3) stats.html 被封鎖
        ctx, pg, errs, reqs = await page(b, BASE + "stats.html", "dns")
        await pg.wait_for_function("document.getElementById('status').className.indexOf('err')>=0", timeout=20000)
        check(not errs, f"[stats blocked] 0 console errors {errs[:3]}")
        check(all("/get/" in u for u in reqs), f"stats page only reads, never hits {reqs}")
        if SHOT: await pg.screenshot(path=os.path.join(SHOT, "stats_blocked.png"))
        await ctx.close()
        # 4) 真實連線（測試命名空間）
        if REAL:
            o0, l0 = get("allen-dino-defense", "opens"), get("allen-dino-defense", "level-starts")
            t0, tl0 = get("allen-dino-defense-test", "opens"), get("allen-dino-defense-test", "level-starts")
            ctx, pg, errs, reqs = await page(b, BASE + "?counttest=1", "real")
            await play_level(pg); await pg.wait_for_timeout(5000); await ctx.close()
            await asyncio.sleep(2)
            t1, tl1 = get("allen-dino-defense-test", "opens"), get("allen-dino-defense-test", "level-starts")
            o1, l1 = get("allen-dino-defense", "opens"), get("allen-dino-defense", "level-starts")
            check(t1 == t0 + 1 and tl1 == tl0 + 1, f"[real] test namespace +1/+1 opens {t0}->{t1} levels {tl0}->{tl1}")
            check(o1 == o0 and l1 == l0, f"[real] official unchanged opens {o0}->{o1} levels {l0}->{l1}")
            check(not errs, f"[real] 0 console errors {errs[:3]}")
            ctx, pg, errs, reqs = await page(b, BASE + "stats.html?counttest=1", "real")
            await pg.wait_for_function("/更新時間/.test(document.getElementById('status').textContent)", timeout=30000)
            shown = await pg.evaluate("[vOpen.textContent,vLevel.textContent]")
            check(shown == [str(t1), str(tl1)], f"[real] stats.html shows test values {shown}")
            check(not errs, f"[real stats] 0 console errors {errs[:3]}")
            if SHOT: await pg.screenshot(path=os.path.join(SHOT, "stats_test_ns.png"))
            await ctx.close()
        await b.close()
    print(f"RESULT counter fails={len(fails)}")
asyncio.run(main())
