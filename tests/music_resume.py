# 音樂恢復回歸測試：python3 tests/music_resume.py URL [new] — 模擬背景切換（系統暫停 <audio>、AudioContext 暫停）後回到頁面再點一下，音樂必須恢復
import asyncio, sys
from playwright.async_api import async_playwright
URL=sys.argv[1]; NEW=len(sys.argv)>2
INIT="""(()=>{window.__au=[];window.__ctxs=[];const AC=window.AudioContext;window.AudioContext=function(...a){const c=new AC(...a);__ctxs.push(c);return c};window.AudioContext.prototype=AC.prototype;const op=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){const p=op.call(this);if(this.tagName==='AUDIO'){window.__lastAu=this;p&&p.then(()=>__au.push('ok'),e=>__au.push('rej:'+e.name));}return p;};})()"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",headless=True,args=["--autoplay-policy=user-gesture-required"])
        ctx=await b.new_context(viewport={"width":390,"height":844},has_touch=True,is_mobile=True)
        await ctx.route("**/abacus.jasoncameron.dev/**", lambda r: r.abort())
        await ctx.add_init_script(INIT)
        pg=await ctx.new_page(); await pg.goto(URL)
        await pg.evaluate("localStorage.setItem('dino_save_v1',JSON.stringify({v:5,unlocked:3,stars:{0:3},introSeen:true}))"); await pg.reload()
        if NEW:
            await pg.wait_for_selector("#iSkip",state="visible",timeout=30000); await pg.wait_for_timeout(500)
            # 只做一次觸控：按跳過
            await pg.evaluate("document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}))")
            await pg.wait_for_timeout(300); await pg.tap("#iSkip")
        else:
            await pg.wait_for_selector("#menu",state="visible",timeout=30000); await pg.wait_for_timeout(500)
            await pg.evaluate("document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}))")  # 模擬手機觸控 pointerdown（不算使用者啟用手勢）
            await pg.wait_for_timeout(300); await pg.touchscreen.tap(200,60)
        await pg.wait_for_timeout(1500)
        r=await pg.evaluate("({ctx:__ctxs.map(c=>c.state),au:__au,paused:window.__lastAu?__lastAu.paused:null,t:window.__lastAu?__lastAu.currentTime:null})")
        print("after non-activating pointerdown + 1st real tap", r)
        # 模擬 iOS／Android 把分頁切到背景：系統暫停 <audio>、AudioContext 變 interrupted/suspended；再切回來並點一下
        await pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));__lastAu.pause();__ctxs[0].suspend()")
        await pg.wait_for_timeout(500)
        await pg.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
        await pg.wait_for_timeout(300); await pg.touchscreen.tap(200,60); await pg.wait_for_timeout(1500)
        r=await pg.evaluate("({ctx:__ctxs.map(c=>c.state),au:__au,paused:window.__lastAu?__lastAu.paused:null,t:window.__lastAu?__lastAu.currentTime:null})")
        print("after background->return + tap", r)
        await b.close()
asyncio.run(main())
