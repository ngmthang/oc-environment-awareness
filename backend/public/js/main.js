(function () {
  // ----------------- VISIT DASHBOARD -----------------
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
    const snap = sessionStorage.getItem("dash_snapshot");
    if (snap) {
      sessionStorage.removeItem("dash_snapshot");
      try { applyDashboard(JSON.parse(snap)); } catch (_) {}
    }

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

  // ----------------- USER NAME -----------------
  let currentProfile = null;

  function getUserName() {
    if (currentProfile && currentProfile.name) return currentProfile.name;
    const stored = sessionStorage.getItem("visitor_profile");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        if (p && p.name) return String(p.name);
      } catch (_) {}
    }
    return "Unknown";
  }

  async function fetchMe() {
    try {
      const res = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return null;
      const p = await res.json();
      currentProfile = p;
      sessionStorage.setItem("visitor_profile", JSON.stringify(p));
      return p;
    } catch (_) {
      return null;
    }
  }

  function normalizeOccId(raw) {
    const v = String(raw ?? "").trim().toUpperCase();
    return v.length ? v : "";
  }

  function normalizeName(raw) {
    const v = String(raw ?? "").trim();
    return v.length ? v : "";
  }

  function isValidOccId(v) {
    return v.length === 0 || /^C\d{8}$/.test(v);
  }

  async function updateMe({ name, occStudentId }) {
    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, occStudentId })
      });
      if (!res.ok) return null;
      const p = await res.json();
      currentProfile = p;
      sessionStorage.setItem("visitor_profile", JSON.stringify(p));
      return p;
    } catch (_) {
      return null;
    }
  }

  // ----------------- TOAST -----------------
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

  // ----------------- FULLSCREEN FX (canvas) -----------------
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

  // ----------------- QUIZ -----------------
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

  const QUIZ_BANK = [
    {id:1, q:"Orange County coastal sampling is described as having about how many monitoring stations?", options:["40", "70", "140", "500"], answer:2, explain:"County agencies collaborate to collect weekly samples at 140 ocean/harbor/bay stations."},
    {id:2, q:"In the 2023–2024 Ocean, Harbor and Bay Water Quality Report, how many sewage spills were reported in 2024?", options:["71", "178", "205", "340"], answer:0, explain:"The report states 71 spills were reported in 2024."},
    {id:3, q:"In 2024, what percent of the 71 sewage spills resulted in ocean/harbor/bay water closures?", options:["0%", "4%", "21%", "61%"], answer:1, explain:"The executive summary reports 4% resulted in closures."},
    {id:4, q:"Since 1999, pipeline blockages have been responsible for about what share of all beach closures on average?", options:["10%", "25%", "61%", "90%"], answer:2, explain:"Blockages average 61% of beach closures since 1999."},
    {id:5, q:"Which cause is listed as a major contributor to pipeline blockages since 1999?", options:["Infiltration of roots", "Earthquakes", "Lightning strikes", "Saltwater intrusion"], answer:0, explain:"Root intrusion is identified as a major cause (along with grease and unknown causes)."},
    {id:6, q:"Which time window defines the AB 411 sampling/standards period mentioned in the report?", options:["Jan 1–Dec 31", "Apr 1–Oct 31", "May 1–Oct 31", "Nov 1–Mar 31"], answer:1, explain:"AB 411 period is April 1 through October 31."},
    {id:7, q:"What does a 'Beach Mile Day' (BMD) measure?", options:["Beach sand volume", "Loss of recreational water use over length × time", "Number of lifeguards on duty", "Tide height"], answer:1, explain:"BMD accounts for the length of beach and time a closure/posting is in place."},
    {id:8, q:"Which agencies are named as collaborating on coastal water sampling in Orange County?", options:["HCA, OC San, SOCWA, OCPW", "NOAA, NASA, EPA, USGS", "Caltrans, CHP, DMV, CARB", "OCTA, Metrolink, Amtrak, BNSF"], answer:0, explain:"The monitoring program describes collaboration among HCA, OC San, SOCWA, and OCPW."},
    {id:9, q:"OCWD was created by the California legislature in what year?", options:["1906", "1933", "1987", "2014"], answer:1, explain:"The OCWD Resilience Plan states OCWD was created in 1933."},
    {id:10, q:"Approximately how many residents are supplied primarily by groundwater within OCWD boundaries?", options:["250,000", "1 million", "2.5 million", "10 million"], answer:2, explain:"OCWD notes the basin supplies about 2.5 million residents."},
    {id:11, q:"The OCWD Resilience Plan describes itself as what kind of document?", options:["A one-time fixed plan", "A living, adaptive management plan", "A private memo", "A legal code"], answer:1, explain:"It is described as a living document updated as conditions evolve."},
    {id:12, q:"Which is NOT one of the four key OCWD assets highlighted in the Resilience Plan?", options:["Groundwater Basin", "Santa Ana River", "GWRS", "Freeway Express Lanes"], answer:3, explain:"The four assets include the basin, Santa Ana River, GWRS, and natural resources."},
    {id:13, q:"In OCWD’s priority projects list, PFAS treatment is categorized under which area?", options:["Basin Management", "Transit Programs", "Education Grants", "Coastal Defense"], answer:0, explain:"PFAS Treatment Project is listed under Basin Management."},
    {id:14, q:"The ZEV Action Plan milestone target is aiming for how many ZEVs on California roadways by 2025?", options:["150,000", "500,000", "1.5 million", "15 million"], answer:2, explain:"The plan sets a path toward 1.5 million ZEVs by 2025."},
    {id:15, q:"According to the ZEV Action Plan, ZEVs include which vehicle types?", options:["Only hydrogen fuel cells", "Only battery EVs", "Hydrogen fuel cells and plug‑in electric vehicles", "Only diesel hybrids"], answer:2, explain:"ZEVs include FCEVs and plug‑in electric vehicles (BEV/PHEV)."},
    {id:16, q:"Climate change affects health directly through exposures like heat and floods, and indirectly through what?", options:["Higher air pollutants and degraded water quality", "Better nutrition", "More rainfall everywhere", "Lower UV radiation"], answer:0, explain:"Indirect effects include air pollutants and degraded water quality."},
    {id:17, q:"In California, which weather hazard causes more reported deaths per year on average than any other?", options:["Earthquakes", "Heat", "Lightning", "Hail"], answer:1, explain:"The human health section states heat causes more reported deaths than any other hazard."},
    {id:18, q:"Which group is mentioned as having increasing occupational heat-related illnesses?", options:["Software engineers", "Wildland firefighters and farmworkers", "Pilots", "Cashiers"], answer:1, explain:"The report mentions increases among wildland firefighters and farmworkers."},
    {id:19, q:"The human health section describes climate change as a 'threat multiplier' because it interacts with what?", options:["Only volcanoes", "Pollution, infrastructure, poverty, and other factors", "Only ocean tides", "Only solar flares"], answer:1, explain:"It notes compounding vulnerabilities from pollution, infrastructure, poverty, etc."},
    {id:20, q:"OCTA’s CASP evaluates assets against how many climate hazards in its vulnerability assessment?", options:["3", "5", "7", "12"], answer:2, explain:"It lists seven hazards including air quality, drought, flooding, storms, storm surge, high heat, wildfires."},
    {id:21, q:"OCTA’s CASP states transportation sector contributes about what share of California GHG emissions?", options:["10%", "25%", "40%", "70%"], answer:2, explain:"It cites transportation as ~40% of California GHG emissions."},
    {id:22, q:"OCTA’s CASP notes its bus fleet transition goal is a 100% zero‑emission bus fleet by what year?", options:["2025", "2030", "2040", "2050"], answer:2, explain:"It references a commitment to transition by 2040."},
    {id:23, q:"OCPW mission statement emphasizes doing what for Orange County communities?", options:["Protect and enrich through sustainable delivery of projects and services", "Maximize profits", "Expand oil drilling", "Reduce public transportation"], answer:0, explain:"Mission: protect and enrich communities through sustainable delivery."},
    {id:24, q:"OCPW reports removing approximately how many cubic yards of trash and debris from roads and flood control channels?", options:["3,570", "35,700", "357,000", "3,570,000"], answer:2, explain:"It states about 357,000 cubic yards removed."},
    {id:25, q:"OCPW reports re‑purposing nearly how many cubic yards of sand to replenish beaches?", options:["1,320", "13,200", "132,000", "1,320,000"], answer:2, explain:"It notes nearly 132,000 cubic yards of sand repurposed."},
    {id:26, q:"OCPW describes upgrading a channel to increase stormwater capacity by about what percent?", options:["10%", "25%", "50%", "200%"], answer:2, explain:"Channel redesign increased capacity by 50%."},
    {id:27, q:"The OC Waste & Recycling annual report mentions SB 1383 compliance focuses on what category of waste?", options:["Electronic waste", "Organic waste recycling", "Construction concrete", "Medical waste"], answer:1, explain:"SB 1383 is about organic waste diversion and recycling."},
    {id:28, q:"OC Waste & Recycling reports repurposing about how many tons of compost and mulch for community use?", options:["4,000", "40,000", "400,000", "4,000,000"], answer:1, explain:"The report states 40,000 tons repurposed."},
    {id:29, q:"OCWR’s ORNGE initiative plans to convert landfill gas into what?", options:["Jet fuel", "Renewable natural gas for pipelines", "Coal", "Plastic pellets"], answer:1, explain:"It plans RNG facilities converting landfill gas to RNG for pipelines."},
    {id:30, q:"A wildlife corridor is primarily used to do what?", options:["Increase pipeline blockages", "Connect habitat fragments to support movement and gene flow", "Increase beach closures", "Trap sediment permanently"], answer:1, explain:"Corridors reduce fragmentation impacts by connecting habitats."},
    {id:31, q:"Mitigation vs adaptation: adaptation focuses on what?", options:["Reducing emissions only", "Reducing vulnerability and coping with impacts", "Increasing gasoline use", "Ignoring hazards"], answer:1, explain:"Adaptation is about resilience to impacts."},
    {id:32, q:"A core waste hierarchy idea is best summarized as:", options:["Dispose first, reduce last", "Reduce, reuse, recycle (and compost), then dispose", "Only incinerate", "Only landfill"], answer:1, explain:"Waste hierarchy prioritizes reducing and reusing before recycling and disposal."},
    {id:33, q:"Recycling plastics is often difficult mainly because:", options:["All plastics are identical", "Sorting/contamination and low-value mixed polymers", "Plastic is magnetic", "Plastic cannot be melted"], answer:1, explain:"Contamination and mixed polymers reduce recycling effectiveness."},
    {id:34, q:"The Ocean Water Quality Report says the biennial report primarily provides what?", options:["New laws", "Factual monitoring data and analysis", "Stock tips", "Restaurant reviews"], answer:1, explain:"It provides factual monitoring data; it does not set policy goals."},
    {id:35, q:"The Ocean Water Monitoring Program states roughly how many ocean/harbor/bay samples are collected in a year?", options:["750", "7,500", "75,000", "750,000"], answer:1, explain:"It says about 7,500 samples per year."},
    {id:36, q:"The Ocean Water Monitoring Program notes approximately how many analyses are performed for three indicator bacteria?", options:["2,250", "22,500", "225,000", "1,400"], answer:1, explain:"It notes approximately 22,500 analyses."},
    {id:37, q:"In 2024, which is true about ocean water closures from private properties (per the report)?", options:["All closures originated from private properties", "Some closures originated from private properties", "None of the closures originated from private properties", "Private properties are not tracked"], answer:2, explain:"It states none of the 2024 ocean closures originated from private properties."},
    {id:38, q:"The OCWD Resilience Plan states imported water is purchased when needed to do what?", options:["Support groundwater replenishment", "Replace beach sand", "Fuel buses", "Treat landfill gas"], answer:0, explain:"It notes imported water purchases for groundwater replenishment when needed."},
    {id:39, q:"BPP (Basin Production Percentage) is what?", options:["Percent of a producer’s supply from basin groundwater", "Percent of ocean water that is drinkable", "Percent of buses that are electric", "Percent of trash recycled"], answer:0, explain:"BPP is the percent of each producer’s supply from groundwater."},
    {id:40, q:"Measure M2 was approved by voters in what year?", options:["1990", "2006", "2016", "2025"], answer:1, explain:"The Next 10 Delivery Plan states M2 was approved in 2006."},
    {id:41, q:"Next 10 Delivery Plan is described as what type of document?", options:["A living document with annual reviews/updates", "A secret plan", "A court ruling", "A science fiction story"], answer:0, explain:"It describes Next 10 as a living document with annual updates."},
    {id:42, q:"The Next 10 plan highlights climate risk affecting which corridor in South OC?", options:["I‑5 only", "LOSSAN rail corridor", "SR‑91 only", "Santa Ana River Trail"], answer:1, explain:"It references disruptions on the LOSSAN corridor."},
    {id:43, q:"Biodiversity loss drivers commonly include which set?", options:["Habitat loss, invasive species, pollution, overharvesting, climate change", "Only volcanoes", "Only asteroid impacts", "Only earthquakes"], answer:0, explain:"These five drivers are commonly taught as major biodiversity threats."},
    {id:44, q:"A nonpoint source water pollutant example is:", options:["Runoff carrying fertilizers", "A single factory pipe discharge", "A treated drinking water plant", "A sealed landfill liner"], answer:0, explain:"Nonpoint pollution comes from diffuse runoff."},
    {id:45, q:"Wetlands primarily help by:", options:["Increasing wildfire smoke", "Filtering pollutants and reducing flooding", "Making oceans saltier", "Producing plastics"], answer:1, explain:"Wetlands can filter pollutants and buffer floods."},
    {id:46, q:"A key air pollution concern is:", options:["Ozone and fine particulate matter", "Helium", "Neon", "Water vapor only"], answer:0, explain:"Ozone and PM are major health-relevant air pollutants."},
    {id:47, q:"Mitigation strategy on this site best matches:", options:["Burn more fossil fuels", "Improve efficiency and shift to cleaner energy/transport", "Eliminate recycling", "Remove public transit"], answer:1, explain:"Mitigation focuses on cutting emissions via clean energy/transport."},
    {id:48, q:"In OCWR’s annual report, SB 1383 compliance success relates to:", options:["Gasoline pricing", "Organic waste diversion outcomes", "Fishing advisories", "Bridge construction"], answer:1, explain:"The report connects achievements to SB 1383 organic waste compliance."},
    {id:49, q:"OCPW mentions fleet ZEV purchase requirements reaching 100% by what year?", options:["2024", "2027", "2035", "2045"], answer:1, explain:"The State of the Department notes 100% ZEV purchases by 2027."},
    {id:50, q:"OCTA CASP notes its 2021 baseline operational emissions are measured in:", options:["kWh", "MTCO2e", "ppm", "mph"], answer:1, explain:"It reports emissions in metric tons CO2 equivalent (MTCO2e)."}
  ];

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickQuizSet(n = 10) {
    const pool = QUIZ_BANK.slice();
    shuffleInPlace(pool);
    return pool.slice(0, n);
  }

  function openQuizModal(text) {
    const modal = document.getElementById("quiz-modal");
    const body = document.getElementById("quiz-modal-body");
    if (!modal || !body) return;
    const parts = text.split("\n\n");
    body.innerHTML = "";
    parts.forEach((part, i) => {
      const p = document.createElement("p");
      p.textContent = part;
      if (i === 1) {
        p.style.marginTop = "0.75rem";
        p.style.fontWeight = "600";
        p.style.fontSize = "1.05rem";
      }
      body.appendChild(p);
    });
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    // Scroll to modal dialog
    requestAnimationFrame(() => {
      const dialog = modal.querySelector(".quiz-modal__dialog");
      if (dialog) {
        const sticky = document.querySelector(".site-nav");
        const offset = (sticky?.offsetHeight || 90) + 16;
        const y = dialog.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    });
  }

  function closeQuizModal() {
    const modal = document.getElementById("quiz-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    // Scroll back to quiz section
    const quizSection = document.getElementById("quiz");
    if (quizSection) {
      const sticky = document.querySelector(".site-nav");
      const offset = (sticky?.offsetHeight || 90) + 12;
      const y = quizSection.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  function bindQuiz() {
    const form = document.getElementById("quiz-form");
    const list = document.getElementById("quiz-list");
    const submitBtn = document.getElementById("quiz-submit");
    const scoreEl = document.getElementById("quiz-score");
    const nameEl = document.getElementById("quiz-name");
    const sidEl = document.getElementById("quiz-studentid");
    const modal = document.getElementById("quiz-modal");
    const modalClose = document.getElementById("quiz-modal-close");
    if (!form || !list || !submitBtn || !scoreEl || !nameEl) return;

    let graded = false;

    async function prefillFromProfile() {
      const p = currentProfile || (await fetchMe());
      if (!p) return;
      if (nameEl && (!nameEl.value || !nameEl.value.trim())) {
        const n = p.name || "";
        nameEl.value = (n === "Unknown") ? "" : n;
      }
      if (sidEl && (!sidEl.value || !sidEl.value.trim())) sidEl.value = p.occStudentId || "";
    }

    function renderSet() {
      graded = false;
      submitBtn.textContent = "Submit";
      scoreEl.textContent = "";
      list.innerHTML = "";

      const currentSet = pickQuizSet(10);
      currentSet.forEach((item, idx) => {
        const li = document.createElement("li");
        li.className = "quiz-q";
        li.dataset.answerIndex = String(item.answer);

        const title = document.createElement("div");
        title.className = "quiz-q__title";
        title.textContent = `${idx + 1}) ${item.q}`;
        li.appendChild(title);

        item.options.forEach((opt, oi) => {
          const label = document.createElement("label");
          label.className = "quiz-opt";
          const input = document.createElement("input");
          input.type = "radio";
          input.name = "q" + (idx + 1);
          input.value = String(oi);
          label.appendChild(input);
          label.appendChild(document.createTextNode(" " + opt));
          li.appendChild(label);
        });

        const exp = document.createElement("div");
        exp.className = "quiz-exp";
        exp.textContent = item.explain;
        exp.hidden = true;
        li.appendChild(exp);

        list.appendChild(li);
      });
    }

    function revealAnswers() {
      const questions = Array.from(list.querySelectorAll(".quiz-q"));
      questions.forEach((q, idx) => {
        q.classList.remove("is-correct", "is-wrong");
        const ansIdx = Number(q.dataset.answerIndex);
        const picked = form.querySelector(`input[name="q${idx + 1}"]:checked`);
        const pickedIdx = picked ? Number(picked.value) : -1;

        const opts = Array.from(q.querySelectorAll(".quiz-opt"));
        opts.forEach((optLabel, oi) => {
          optLabel.classList.remove("is-correct", "is-wrong");
          if (oi === ansIdx) optLabel.classList.add("is-correct");
          if (pickedIdx === oi && pickedIdx !== ansIdx) optLabel.classList.add("is-wrong");
        });

        const exp = q.querySelector(".quiz-exp");
        if (exp) exp.hidden = false;
        if (pickedIdx === ansIdx) q.classList.add("is-correct");
        else q.classList.add("is-wrong");
      });
    }

    async function grade() {
      const name = normalizeName(nameEl.value);
      const occId = normalizeOccId(sidEl ? sidEl.value : "");

      if (!name) {
        nameEl.focus();
        showToast("Enter your name before submitting.");
        return;
      }
      if (!isValidOccId(occId)) {
        showToast("Student ID must look like C######## (example: C03104480).");
        if (sidEl) sidEl.focus();
        return;
      }

      await updateMe({ name, occStudentId: occId || null });

      const questions = Array.from(list.querySelectorAll(".quiz-q"));
      let correct = 0;
      questions.forEach((q, idx) => {
        const ansIdx = Number(q.dataset.answerIndex);
        const picked = form.querySelector(`input[name="q${idx + 1}"]:checked`);
        const pickedIdx = picked ? Number(picked.value) : -1;
        if (pickedIdx === ansIdx) correct += 1;
      });

      const total = questions.length;
      scoreEl.textContent = `Score: ${correct}/${total}`;

      await submitQuizScore(correct, total);

      const label = occId ? `${name} (ID: ${occId})` : name;

      let encouragement;
      if (correct === total) {
        encouragement = "🎉 Perfect score! Outstanding — you've mastered every question. You clearly know your OC environmental facts!";
      } else if (correct >= 8) {
        encouragement = "🌟 Excellent work! You got " + correct + "/" + total + ". You have a strong grasp of the material — just a couple more to nail down!";
      } else if (correct >= 6) {
        encouragement = "👍 Good job! You got " + correct + "/" + total + ". Solid effort — reviewing the sections you missed will get you to the top!";
      } else if (correct >= 4) {
        encouragement = "📚 Nice try! You got " + correct + "/" + total + ". Keep exploring the sections above — you're building a great foundation!";
      } else {
        encouragement = "💪 Keep going! You got " + correct + "/" + total + ". Every expert starts somewhere — read through the sections and try again!";
      }

      openQuizModal(`${label} — Score: ${correct}/${total}\n\n${encouragement}`);

      refreshVisitDashboard();

      graded = true;
      submitBtn.textContent = "Try again";
    }

    function handleSubmitOrRetry() {
      if (!graded) grade();
      else renderSet();
    }

    function closeAndReveal() {
      closeQuizModal();
      if (graded) revealAnswers();
    }

    submitBtn.addEventListener("click", handleSubmitOrRetry);
    if (modalClose) modalClose.addEventListener("click", closeAndReveal);
    if (modal) {
      modal.addEventListener("click", (e) => {
        const t = e.target;
        if (t && t.getAttribute && t.getAttribute("data-close") === "1") closeAndReveal();
      });
    }

    prefillFromProfile();
    renderSet();
  }

  // ----------------- SCROLL UI -----------------
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

  function bindBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  function onScroll() {
    updateScrollProgress();
    toggleBackToTop();
    revealOnScroll();
  }

  // ----------------- IMAGE LIGHTBOX -----------------
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

    const imgs = document.querySelectorAll(".section-image, .image-grid img, .panel-hero-img img, .image-gallery img");
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

  // ----------------- NAV ARROWS -----------------
  function initNavScrollArrows() {
    const scroller = document.getElementById("nav-scroll");
    if (!scroller) return;
    scroller.scrollLeft = 0;

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

    scroller.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      a.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });

    updateArrows();
  }

  // ----------------- TABS + VISITS (INDEPENDENT) -----------------
  function initTabs() {
    const nav = document.getElementById("nav-list");
    if (!nav) return;

    // Only section tabs (exclude quiz)
    const tabs = Array.from(nav.querySelectorAll("a[data-tab]"))
      .filter(a => a.dataset.tab !== "quiz");

    // Only content sections (exclude visits)
    const sectionPanels = Array.from(document.querySelectorAll('.tab-panel[data-panel]'))
      .filter(p => p.dataset.panel !== "visits");

    const visitsPanel = document.querySelector('.tab-panel[data-panel="visits"]');
    const showVisitsBtn = document.getElementById("show-visits");
    const closeVisitsBtn = document.getElementById("visits-close");

    let lastSectionKey = "snapshot";

    function scrollToPanel(panelEl) {
      if (!panelEl) return;

      const sticky = document.querySelector(".site-nav");
      const offset = (sticky?.offsetHeight || 90) + 12;

      // wait for layout after class toggles
      requestAnimationFrame(() => {
        const y = panelEl.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    }

    function hideAllSections() {
      sectionPanels.forEach(p => p.classList.remove("active", "is-active"));
      tabs.forEach(t => t.classList.remove("active"));
    }

    function showSection(key, { updateHash = true } = {}) {
      hideAllSections();

      const panel = document.querySelector(`.tab-panel[data-panel="${key}"]`);
      if (panel) {
        panel.classList.add("active");
        panel.classList.add("is-active");
      }

      const tab = tabs.find(t => t.dataset.tab === key);
      if (tab) tab.classList.add("active");

      lastSectionKey = key;

      if (updateHash) history.replaceState(null, "", `#${key}`);

      // IMPORTANT: scroll to the section panel, not to top
      scrollToPanel(panel);
    }

    function isVisitsOpen() {
      if (!visitsPanel) return false;
      return visitsPanel.classList.contains("active") || visitsPanel.classList.contains("is-active") || visitsPanel.classList.contains("is-open");
    }

    function openVisits(open) {
      if (!visitsPanel) return;

      visitsPanel.classList.toggle("is-open", open);
      visitsPanel.classList.toggle("active", open);
      visitsPanel.classList.toggle("is-active", open);

      // scroll to visits when opening; when closing scroll back to current section
      if (open) {
        scrollToPanel(visitsPanel);
      } else {
        const current = document.querySelector(`.tab-panel[data-panel="${lastSectionKey}"]`);
        scrollToPanel(current);
      }
    }

    function toggleVisits() {
      openVisits(!isVisitsOpen());
    }

    // Section menu click -> show section (visits state unchanged)
    tabs.forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const key = a.dataset.tab;
        if (!key) return;
        showSection(key, { updateHash: true });
      });
    });

    // Hero "Show visits" toggles dashboard only
    if (showVisitsBtn) {
      showVisitsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        toggleVisits();
      });
    }

    // Close visits hides dashboard only
    if (closeVisitsBtn) {
      closeVisitsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openVisits(false);
      });
    }

    // Initial section from hash (but ignore #visits / #quiz)
    const initial = (location.hash || "").replace("#", "");
    const validInitial =
      initial &&
      initial !== "visits" &&
      initial !== "quiz" &&
      !!document.querySelector(`.tab-panel[data-panel="${initial}"]`);

    // show a section by default, visits hidden by default
    showSection(validInitial ? initial : "snapshot", { updateHash: true });
    openVisits(false);
  }

  // ----------------- INIT -----------------
  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initNavScrollArrows();

    bindBackToTop();
    enableImageLightbox();
    bindQuiz();

    refreshVisitDashboard();
    setTimeout(refreshVisitDashboard, 250);
    setTimeout(refreshVisitDashboard, 900);
    setInterval(refreshVisitDashboard, 5000);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  });
})();