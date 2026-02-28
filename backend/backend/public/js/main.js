/* js/main.js */
(function () {
    // -------- VISIT DASHBOARD --------
    function fmt(n) {
        return Number(n ?? 0).toLocaleString();
    }

    function applyDashboard(d) {
        const map = {
            "dash-total-visits": d.totalVisits,
            "dash-total-visitors": d.totalVisitors,
            "dash-total-guests": d.totalGuests,
            "dash-total-occ": d.totalOccStudents,
            "dash-total-perfect": d.totalPerfectQuizUsers,

            "dash-today-visits": d.todayVisits,
            "dash-today-visitors": d.todayVisitors,
            "dash-today-guests": d.todayGuests,
            "dash-today-occ": d.todayOccStudents
        };

        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.textContent = fmt(val);
        }
    }

    async function refreshVisitDashboard() {
        // 1) instant snapshot from login redirect (optional)
        const snap = sessionStorage.getItem("dash_snapshot");
        if (snap) {
            sessionStorage.removeItem("dash_snapshot");
            try { applyDashboard(JSON.parse(snap)); } catch (_) {}
        }

        // 2) authoritative backend
        try {
            const res = await fetch("/api/dashboard", {
                cache: "no-store",
                credentials: "same-origin"
            });
            if (!res.ok) return;
            const d = await res.json();
            applyDashboard(d);
        } catch (_) {}
    }

    // -------- USERNAME FOR NOTIFICATIONS --------
    // If you have a visible user name element on main.html, prefer it by id="visitor-name".
    // Otherwise fall back to what we saved from login.js in sessionStorage.
    function getUserName() {
        const onPage = document.getElementById("visitor-name");
        const pageName = onPage ? String(onPage.textContent || "").trim() : "";
        if (pageName) return pageName;

        const stored = sessionStorage.getItem("visitor_name");
        const v = stored ? String(stored).trim() : "";
        return v.length ? v : "Unknown";
    }

    // -------- TOAST NOTIFICATION --------
    function ensureToast() {
        let el = document.getElementById("toast");
        if (el) return el;

        el = document.createElement("div");
        el.id = "toast";
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        el.style.position = "fixed";
        el.style.right = "16px";
        el.style.bottom = "16px";
        el.style.zIndex = "10002";
        el.style.maxWidth = "420px";
        el.style.padding = "12px 14px";
        el.style.borderRadius = "12px";
        el.style.border = "1px solid rgba(0,0,0,0.12)";
        el.style.background = "rgba(255,255,255,0.96)";
        el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.18)";
        el.style.color = "#0f172a";
        el.style.fontWeight = "800";
        el.style.display = "none";
        document.body.appendChild(el);
        return el;
    }

    let toastTimer = null;
    function showToast(msg) {
        const el = ensureToast();
        el.textContent = msg;
        el.style.display = "block";
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            el.style.display = "none";
        }, 4200);
    }

    // -------- FULLSCREEN FX (canvas) --------
    let fxCanvas = null;
    let fxCtx = null;
    let fxRAF = null;

    function ensureFxCanvas() {
        if (fxCanvas) return fxCanvas;

        fxCanvas = document.createElement("canvas");
        fxCanvas.id = "fx-canvas";
        fxCanvas.style.position = "fixed";
        fxCanvas.style.inset = "0";
        fxCanvas.style.width = "100vw";
        fxCanvas.style.height = "100vh";
        fxCanvas.style.zIndex = "10001";
        fxCanvas.style.pointerEvents = "none";
        document.body.appendChild(fxCanvas);

        fxCtx = fxCanvas.getContext("2d");

        const resize = () => {
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            fxCanvas.width = Math.floor(window.innerWidth * dpr);
            fxCanvas.height = Math.floor(window.innerHeight * dpr);
            fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        window.addEventListener("resize", resize);
        resize();
        return fxCanvas;
    }

    function stopFx() {
        if (fxRAF) cancelAnimationFrame(fxRAF);
        fxRAF = null;
        if (fxCtx) fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (fxCanvas) {
            fxCanvas.remove();
            fxCanvas = null;
            fxCtx = null;
        }
    }

    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function fireworkBurstFullScreen(durationMs = 2800) {
        stopFx();
        ensureFxCanvas();

        const W = () => window.innerWidth;
        const H = () => window.innerHeight;

        const particles = [];
        const bursts = 4;

        for (let b = 0; b < bursts; b++) {
            const cx = rand(0.2, 0.8) * W();
            const cy = rand(0.15, 0.55) * H();
            const pieces = 140;

            for (let i = 0; i < pieces; i++) {
                const ang = (i / pieces) * Math.PI * 2 + rand(-0.02, 0.02);
                const speed = rand(140, 360);
                particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(ang) * speed,
                    vy: Math.sin(ang) * speed,
                    r: rand(2, 4.5),
                    hue: (i / pieces) * 360,
                    life: rand(1400, 2200),
                    born: b * 240
                });
            }
        }

        const start = performance.now();

        const tick = (now) => {
            const t = now - start;
            fxCtx.clearRect(0, 0, W(), H());

            // trail fade
            fxCtx.fillStyle = "rgba(0,0,0,0.10)";
            fxCtx.fillRect(0, 0, W(), H());

            const gravity = 240;
            const dt = 1 / 60;

            for (const p of particles) {
                if (t < p.born) continue;
                const age = t - p.born;
                if (age > p.life) continue;

                p.vy += gravity * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;

                const alpha = Math.max(0, 1 - age / p.life);
                fxCtx.beginPath();
                fxCtx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${alpha})`;
                fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                fxCtx.fill();
            }

            if (t < durationMs) fxRAF = requestAnimationFrame(tick);
            else stopFx();
        };

        fxRAF = requestAnimationFrame(tick);
    }

    function encouragementSparklesFullScreen(durationMs = 2600) {
        stopFx();
        ensureFxCanvas();

        const W = () => window.innerWidth;
        const H = () => window.innerHeight;

        const stars = [];
        const count = 110;

        for (let i = 0; i < count; i++) {
            stars.push({
                x: rand(0, W()),
                y: rand(H() * 0.55, H()),
                vx: rand(-40, 40),
                vy: rand(-160, -300),
                size: rand(10, 18),
                rot: rand(0, Math.PI * 2),
                vr: rand(-2.5, 2.5),
                life: rand(1600, 2400),
                born: rand(0, 600)
            });
        }

        const start = performance.now();

        function drawStar(x, y, r, rot, alpha) {
            fxCtx.save();
            fxCtx.translate(x, y);
            fxCtx.rotate(rot);
            fxCtx.globalAlpha = alpha;
            fxCtx.fillStyle = "rgba(255,255,255,0.92)";
            fxCtx.beginPath();
            for (let i = 0; i < 5; i++) {
                fxCtx.lineTo(Math.cos((i * 2 * Math.PI) / 5) * r, Math.sin((i * 2 * Math.PI) / 5) * r);
                fxCtx.lineTo(
                    Math.cos(((i * 2 + 1) * Math.PI) / 5) * (r * 0.45),
                    Math.sin(((i * 2 + 1) * Math.PI) / 5) * (r * 0.45)
                );
            }
            fxCtx.closePath();
            fxCtx.fill();
            fxCtx.restore();
        }

        const tick = (now) => {
            const t = now - start;
            fxCtx.clearRect(0, 0, W(), H());

            // soft overlay
            fxCtx.fillStyle = "rgba(0,0,0,0.18)";
            fxCtx.fillRect(0, 0, W(), H());

            const dt = 1 / 60;

            for (const s of stars) {
                if (t < s.born) continue;
                const age = t - s.born;
                if (age > s.life) continue;

                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.rot += s.vr * dt;

                const alpha = Math.max(0, 1 - age / s.life);
                drawStar(s.x, s.y, s.size, s.rot, alpha);
            }

            if (t < durationMs) fxRAF = requestAnimationFrame(tick);
            else stopFx();
        };

        fxRAF = requestAnimationFrame(tick);
    }

    function sadDrizzleFullScreen(durationMs = 2400) {
        stopFx();
        ensureFxCanvas();

        const W = () => window.innerWidth;
        const H = () => window.innerHeight;

        const drops = [];
        const count = 200;

        for (let i = 0; i < count; i++) {
            drops.push({
                x: rand(0, W()),
                y: rand(-H(), 0),
                vy: rand(280, 560),
                len: rand(10, 18),
                w: rand(1, 2),
                life: rand(1700, 2400),
                born: rand(0, 420)
            });
        }

        const start = performance.now();

        const tick = (now) => {
            const t = now - start;
            fxCtx.clearRect(0, 0, W(), H());

            // bluish overlay
            fxCtx.fillStyle = "rgba(2, 6, 23, 0.38)";
            fxCtx.fillRect(0, 0, W(), H());

            const dt = 1 / 60;

            fxCtx.strokeStyle = "rgba(224, 242, 254, 0.85)";
            fxCtx.lineCap = "round";

            for (const d of drops) {
                if (t < d.born) continue;
                const age = t - d.born;
                if (age > d.life) continue;

                d.y += d.vy * dt;
                if (d.y > H() + 40) {
                    d.y = rand(-200, -20);
                    d.x = rand(0, W());
                }

                const alpha = Math.max(0, 1 - age / d.life);
                fxCtx.globalAlpha = alpha;
                fxCtx.lineWidth = d.w;

                fxCtx.beginPath();
                fxCtx.moveTo(d.x, d.y);
                fxCtx.lineTo(d.x, d.y + d.len);
                fxCtx.stroke();
            }

            fxCtx.globalAlpha = 1;

            if (t < durationMs) fxRAF = requestAnimationFrame(tick);
            else stopFx();
        };

        fxRAF = requestAnimationFrame(tick);
    }

    // -------- QUIZ: submit score to backend and store best --------
    async function submitQuizScore(score, total) {
        const res = await fetch("/api/quiz/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ score, total })
        });

        if (!res.ok) return null;
        return await res.json();
    }

    function bindQuiz() {
        const form = document.getElementById("quiz-form");
        const submitBtn = document.getElementById("quiz-submit");
        const resetBtn = document.getElementById("quiz-reset");
        const scoreEl = document.getElementById("quiz-score");
        if (!form || !submitBtn || !resetBtn || !scoreEl) return;

        const questions = Array.from(form.querySelectorAll(".quiz-q"));

        const grade = async () => {
            let correct = 0;

            questions.forEach((q, idx) => {
                q.classList.remove("is-correct", "is-wrong");

                const ans = q.getAttribute("data-answer");
                const name = "q" + (idx + 1);
                const picked = form.querySelector(`input[name="${name}"]:checked`);
                const val = picked ? picked.value : null;

                const exp = q.querySelector(".quiz-exp");
                if (exp) exp.hidden = false;

                if (val && val === ans) {
                    correct += 1;
                    q.classList.add("is-correct");
                } else {
                    q.classList.add("is-wrong");
                }
            });

            const total = questions.length;
            scoreEl.textContent = `Score: ${correct}/${total}`;

            const r = await submitQuizScore(correct, total);
            const user = getUserName();

            if (!r) {
                showToast(`${user}: quiz save failed. Refresh and try again.`);
                sadDrizzleFullScreen();
                return;
            }

            // tiers: low <= 3, middle 4-9, perfect 10
            if (r.perfect) {
                showToast(`${user}: 10/10. Perfect. Stored as your best.`);
                fireworkBurstFullScreen();
            } else if (r.score <= 3) {
                if (r.improved) showToast(`${user}: ${r.score}/${r.total}. New best. Try again—aim for 10/10.`);
                else showToast(`${user}: ${r.score}/${r.total}. Keep going—try again for 10/10.`);
                sadDrizzleFullScreen();
            } else {
                if (r.improved) showToast(`${user}: ${r.score}/${r.total}. New best. You’re close—try again for 10/10.`);
                else showToast(`${user}: ${r.score}/${r.total}. Best: ${r.bestScore}/${r.total}. Try again for 10/10.`);
                encouragementSparklesFullScreen();
            }

            refreshVisitDashboard();
        };

        const reset = () => {
            form.reset();
            questions.forEach((q) => {
                q.classList.remove("is-correct", "is-wrong");
                const exp = q.querySelector(".quiz-exp");
                if (exp) exp.hidden = true;
            });
            scoreEl.textContent = "";
        };

        submitBtn.addEventListener("click", grade);
        resetBtn.addEventListener("click", reset);

        reset();
    }

    // -------- UI --------
    function updateScrollProgress() {
        const bar = document.getElementById("scroll-progress");
        if (!bar) return;

        const windowHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight - windowHeight;
        const scrolled = window.scrollY || window.pageYOffset || 0;

        const pct = docHeight > 0 ? (scrolled / docHeight) * 100 : 0;
        bar.style.width = pct + "%";
    }

    function toggleBackToTop() {
        const btn = document.getElementById("back-to-top");
        if (!btn) return;

        if ((window.scrollY || 0) > 300) btn.classList.add("visible");
        else btn.classList.remove("visible");
    }

    function backToTopClick() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function highlightActiveSection() {
        const sections = document.querySelectorAll("section[id]");
        const links = document.querySelectorAll(".site-nav a");
        let current = "";

        sections.forEach((s) => {
            const top = s.offsetTop;
            if ((window.scrollY || 0) >= top - 120) current = s.id;
        });

        links.forEach((a) => {
            a.classList.toggle("active", a.getAttribute("href") === "#" + current);
        });
    }

    function revealOnScroll() {
        const reveals = document.querySelectorAll(".reveal");
        const vh = window.innerHeight;

        reveals.forEach((el) => {
            const top = el.getBoundingClientRect().top;
            if (top < vh - 150) el.classList.add("active");
        });
    }

    function bindNavSmoothScroll() {
        document.querySelectorAll('.site-nav a[href^="#"]').forEach((a) => {
            a.addEventListener("click", (e) => {
                e.preventDefault();
                const id = a.getAttribute("href");
                const target = document.querySelector(id);
                if (!target) return;

                const offset = target.offsetTop - 90;
                window.scrollTo({ top: offset, behavior: "smooth" });
            });
        });
    }

    function bindBackToTop() {
        const btn = document.getElementById("back-to-top");
        if (btn) btn.addEventListener("click", backToTopClick);
    }

    function onScroll() {
        updateScrollProgress();
        toggleBackToTop();
        highlightActiveSection();
        revealOnScroll();
    }

    // -------- IMAGE LIGHTBOX --------
    function enableImageLightbox() {
        const box = document.getElementById("lightbox");
        const boxImg = document.getElementById("lightboxImg");
        const closeBtn = document.getElementById("lightboxClose");
        if (!box || !boxImg || !closeBtn) return;

        const open = (img) => {
            boxImg.src = img.currentSrc || img.src;
            boxImg.alt = img.alt || "Image";
            box.classList.add("is-open");
            box.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
        };

        const close = () => {
            box.classList.remove("is-open");
            box.setAttribute("aria-hidden", "true");
            boxImg.src = "";
            document.body.style.overflow = "";
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        };

        const imgs = document.querySelectorAll(".section-image, .image-grid img");
        imgs.forEach((img) => {
            img.addEventListener("click", () => open(img));
            img.setAttribute("tabindex", "0");
            img.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(img);
                }
            });
        });

        closeBtn.addEventListener("click", close);
        box.addEventListener("click", (e) => {
            if (e.target === box) close();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") close();
            if (e.key.toLowerCase() === "f" && box.classList.contains("is-open")) {
                box.requestFullscreen?.().catch(() => {});
            }
        });

        boxImg.addEventListener("click", close);
    }

    // -------- INIT --------
    document.addEventListener("DOMContentLoaded", () => {
        bindNavSmoothScroll();
        bindBackToTop();
        enableImageLightbox();
        bindQuiz();

        refreshVisitDashboard();
        setTimeout(refreshVisitDashboard, 250);
        setTimeout(refreshVisitDashboard, 900);
        setInterval(refreshVisitDashboard, 5000);

        window.addEventListener("scroll", onScroll);
        onScroll();
    });
})();

// ===== One-line nav scroll arrows =====
(function initNavScrollArrows() {
  const scroller = document.getElementById("nav-scroll");
  if (scroller) scroller.scrollLeft = 0;
  if (!scroller) return;

  const leftBtn = document.querySelector(".nav-arrow--left");
  const rightBtn = document.querySelector(".nav-arrow--right");
  if (!leftBtn || !rightBtn) return;

  const step = () => Math.max(220, Math.floor(scroller.clientWidth * 0.7));

  function updateArrows() {
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const atStart = scroller.scrollLeft <= 1;
    const atEnd = scroller.scrollLeft >= maxScrollLeft - 1;

    leftBtn.classList.toggle("is-hidden", atStart);
    rightBtn.classList.toggle("is-hidden", atEnd);
  }

  leftBtn.addEventListener("click", () => {
    scroller.scrollBy({ left: -step(), behavior: "smooth" });
  });

  rightBtn.addEventListener("click", () => {
    scroller.scrollBy({ left: step(), behavior: "smooth" });
  });

  scroller.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);

  // Optional: when a nav link is clicked, keep it visible
  scroller.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    a.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });

  updateArrows();
})();