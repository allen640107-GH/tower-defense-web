/* 恐龍防線：匿名次數計數器（Abacus，免費、免註冊、免金鑰）
 * 只計兩個總數：遊戲開啟次數 opens、開始關卡次數 level-starts。
 * 不收集任何個人資料：不送 cookie、不帶識別碼、不讀存檔，只對固定網址發一次 GET。
 * 請求放在一次性 Web Worker 內 fire-and-forget（短逾時、全部 try/catch），
 * 計數站連不上時不影響遊戲，主控台也不會出現網路錯誤。
 * 不計數：localhost / 127.0.0.1 / 檔案開啟（file://）/ 自動化測試（navigator.webdriver）/ ?nocount。
 * 測試用：?counttest=1 → 改計到獨立的測試命名空間（不影響正式總數）。 */
(function () {
  var BASE = "https://abacus.jasoncameron.dev";
  var NS = "allen-dino-defense";
  var NS_TEST = "allen-dino-defense-test";
  var KEYS = { open: "opens", level: "level-starts" };
  var TIMEOUT = 4000;

  function param(name) {
    try { return new URLSearchParams(location.search || "").has(name); } catch (e) { return false; }
  }
  var testMode = param("counttest");
  var cs = document.currentScript;
  var autoOpen = !(cs && cs.getAttribute("data-noopen") !== null); // 統計頁不算「開啟遊戲」
  function skip() {
    try {
      if (testMode) return false;
      var h = (location.hostname || "").toLowerCase();
      if (location.protocol === "file:" || !h) return true;
      if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" || /\.local$/.test(h)) return true;
      if (navigator.webdriver) return true;
      if (param("nocount") || param("test")) return true;
      return false;
    } catch (e) { return true; }
  }

  // 在一次性 Worker 中發請求：失敗不會寫入頁面主控台。
  function workerFetch(urls, timeout, onDone) {
    try {
      if (typeof Worker === "undefined" || typeof Blob === "undefined" || !window.URL || !URL.createObjectURL) { if (onDone) onDone(null); return; }
      var src =
        "self.onmessage=function(m){var d=m.data,out=[],n=d.urls.length;" +
        "function fin(){n--;if(n<=0){try{self.postMessage(out)}catch(e){}self.close()}}" +
        "d.urls.forEach(function(u,i){out[i]=null;try{var c=typeof AbortController!=='undefined'?new AbortController():null;" +
        "var t=setTimeout(function(){try{c&&c.abort()}catch(e){}},d.t);" +
        "fetch(u,{mode:d.read?'cors':'no-cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:c?c.signal:undefined})" +
        ".then(function(r){if(!d.read)return null;return r.ok?r.json():null}).then(function(j){out[i]=j&&typeof j.value==='number'?j.value:(d.read?0:null)})" +
        ".catch(function(){}).then(function(){clearTimeout(t);fin()})}catch(e){fin()}});" +
        "setTimeout(function(){try{self.postMessage(out)}catch(e){}self.close()},d.t+1000)};";
      var bu = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
      var w = new Worker(bu);
      var done = false;
      w.onmessage = function (m) { if (done) return; done = true; try { w.terminate(); } catch (e) {} if (onDone) onDone(m.data); };
      w.onerror = function (ev) { try { ev.preventDefault(); } catch (e) {} if (!done) { done = true; if (onDone) onDone(null); } };
      w.postMessage({ urls: urls, t: timeout, read: !!onDone });
      setTimeout(function () { try { URL.revokeObjectURL(bu); } catch (e) {} }, 1000);
      setTimeout(function () { if (!done) { done = true; try { w.terminate(); } catch (e) {} if (onDone) onDone(null); } }, timeout + 2500);
    } catch (e) { if (onDone) onDone(null); }
  }

  function hit(kind) {
    try {
      if (skip()) return;
      var key = KEYS[kind];
      if (!key) return;
      workerFetch([BASE + "/hit/" + (testMode ? NS_TEST : NS) + "/" + key], TIMEOUT, null);
    } catch (e) {}
  }

  // 統計頁使用：讀兩個總數（找不到鍵＝0；連不上＝null）
  function read(cb, ns) {
    var n = ns || (testMode ? NS_TEST : NS);
    workerFetch([BASE + "/get/" + n + "/" + KEYS.open, BASE + "/get/" + n + "/" + KEYS.level], 10000, function (vals) {
      try { cb(vals ? { opens: vals[0], levels: vals[1] } : null); } catch (e) {}
    });
  }

  var opened = false;
  window.DinoCounter = {
    open: function () { if (opened) return; opened = true; hit("open"); },
    levelStart: function () { hit("level"); },
    read: read, skip: skip, NS: NS, NS_TEST: NS_TEST, KEYS: KEYS, BASE: BASE
  };
  if (autoOpen) try { if (document.readyState === "complete") window.DinoCounter.open(); else window.addEventListener("load", function () { window.DinoCounter.open(); }); } catch (e) {}
})();
