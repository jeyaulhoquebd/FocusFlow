/* ============ ফোকাস মাস্টার — main script (v2 + Habit Tracker + Focus Guard) ============ */
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

  /* ---------- 2. ROUTING ---------- */
  const pages = $$(".page");
  const links = $$("#navLinks a");
  function route() {
    let hash = location.hash.replace("#", "") || "home";
    let page = $(`.page[data-page="${hash}"]`);
    if (!page) { hash = "home"; page = $(`.page[data-page="home"]`); }
    pages.forEach(p => p.classList.remove("active"));
    page.classList.add("active");
    links.forEach(a => a.classList.toggle("active-link", a.getAttribute("href") === "#" + hash));
    window.scrollTo({ top: 0, behavior: "auto" });
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

  /* ---------- 5. REVEAL ---------- */
  let io;
  function revealInit() {
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("show"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".page.active .reveal").forEach(el => io.observe(el));
  }

  /* ---------- 6. CHECKLISTS ---------- */
  $$('input[type="checkbox"][data-key]').forEach(cb => {
    const key = cb.dataset.key;
    cb.checked = store.get("chk:" + key, false);
    cb.addEventListener("change", () => store.set("chk:" + key, cb.checked));
  });

  /* ---------- 7. POMODORO TIMER ---------- */
  const RING_CIRC = 2 * Math.PI * 90;
  const ringFg    = $("#ringFg");
  const elMode    = $("#timerMode");
  const elTime    = $("#timerTime");
  const elRound   = $("#timerRound");
  const btnStart  = $("#btnStart");
  const btnReset  = $("#btnReset");
  const btnSkip   = $("#btnSkip");
  const chips     = $$(".chip");

  let focusMin = 25, breakMin = 5;
  let mode = "focus", remaining = focusMin * 60, total = remaining;
  let timerId = null, running = false, round = 1;
  const ROUNDS = 4;

  function fmt(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }
  function paintTimer() {
    if (!elTime) return;
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
    paintTimer();
  }
  function startTimer() {
    if (running) { clearInterval(timerId); running = false; btnStart.textContent = "চালু করুন"; return; }
    running = true; btnStart.textContent = "পজ";
    timerId = setInterval(tick, 1000);
  }
  function resetTimer() {
    clearInterval(timerId); running = false;
    btnStart.textContent = "শুরু";
    mode = "focus"; round = 1; remaining = focusMin * 60; total = remaining;
    paintTimer();
  }
  function skipTimer() {
    clearInterval(timerId); running = false;
    btnStart.textContent = "চালু করুন";
    if (mode === "focus") { mode = "break"; total = breakMin * 60; }
    else { mode = "focus"; round = Math.min(round + 1, ROUNDS); total = focusMin * 60; }
    remaining = total; paintTimer();
  }
  if (btnStart) {
    btnStart.addEventListener("click", startTimer);
    btnReset.addEventListener("click", resetTimer);
    btnSkip.addEventListener("click", skipTimer);
    chips.forEach(c => c.addEventListener("click", () => {
      chips.forEach(x => x.classList.remove("active"));
      c.classList.add("active");
      const [f, b] = c.dataset.preset.split(",").map(Number);
      focusMin = f; breakMin = b; resetTimer();
    }));
    paintTimer();
  }

  /* ---------- 8. DISTRACTION LIST ---------- */
  const distInput = $("#distInput");
  const distList  = $("#distList");
  const distCount = $("#distCount");
  let items = store.get("distractions", []);
  function renderDist() {
    if (!distList) return;
    distList.innerHTML = "";
    if (!items.length) distList.innerHTML = `<li class="empty">এখনো কিছু যোগ করা হয়নি ✨</li>`;
    else {
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
    return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  /* ---------- 9. GOAL ---------- */
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

  /* ---------- 10. SLEEP ---------- */
  const wakeTime = $("#wakeTime");
  const sleepResults = $("#sleepResults");
  function calcSleep() {
    if (!wakeTime || !sleepResults) return;
    const [h, m] = wakeTime.value.split(":").map(Number);
    if (isNaN(h)) return;
    const wake = h * 60 + m;
    sleepResults.innerHTML = "";
    [9, 8, 7.5, 7, 6].forEach(hrs => {
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
  if (wakeTime) { wakeTime.addEventListener("change", calcSleep); calcSleep(); }

  /* ---------- 11. DEEP WORK ---------- */
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
  }

  /* ============================================================
     12. HABIT TRACKER (NEW)
     ============================================================ */
  const HT = {
    list: () => store.get("ht:list", []),
    save: (l) => store.set("ht:list", l),
    notes: (id) => store.get("ht:notes:" + id, ""),
    saveNotes: (id, v) => store.set("ht:notes:" + id, v)
  };
  let htTimerId = null;

  function htTodayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function htDiff(startDate) {
    const start = new Date(startDate + "T00:00:00").getTime();
    const now = Date.now();
    let diff = Math.max(0, now - start);
    const days    = Math.floor(diff / (1000 * 60 * 60 * 24)); diff -= days * 86400000;
    const hours   = Math.floor(diff / (1000 * 60 * 60));      diff -= hours * 3600000;
    const minutes = Math.floor(diff / (1000 * 60));            diff -= minutes * 60000;
    const seconds = Math.floor(diff / 1000);
    return { days, hours, minutes, seconds };
  }

  function htProgress(startDate, targetDays) {
    const start = new Date(startDate + "T00:00:00").getTime();
    const now = Date.now();
    const passedDays = (now - start) / 86400000;
    const pct = targetDays > 0 ? Math.min(100, Math.max(0, (passedDays / targetDays) * 100)) : 0;
    const remainMs = Math.max(0, (start + targetDays * 86400000) - now);
    return { pct, remainMs };
  }

  function htFmtRemain(ms) {
    if (ms <= 0) return "✅ সম্পন্ন";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    return `${d} দিন ${h} ঘণ্টা বাকি`;
  }

  function htRender() {
    const listEl = $("#htList");
    const ovEl   = $("#htOverview");
    if (!listEl) return;
    const habits = HT.list();

    /* overview */
    if (ovEl) {
      if (!habits.length) ovEl.innerHTML = "";
      else {
        const totalTarget = habits.reduce((a, h) => a + h.targetDays, 0);
        const doneDays    = habits.reduce((a, h) => {
          const d = htDiff(h.startDate).days;
          return a + Math.min(d, h.targetDays);
        }, 0);
        const avgPct = totalTarget > 0 ? Math.round((doneDays / totalTarget) * 100) : 0;
        ovEl.innerHTML = `
          <div class="ht-ov-card"><b>${habits.length}</b><span>সক্রিয় অভ্যাস</span></div>
          <div class="ht-ov-card"><b>${doneDays}</b><span>সম্পন্ন দিন (মোট)</span></div>
          <div class="ht-ov-card"><b>${avgPct}%</b><span>গড় অগ্রগতি</span></div>
        `;
      }
    }

    /* list */
    if (!habits.length) {
      listEl.innerHTML = `
        <div class="ht-empty">
          <span class="emoji">📋</span>
          <b style="display:block;font-size:1.05rem;margin-bottom:6px">এখনো কোনো অভ্যাস নেই</b>
          উপরে প্রথম অভ্যাস যোগ করে শুরু করুন।
        </div>`;
      return;
    }

    listEl.innerHTML = "";
    habits.forEach(h => {
      const d = htDiff(h.startDate);
      const pr = htProgress(h.startDate, h.targetDays);
      const card = document.createElement("div");
      card.className = "ht-card";
      card.dataset.id = h.id;
      card.innerHTML = `
        <div class="ht-card-head">
          <div>
            <h3>${escapeHtml(h.name)}</h3>
            <div class="ht-meta">
              <span>📅 শুরু: <b>${h.startDate}</b></span>
              <span>🎯 লক্ষ্য: <b>${h.targetDays} দিন</b></span>
            </div>
          </div>
          <button class="ht-delete" title="মুছুন">🗑️</button>
        </div>

        <div class="ht-counter">
          <div class="ht-count-box"><b data-fld="days">${d.days}</b><span>Days</span></div>
          <div class="ht-count-box"><b data-fld="hours">${String(d.hours).padStart(2,"0")}</b><span>Hours</span></div>
          <div class="ht-count-box"><b data-fld="minutes">${String(d.minutes).padStart(2,"0")}</b><span>Minutes</span></div>
          <div class="ht-count-box"><b data-fld="seconds">${String(d.seconds).padStart(2,"0")}</b><span>Seconds</span></div>
        </div>

        <div class="ht-progress-info">
          <span>অগ্রগতি: <b>${pr.pct.toFixed(1)}%</b></span>
          <span>${htFmtRemain(pr.remainMs)}</span>
        </div>
        <div class="ht-progress">
          <div class="ht-progress-fill" style="width:${pr.pct}%"></div>
        </div>

        <div class="ht-notes-label">📝 Notes</div>
        <textarea class="ht-notes" placeholder="এই অভ্যাস নিয়ে আপনার ভাবনা, প্রতিদিনের অগ্রগতি বা স্মরণীয় কিছু লিখুন...">${escapeHtml(HT.notes(h.id))}</textarea>
        <div class="ht-note-saved">✅ সংরক্ষিত</div>
      `;

      /* delete */
      card.querySelector(".ht-delete").addEventListener("click", () => {
        if (!confirm(`"${h.name}" মুছে ফেলবেন?`)) return;
        const l = HT.list().filter(x => x.id !== h.id);
        HT.save(l);
        store.del("ht:notes:" + h.id);
        htRender();
      });

      /* notes auto-save with debounce */
      const ta  = card.querySelector(".ht-notes");
      const ind = card.querySelector(".ht-note-saved");
      let noteTid = null;
      ta.addEventListener("input", () => {
        clearTimeout(noteTid);
        noteTid = setTimeout(() => {
          HT.saveNotes(h.id, ta.value);
          ind.classList.add("show");
          setTimeout(() => ind.classList.remove("show"), 1200);
        }, 400);
      });

      listEl.appendChild(card);
    });
  }

  function htUpdateCounters() {
    const habits = HT.list();
    const cards  = $$("#htList .ht-card");
    cards.forEach(card => {
      const h = habits.find(x => x.id === card.dataset.id);
      if (!h) return;
      const d = htDiff(h.startDate);
      const pr = htProgress(h.startDate, h.targetDays);
      card.querySelector('[data-fld="days"]').textContent    = d.days;
      card.querySelector('[data-fld="hours"]').textContent   = String(d.hours).padStart(2,"0");
      card.querySelector('[data-fld="minutes"]').textContent = String(d.minutes).padStart(2,"0");
      card.querySelector('[data-fld="seconds"]').textContent = String(d.seconds).padStart(2,"0");
      const fill = card.querySelector(".ht-progress-fill");
      if (fill) fill.style.width = pr.pct + "%";
      const pct = card.querySelector(".ht-progress-info b");
      if (pct) pct.textContent = pr.pct.toFixed(1) + "%";
      const remain = card.querySelector(".ht-progress-info span:last-child");
      if (remain) remain.textContent = htFmtRemain(pr.remainMs);
    });
  }

  function htAddHabit() {
    const name = $("#htName").value.trim();
    const startDate = $("#htStart").value;
    const targetDays = parseInt($("#htTarget").value, 10);
    if (!name) { alert("অভ্যাসের নাম দিন"); return; }
    if (!startDate) { alert("শুরুর তারিখ দিন"); return; }
    if (!targetDays || targetDays < 1) { alert("লক্ষ্য দিন (কমপক্ষে ১ দিন)"); return; }

    const list = HT.list();
    list.unshift({
      id: "h_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name, startDate, targetDays, createdAt: Date.now()
    });
    HT.save(list);

    $("#htName").value = "";
    $("#htStart").value = htTodayISO();
    $("#htTarget").value = 30;
    htRender();
  }

  if ($("#htAdd")) {
    if (!$("#htStart").value) $("#htStart").value = htTodayISO();
    $("#htAdd").addEventListener("click", htAddHabit);
    $("#htName").addEventListener("keydown", e => { if (e.key === "Enter") htAddHabit(); });
    htRender();
    htTimerId = setInterval(htUpdateCounters, 1000);
  }

  /* ============================================================
     13. FOCUS GUARD — Website Blocker (NEW)
     ============================================================ */
  const FG = {
    getEnabled: () => store.get("fg:enabled", false),
    setEnabled: (v) => store.set("fg:enabled", v),
    getSites: () => store.get("fg:sites", ["facebook.com","youtube.com","instagram.com","twitter.com","x.com","reddit.com","tiktok.com"]),
    setSites: (v) => store.set("fg:sites", v),
    getDistractions: () => store.get("fg:distractions", 0),
    setDistractions: (v) => store.set("fg:distractions", v),
    getFocusStart: () => store.get("fg:focusStart", null),
    setFocusStart: (v) => store.set("fg:focusStart", v)
  };

  let fgSites = FG.getSites();
  let fgDistractions = FG.getDistractions();
  let fgFocusStart = FG.getFocusStart();
  let fgTickId = null;

  function fgRenderSites() {
    const ul = $("#fgSiteList");
    if (!ul) return;
    ul.innerHTML = "";
    if (!fgSites.length) {
      ul.innerHTML = `<li class="empty">এখনো কোনো সাইট যোগ করা হয়নি</li>`;
      return;
    }
    fgSites.forEach((s, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>🌐 ${escapeHtml(s)}</span><button title="মুছুন">✕</button>`;
      li.querySelector("button").addEventListener("click", () => {
        fgSites.splice(i, 1);
        FG.setSites(fgSites);
        fgRenderSites();
        fgUpdateStats();
      });
      ul.appendChild(li);
    });
  }

  function fgFmtDuration(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function fgUpdateStats() {
    const dEl = $("#fgDistractions");
    const bEl = $("#fgBlocked");
    const fEl = $("#fgFocusTime");
    if (dEl) dEl.textContent = fgDistractions;
    if (bEl) bEl.textContent = fgSites.length;
    if (fEl) {
      if (FG.getEnabled() && fgFocusStart) {
        fEl.textContent = fgFmtDuration(Date.now() - fgFocusStart);
      } else {
        fEl.textContent = "0s";
      }
    }
  }

  function fgRenderStatus() {
    const st = $("#fgStatus");
    if (!st) return;
    const on = FG.getEnabled();
    st.className = "fg-status" + (on ? " active" : "");
    st.innerHTML = `<span class="dot"></span><span>${on ? "Focus Mode চালু — সক্রিয় আছেন ✅" : "Focus Mode বন্ধ — চালু করলে distraction গণনা শুরু হবে"}</span>`;
  }

  function fgShowWarning(reason) {
    if (!FG.getEnabled()) return;
    let ov = $("#fgWarningOverlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "fgWarningOverlay";
      ov.className = "fg-warning";
      ov.innerHTML = `
        <div class="fg-warning-card">
          <span class="warn-icon">⚠️</span>
          <h3>মনোযোগ ভেঙেছে!</h3>
          <p id="fgWarnMsg">আপনি এই ট্যাব ছেড়ে চলে গিয়েছিলেন। ফোকাসে ফিরে আসুন।</p>
          <button class="btn btn-primary" id="fgWarnClose" style="margin-top:6px">← ফিরে যাই</button>
        </div>`;
      document.body.appendChild(ov);
      ov.querySelector("#fgWarnClose").addEventListener("click", () => {
        ov.classList.remove("show");
      });
    }
    $("#fgWarnMsg").textContent = reason;
    ov.classList.add("show");
  }

  function fgHandleDistraction() {
    if (!FG.getEnabled()) return;
    fgDistractions++;
    FG.setDistractions(fgDistractions);
    fgUpdateStats();
    fgShowWarning("আপনি এই ট্যাব ছেড়ে চলে গিয়েছিলেন। ফোকাসে ফিরে আসুন।");
  }

  if ($("#fgToggle")) {
    /* init toggle */
    const tgl = $("#fgToggle");
    tgl.checked = FG.getEnabled();
    fgRenderStatus();
    fgRenderSites();
    fgUpdateStats();

    tgl.addEventListener("change", () => {
      const on = tgl.checked;
      FG.setEnabled(on);
      if (on) {
        fgFocusStart = Date.now();
        FG.setFocusStart(fgFocusStart);
      } else {
        fgFocusStart = null;
        FG.setFocusStart(null);
      }
      fgRenderStatus();
      fgUpdateStats();
    });

    /* add site */
    const addBtn = $("#fgSiteAdd");
    const siteInput = $("#fgSiteInput");
    function fgAddSite() {
      let v = siteInput.value.trim().toLowerCase()
        .replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      if (!v || fgSites.includes(v)) return;
      fgSites.push(v);
      FG.setSites(fgSites);
      siteInput.value = "";
      fgRenderSites();
      fgUpdateStats();
    }
    addBtn.addEventListener("click", fgAddSite);
    siteInput.addEventListener("keydown", e => { if (e.key === "Enter") fgAddSite(); });

    /* quick add */
    $$(".quick-add button").forEach(b => b.addEventListener("click", () => {
      const s = b.dataset.site;
      if (!fgSites.includes(s)) {
        fgSites.push(s);
        FG.setSites(fgSites);
        fgRenderSites();
        fgUpdateStats();
      }
    }));

    /* visibility detection — tab switch = distraction */
    document.addEventListener("visibilitychange", () => {
      if (!FG.getEnabled()) return;
      if (document.hidden) {
        fgHandleDistraction();
      }
    });

    /* update focus time every second */
    fgTickId = setInterval(fgUpdateStats, 1000);
  }

  /* ---------- INIT ---------- */
  route();
})();