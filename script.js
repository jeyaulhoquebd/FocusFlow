/* ============ ফোকাস মাস্টার — main script ============ */
(function () {
  "use strict";
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem("fm:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("fm:" + k, JSON.stringify(v)); } catch {} },
    del(k)    { try { localStorage.removeItem("fm:" + k); } catch {} }
  };

  /* ---------- 1. THEME ---------- */
  const root = document.documentElement;
  const themeBtn = $("#themeToggle");
  const savedTheme = store.get("theme", "dark");
  root.setAttribute("data-theme", savedTheme);
  themeBtn.textContent = savedTheme === "dark" ? "🌙" : "☀️";
  themeBtn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    themeBtn.textContent = next === "dark" ? "🌙" : "☀️";
    store.set("theme", next);
  });

  /* ---------- 2. ROUTING (SPA) ---------- */
  const pages = $$(".page");
  const links = $$("#navLinks a");
  function route() {
    let hash = location.hash.replace("#", "") || "home";
    let page = $(`.page[data-page="${hash}"]`);
    if (!page) { hash = "home"; page = $(`.page[data-page="home"]`); }
    pages.forEach(p => p.classList.remove("active"));
    page.classList.add("active");
    links.forEach(a => a.classList.toggle("active-link", a.getAttribute("href") === "#" + hash));
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    $("#navLinks").classList.remove("open");
    revealInit();
  }
  window.addEventListener("hashchange", route);

  /* ---------- 3. MOBILE MENU ---------- */
  $("#menuBtn").addEventListener("click", () => $("#navLinks").classList.toggle("open"));

  /* ---------- 4. SCROLL PROGRESS ---------- */
  const bar = $("#scrollProgress");
  window.addEventListener("scroll", () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
  }, { passive: true });

  /* ---------- 5. REVEAL ANIMATION ---------- */
  let io;
  function revealInit() {
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("show"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".page.active .reveal").forEach(el => io.observe(el));
  }

  /* ---------- 6. CHECKLISTS (localStorage) ---------- */
  $$('input[type="checkbox"][data-key]').forEach(cb => {
    const key = cb.dataset.key;
    cb.checked = store.get("chk:" + key, false);
    cb.addEventListener("change", () => store.set("chk:" + key, cb.checked));
  });

  /* ---------- 7. POMODORO TIMER ---------- */
  const RING_CIRC = 2 * Math.PI * 90; // ~565.48
  const ringFg    = $("#ringFg");
  const elMode    = $("#timerMode");
  const elTime    = $("#timerTime");
  const elRound   = $("#timerRound");
  const btnStart  = $("#btnStart");
  const btnReset  = $("#btnReset");
  const btnSkip   = $("#btnSkip");
  const chips     = $$(".chip");

  let focusMin = 25, breakMin = 5;
  let mode = "focus";        // focus | break
  let remaining = focusMin * 60;
  let total = remaining;
  let timerId = null;
  let running = false;
  let round = 1;
  const ROUNDS = 4;

  function fmt(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }
  function paint() {
    elTime.textContent = fmt(remaining);
    elMode.textContent = mode === "focus" ? "FOCUS" : "BREAK";
    elMode.style.color = mode === "focus" ? "var(--accent)" : "var(--accent-2)";
    elRound.textContent = `রাউন্ড ${round} / ${ROUNDS}`;
    ringFg.style.stroke = mode === "focus" ? "var(--accent)" : "var(--accent-2)";
    const prog = total > 0 ? remaining / total : 0;
    ringFg.style.strokeDasharray = RING_CIRC;
    ringFg.style.strokeDashoffset = RING_CIRC * (1 - prog);
  }
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
      o.start(); o.stop(ctx.currentTime + 0.95);
    } catch (e) {}
  }
  function tick() {
    remaining--;
    if (remaining <= 0) {
      beep();
      if (mode === "focus") {
        if (round >= ROUNDS) { round = 1; mode = "break"; total = 15 * 60; }
        else { mode = "break"; total = breakMin * 60; }
      } else {
        mode = "focus"; round = Math.min(round + 1, ROUNDS); total = focusMin * 60;
      }
      remaining = total;
    }
    paint();
  }
  function startTimer() {
    if (running) { // pause
      clearInterval(timerId); running = false;
      btnStart.textContent = "চালু করুন";
      return;
    }
    running = true;
    btnStart.textContent = "পজ";
    timerId = setInterval(tick, 1000);
  }
  function resetTimer() {
    clearInterval(timerId); running = false;
    btnStart.textContent = "শুরু";
    mode = "focus"; round = 1;
    remaining = focusMin * 60; total = remaining;
    paint();
  }
  function skipTimer() {
    clearInterval(timerId); running = false;
    btnStart.textContent = "চালু করুন";
    if (mode === "focus") { mode = "break"; total = breakMin * 60; }
    else { mode = "focus"; round = Math.min(round + 1, ROUNDS); total = focusMin * 60; }
    remaining = total; paint();
  }

  if (btnStart) {
    btnStart.addEventListener("click", startTimer);
    btnReset.addEventListener("click", resetTimer);
    btnSkip.addEventListener("click", skipTimer);
    chips.forEach(c => c.addEventListener("click", () => {
      chips.forEach(x => x.classList.remove("active"));
      c.classList.add("active");
      const [f, b] = c.dataset.preset.split(",").map(Number);
      focusMin = f; breakMin = b;
      resetTimer();
    }));
    paint();
  }

  /* ---------- 8. DISTRACTION LIST ---------- */
  const distInput = $("#distInput");
  const distList  = $("#distList");
  const distCount = $("#distCount");
  let items = store.get("distractions", []);
  function renderDist() {
    distList.innerHTML = "";
    if (!items.length) {
      distList.innerHTML = `<li class="empty">এখনো কিছু যোগ করা হয়নি ✨</li>`;
    } else {
      items.forEach((txt, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${escapeHtml(txt)}</span><button title="মুছুন">✕</button>`;
        li.querySelector("button").addEventListener("click", () => {
          items.splice(i, 1); store.set("distractions", items); renderDist();
        });
        distList.appendChild(li);
      });
    }
    if (distCount) distCount.textContent = items.length + "টি";
  }
  function addDist() {
    const v = distInput.value.trim();
    if (!v) return;
    items.push(v); store.set("distractions", items);
    distInput.value = ""; renderDist(); distInput.focus();
  }
  if (distInput) {
    $("#distAdd").addEventListener("click", addDist);
    distInput.addEventListener("keydown", e => { if (e.key === "Enter") addDist(); });
    $("#distClear").addEventListener("click", () => {
      if (items.length && confirm("সব মুছে ফেলবেন?")) {
        items = []; store.set("distractions", items); renderDist();
      }
    });
    renderDist();
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  /* ---------- 9. GOAL SAVER ---------- */
  const goalInput = $("#goalInput");
  if (goalInput) {
    goalInput.value = store.get("goal", "");
    $("#goalSave").addEventListener("click", () => {
      const v = goalInput.value.trim();
      if (!v) return;
      store.set("goal", v);
      $("#goalSavedText").textContent = "সংরক্ষিত: " + v;
      $("#goalSaved").style.display = "flex";
    });
    $("#goalClear").addEventListener("click", () => {
      store.del("goal"); goalInput.value = "";
      $("#goalSaved").style.display = "none";
    });
    if (store.get("goal", "")) {
      $("#goalSavedText").textContent = "সংরক্ষিত: " + store.get("goal");
      $("#goalSaved").style.display = "flex";
    }
  }

  /* ---------- 10. SLEEP CALCULATOR ---------- */
  const wakeTime = $("#wakeTime");
  const sleepResults = $("#sleepResults");
  function calcSleep() {
    if (!wakeTime || !sleepResults) return;
    const [h, m] = wakeTime.value.split(":").map(Number);
    if (isNaN(h)) return;
    const wake = h * 60 + m;
    const options = [9, 8, 7.5, 7, 6];
    sleepResults.innerHTML = "";
    options.forEach(hrs => {
      const bed = (wake - hrs * 60 - 15 + 1440) % 1440;
      const bh = Math.floor(bed / 60), bm = bed % 60;
      const ampm = bh >= 12 ? "PM" : "AM";
      const h12 = bh % 12 === 0 ? 12 : bh % 12;
      const el = document.createElement("div");
      el.className = "sleep-item";
      el.innerHTML = `<span>${hrs} ঘণ্টা ঘুমাতে হলে</span><b>${String(h12).padStart(2,"0")}:${String(bm).padStart(2,"0")} ${ampm}</b>`;
      sleepResults.appendChild(el);
    });
  }
  if (wakeTime) { wakeTime.addEventListener("change", calcSleep); wakeTime.addEventListener("input", calcSleep); calcSleep(); }

  /* ---------- 11. DEEP WORK TIME ---------- */
  const dwStart = $("#dwStart"), dwEnd = $("#dwEnd");
  if (dwStart && dwEnd) {
    const saved = store.get("deepwork", null);
    if (saved) {
      dwStart.value = saved.s; dwEnd.value = saved.e;
      $("#dwResultText").textContent = `আপনার Deep Work সময়: ${saved.s} – ${saved.e}`;
      $("#dwResult").style.display = "flex";
    }
    $("#dwSave").addEventListener("click", () => {
      const s = dwStart.value, e = dwEnd.value;
      if (!s || !e) return;
      store.set("deepwork", { s, e });
      $("#dwResultText").textContent = `আপনার Deep Work সময়: ${s} – ${e}`;
      $("#dwResult").style.display = "flex";
    });
    $("#dwClear").addEventListener("click", () => {
      store.del("deepwork");
      $("#dwResult").style.display = "none";
    });
  }

  /* ---------- INIT ---------- */
  route();
})();