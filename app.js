/* app.js — presenter UI, sections and the simulator front end.
 * Reads: CONFIG (config.js), CORPUS (corpus.js), Engine (engine.js), CONTENT (content.js).
 * No network, no modules: runs from file://.
 */
(function () {
  "use strict";

  if (!window.CONFIG || !window.CORPUS || !window.Engine || !window.CONTENT) {
    document.getElementById("main").innerHTML =
      '<div style="padding:3rem;max-width:44rem"><h2>Something didn’t load</h2><p>One of config.js, corpus.js, engine.js or content.js failed to load. ' +
      "The usual cause is a typo in <code>config.js</code> (a missing comma or quote). Press F12 and look at the Console for the line number.</p></div>";
    return;
  }

  const C = window.CONFIG, K = window.CORPUS, E = window.Engine, X = window.CONTENT;
  const REDUCED = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  /* =============================================================== utilities */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const FILL_MARK = "[FILL]";
  const isFill = (v) => v == null || v === "" || (typeof v === "string" && /^\s*\[FILL/.test(v));
  const isDraft = (v) => typeof v === "string" && /^\[DRAFT\]/.test(v);
  const undraft = (v) => String(v).replace(/^\[DRAFT\]\s*/, "");

  // Render a config value: [FILL] badge, draft outline, or the escaped value.
  function F(v) {
    if (isFill(v)) return '<span class="fill" title="Not set in config.js: do not present">[FILL]</span>';
    if (isDraft(v)) return '<span class="draft" title="Draft wording: confirm in config.js">' + esc(undraft(v)) + "</span>";
    return esc(String(v));
  }
  // Content strings: escape, then [[key|label]] → glossary term, **x** → bold.
  function rich(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[\[([a-z0-9]+)(?:\|([^\]]+))?\]\]/g, (_, key, label) => term(key, label));
  }
  function term(key, label) {
    const g = X.glossary[key];
    if (!g) return label || key;
    return '<dfn class="gl" tabindex="0" data-gl="' + key + '">' + (label || esc(g.term)) + "</dfn>";
  }
  const val = (x) => (typeof x === "function" ? x(F, C) : rich(x || ""));
  // Same text without glossary markers (for places a hover can't go, such as inside a button).
  const strip = (s) => String(s || "").replace(/\[\[([a-z0-9]+)(?:\|([^\]]+))?\]\]/g, (_, k, l) => l || (X.glossary[k] || {}).term || k);
  const cap1 = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
  // rich() with the first visible letter capitalised, even when it sits inside a glossary term.
  const richCap = (s) => rich(s).replace(/^((?:<[^>]+>)*)([a-z])/, (_, tags, ch) => tags + ch.toUpperCase());
  // "R2 · Finance directors" chips for a list of requirement ids.
  function reqChips(ids) {
    return (ids || []).map((id) => {
      const r = C.requirements.find((x) => x.id === id);
      if (!r) return "";
      const who = stakeholder(r.from);
      return '<span class="chip" title="' + esc(strip(undraft(r.text))) + '">' + esc(r.id) + "</span> " + F(r.text) + (who ? ' <span class="muted">(' + esc(who.role) + ")</span>" : "");
    }).filter(Boolean).join("<br>");
  }
  const fmtInt = (n) => Math.round(n).toLocaleString("en-GB");
  const idxOf = (id) => X.sections.findIndex((s) => s.id === id);
  const stakeholder = (id) => C.stakeholders.find((s) => s.id === id);
  const nodeById = (id) => X.nodes.find((n) => n.id === id);
  const nodeName = (id) => (id === "tenant" ? "Governance controls" : (nodeById(id) || { name: id }).name);

  /* ================================================================== icons */
  const ICON = {
    ba: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.2"/><path d="M9.6 9.6L14 14"/></svg>',
    architect: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="2" width="12" height="12"/><path d="M2 7h12M7 7v7"/></svg>',
    builder: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5.5 4L2 8l3.5 4M10.5 4L14 8l-3.5 4"/></svg>',
    change: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="5" cy="5" r="2"/><circle cx="11" cy="5" r="2"/><path d="M1.5 13.5c.4-2.4 1.8-3.6 3.5-3.6s3.1 1.2 3.5 3.6M7.5 13.5c.4-2.4 1.8-3.6 3.5-3.6s3.1 1.2 3.5 3.6"/></svg>'
  };
  const PICTO = {
    library: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="5" width="30" height="30"/><path d="M5 15h30M5 25h30M9 5v10M12.5 5v10M17 7v8M22 15v10M25.5 15v10M29 17v8M10 25v10M14 25v10M19 27v8"/></svg>',
    librarian: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11.5" cy="12" r="6"/><path d="M15.8 16.3L20 21"/><circle cx="28.5" cy="12" r="6"/><path d="M24.2 16.3L20 21M20 21v11M13 34h14"/></svg>',
    exam: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 11c-4-3-10-3-15-1v22c5-2 11-2 15 1 4-3 10-3 15-1V10c-5-2-11-2-15 1zM20 11v22"/><path d="M24 21l3 3 5-6"/></svg>',
    invigilator: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 4l12 5v9c0 8.5-5.5 13.5-12 17C13.5 31.5 8 26.5 8 18V9z"/><path d="M14 19.5l4.2 4.2 8-8"/></svg>'
  };

  function roleBadge(key, inline) {
    // Inline (inside a sentence): icon only, role name as tooltip and accessible label.
    if (inline) return '<span class="role inline" role="img" aria-label="' + esc(X.roles[key].label) + '" title="' + esc(X.roles[key].label) + '">' + ICON[key] + "</span> ";
    return '<span class="role">' + ICON[key] + esc(X.roles[key].label) + "</span>";
  }
  function ownBadge(key) {
    const v = C.ownership[key];
    if (key === "tenant") return "";
    if (isFill(v)) return F(v);
    const o = X.ownershipLabels[v];
    return o ? '<span class="own ' + o.cls + '">' + esc(o.label) + "</span>" : F(v);
  }

  /* ===================================================== startup config check */
  function scanConfig() {
    const out = [];
    (function walk(v, path) {
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, path + "[" + i + "]"));
      else if (v && typeof v === "object") Object.keys(v).forEach((k) => walk(v[k], path ? path + "." + k : k));
      else if (typeof v === "string" && isFill(v)) out.push({ path, kind: "FILL" });
      else if (isDraft(v)) out.push({ path, kind: "DRAFT", value: undraft(v) });
    })(C, "");
    if (!C.thresholdScoreTypeConfirmed) out.push({ path: "thresholdScoreType (= " + C.thresholdScoreType + ")", kind: "CONFIRM" });
    if (!C.stakeholderPositionsConfirmed) out.push({ path: "stakeholders[].power / interest", kind: "CONFIRM" });
    return out;
  }

  /* ================================================================ sections */
  const S = X.sections;
  const state = { i: 0, tech: {}, clean: false, pinnedReq: null, hoverReq: null, view: "stake", stake: "finance", step: null, node: null, record: "hybrid" };

  function shell(def, body) {
    const headline = esc(def.headline).replace("30–45", F(C.problem.lookupMinutes));
    return '<div class="slide-inner">' +
      '<div class="slide-head"><div class="lens" aria-label="Role I was playing">' + def.roles.map((r) => roleBadge(r)).join("") + "</div>" +
      '<div class="spacer"></div><button type="button" class="tech-toggle" aria-expanded="false" data-tech-toggle>Technical detail</button></div>' +
      '<h2 class="headline" id="h-' + def.id + '">' + headline + "</h2>" + body + "</div>";
  }

  /* ---------------------------------------------------------------- 1 opening */
  const DOCS = [
    ["Word", "Elective Recovery Plan v3.2"], ["Word", "Elective Recovery Plan v3.1 FINAL"],
    ["PDF", "Performance Report, Sept"], ["PDF", "Performance Report, Aug"],
    ["Export", "PAS extract 30-09.csv"], ["PDF", "Bed Capacity Review Q2"],
    ["Word", "T&O Pathway Guide"], ["Export", "RTT waits (legacy).xls"]
  ];
  function renderOpening() {
    const lines = [
      ["Problem", "Figures such as " + F(C.problem.figuresExamples) + " were buried across " + F(C.problem.documentsDescription) +
        ". Each lookup took " + F(C.problem.lookupMinutes) + " minutes, " + F(C.problem.lookupsDescription) + "."],
      ["Outcome", "A manager asks in plain English and gets a grounded, cited answer in seconds. When the evidence is weak, it says so, and a person checks."],
      ["My role", F(C.roleLine) + " On this one I " + roleBadge("ba", true) + "did the business analysis, " + roleBadge("architect", true) +
        "designed the solution, " + roleBadge("builder", true) + "built the core of it, and " + roleBadge("change", true) + "led the case for adoption."]
    ];
    return '<div class="recreation-banner" role="note"><strong>Anonymised recreation.</strong><span>Synthetic data. Not the production system.</span></div>' +
      '<div class="split">' +
        '<div class="split-side"><div class="split-label">Before</div><div class="split-title">A manager hunts for one figure</div>' +
          '<div class="docstack" id="docstack" aria-hidden="true">' + DOCS.map((d) => '<div class="doc"><b>' + esc(d[0]) + "</b>" + esc(d[1]) + "</div>").join("") + "</div>" +
          '<div class="hunt-row"><span class="hunt-step" id="hunt-step">Shared drives, reports and exports</span><span class="clock" id="clock-before">0<small>min</small></span></div></div>' +
        '<div class="split-side"><div class="split-label">After</div><div class="split-title">The same question, in plain English</div>' +
          '<div class="chat"><div class="chat-q" id="chat-q" hidden><span id="typed"></span></div><div id="chat-a"></div></div>' +
          '<div class="hunt-row"><span class="hunt-step" id="after-step">Ready</span><span class="clock" id="clock-after"></span></div></div>' +
      "</div>" +
      '<div class="opening-actions"><button class="btn primary" type="button" id="run-both">Run both</button>' +
        '<span class="small muted presenter-chrome">Press it before you say anything.</span></div>' +
      '<dl class="lines3">' + lines.map((l) => "<div><dt>" + l[0] + "</dt><dd>" + l[1] + "</dd></div>").join("") + "</dl>" +
      '<p class="agenda">Agenda: ' + X.spine.map((s) => "<b>" + esc(s) + "</b>").join(" → ") + "</p>" +
      '<div class="tech techbox"><h4>Technical detail</h4><ul>' +
        "<li>The “after” answer is produced live by the simulator engine (BM25 + concept vectors + RRF + gate), not typed in.</li>" +
        "<li>Production: Copilot Studio → FastAPI on Azure → LangChain LCEL chain → Azure AI Search hybrid query → confidence gate → GPT-4.</li>" +
        "<li>One of " + F(C.agentsLed) + " GenAI agents in " + F(C.programme) + " whose technical design I led.</li></ul></div>";
  }
  let openingTimers = [];
  function runOpening() {
    openingTimers.forEach(clearTimeout); openingTimers = [];
    const at = (ms, fn) => openingTimers.push(setTimeout(fn, REDUCED ? 0 : ms));
    const docs = $$("#docstack .doc"), step = $("#hunt-step"), clock = $("#clock-before");
    docs.forEach((d) => d.classList.remove("peek", "doubt"));
    const q = K.presets[0].query;
    const r = E.run(sim.idx.structure, q, { balance: C.simulator.defaultBalance, scoreType: sim.scoreType, threshold: C.simulator.defaultThresholds[sim.scoreType] });
    $("#chat-a").innerHTML = ""; $("#typed").textContent = ""; $("#chat-q").hidden = true; $("#after-step").textContent = "Typing…"; $("#clock-after").textContent = "";
    // Before: a 7-second fast-forward of a 45-minute hunt.
    const stepsText = ["Searching shared drives…", "Opening a PDF report…", "Opening a Word document…", "Which version is current?", "Is this figure right?"];
    stepsText.forEach((t, k) => at(k * 1350, () => { step.textContent = t; }));
    docs.forEach((d, k) => at(250 + k * 700, () => { docs.forEach((x) => x.classList.remove("peek")); d.classList.add("peek"); }));
    at(4050, () => { docs[0].classList.add("doubt"); docs[1].classList.add("doubt"); });
    const total = 7000;
    for (let t = 0; t <= total; t += 175) at(t, () => { clock.innerHTML = Math.round((t / total) * 45) + "<small>min</small>"; });
    at(total + 60, () => { docs.forEach((x) => x.classList.remove("peek")); clock.innerHTML = F(C.problem.lookupMinutes) + "<small>min</small>"; step.textContent = "Found a figure. Still not sure it’s right."; });
    // After: type the question, then the engine's answer.
    for (let k = 1; k <= q.length; k++) at(k * 34, () => { $("#chat-q").hidden = false; $("#typed").textContent = q.slice(0, k); });
    const typed = q.length * 34;
    at(typed + 80, () => { $("#after-step").textContent = "Searching " + sim.idx.structure.N + " synthetic pages…"; });
    at(typed + 700, () => {
      $("#chat-a").innerHTML = '<div class="chat-a">' + answerInner(r, true) + "</div>";
      $("#after-step").textContent = "Answered, with its source.";
      $("#clock-after").innerHTML = "seconds";
    });
  }

  /* ---------------------------------------------------------------- 2 problem */
  const CURRENT_LANES = [{ id: "manager", label: "Manager" }, { id: "documents", label: "Documents" }, { id: "colleagues", label: "Colleagues" }];
  const FUTURE_LANES = [{ id: "manager", label: "Manager" }, { id: "agent", label: "Agent" }, { id: "reviewer", label: "Senior administrator" }];
  const FUTURE_COLS = [1, 2, 3, 4, 4, 5];
  const FUTURE_EDGES = [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5]];

  function lanesHTML(steps, lanes, opts) {
    const cols = opts.cols || steps.map((_, i) => i + 1);
    const n = Math.max.apply(null, cols);
    return '<div class="lanes' + (opts.compact ? " compact" : "") + '" data-lanes data-edges="' + esc(JSON.stringify(opts.edges || steps.slice(1).map((_, i) => [i, i + 1]))) + '">' +
      '<svg class="lane-svg" aria-hidden="true"></svg>' +
      lanes.map((L) => '<div class="lane"><div class="lane-name">' + esc(L.label) + '</div><div class="lane-track" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' +
        steps.map((s, i) => {
          if (s.lane !== L.id) return "";
          const cls = "step" + (s.worst ? " worst" : "") + (s.branch ? " " + s.branch : "");
          const inner = '<span class="n">' + (i + 1) + "</span>" + F(s.step) + (s.worst && !opts.compact ? '<span class="flag">Trust problem</span>' : "");
          return opts.clickable
            ? '<button type="button" class="' + cls + '" style="grid-column:' + cols[i] + '" data-step="' + i + '" aria-pressed="false">' + inner + "</button>"
            : '<div class="' + cls + '" style="grid-column:' + cols[i] + '" data-step="' + i + '">' + inner + "</div>";
        }).join("") + "</div></div>").join("") + "</div>";
  }
  function drawLanes(root) {
    $$("[data-lanes]", root).forEach((wrap) => {
      const svg = $("svg", wrap), box = wrap.getBoundingClientRect();
      if (!box.width) return;
      const edges = JSON.parse(wrap.dataset.edges);
      const el = (i) => $('[data-step="' + i + '"]', wrap);
      svg.innerHTML = edges.map(([a, b]) => {
        const A = el(a), B = el(b);
        if (!A || !B) return "";
        const ra = A.getBoundingClientRect(), rb = B.getBoundingClientRect();
        const x1 = ra.right - box.left, y1 = ra.top + ra.height / 2 - box.top, x2 = rb.left - box.left, y2 = rb.top + rb.height / 2 - box.top;
        const mid = x1 + Math.max(6, (x2 - x1) / 2);
        const d = Math.abs(y1 - y2) < 2 ? "M" + x1 + " " + y1 + "H" + (x2 - 2) : "M" + x1 + " " + y1 + "H" + mid + "V" + y2 + "H" + (x2 - 2);
        return '<path d="' + d + '" fill="none" stroke="var(--slate)" stroke-width="1.4" marker-end="url(#m-slate)"/>';
      }).join("");
    });
  }

  function renderProblem() {
    const cc = C.costCalculator;
    return '<div class="lanes-total"><h3>Today: one lookup, step by step</h3><span class="muted">' + F(C.problem.lookupMinutes) + " minutes each, " + F(C.problem.lookupsDescription) + "</span></div>" +
        lanesHTML(C.currentStateSteps, CURRENT_LANES, { clickable: true }) +
      '<div class="grid-2" style="margin-top:1.25rem;align-items:start">' +
      '<div class="step-detail" id="step-detail" aria-live="polite">Click a step. The two outlined ones are where the real problem showed.</div>' +
      '<div class="panel"><h3>What that costs one trust</h3>' +
        '<div class="calc-grid">' +
          field("c-min", "Minutes per lookup", cc.minutesPerLookup, cc.minutesNote, 1, 240) +
          field("c-per", "Lookups a day", cc.lookupsPerDay, cc.lookupsNote, 1, 500) +
          field("c-days", "Working days a year", cc.workingDays, cc.daysNote, 1, 366) +
        "</div>" +
        '<div class="calc-out"><output id="c-out" for="c-min c-per c-days" aria-live="polite"></output><span>staff hours a year</span></div>' +
        '<p class="small muted">Minutes × lookups a day × working days ÷ 60.</p>' +
        '<label class="switch"><input type="checkbox" id="c-wrong"> Include the cost of a wrong figure</label>' +
        '<div class="wrong-note" id="c-wrong-note" hidden>A wrong waiting-time figure can misdirect resources: staff, theatre time or money sent to the wrong specialty. ' +
          "It doesn’t show up in hours, and it’s closer to the liability worry the finance directors raised. I haven’t put a number on it.</div>" +
      "</div></div>" +
      '<div class="tech techbox"><h4>Technical detail</h4><ul>' +
        "<li>Sources: " + F(C.problem.documentsDescription) + ".</li>" +
        "<li>Typical figures: " + F(C.problem.figuresExamples) + ".</li>" +
        "<li>Calculator defaults come from <code>config.js</code> (costCalculator); each input shows where its default came from.</li></ul></div>";
  }
  function field(id, label, value, note, min, max) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" type="number" inputmode="numeric" min="' + min + '" max="' + max + '" value="' + esc(value) + '">' +
      '<span class="src">' + F(note) + "</span></div>";
  }
  function mountProblem(root) {
    const calc = () => {
      const v = (id) => Math.max(0, Number($("#" + id, root).value) || 0);
      $("#c-out", root).textContent = fmtInt((v("c-min") * v("c-per") * v("c-days")) / 60);
    };
    ["c-min", "c-per", "c-days"].forEach((id) => $("#" + id, root).addEventListener("input", calc));
    calc();
    $("#c-wrong", root).addEventListener("change", (e) => { $("#c-wrong-note", root).hidden = !e.target.checked; });
    $$(".step", root).forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.dataset.step), s = C.currentStateSteps[i];
      $$(".step", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const lane = CURRENT_LANES.find((l) => l.id === s.lane).label;
      $("#step-detail", root).innerHTML = "<strong>Step " + (i + 1) + " · " + esc(lane) + ":</strong> " + F(s.step) +
        '<span class="sd-row"><span class="muted">Time:</span> ' + (isFill(s.minutes) ? F(s.minutes) : esc(s.minutes) + " min") + "</span>" +
        '<span class="sd-row"><span class="muted">Pain point:</span> ' + F(s.pain) + "</span>" +
        (s.worst ? '<span class="sd-row"><strong>A trust problem, not a speed problem.</strong></span>' : "");
    }));
  }

  /* ------------------------------------------------------------------ 3 found */
  const MINI = [
    ["Ahead", ["blob", "indexer", "chunker", "embeddings", "index", "tenant"]],
    ["Live", ["copilot", "api", "search", "gate", "answer", "review"]]
  ];
  const MINI_SHORT = { blob: "Storage", indexer: "Indexer", chunker: "Chunker", embeddings: "Embeddings", index: "Index", tenant: "Governance",
    copilot: "Copilot Studio", api: "Service + chain", search: "Hybrid search", gate: "Gate", answer: "Cited answer", review: "Human review" };

  function renderFound() {
    // Discovery as one sentence: "How I found out: Interviews (12) · Shadowing (4) · … with 23 people (roles)."
    const methods = C.discoveryMethods.map((m) => "<strong>" + F(m.method) + "</strong>").join(" · ");
    const views = [["stake", "Stakeholders"], ["req", "Requirements"], ["measures", "Success measures"], ["future", "Before / after"]];
    return '<p class="methods-line"><span class="muted">How I found out:</span> ' + methods + "</p>" +
      '<div class="tabs" role="tablist" aria-label="Business analysis views">' +
        views.map((v) => '<button type="button" role="tab" data-view="' + v[0] + '" aria-pressed="' + (v[0] === state.view) + '" aria-selected="' + (v[0] === state.view) + '">' + v[1] + "</button>").join("") +
      "</div>" +
      '<div class="view" data-viewpane="stake">' + stakeView() + "</div>" +
      '<div class="view" data-viewpane="req" hidden>' + reqView() + "</div>" +
      '<div class="view" data-viewpane="measures" hidden>' + measuresView() + "</div>" +
      '<div class="view" data-viewpane="future" hidden>' + futureView() + "</div>" +
      '<div class="tech techbox"><h4>Traceability matrix</h4><table class="data"><thead><tr><th>Req</th><th>Priority</th><th>Requirement</th><th>From</th><th>Met by</th></tr></thead><tbody>' +
        C.requirements.map((r) => "<tr><td><code>" + esc(r.id) + "</code></td><td>" + esc(r.priority) + "</td><td>" + F(r.text) + "</td><td>" + esc((stakeholder(r.from) || {}).role || r.from) + "</td><td>" +
          (r.metBy.length ? r.metBy.map((n) => esc(nodeName(n))).join(", ") : '<span class="muted">Out of scope</span>') + "</td></tr>").join("") +
      "</tbody></table></div>";
  }
  function stakeView() {
    const dots = C.stakeholders.map((s) => {
      const x = Math.min(.94, Math.max(.06, s.interest)) * 100, y = (1 - Math.min(.94, Math.max(.06, s.power))) * 100;
      return '<button type="button" class="dot' + (s.interest > .8 ? " left" : "") + '" style="left:' + x + "%;top:" + y + '%" data-sh="' + s.id + '" aria-pressed="' + (s.id === state.stake) + '">' + esc(s.role) + "</button>";
    }).join("");
    return '<div class="pi"><div style="padding:1.6rem 0 1.6rem"><div class="pi-grid' + (C.stakeholderPositionsConfirmed ? "" : " unconfirmed") + '" role="group" aria-label="Stakeholder power and interest grid">' +
        '<span class="quad tl">Keep satisfied</span><span class="quad tr">Manage closely</span><span class="quad bl">Monitor</span><span class="quad br">Keep informed</span>' +
        '<span class="axis y">↑ Power</span><span class="axis x">Interest →</span>' + dots + "</div>" +
      '<p class="xsmall muted" style="margin:1.9rem 0 0">Power: how much they could shape or stop it. Interest: how much they cared.</p></div>' +
      '<div class="sh-detail" id="sh-detail" aria-live="polite"></div></div>';
  }
  function shDetail(id) {
    const s = stakeholder(id);
    if (!s) return "";
    return '<div class="role-name">' + esc(s.role) + '</div><dl class="kv"><dt>Cared about</dt><dd>' + F(s.concern) + "</dd>" +
      "<dt>How the design answered it</dt><dd>" + F(s.howAddressed) + "</dd>" +
      "<dt>Requirements</dt><dd>" + (s.requirements.length ? s.requirements.map((r) => '<button type="button" class="chip" data-goreq="' + r + '">' + esc(r) + "</button>").join(" ") : '<span class="muted">None tagged</span>') + "</dd></dl>";
  }
  function reqView() {
    const groups = ["Must", "Should", "Could", "Won't"];
    return '<div class="moscow">' + groups.map((g) => "<div><h4>" + (g === "Won't" ? "Won’t have (this phase)" : g + " have") + "</h4>" +
      C.requirements.filter((r) => r.priority === g).map((r) => '<button type="button" class="req" data-req="' + r.id + '" aria-pressed="' + (state.pinnedReq === r.id) + '">' +
        '<span class="chip">' + esc(r.id) + "</span><span>" + F(r.text) + '</span><span class="from">from ' + esc((stakeholder(r.from) || {}).role || r.from) + "</span></button>").join("") + "</div>").join("") + "</div>" +
      '<div class="trace"><div class="mini-arch" aria-hidden="true">' + MINI.map((row) => '<span class="ml">' + row[0] + "</span>" + row[1].map((n) => '<span class="mn" data-mn="' + n + '">' + MINI_SHORT[n] + "</span>").join("")).join("") + "</div>" +
      '<div class="trace-text" id="trace-text" aria-live="polite">Hover a requirement to see which part of the design meets it. Click to pin it: it reappears on the architecture.</div></div>';
  }
  function measuresView() {
    return '<div class="panel" style="max-width:68rem"><table class="data"><thead><tr><th>Measure</th><th>Baseline</th><th>Target</th><th>Actual</th></tr></thead><tbody>' +
      C.successMeasures.map((m) => "<tr><td><strong>" + F(m.measure) + "</strong></td><td>" + F(m.baseline) + "</td><td>" + F(m.target) + "</td><td>" + F(m.actual) + "</td></tr>").join("") +
      '</tbody></table><p class="small muted" style="margin-top:.6rem">Defined before the build. An actual I can’t evidence stays blank.</p></div>';
  }
  function futureView() {
    return '<div class="states"><div><h3 class="state-h">Before: ' + F(C.problem.lookupMinutes) + " minutes, and still unsure</h3>" + lanesHTML(C.currentStateSteps, CURRENT_LANES, { compact: true }) + "</div>" +
      '<div><h3 class="state-h">After: seconds, or a person checks. Never an unchecked guess.</h3>' + lanesHTML(X.futureState, FUTURE_LANES, { cols: FUTURE_COLS, edges: FUTURE_EDGES, compact: true }) + "</div></div>";
  }
  function traceText(id) {
    const r = C.requirements.find((x) => x.id === id);
    if (!r) return "";
    const met = r.metBy.length ? r.metBy.map((n) => "<strong>" + esc(nodeName(n)) + "</strong>").join(" and ") : "nothing: deliberately out of scope";
    return '<span class="chip hot">' + esc(r.id) + "</span> " + F(r.text) + " → met by " + met + "." + (state.pinnedReq === id ? ' <span class="muted">Pinned: you’ll see it on the architecture.</span>' : "");
  }
  function mountFound(root) {
    const showView = (v) => {
      state.view = v;
      $$("[data-view]", root).forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.view === v)); b.setAttribute("aria-selected", String(b.dataset.view === v)); });
      $$("[data-viewpane]", root).forEach((p) => { p.hidden = p.dataset.viewpane !== v; });
      requestAnimationFrame(() => drawLanes(root));
    };
    $$("[data-view]", root).forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
    const pickSh = (id) => {
      state.stake = id;
      $$("[data-sh]", root).forEach((d) => d.setAttribute("aria-pressed", String(d.dataset.sh === id)));
      $("#sh-detail", root).innerHTML = shDetail(id);
    };
    $$("[data-sh]", root).forEach((d) => d.addEventListener("click", () => pickSh(d.dataset.sh)));
    pickSh(state.stake);
    root.addEventListener("click", (e) => {
      const g = e.target.closest("[data-goreq]");
      if (g) { showView("req"); highlightReq(g.dataset.goreq, root); }
    });
    const reqs = $$("[data-req]", root);
    reqs.forEach((b) => {
      const on = () => highlightReq(b.dataset.req, root);
      b.addEventListener("mouseenter", on); b.addEventListener("focus", on);
      b.addEventListener("mouseleave", () => highlightReq(state.pinnedReq, root));
      b.addEventListener("click", () => {
        state.pinnedReq = state.pinnedReq === b.dataset.req ? null : b.dataset.req;
        reqs.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.req === state.pinnedReq)));
        highlightReq(b.dataset.req, root);
        updateArchTrace();
      });
    });
  }
  function highlightReq(id, root) {
    const r = C.requirements.find((x) => x.id === id);
    $$("[data-req]", root).forEach((b) => b.classList.toggle("hot", b.dataset.req === id));
    $$("[data-mn]", root).forEach((m) => m.classList.toggle("hot", !!r && r.metBy.indexOf(m.dataset.mn) !== -1));
    $("#trace-text", root).innerHTML = r ? traceText(id) : "Hover a requirement to see which part of the design meets it. Click to pin it: it reappears on the architecture.";
  }

  /* ----------------------------------------------------------- 4 architecture */
  const ROW1 = ["blob", "indexer", "chunker", "embeddings", "index"];
  const ROW2 = ["copilot", "api", "search", "gate", "answer"];
  const EDGES = [
    ["blob", "indexer"], ["indexer", "chunker"], ["chunker", "embeddings"], ["embeddings", "index"],
    ["copilot", "api"], ["api", "search"], ["index", "search", "down"], ["search", "gate"],
    ["gate", "answer", "h"], ["gate", "review", "branch", "not enough"]
  ];
  const reqsFor = (id) => C.requirements.filter((r) => r.metBy.indexOf(id) !== -1);

  function nodeHTML(id) {
    const n = nodeById(id);
    const chips = reqsFor(id).map((r) => '<span class="chip" data-chip="' + r.id + '">' + esc(r.id) + "</span>").join("");
    return '<button type="button" class="node' + (C.ownership[id] === "platform" ? " platform" : "") + '" data-node="' + id + '" aria-pressed="false" aria-label="' + esc(n.plain + ". " + n.product) + '">' +
      '<span class="np">' + esc(n.plain) + '</span><span class="nt">' + esc(n.product) + '</span><span class="nb">' + ownBadge(id) + chips + "</span></button>";
  }
  function renderArchitecture() {
    return '<div class="analogy-key" aria-label="The analogy used throughout">' + X.analogy.map((a) =>
        '<div class="an-item">' + PICTO[a.id] + '<span class="an-name">' + esc(a.name) + '</span><span class="an-eq">= <b>' + rich(a.real) + '</b></span><span class="an-plain">' + esc(a.plain) + "</span></div>").join("") + "</div>" +
      '<div class="trace-banner" id="trace-banner" hidden></div>' +
      '<div class="arch"><div>' +
        '<div class="diagram" id="diagram" role="group" aria-label="System architecture: select a component for details">' +
          '<svg class="diagram-svg" aria-hidden="true"></svg>' +
          '<div class="diagram-head"><div class="pipe-label">Ahead of time: filing the documents</div>' +
            '<div class="arch-controls"><button type="button" class="btn small" id="animate">Animate a question</button><button type="button" class="btn small quiet" id="animate-fail">Animate one it can’t answer</button></div></div>' +
          '<div class="pipe-row">' + ROW1.map(nodeHTML).join("") + "</div>" +
          '<div class="pipe-gap"></div>' +
          '<div class="pipe-label">Live: answering one question</div><div class="pipe-row">' + ROW2.map(nodeHTML).join("") + "</div>" +
          '<div class="review-row"><div style="grid-column:1/4;align-self:end"><button type="button" class="tenant" data-node="tenant">Governance: where it runs, what it holds, who can see it' +
            reqsFor("tenant").map((r) => ' <span class="chip" data-chip="' + r.id + '">' + esc(r.id) + "</span>").join("") + '</button></div><div></div>' + nodeHTML("review") + "</div>" +
        "</div>" +
        '<div class="arch-foot"><div class="legend"><span class="muted">Ownership:</span>' + Object.keys(X.ownershipLabels).map((k) => '<span class="own ' + X.ownershipLabels[k].cls + '">' + esc(X.ownershipLabels[k].label) + "</span>").join("") + "</div>" +
        '<div class="agents"><span><b>' + F(C.agentsLed) + "</b>agents: I led the technical design</span><span><b>" + F(C.otherAgents.builtTopicsFor) + "</b>simpler agents: I built the Copilot Studio topics</span><span><b>" +
          F(C.otherAgents.designedTeamBuilt) + "</b>agents: the team built them to my pattern, with my review</span></div></div>" +
      '</div><aside class="panel side" id="side" aria-live="polite"><p class="ph">Select any component to see what it does, why I chose it, what it cost, and what failure it prevents.</p></aside></div>' +
      '<div class="tech techbox"><h4>Technical detail</h4><ul>' +
        "<li>Indexing: scheduled Azure Function reads Blob Storage → two-path chunking (python-docx / pdfplumber for tables, tagged <code>type: table</code>; customised LangChain <code>RecursiveCharacterTextSplitter</code> for prose, overlap at section boundaries) → Azure OpenAI <code>text-embedding-ada-002</code> (1,536 dimensions) → text + vectors pushed to one Azure AI Search index.</li>" +
        "<li>Query: Copilot Studio calls a Python FastAPI service over HTTP. An explicit LCEL chain runs hybrid retrieval → confidence gate → prompt template with source metadata → GPT-4 via <code>AzureChatOpenAI</code>.</li>" +
        "<li>Hybrid: BM25 and vector queries run in parallel; Reciprocal Rank Fusion merges by rank position, not raw score. The balance is set with the <code>weight</code> property on the vector query.</li>" +
        "<li>Gate: " + gateExplanation() + " Below the threshold the chain short-circuits before the LLM call and returns a structured low-confidence response; a Copilot Studio branch creates the review task.</li>" +
        (C.thresholdScoreTypeConfirmed ? "" : '<li class="presenter-chrome"><span class="fill">Confirm thresholdScoreType in config.js</span></li>') +
        "</ul><pre>" + esc("chain = (\n    {\"docs\": hybrid_retriever, \"question\": RunnablePassthrough()}\n  | confidence_gate        # below threshold: return low-confidence response, no LLM call\n  | grounded_prompt        # context with document + section metadata, citation rules\n  | AzureChatOpenAI(deployment=\"gpt-4\")\n)") +
        '</pre><p class="xsmall muted">Illustrative shape of the chain, not production code.</p></div>';
  }
  function gateExplanation() {
    return C.thresholdScoreType === "semanticReranker"
      ? "thresholds the Azure AI Search semantic reranker score (0–4) of the top result."
      : "thresholds the vector (cosine) similarity of the top result.";
  }
  function sidePanel(id) {
    if (id === "tenant") {
      return "<h3>The trust's own Azure tenant</h3><div class=\"prod\">Everything runs inside infrastructure the trust already governs</div><dl class=\"five\">" +
        "<dt>What it does</dt><dd>Hosts every component: storage, search, the service and the model endpoint.</dd>" +
        "<dt>Why this choice</dt><dd>No document leaves infrastructure the trust already governs, and no new third-party data processor needed an assessment.</dd>" +
        "<dt>Trade-off</dt><dd>Tied to one cloud. A different trust on different infrastructure would need rework.</dd>" +
        "<dt>Failure it prevents</dt><dd>Trust documents sitting in a store outside the trust's own governance.</dd>" +
        "<dt>Meets</dt><dd>" + reqsFor("tenant").map((r) => '<span class="chip">' + esc(r.id) + "</span> " + F(r.text)).join("<br>") + "</dd></dl>";
    }
    const n = nodeById(id), reqs = reqsFor(id);
    return "<h3>" + esc(n.plain) + '</h3><div class="prod">' + esc(n.product) + "</div>" + ownBadge(id) +
      (n.ownNote ? ' <span class="xsmall muted">' + esc(n.ownNote) + "</span>" : "") +
      '<dl class="five"><dt>What it does</dt><dd>' + val(n.what) + "</dd><dt>Why this choice</dt><dd>" + val(n.why) + "</dd>" +
      "<dt>Trade-off</dt><dd>" + val(n.tradeoff) + "</dd><dt>Failure it prevents</dt><dd>" + val(n.prevents) + "</dd>" +
      (reqs.length ? "<dt>Meets</dt><dd>" + reqs.map((r) => '<span class="chip' + (r.id === state.pinnedReq ? " pinned" : "") + '">' + esc(r.id) + "</span> " + F(r.text)).join("<br>") + "</dd>" : "") + "</dl>";
  }
  function drawArch() {
    const d = $("#diagram");
    if (!d || !d.offsetWidth) return;
    const svg = $(".diagram-svg", d), box = d.getBoundingClientRect();
    const R = (id) => { const r = $('[data-node="' + id + '"]', d).getBoundingClientRect(); return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2 }; };
    svg.innerHTML = EDGES.map(([a, b, kind, label]) => {
      const A = R(a), B = R(b);
      let dpath, lx, ly;
      if (kind === "down") { const midY = A.b + (B.t - A.b) / 2; dpath = "M" + A.cx + " " + A.b + "V" + midY + "H" + B.cx + "V" + (B.t - 3); }
      else if (kind === "branch") { dpath = "M" + A.cx + " " + A.b + "V" + B.cy + "H" + (B.l - 3); lx = A.cx + 8; ly = B.cy - 8; }
      else { dpath = "M" + A.r + " " + A.cy + "H" + (B.l - 3); lx = A.r + 4; ly = A.cy - 8; }
      const lit = archLit.edges[a + "-" + b];
      return '<path class="edge' + (lit ? " " + lit : "") + '" data-edge="' + a + "-" + b + '" d="' + dpath + '" marker-end="url(#' + (lit === "lit-fail" ? "m-plum" : lit ? "m-spruce" : "m-slate") + ')"/>' +
        (label ? '<text class="edge-label" x="' + lx + '" y="' + ly + '">' + esc(label) + "</text>" : "");
    }).join("");
  }
  // Which nodes and edges the last "Animate" lit, so a redraw (resize, detail toggle) keeps them.
  const archLit = { nodes: {}, edges: {} };
  let animTimers = [];
  function animateQuestion(fail) {
    animTimers.forEach(clearTimeout); animTimers = [];
    const d = $("#diagram");
    archLit.nodes = {}; archLit.edges = {};
    $$(".node", d).forEach((n) => n.classList.remove("lit", "lit-fail"));
    $$(".edge", d).forEach((e) => { e.classList.remove("lit", "lit-fail"); e.setAttribute("marker-end", "url(#m-slate)"); });
    const path = fail ? ["copilot", "api", "index", "search", "gate", "review"] : ["copilot", "api", "index", "search", "gate", "answer"];
    const edges = fail ? ["copilot-api", "api-search", "index-search", "search-gate", "gate-review"] : ["copilot-api", "api-search", "index-search", "search-gate", "gate-answer"];
    path.forEach((id, k) => animTimers.push(setTimeout(() => {
      const cls = fail && (id === "gate" || id === "review") ? "lit-fail" : "lit";
      archLit.nodes[id] = cls;
      $('[data-node="' + id + '"]', d).classList.add(cls);
      const eid = edges[k - 1], e = eid && $('[data-edge="' + eid + '"]', d);
      if (e) { archLit.edges[eid] = cls; e.classList.add(cls); e.setAttribute("marker-end", cls === "lit-fail" ? "url(#m-plum)" : "url(#m-spruce)"); }
    }, REDUCED ? 0 : k * 650)));
    announce(fail ? "Path: question, service, search, gate fails, review task for a person." : "Path: question, service, search, gate passes, cited answer.");
  }
  function updateArchTrace() {
    const root = $("#s-architecture");
    if (!root) return;
    const id = state.pinnedReq, r = C.requirements.find((x) => x.id === id), banner = $("#trace-banner", root);
    $$(".node, .tenant", root).forEach((n) => n.classList.toggle("traced", !!r && r.metBy.indexOf(n.dataset.node) !== -1));
    $$("[data-chip]", root).forEach((c) => c.classList.toggle("pinned", c.dataset.chip === id));
    if (r) {
      banner.hidden = false;
      banner.innerHTML = "Tracing from the requirements: " + traceText(id).replace(/ <span class="muted">Pinned.*$/, "") + ' <button type="button" class="btn small quiet" id="clear-trace">Clear</button>';
      $("#clear-trace", banner).addEventListener("click", () => { state.pinnedReq = null; $$("#s-found [data-req]").forEach((x) => x.setAttribute("aria-pressed", "false")); updateArchTrace(); });
    } else banner.hidden = true;
  }
  function mountArchitecture(root) {
    $$("[data-node]", root).forEach((b) => b.addEventListener("click", () => {
      state.node = b.dataset.node;
      $$("[data-node]", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("#side", root).innerHTML = sidePanel(b.dataset.node);
    }));
    $("#animate", root).addEventListener("click", () => animateQuestion(false));
    $("#animate-fail", root).addEventListener("click", () => animateQuestion(true));
  }

  /* ------------------------------------------------------------- 5 simulation */
  const STAGES = ["Question", "Exact words", "Meaning", "Compare", "Check", "Answer"];
  const sim = {
    idx: { structure: E.buildIndex(K, { chunking: "structure" }), fixed: E.buildIndex(K, { chunking: "fixed" }) },
    query: K.presets[0].query, preset: "intent", mode: "guided", stage: 0,
    chunking: C.simulator.defaultChunking === "fixed" ? "fixed" : "structure",
    balance: C.simulator.defaultBalance != null ? C.simulator.defaultBalance : 0.5,
    scoreType: E.SCORE_TYPES[C.thresholdScoreType] ? C.thresholdScoreType : "vectorSimilarity",
    threshold: null, result: null, cutOpen: false
  };
  sim.threshold = C.simulator.defaultThresholds[sim.scoreType];
  const simOpts = () => ({ balance: sim.balance, scoreType: sim.scoreType, threshold: sim.threshold });
  const isDefaultSettings = () => sim.balance === (C.simulator.defaultBalance != null ? C.simulator.defaultBalance : 0.5) && sim.threshold === C.simulator.defaultThresholds[sim.scoreType];

  function chunkTitle(c) {
    if (c.type === "table") return c.doc.short + " › " + c.table.caption.split(".")[0];
    if (c.type === "fixed") return c.doc.short + " › chars " + (c.start + 1) + "–" + c.end;
    return c.doc.short + " › " + c.section.replace(/^\d+(\.\d+)?\.?\s*/, "");
  }
  // Only tag the kinds that matter to the story: whole tables, and cut fragments.
  const kindTag = (c) => (c.type === "prose" ? "" : '<span class="kind ' + c.type + '">' + (c.type === "fixed" ? "fragment" : "table") + "</span>");
  const conceptLabel = (id) => (K.concepts.find((c) => c.id === id) || { label: id }).label;

  function renderSimulation() {
    const st = E.SCORE_TYPES[sim.scoreType];
    return '<div class="sim guided" id="sim">' +
      '<div class="sim-bar">' +
        '<form class="ask" id="ask" role="search"><label class="sr-only" for="q">Ask the simulator a question</label><input id="q" autocomplete="off" spellcheck="false"><button type="submit">Ask</button></form>' +
        '<div class="sim-modes"><span class="lbl">View</span><div class="seg" id="sim-mode"><button type="button" data-mode="guided">Guided</button><button type="button" data-mode="full">Full view</button></div>' +
          '<span class="lbl">' + term("chunk", "Chunking") + '</span><div class="seg" id="sim-chunk"><button type="button" data-chunk="structure">Structure-aware</button><button type="button" data-chunk="fixed">Fixed 500-char</button></div></div>' +
        '<div class="presets" id="presets">' + K.presets.map((p, i) => '<button type="button" class="preset" data-preset="' + p.id + '" title="' + esc(p.query) + '"><b>' + (i + 1) + "</b>" + esc(p.label) + "</button>").join("") +
          '<button type="button" class="btn small quiet" id="cut-btn" aria-expanded="false" hidden>How the table is cut</button></div>' +
      "</div>" +
      '<div class="sim-sliders">' +
        '<div class="slider"><label for="bal">Keyword ↔ vector balance <output id="bal-out"></output></label><input id="bal" type="range" min="0" max="100" step="5"><div class="ends"><span>exact words only</span><span>meaning only</span></div></div>' +
        '<div class="slider"><label for="thr">Confidence threshold (' + esc(st.label.toLowerCase()) + ') <output id="thr-out"></output></label><input id="thr" type="range" min="0" max="' + st.max + '" step="' + (st.max > 1 ? 0.05 : 0.01) + '"><div class="ends"><span>answers anything</span><span>answers nothing</span></div></div>' +
      "</div>" +
      '<div class="caption"><div class="stage-dots" id="dots" role="group" aria-label="Stages">' + STAGES.map((s, i) => '<button type="button" data-stage="' + i + '" title="' + s + '" aria-label="Stage ' + (i + 1) + ": " + s + '">' + (i + 1) + "</button>").join("") + "</div>" +
        '<div class="cap-text" id="cap" aria-live="polite"></div><div><button type="button" class="btn small" id="step-next">Next step ▸</button></div></div>' +
      '<div class="rank-area" id="rank-area"><svg class="rank-svg" id="rank-svg" aria-hidden="true" data-st="3"></svg>' +
        '<div class="col col-a" data-st="1"><div class="col-head"><h3>Librarian A · exact words</h3><span>' + term("bm25", "BM25") + '</span></div><div class="concepts" id="words-a"></div><ol class="rows" id="rows-a" aria-label="Keyword ranking"></ol></div>' +
        '<div class="col col-f" data-st="3"><div class="col-head"><h3>Combined list</h3><span>' + term("rrf", "RRF") + ', k = 60</span></div><div class="concepts" id="note-f">pages high on both lists rise</div><ol class="rows" id="rows-f" aria-label="Combined ranking"></ol></div>' +
        '<div class="col col-b" data-st="2"><div class="col-head"><h3>Librarian B · meaning</h3><span>' + term("vector", "vector search") + '</span></div><div class="concepts" id="words-b"></div><ol class="rows" id="rows-b" aria-label="Vector ranking"></ol></div>' +
      "</div>" +
      '<div class="verdict"><div class="gate" id="gate" data-st="4"></div><div id="answer" data-st="5"></div></div>' +
      '<div id="cutview" hidden></div>' +
      '<p class="stand-in">Synthetic, fictional data. Meaning search is a simplified stand-in for embeddings (the real system used 1,536-dimension ada-002 vectors). Answers come from templates, not a language model.</p>' +
      '<div class="tech techbox" id="sim-tech"></div>' +
      "</div>";
  }

  function rowsHTML(list, col, r) {
    const fusedRank = {};
    r.fused.forEach((e, i) => { fusedRank[e.chunk.id] = i + 1; });
    const topId = r.top && r.top.id;
    if (!list.length) return '<li class="empty-col">' + (col === "a" ? "No page contains these words." : col === "b" ? "No page shares a meaning it recognises." : "Nothing to combine.") + "</li>";
    return list.slice(0, 5).map((x, i) => {
      const c = x.chunk;
      let sub, sc;
      // The sub-line (why it matched) only shows in full view; the lines carry the story in guided mode.
      if (col === "a") { sub = x.matched.map((m) => m.term).join(" · "); sc = x.score.toFixed(2); }
      else if (col === "b") { sub = x.shared.map(conceptLabel).join(" · "); sc = x.score.toFixed(2); }
      else {
        sub = [x.ranks.keyword ? "words #" + x.ranks.keyword : "", x.ranks.vector ? "meaning #" + x.ranks.vector : ""].filter(Boolean).join(" · ") || "";
        sc = x.score.toFixed(4);
      }
      void fusedRank;
      return '<li class="row' + (i === 0 ? " top" : "") + (c.id === topId && col === "f" ? " winner" : "") + '" data-chunk="' + esc(c.id) + '">' +
        '<span class="rk">' + (i + 1) + '</span><span class="tt"><b title="' + esc(c.doc.title + " › " + c.section) + '">' + esc(chunkTitle(c)) + kindTag(c) + "</b><i>" + esc(sub) + '</i></span><span class="sc">' + sc + "</span></li>";
    }).join("");
  }

  function answerInner(r, compact) {
    const a = r.answer;
    if (a.kind === "escalation") {
      return '<div class="atext">' + esc(a.text) + "</div>" + taskCard(a.task);
    }
    const c = a.citations[0];
    const cite = '<span class="cite"><b>[1]</b>' + esc(c.doc) + " › " + esc(c.section) + (c.detail ? " › " + esc(c.detail) : "") + "</span>";
    void compact;
    return '<div class="atext">' + esc(a.text) + "</div>" + cite;
  }
  function taskCard(t) {
    return '<div class="task" role="group" aria-label="Review task"><div class="task-head"><span>' + esc(t.id) + " · Task</span><span class=\"st\">" + esc(t.status) + "</span></div>" +
      '<dl class="task-body"><dt>Title</dt><dd>' + esc(t.title) + "</dd><dt>Queue</dt><dd>" + esc(t.queue) + "</dd><dt>Reason</dt><dd>" + esc(t.reason) + "</dd>" +
      "<dt>Attached</dt><dd>" + t.attached.map(esc).join("<br>") + "</dd></dl></div>";
  }

  function gateHTML(r) {
    const g = r.gate, pct = Math.max(0, Math.min(100, (g.score / g.max) * 100)), tp = Math.max(0, Math.min(100, (g.threshold / g.max) * 100));
    const note = g.scoreType === "semanticReranker"
      ? "Score: a stand-in for the semantic reranker (0–4), for the top page."
      : "Score: vector similarity of the top page.";
    return '<div class="gate-top"><h3>The invigilator checks the top page</h3><span class="score">' + g.score.toFixed(g.digits) + "<small> / " + g.max + "</small></span></div>" +
      '<div class="meter" role="meter" aria-valuemin="0" aria-valuemax="' + g.max + '" aria-valuenow="' + g.score.toFixed(2) + '" aria-label="' + esc(g.label) + '"><div class="fillbar" style="width:' + pct + '%"></div>' +
        '<div class="thr" style="left:' + tp + '%"><span>threshold ' + g.threshold.toFixed(g.digits) + "</span></div></div>" +
      '<div class="result">' + (g.pass ? "Good enough: answer it" : "Not good enough: hand it to a person") + "</div>" +
      '<div class="gnote">' + note + " Never the RRF score, which only ranks.</div>";
  }

  function answerHTML(r) {
    const a = r.answer, p = K.presets.find((x) => x.query === r.query);
    let html, cls = "answer";
    if (a.kind === "escalation") {
      cls += " esc";
      html = answerInner(r) + '<p class="proves"><b>The behaviour the board funded:</b> it would rather say “I can’t answer” than guess.</p>';
    } else if (a.method === "headerless-fragment") {
      cls += " wrong";
      const dgn = a.diagnosis;
      html = answerInner(r) +
        (dgn ? '<div class="reveal"><h4>Cited, confident, and wrong</h4>' + esc(dgn.usedValue) + " is the “" + esc(dgn.usedColumn) + "”" +
          (dgn.intendedColumn ? "; the " + esc(dgn.intendedColumn.replace(/\s*\(.*\)/, "").toLowerCase()) + " is " + esc(dgn.intendedValue) : "") +
          ". The column headings were cut off into the previous chunk, and it still passed the check. " +
          '<button type="button" class="linkbtn" data-open-cut>See the cut</button></div>' : "");
    } else {
      html = answerInner(r);
    }
    if (p && sim.chunking === "structure" && isDefaultSettings()) {
      const tr = X.presetTraces && X.presetTraces[p.id];
      const r0 = tr && C.requirements.find((x) => x.id === tr[0]), who = r0 && stakeholder(r0.from);
      html += '<p class="proves">' + esc(p.proves) + (r0 ? ' <span class="chip" title="' + esc(strip(undraft(r0.text))) + '">' + esc(r0.id) + "</span>" + (who ? " " + esc(who.role) : "") : "") + "</p>";
    }
    return '<div class="' + cls + '">' + html + "</div>";
  }

  function captionFor(stage, r) {
    const q = r.query, kTop = r.keyword[0], vTop = r.vector[0], f = r.fused[0];
    const quote = (t) => "“" + esc(t) + "”";
    switch (stage) {
      case 0: return ["A manager asks: " + quote(q), "Copilot Studio sends the question to the FastAPI service, which runs the LangChain " + term("lcel", "LCEL") + " chain"];
      case 1: return [kTop ? "Librarian A matches exact words. Top page: <strong>" + esc(chunkTitle(kTop.chunk)) + "</strong>, because it shares " + kTop.matched.map((m) => quote(m.term)).join(", ") + "."
        : "Librarian A finds no page containing these words.", "BM25 keyword search · k1 = 1.2, b = 0.75 · no stemming"];
      case 2: {
        if (!vTop) return ["Librarian B can’t tell what this is about: none of the words map to a meaning it knows.", "Vector search · cosine similarity"];
        const pair = synonymPair(r, vTop.chunk);
        const lead = pair ? "Librarian B searches by meaning, so " + quote(pair[0]) + " finds " + quote(pair[1]) + ". "
          : "Librarian B searches by meaning (" + esc(vTop.shared.map(conceptLabel).join(", ")) + "). ";
        return [lead + "Top page: <strong>" + esc(chunkTitle(vTop.chunk)) + "</strong>.", "Vector search · cosine similarity over 16 concepts (production: 1,536-dimension ada-002)"];
      }
      case 3: {
        if (!f) return ["Neither librarian found anything to compare.", "Reciprocal Rank Fusion"];
        const k = f.ranks.keyword, v = f.ranks.vector;
        let why;
        if (k && v && k > 1 && v > 1) why = "Neither librarian put it first, but both rated it highly (#" + k + " and #" + v + "), so it rises to the top.";
        else if (k && v) why = "It’s #" + k + " for words and #" + v + " for meaning: high on both lists.";
        else why = k ? "Only Librarian A found it (#" + k + ")." : "Only Librarian B found it (#" + v + ").";
        return ["They compare lists. <strong>" + esc(chunkTitle(f.chunk)) + "</strong> comes first. " + why, "Reciprocal Rank Fusion: score = Σ weight ÷ (60 + rank) · ranks only, never raw scores"];
      }
      case 4: {
        const g = r.gate, s = g.score.toFixed(g.digits), t = g.threshold.toFixed(g.digits);
        return [g.pass ? "The invigilator checks the top page: " + esc(g.label.toLowerCase()) + " " + s + " against a pass mark of " + t + ". Good enough to answer."
          : "The invigilator checks the top page: " + s + " is below the pass mark of " + t + ". The pages aren’t good enough, so no answer gets written.",
          "Confidence gate on " + esc(g.label.toLowerCase()) + ", before the model is called"];
      }
      default:
        if (r.answer.kind === "escalation") return ["The student says “I can’t answer this”, and a senior administrator gets a review task.", "Low-confidence response → Copilot Studio branch → existing task system"];
        if (r.answer.method === "headerless-fragment") return ["Open-book exam: the answer quotes the page and cites it. It looks right. It isn’t.", "Grounded prompt → GPT-4 (here: simulated behaviour on a headerless fragment)"];
        return ["Open-book exam: the answer uses only that page, and cites it.", "Grounded prompt → GPT-4 (here: a template, no model)"];
    }
  }
  // Find a query phrase and a different chunk phrase that light the same concept ("hip replacement" → "arthroplasty").
  function synonymPair(r, chunk) {
    const qHits = r.queryConcepts.hits, low = chunk.text.toLowerCase();
    for (const qh of qHits) {
      if (low.indexOf(qh.phrase) !== -1) continue;
      const ch = chunk.conceptHits.find((h) => h.concept === qh.concept && h.phrase !== qh.phrase);
      if (ch) return [qh.phrase, ch.phrase];
    }
    return null;
  }

  function simRun() {
    sim.result = E.run(sim.idx[sim.chunking], sim.query, simOpts());
    simRender(true);
  }
  function simRender(animate) {
    const root = $("#s-simulation"), r = sim.result;
    if (!root || !r) return;
    const simEl = $("#sim", root);
    simEl.classList.toggle("guided", sim.mode === "guided");
    simEl.classList.toggle("full", sim.mode === "full");
    $$("#sim-mode button", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === sim.mode)));
    $$("#sim-chunk button", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.chunk === sim.chunking)));
    $$("#presets .preset", root).forEach((b) => b.setAttribute("aria-pressed", String(K.presets.find((p) => p.id === b.dataset.preset).query === sim.query)));
    if (document.activeElement !== $("#q", root)) $("#q", root).value = sim.query;
    $("#bal", root).value = Math.round(sim.balance * 100);
    const w = E.weightsFor(sim.balance), eq = E.vectorWeightEquivalent(sim.balance);
    $("#bal-out", root).textContent = Math.round((1 - sim.balance) * 100) + "% words · " + Math.round(sim.balance * 100) + "% meaning (vector weight " + (isFinite(eq) ? eq.toFixed(2) : "∞") + ")";
    $("#thr", root).value = sim.threshold;
    $("#thr-out", root).textContent = sim.threshold.toFixed(E.SCORE_TYPES[sim.scoreType].digits);
    void w;

    // FLIP: remember where rows were
    const before = {};
    $$(".row", root).forEach((row) => { before[row.parentElement.id + "|" + row.dataset.chunk] = row.getBoundingClientRect().top; });

    $("#words-a", root).innerHTML = r.queryTerms.length ? r.queryTerms.map((t) => '<span class="kw">' + esc(t) + "</span>").join("") : '<span class="kw">no searchable words</span>';
    const seen = {};
    $("#words-b", root).innerHTML = r.queryConcepts.hits.filter((h) => !seen[h.phrase + h.concept] && (seen[h.phrase + h.concept] = 1))
      .map((h) => "<span>" + esc(h.phrase) + " → " + esc(conceptLabel(h.concept)) + "</span>").join("") || "<span>no recognised meaning</span>";
    // The table-cut view only makes sense with fixed-size chunks.
    $("#cut-btn", root).hidden = sim.chunking !== "fixed";
    if (sim.chunking !== "fixed" && sim.cutOpen) { sim.cutOpen = false; $("#cutview", root).hidden = true; $("#cut-btn", root).setAttribute("aria-expanded", "false"); $("#cut-btn", root).textContent = "How the table is cut"; }
    $("#rows-a", root).innerHTML = rowsHTML(r.keyword, "a", r);
    $("#rows-b", root).innerHTML = rowsHTML(r.vector, "b", r);
    $("#rows-f", root).innerHTML = rowsHTML(r.fused, "f", r);
    const gate = $("#gate", root);
    gate.className = "gate " + (r.gate.pass ? "pass" : "fail");
    gate.innerHTML = gateHTML(r);
    $("#answer", root).innerHTML = answerHTML(r);
    $("#sim-tech", root).innerHTML = simTech(r);
    applyStage();

    const svg = $("#rank-svg", root);
    if (animate && !REDUCED && Object.keys(before).length) {
      svg.style.opacity = "0";
      $$(".row", root).forEach((row) => {
        const key = row.parentElement.id + "|" + row.dataset.chunk, top = row.getBoundingClientRect().top;
        if (before[key] != null) {
          const dy = before[key] - top;
          if (Math.abs(dy) > 1) {
            row.style.transform = "translateY(" + dy + "px)"; row.style.transition = "none";
            requestAnimationFrame(() => { row.style.transition = "transform .42s cubic-bezier(.2,.7,.2,1)"; row.style.transform = ""; });
          }
        } else { row.style.opacity = "0"; requestAnimationFrame(() => { row.style.transition = "opacity .35s"; row.style.opacity = "1"; }); }
      });
      setTimeout(() => { drawLinks(); svg.style.transition = "opacity .25s"; svg.style.opacity = "1"; }, 460);
    } else drawLinks();
    if (sim.cutOpen) renderCut();
    announce(r.gate.pass ? "Top page: " + chunkTitle(r.top) + ". Gate passed. " + r.answer.text : "Gate failed: escalated to a senior administrator.");
  }

  function applyStage() {
    const root = $("#s-simulation");
    const st = sim.mode === "full" ? 99 : sim.stage;
    $$("[data-st]", root).forEach((el) => {
      const s = Number(el.dataset.st);
      el.classList.toggle("st-future", s > st);
      el.classList.toggle("st-past", sim.mode === "guided" && s < st);
      el.classList.toggle("st-now", s === st);
    });
    // Comparing keeps both lists lit; the answer keeps the gate readable beside it.
    if (sim.mode === "guided" && sim.stage === 3) $$(".col-a, .col-b", root).forEach((c) => c.classList.remove("st-past"));
    if (sim.mode === "guided" && sim.stage === 5) $("#gate", root).classList.remove("st-past");
    $$("#dots button", root).forEach((b) => {
      const i = Number(b.dataset.stage);
      b.classList.toggle("now", i === sim.stage); b.classList.toggle("done", i < sim.stage);
    });
    const cap = captionFor(sim.stage, sim.result);
    $("#cap", root).innerHTML = cap[0] + '<span class="cap-real">' + cap[1] + "</span>";
    $("#step-next", root).disabled = sim.stage >= STAGES.length - 1;
  }
  // In guided mode, keep the current stage on screen: the verdict sits below the lists.
  function followStage() {
    const root = $("#s-simulation");
    if (!root || root.hidden || sim.mode !== "guided") return;
    const behavior = REDUCED ? "auto" : "smooth";
    if (sim.stage >= 4) $(".verdict", root).scrollIntoView({ block: "end", behavior });
    else root.scrollTo({ top: 0, behavior });
  }
  function setStage(n) { sim.stage = Math.max(0, Math.min(STAGES.length - 1, n)); applyStage(); followStage(); }

  function drawLinks() {
    const area = $("#rank-area"), svg = $("#rank-svg");
    if (!area || !area.offsetWidth || !sim.result) return;
    const box = area.getBoundingClientRect(), topId = sim.result.top && sim.result.top.id;
    const rowOf = (col, id) => $('#rows-' + col + ' [data-chunk="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]', area);
    let paths = "";
    $$("#rows-f .row", area).forEach((fr) => {
      const id = fr.dataset.chunk, rf = fr.getBoundingClientRect(), yf = rf.top + rf.height / 2 - box.top;
      [["a", "right", rf.left - box.left], ["b", "left", rf.right - box.left]].forEach(([col, side, xf]) => {
        const src = rowOf(col, id);
        if (!src) return;
        const rs = src.getBoundingClientRect(), ys = rs.top + rs.height / 2 - box.top, xs = (side === "right" ? rs.right : rs.left) - box.left;
        const dx = (xf - xs) * 0.5;
        paths += '<path class="link ' + col + (id === topId ? " win" : "") + '" data-link="' + esc(id) + '" d="M' + xs + " " + ys + "C" + (xs + dx) + " " + ys + "," + (xf - dx) + " " + yf + "," + xf + " " + yf + '"/>';
      });
    });
    svg.innerHTML = paths;
  }

  function simTech(r) {
    const st = E.SCORE_TYPES[sim.scoreType];
    return "<h4>Technical detail</h4><ul>" +
      "<li><strong>BM25</strong>: idf(t) × tf·(k1+1) / (tf + k1·(1 − b + b·len/avglen)), k1 = 1.2, b = 0.75, summed over query words. Lower-case, punctuation split, filler words dropped, no stemming.</li>" +
      "<li><strong>Vector stand-in</strong>: a hand-written lexicon maps words and phrases to 16 concepts (“hip replacement” and “arthroplasty” both light <em>joints and orthopaedics</em>); repeated mentions are log-dampened; cosine similarity. Production: ada-002, 1,536 dimensions.</li>" +
      "<li><strong>RRF</strong>: each list contributes weight ÷ (60 + rank) from its top " + E.constants.LIST_DEPTH + ". Balance " + Math.round(sim.balance * 100) + "% meaning = vector query <code>weight</code> " +
        (isFinite(E.vectorWeightEquivalent(sim.balance)) ? E.vectorWeightEquivalent(sim.balance).toFixed(2) : "∞") + " with the text query fixed at 1, as in Azure AI Search.</li>" +
      "<li><strong>Gate</strong>: " + esc(st.label) + " of the top combined result vs threshold " + sim.threshold.toFixed(st.digits) + " (configured: <code>thresholdScoreType: \"" + esc(sim.scoreType) + "\"</code>). " +
        (sim.scoreType === "semanticReranker" ? "Stand-in: 4 × (0.6 × cosine + 0.4 × share of identifiers present), or 4 × cosine when the question has no identifiers. It only grades the top result; Azure’s ranker also re-orders the top 50." : "Cosine between the question and the top page’s concept vectors.") + "</li>" +
      "<li><strong>Chunking</strong>: " + (sim.chunking === "fixed" ? "fixed 500-character windows over the flattened document (" + sim.idx.fixed.N + " chunks)." : "tables whole and tagged <code>type: table</code>; prose split inside sections, " + E.constants.PROSE_CHUNK + " characters with " + E.constants.PROSE_OVERLAP + " overlap (" + sim.idx.structure.N + " chunks).") + "</li>" +
      "<li>Identifiers spotted in the question: " + (r.identifiers.length ? r.identifiers.map((t) => "<code>" + esc(t) + "</code>").join(", ") : "none") + ".</li></ul>" +
      "<h4 style=\"margin-top:.7rem\">The open-book exam paper (the grounded prompt the model would receive)</h4><pre>" + esc(r.prompt) + "</pre>" +
      '<p class="xsmall muted">Source: engine.js (about 450 lines, commented). tests.html checks every preset.</p>';
  }

  function renderCut() {
    const host = $("#cutview");
    const erpT = sim.idx.structure.chunks.find((c) => c.id === "erp:t2").table;
    const frags = sim.idx.fixed.chunks.filter((c) => c.docId === "erp");
    const rowIdx = erpT.rows.findIndex((r) => r[1] === "Primary arthroplasty");
    const usedCol = erpT.columns.indexOf("Longest wait (weeks)"), rightCol = erpT.columns.indexOf("Median wait (weeks)");
    const table = '<table class="data"><thead><tr>' + erpT.columns.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr></thead><tbody>" +
      erpT.rows.map((r, i) => '<tr class="' + (i === rowIdx ? "hl" : "") + '">' + r.map((v, j) => '<td class="' + (i === rowIdx && j === usedCol ? "hl-used" : i === rowIdx && j === rightCol ? "hl-right" : "") + '">' + esc(v) + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
    // Find the two fragments the table spans.
    const startI = frags.findIndex((c) => c.body.indexOf(erpT.caption) !== -1);
    const a = frags[startI], b = frags[startI + 1];
    const tail = a.body.slice(a.body.indexOf(erpT.caption));
    const noteAt = b.body.indexOf(erpT.note.slice(0, 20));
    const head = noteAt === -1 ? b.body : b.body.slice(0, noteAt + erpT.note.length);
    const markHeader = (s) => esc(s).replace(esc(erpT.columns.join(" | ")), "<mark>" + esc(erpT.columns.join(" | ")) + "</mark>");
    const markRow = (s) => esc(s).replace(/^(cs \| Primary arthroplasty \| 63)/, "<mark>$1</mark>");
    host.innerHTML = '<div class="cutview">' +
      '<div><h4>Structure-aware: one chunk, tagged <code>type: table</code></h4>' + table +
        '<p class="small" style="margin-top:.4rem">Cited as <span class="cite">' + esc("Elective Recovery Plan 2025/26 › 3. Waits by specialty › Table 2") + '</span>. Headings travel with every row: <span style="outline:2px solid var(--spruce);padding:0 .2rem">41</span> is the median.</p></div>' +
      "<div><h4>Fixed 500 characters: the same table, cut in two</h4><pre>" +
        '<span class="muted">' + esc(a.id) + " · characters " + (a.start + 1) + "–" + a.end + " (has the headings)</span>\n" + markHeader(tail) +
        '<span class="cutline"><span>chunk boundary at character ' + a.end + "</span></span>" +
        '<span class="muted">' + esc(b.id) + " · characters " + (b.start + 1) + "–" + b.end + " (has the figures, no headings)</span>\n" + markRow(head) + "</pre>" +
        '<p class="small" style="margin-top:.4rem">The cut lands inside “Trauma and orthopaedi|cs”. Query 1 retrieves the second chunk, and <span style="outline:2px solid var(--amber);padding:0 .2rem">63</span>, the first figure on the row, is the longest wait.</p></div></div>';
  }

  function setPreset(id) {
    const p = K.presets.find((x) => x.id === id);
    if (!p) return;
    sim.query = p.query; sim.preset = id; sim.stage = 0;
    simRun();
  }
  function mountSimulation(root) {
    $("#ask", root).addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#q", root).value.trim();
      if (!v) return;
      sim.query = v; sim.stage = 0; simRun(); $("#q", root).blur();
    });
    // After picking a preset, focus "Next step" so Space and → keep stepping through it.
    $$("#presets .preset", root).forEach((b) => b.addEventListener("click", () => {
      setPreset(b.dataset.preset);
      if (sim.mode === "guided") $("#step-next", root).focus();
    }));
    $$("#sim-mode button", root).forEach((b) => b.addEventListener("click", () => { sim.mode = b.dataset.mode; simRender(false); }));
    $$("#sim-chunk button", root).forEach((b) => b.addEventListener("click", () => { sim.chunking = b.dataset.chunk; simRun(); }));
    $("#bal", root).addEventListener("input", (e) => { sim.balance = Number(e.target.value) / 100; simRun(); });
    $("#thr", root).addEventListener("input", (e) => { sim.threshold = Number(e.target.value); simRun(); });
    $$("#dots button", root).forEach((b) => b.addEventListener("click", () => setStage(Number(b.dataset.stage))));
    $("#step-next", root).addEventListener("click", () => setStage(sim.stage + 1));
    const toggleCut = (open) => {
      sim.cutOpen = open == null ? !sim.cutOpen : open;
      $("#cutview", root).hidden = !sim.cutOpen;
      $("#cut-btn", root).setAttribute("aria-expanded", String(sim.cutOpen));
      $("#cut-btn", root).textContent = sim.cutOpen ? "Hide the table cut" : "How the table is cut";
      if (sim.cutOpen) { renderCut(); $("#cutview", root).scrollIntoView({ block: "nearest", behavior: REDUCED ? "auto" : "smooth" }); }
    };
    $("#cut-btn", root).addEventListener("click", () => toggleCut());
    root.addEventListener("click", (e) => { if (e.target.closest("[data-open-cut]")) toggleCut(true); });
    // Hovering a row lights the same page in every column, and its lines.
    $("#rank-area", root).addEventListener("mouseover", (e) => {
      const row = e.target.closest(".row");
      const id = row && row.dataset.chunk;
      $$(".row", root).forEach((x) => x.classList.toggle("hover", !!id && x.dataset.chunk === id));
      $$(".link", root).forEach((l) => l.classList.toggle("hover", !!id && l.dataset.link === id));
    });
    $("#rank-area", root).addEventListener("mouseleave", () => { $$(".row.hover, .link.hover", root).forEach((x) => x.classList.remove("hover")); });
    simRun();
  }

  /* --------------------------------------------------------------- 6 trade-offs */
  function renderTradeoffs() {
    return '<div class="records"><div class="record-list" role="tablist" aria-orientation="vertical" aria-label="Decisions">' +
      X.tradeoffs.map((t) => '<button type="button" role="tab" class="record-btn" data-rec="' + t.id + '" aria-selected="' + (t.id === state.record) + '" aria-controls="record"><b>' + esc(t.plain) + "</b><span>" + esc(strip(t.choice)) + " instead of " + esc(strip(t.alternative)) + "</span></button>").join("") +
      '</div><div class="record" id="record" role="tabpanel"></div></div>' +
      '<div class="tech techbox"><h4>All six at a glance</h4><table class="data"><thead><tr><th>Chose</th><th>Instead of</th><th>Served</th><th>What I gave up</th><th>When I’d choose differently</th></tr></thead><tbody>' +
        X.tradeoffs.map((t) => "<tr><td><strong>" + rich(t.choice) + "</strong></td><td>" + richCap(t.alternative) + "</td><td>" + (t.traces || []).map((r) => "<code>" + esc(r) + "</code>").join(" ") + "</td><td>" + val(t.gaveUp) + "</td><td>" + val(t.differently) + "</td></tr>").join("") + "</tbody></table></div>";
  }
  function recordHTML(id) {
    const t = X.tradeoffs.find((x) => x.id === id);
    return '<div class="record-head"><h3>' + esc(t.headline) + '</h3></div><dl class="record-rows">' +
      "<div><dt>Chose</dt><dd>" + rich(t.choice) + "</dd></div><div><dt>Instead of</dt><dd>" + richCap(t.alternative) + "</dd></div>" +
      "<div><dt>Why</dt><dd>" + val(t.why) + "</dd></div><div><dt>What I gave up</dt><dd>" + val(t.gaveUp) + "</dd></div>" +
      '<div class="differently"><dt>When I’d choose differently</dt><dd>' + val(t.differently) + "</dd></div>" +
      (t.traces && t.traces.length ? "<div><dt>The need it served</dt><dd>" + reqChips(t.traces) + "</dd></div>" : "") + "</dl>";
  }
  function mountTradeoffs(root) {
    const pick = (id, focus) => {
      state.record = id;
      $$("[data-rec]", root).forEach((b) => { b.setAttribute("aria-selected", String(b.dataset.rec === id)); b.tabIndex = b.dataset.rec === id ? 0 : -1; if (focus && b.dataset.rec === id) b.focus(); });
      $("#record", root).innerHTML = recordHTML(id);
    };
    $$("[data-rec]", root).forEach((b) => b.addEventListener("click", () => pick(b.dataset.rec)));
    $(".record-list", root).addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const ids = X.tradeoffs.map((t) => t.id), i = ids.indexOf(state.record);
      pick(ids[(i + (e.key === "ArrowDown" ? 1 : ids.length - 1)) % ids.length], true);
    });
    pick(state.record);
  }

  /* --------------------------------------------------------------- 7 guardrails */
  function renderGuardrails() {
    const forWho = (id) => {
      const r = C.requirements.find((x) => x.id === id), who = r && stakeholder(r.from);
      return r ? '<span class="lfor">For ' + esc(who ? who.role.charAt(0).toLowerCase() + who.role.slice(1) : r.from) + ' <span class="chip" title="' + esc(strip(undraft(r.text))) + '">' + esc(r.id) + "</span></span>" : "";
    };
    return '<div class="guard"><div><div class="layers">' + X.guardrails.map((l, i) =>
        '<div class="layer"><span class="ln">' + (i + 1) + '</span><span class="lname">' + rich(l.name) + '</span><span class="lcatch"><b>Guards against</b>' + rich(l.catches) + forWho(l.req) + "</span>" +
        '<span class="lan">' + esc(l.analogy) + ' · <span class="lex">' + esc(l.example) + "</span></span></div>").join("") + "</div>" +
        '<div class="leak"><strong>What gets through all three:</strong> a confident answer from a misleading page, like the cut table in the simulator. That’s what evaluation is for. ' +
          '<button type="button" class="btn small quiet" data-goto="wrong">What I’d change</button></div></div>' +
      '<div class="panel"><h3>Where it runs</h3>' +
        '<p class="small">Every component ran inside the trust\u2019s own Azure tenant: storage, search, the service and the model endpoint. No document left infrastructure the trust already governed, and no new third-party data processor had to be assessed.</p>' +
        '<p class="small" style="margin-top:.6rem">The system indexed planning and performance reports, not patient records. The figures it retrieves are aggregate \u2014 waits by specialty, referral volumes, occupancy by ward.</p>' +
        '<p class="xsmall muted presenter-chrome" style="margin-top:.5rem">Presenter: specifics on DPIA, access controls and retention \u2014 answer verbally, don\u2019t put numbers on screen.</p></div></div>' +
      '<div class="tech techbox"><h4>Technical detail</h4><ul>' +
        "<li>Layer 1: the prompt template carries document and section metadata for each chunk and instructs: answer only from context; if it isn’t there, say so; cite every factual claim.</li>" +
        "<li>Layer 2: the gate " + gateExplanation() + " The fused RRF score is never thresholded, because it is rank-based and not a similarity measure.</li>" +
        "<li>Layer 3: the structured low-confidence response triggers a Copilot Studio branch that creates a task in the trust’s existing task-management system.</li></ul></div>";
  }

  /* --------------------------------------------------------------- 6 copilot */
  function csNode(id) {
    const n = X.copilotFlow.find((x) => x.id === id) || X.copilotFlow[0];
    return "<h3>" + esc(n.name) + '</h3><div class="prod">' + esc(n.cs) + "</div><dl class=\"five\">" +
      "<dt>What it does</dt><dd>" + esc(n.what) + "</dd>" +
      "<dt>Why</dt><dd>" + esc(n.why) + "</dd>" +
      "<dt>What a learner would do here</dt><dd>" + esc(n.learner) + "</dd></dl>";
  }
  function renderCopilot() {
    return '<div class="cs">' +
      '<div><ol class="csflow" id="csflow">' + X.copilotFlow.map((n, i) =>
        '<li><button type="button" class="csnode" data-cs="' + n.id + '" aria-pressed="' + (i === 0) + '">' +
          '<span class="csn">' + (i + 1) + "</span><span class=\"csl\">" + esc(n.name) + "</span>" +
          '<span class="csc">' + esc(n.cs) + "</span></button></li>").join("") + "</ol>" +
        '<p class="small muted" style="margin-top:.7rem">Steps 1, 2, 6 and 7 are ordinary Copilot Studio. Steps 3 to 5 are where it calls out to the service.</p></div>' +
      '<div class="panel" id="cs-panel">' + csNode("trigger") + "</div></div>" +
      '<div class="tech techbox"><h4>Technical detail</h4><ul>' +
        "<li><strong>Why not the built-in knowledge sources:</strong> they give you retrieval you can\u2019t inspect or tune \u2014 no structure-aware chunking for clinical tables, no control of the keyword/vector balance, and no way to stop the model being called at all. Fine for general Q&amp;A; not for this.</li>" +
        "<li><strong>HTTP node timeout:</strong> defaults to 30 seconds, and a full retrieval plus generation can get close under load. A holding message before the call, and tight context, both help.</li>" +
        "<li><strong>Continue on error:</strong> the node can either raise and stop the agent, or populate a status code into a variable and carry on. I took the second, so a failure routes down the same escalation branch as a low-confidence answer rather than showing a platform error.</li>" +
        "<li><strong>Authentication:</strong> Entra ID rather than a shared key, so the service sees a real identity on every request.</li></ul></div>";
  }
  function mountCopilot(root) {
    $$("[data-cs]", root).forEach((b) => b.addEventListener("click", () => {
      $$("[data-cs]", root).forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      $("#cs-panel", root).innerHTML = csNode(b.dataset.cs);
    }));
  }

  /* ---------------------------------------------------------------- 8 adoption */
  // Only renders rows that are actually set. If none are, the card is left out entirely
  // and the status is given verbally, rather than showing a placeholder as if it were a fact.
  function statusCard() {
    const rows = [["Status", C.deploymentStatus], ["Users", C.currentUsers], ["Since", C.since]].filter((r) => !isFill(r[1]));
    if (!rows.length) return "";
    return '<div class="status-card" aria-label="Current status"><div class="k">Where it is now</div><div class="status-grid">' +
      rows.map((r) => '<div><div class="k">' + esc(r[0]) + '</div><div class="v">' + F(r[1]) + "</div></div>").join("") + "</div></div>";
  }
  function renderAdoption() {
    const b = C.businessCase, p = C.pilot;
    const principles = [
      ["Meet people in tools they already use", "Copilot Studio as the front end, and human review routed into the trust’s existing task system."],
      ["Make it safe to trust", "A citation on every answer, so any figure can be checked against its source."],
      ["Start small and learn", "A pilot with " + F(p.cohort) + " " + F(p.cohortRole) + " on real queries over " + F(p.duration) + "."],
      ["Give the cautious a role", "Senior administrators became reviewers, not bystanders."]
    ];
    const res = (C.resistanceAndResponse || []).filter((x) => x && (x.concern || x.response));
    return '<ol class="timeline">' +
        "<li><b>Board concern: " + (isFill(b.boardConcern) ? F(b.boardConcern) : esc(String(b.boardConcern).toLowerCase())) + "</b><span>Finance directors and clinical leads weren’t worried whether AI could find documents. They were worried about liability.</span></li>" +
        "<li><b>I showed it refusing</b><span>" + F(b.whatIShowed) + ". The same behaviour you just saw with query 4 in the simulator.</span></li>" +
        "<li><b>Sponsoring within " + F(b.timeToSponsorship) + "</b><span>From sceptical to sponsoring after seeing the prototype.</span></li>" +
        "<li><b>" + F(b.funding) + " board funding</b><span>" + esc(cap1(b.wonBy || "partly")) + " won by the guardrail demo." + (isFill(b.fundingScope) ? "" : " Funded: " + F(b.fundingScope) + ".") + "</span></li>" +
      "</ol>" +
      '<div class="opening-actions" style="margin-top:-.2rem"><button type="button" class="btn" id="replay" title="Opens simulator query 4 at the confidence check">Replay the moment</button></div>' +
      '<div class="adopt"><div><h3 style="margin-bottom:.4rem">Designing for adoption</h3><dl class="pairs">' +
        principles.map((x) => "<div><dt>" + esc(x[0]) + "</dt><dd>" + x[1] + "</dd></div>").join("") +
        "</dl>" +
        (res.length ? '<h3 style="margin:1rem 0 .4rem">Resistance, and how I handled it</h3><dl class="pairs">' + res.map((x) => "<div><dt>" + F(x.who) + ": " + F(x.concern) + "</dt><dd>" + F(x.response) + "</dd></div>").join("") + "</dl>" : "") +
        '<p class="tech small muted" style="margin-top:.6rem">The guardrail demo was part of the case, not all of it: the programme had a wider business case behind it.</p>' +
      '</div><div class="stack">' +
        statusCard() +
        '<div class="panel"><h3>Pilot signals</h3><div class="signals">' +
          '<div class="signal"><div class="k">Handed to a person</div><div class="v">' + F(p.escalationRate) + "</div></div></div>" +
          '<p class="small" style="margin-top:.7rem"><strong>Why a nonzero rate is healthy:</strong> in healthcare, a system that never escalates is probably answering some questions it shouldn’t. The real question is whether it escalates the right ones.</p>' +
          '<p class="xsmall muted">' + F(p.cohort) + " " + F(p.cohortRole) + ", " + F(p.duration) + ", real queries. " + F(p.checks) + ".</p></div>" +
      "</div></div>";
  }
  function mountAdoption(root) {
    $("#replay", root).addEventListener("click", () => {
      sim.chunking = "structure"; sim.mode = "guided"; sim.balance = C.simulator.defaultBalance; sim.threshold = C.simulator.defaultThresholds[sim.scoreType];
      setPreset("outofscope"); sim.stage = 4; applyStage();
      go(idxOf("simulation"));
    });
  }

  /* ------------------------------------------------------------------- 9 wrong */
  function renderWrong() {
    return '<div class="wrong-grid"><div><h3 style="margin-bottom:.3rem">Failures caught in testing, and fixed</h3>' +
        X.failures.map((f) => '<div class="failure"><b>' + esc(f.what) + "</b><span>" + esc(f.how) + ' <span class="fixed">Fixed:</span> <span class="fixtext">' + esc(f.fix) + "</span></span></div>").join("") + "</div>" +
      '<div><h3 style="margin-bottom:.3rem">The honest gap</h3><ul class="gaps">' + X.gaps.map((g) => "<li>" + esc(g) + "</li>").join("") + "</ul>" +
        '<div class="risk"><strong>The risk this leaves:</strong> subtle wrong answers that users can’t detect. Like the cut-table answer in the simulator: cited, plausible and wrong.</div>' +
        '<p class="tech small muted" style="margin-top:.6rem">What did exist: user acceptance testing with ' + F(C.pilot.cohort) + " " + F(C.pilot.cohortRole) + ", task completion tracking, an escalation rate of " + F(C.pilot.escalationRate) + ", and manual spot-checks.</p></div></div>" +
      '<div class="evald"><h3 style="margin-bottom:.6rem">What I’d build first: evaluation in two layers</h3><div class="evald-grid">' +
        '<div class="ev"><h4>Retrieval</h4><div class="q">Did it find the right page?</div><ul><li>About 100 real-distribution questions, each labelled with its relevant chunks</li><li>' + term("precision") + " and " + term("recall") + "</li></ul></div>" +
        '<div class="ev"><h4>Generation</h4><div class="q">Did it answer faithfully from that page?</div><ul><li>' + term("faithful") + " via human review, or " + term("judge") + " calibrated against human labels</li></ul></div>" +
        '<div class="ci"><b>Both run in ' + term("ci") + "</b>on every change to chunking, embeddings, retrieval settings or the prompt. Retrieval and generation fail independently, so they’re tested separately.</div>" +
      "</div></div>" +
      '<p class="quote">Evaluation was the least mature part of what I built. If I did it again, it’s the first thing I’d invest in.</p>' +
      '<div class="tech techbox"><h4>Technical detail</h4><ul>' +
        "<li>Golden set: sampled from real query logs so the distribution matches use (codes, wards, intent questions, out-of-scope), with relevant chunk ids labelled by subject experts.</li>" +
        "<li>Retrieval metrics: precision@k and recall@k at the k actually passed to the prompt; track per query type, because hybrid weighting trades one type against another.</li>" +
        "<li>Generation: faithfulness (every claim supported by a cited chunk) and correct refusal; an LLM judge only after checking its agreement with human labels.</li>" +
        "<li>Gate: track the escalation rate alongside the share of escalations a reviewer could have answered from the index, to recalibrate the threshold.</li></ul></div>";
  }

  /* ---------------------------------------------------------------- 10 learners */
  function renderLearners() {
    return '<p style="font-size:var(--fs-md);max-width:62ch">A Copilot Studio agent with a knowledge source runs the same machinery under the hood: ' + term("chunk", "chunking") + ", retrieval, " + term("grounding", "grounding") +
        " and citations. When a learner’s agent gives a wrong answer, knowing the mechanism lets them diagnose it instead of guessing.</p>" +
      '<div class="diag">' + X.learnerQuestions.map((q, i) => '<div class="dq"><span class="qn">' + (i + 1) + '</span><span class="ql">' + esc(q.layer) + '</span><span class="qq">' + esc(q.q) + '</span><span class="qif"><strong>If not:</strong> ' + esc(q.ifNo) + "</span></div>").join("") +
        '<div class="dq end"><span class="ql">Both yes, still wrong?</span><span class="qq">Then the page itself is wrong or out of date.</span><span class="qif">That’s a job for whoever owns the document.</span></div></div>' +
      '<div class="opening-actions"><button type="button" class="btn quiet" id="try-wrong">Try it on the simulator’s wrong answer</button></div>' +
      '<p class="makers">It’s the AI Essentials arc in miniature: master the tool, automate a real use case, then rethink the work around it.</p>' +
      '<dl class="pairs jdmap">' + X.jdBridge.map((j) => "<div><dt>" + esc(j.ask) + "</dt><dd>" + esc(j.shown) + "</dd></div>").join("") + "</dl>" +
      '<div class="tech techbox"><h4>Technical detail</h4><ul><li>In Copilot Studio, check the activity map or test pane to see which knowledge sources were used for an answer: that answers question 1.</li>' +
        "<li>Question 2 is about the instructions: ask for answers only from the knowledge source, with citations, and a fallback when nothing relevant is found.</li></ul></div>";
  }
  function mountLearners(root) {
    $("#try-wrong", root).addEventListener("click", () => {
      sim.chunking = "fixed"; sim.mode = "guided"; sim.balance = C.simulator.defaultBalance; sim.threshold = C.simulator.defaultThresholds[sim.scoreType];
      setPreset("intent"); sim.stage = 5; applyStage();
      go(idxOf("simulation"));
    });
  }

  /* -------------------------------------------------------------------- 11 close */
  function renderClose() {
    return '<ul class="three">' + X.closeThings.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>" +
      '<h3 class="tiles-h">Where would you like to go deeper?</h3><div class="tiles">' +
      X.tiles.map((t) => '<button type="button" class="tile" data-tile="' + t.section + '">' + esc(t.label) + "<span>" + esc(S[idxOf(t.section)].nav) + "</span></button>").join("") + "</div>";
  }
  function mountClose(root) {
    $$("[data-tile]", root).forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.tile;
      if (id === "simulation") { sim.mode = "full"; simRender(false); }
      setTech(idxOf(id), true);
      go(idxOf(id));
    }));
  }

  const RENDER = { opening: renderOpening, problem: renderProblem, found: renderFound, architecture: renderArchitecture, simulation: renderSimulation,
    copilot: renderCopilot, tradeoffs: renderTradeoffs, guardrails: renderGuardrails, adoption: renderAdoption, wrong: renderWrong, learners: renderLearners, close: renderClose };
  const MOUNT = { opening: (r) => $("#run-both", r).addEventListener("click", runOpening), problem: mountProblem, found: mountFound, architecture: mountArchitecture,
    simulation: mountSimulation, copilot: mountCopilot, tradeoffs: mountTradeoffs, adoption: mountAdoption, learners: mountLearners, close: mountClose };
  const ENTER = {
    problem: (r) => drawLanes(r), found: (r) => drawLanes(r),
    architecture: () => { drawArch(); updateArchTrace(); },
    simulation: () => { simRender(false); requestAnimationFrame(followStage); }
  };
  // Sections that consume →/← before moving on (guided simulator steps).
  const STEP = {
    simulation: (dir) => {
      if (sim.mode !== "guided") return false;
      if (dir > 0 && sim.stage < STAGES.length - 1) { setStage(sim.stage + 1); return true; }
      if (dir < 0 && sim.stage > 0) { setStage(sim.stage - 1); return true; }
      return false;
    }
  };

  /* ============================================================== navigation */
  function build() {
    const main = $("#main");
    main.innerHTML = S.map((s) => '<section class="slide" id="s-' + s.id + '" data-id="' + s.id + '" aria-labelledby="h-' + s.id + '" tabindex="-1" hidden></section>').join("");
    S.forEach((s) => {
      const el = $("#s-" + s.id);
      el.innerHTML = shell(s, RENDER[s.id]());
      if (MOUNT[s.id]) MOUNT[s.id](el);
      $("[data-tech-toggle]", el).addEventListener("click", () => setTech(idxOf(s.id)));
      el.addEventListener("click", (e) => { const g = e.target.closest("[data-goto]"); if (g) go(idxOf(g.dataset.goto)); });
    });
    $("#spine").innerHTML = X.spine.map((label, i) => '<li><button type="button" data-spine="' + i + '">' + esc(label) + "</button></li>").join("");
    $$("[data-spine]").forEach((b) => b.addEventListener("click", () => go(S.findIndex((s) => s.stage === Number(b.dataset.spine)))));
    // Shared SVG arrowheads
    const defs = document.createElement("div");
    defs.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      ["slate", "spruce", "plum"].map((c) => '<marker id="m-' + c + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--' + c + ')"/></marker>').join("") + "</defs></svg>";
    document.body.appendChild(defs.firstChild);
  }

  function setTech(i, force) {
    const s = S[i], el = $("#s-" + s.id);
    state.tech[s.id] = force != null ? force : !state.tech[s.id];
    el.classList.toggle("show-tech", state.tech[s.id]);
    const b = $("[data-tech-toggle]", el);
    b.setAttribute("aria-expanded", String(state.tech[s.id]));
    b.textContent = state.tech[s.id] ? "Hide technical detail" : "Technical detail";
    if (i === state.i) requestAnimationFrame(redraw);
  }

  function go(i, opts) {
    i = Math.max(0, Math.min(S.length - 1, i));
    const prev = S[state.i], next = S[i];
    timerSwitch(prev.id);
    hideTip();
    $$(".slide").forEach((el) => { el.hidden = el.dataset.id !== next.id; });
    state.i = i;
    const el = $("#s-" + next.id);
    if (!REDUCED && !(opts && opts.instant)) { el.classList.remove("is-entering"); void el.offsetWidth; el.classList.add("is-entering"); }
    el.scrollTop = 0;
    $$("#spine li").forEach((li, k) => { li.className = k < next.stage ? "past" : k === next.stage ? "now" : ""; });
    $$("#spine button").forEach((b, k) => b.setAttribute("aria-current", k === next.stage ? "step" : "false"));
    $("#counter").textContent = (i + 1) + " / " + S.length;
    if (location.hash !== "#" + next.id) history.replaceState(null, "", "#" + next.id);
    document.title = next.nav + " · Document-retrieval agent (recreation)";
    if (ENTER[next.id]) requestAnimationFrame(() => ENTER[next.id](el));
    if (!(opts && opts.keepFocus)) el.focus({ preventScroll: true });
    renderNotes(); renderTimer();
    announce("Section " + (i + 1) + " of " + S.length + ": " + next.nav + ". " + next.headline);
  }
  function step(dir) {
    const cur = S[state.i];
    if (STEP[cur.id] && STEP[cur.id](dir)) return;
    go(state.i + dir);
  }
  function redraw() {
    const id = S[state.i].id, el = $("#s-" + id);
    if (ENTER[id]) ENTER[id](el);
  }

  /* =========================================================== presenter tools */
  const timer = { started: false, shown: false, t0: 0, per: {}, secStart: 0 };
  function timerKey(reset) {
    if (reset) { timer.started = false; timer.per = {}; timer.shown = false; renderTimer(); return; }
    if (!timer.started) { timer.started = true; timer.shown = true; timer.t0 = Date.now(); timer.secStart = Date.now(); }
    else timer.shown = !timer.shown;
    renderTimer();
  }
  function timerSwitch(prevId) {
    if (!timer.started) return;
    timer.per[prevId] = (timer.per[prevId] || 0) + (Date.now() - timer.secStart);
    timer.secStart = Date.now();
  }
  const mmss = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const target = (id) => (C.sectionTimings && C.sectionTimings[id]) || 0;
  const totalTarget = () => S.reduce((a, s) => a + target(s.id), 0);
  function timerText() {
    const id = S[state.i].id;
    if (!timer.started) return { text: "Timer off (T)", cls: "" };
    const sec = (timer.per[id] || 0) + (Date.now() - timer.secStart), tot = Date.now() - timer.t0, tg = target(id) * 60000;
    return { text: mmss(sec) + " / " + mmss(tg) + " · total " + mmss(tot) + " / " + mmss(totalTarget() * 60000), cls: tg && sec > tg * 1.25 ? "over2" : tg && sec > tg ? "over" : "" };
  }
  function renderTimer() {
    const el = $("#timer"), t = timerText();
    el.hidden = !timer.shown;
    el.textContent = t.text;
    el.className = "timer " + t.cls;
    if (pop && !pop.closed) { const pt = pop.document.getElementById("ptimer"); if (pt) { pt.textContent = t.text; pt.className = t.cls; } }
  }
  setInterval(() => { if (timer.started) renderTimer(); }, 1000);

  function notesHTML(forPopup) {
    const s = S[state.i], nx = S[state.i + 1];
    return '<div class="dhead"><h2>Notes · ' + esc(s.nav) + "</h2><div>" + (forPopup ? "" : '<button type="button" class="btn small quiet" id="notes-pop">Pop out</button> <button type="button" class="btn small quiet" data-close="notes">Close</button>') + "</div></div>" +
      '<p class="small muted">Target ' + target(s.id) + " min" + (nx ? " · next: " + esc(nx.nav) : " · then questions (" + (C.questionsMinutes || 10) + " min)") + "</p>" +
      "<ul>" + s.notes.map((n) => "<li>" + esc(n) + "</li>").join("") + "</ul>" +
      '<p class="small" style="margin-top:.8rem"><strong>Headline:</strong> ' + esc(s.headline) + "</p>";
  }
  function questionsHTML(forPopup) {
    return '<div class="dhead"><h2>Anticipated questions</h2>' + (forPopup ? "" : '<button type="button" class="btn small quiet" data-close="questions">Close</button>') + "</div>" +
      '<p class="small muted">Answers use only the brief and config.js. Amber = fill before presenting.</p>' +
      X.questions.map((q) => "<details><summary>" + esc(q.q) + "</summary><p>" + q.a(F, C) + "</p></details>").join("");
  }
  function renderNotes() {
    const n = $("#notes");
    if (!n.hidden) { n.innerHTML = notesHTML(false); bindDrawer(n); }
    if (pop && !pop.closed) {
      pop.document.getElementById("pnotes").innerHTML = notesHTML(true);
      pop.document.getElementById("pcount").textContent = (state.i + 1) + " / " + S.length;
    }
  }
  function bindDrawer(n) {
    const c = $("[data-close]", n);
    if (c) c.addEventListener("click", () => { n.hidden = true; });
    const p = $("#notes-pop", n);
    if (p) p.addEventListener("click", popOut);
  }
  function toggleDrawer(id) {
    const n = $("#" + id), other = $("#" + (id === "notes" ? "questions" : "notes"));
    n.hidden = !n.hidden; other.hidden = true;
    if (!n.hidden) { n.innerHTML = id === "notes" ? notesHTML(false) : questionsHTML(false); bindDrawer(n); }
  }

  // Pop-out presenter window: an about:blank window inherits this page's origin, so it can be
  // updated directly, even from file://. Share the main window; keep this one on your screen.
  let pop = null;
  function popOut() {
    pop = window.open("", "nrd-presenter", "width=600,height=900");
    if (!pop) { alert("The browser blocked the pop-out window. Allow pop-ups for this file, or use the N panel."); return; }
    const css = "body{font:18px/1.45 'Segoe UI',system-ui,sans-serif;margin:0;padding:1.2rem 1.4rem;background:#F7F8F6;color:#14201B}h2{font-size:1.3rem;margin:0}" +
      ".dhead{display:flex;justify-content:space-between}.muted{color:#4F5D57}.small{font-size:.9rem}li{margin:.4rem 0;font-size:1.25rem}details{border-bottom:1px solid #CDD4D0;padding:.4rem 0}" +
      "summary{cursor:pointer;font-weight:600}#ptimer{font:600 1.6rem Consolas,monospace}#ptimer.over,#ptimer.over2{color:#A04A00}.fill{color:#A04A00;border:1.5px solid #A04A00;padding:0 .3em;font:600 .8em Consolas,monospace}" +
      ".draft{outline:1.5px dotted #A04A00}hr{border:0;border-top:2px solid #14201B;margin:1rem 0}";
    pop.document.open();
    pop.document.write('<!doctype html><title>Presenter notes</title><style>' + css + '</style><div style="display:flex;justify-content:space-between;align-items:baseline"><span id="ptimer">Timer off (T)</span><span id="pcount" class="muted"></span></div>' +
      '<p class="small muted">Keys work here too: ← → D T. Keep this window off the shared screen.</p><div id="pnotes"></div><hr><div id="pq">' + questionsHTML(true) + "</div>");
    pop.document.close();
    pop.document.addEventListener("keydown", onKey);
    renderNotes(); renderTimer();
  }

  function menuHTML() {
    let cum = 0;
    const short = new Set(["opening", "problem", "architecture", "simulation", "adoption", "wrong", "close"]);
    const shortMin = S.filter((s) => short.has(s.id)).reduce((a, s) => a + target(s.id), 0);
    return '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="menu-h"><div class="dhead" style="display:flex;justify-content:space-between;align-items:center"><h2 id="menu-h">Jump to a section</h2><button type="button" class="btn small quiet" data-close-menu>Close (Esc)</button></div>' +
      '<p class="small muted">Targets add up to ' + totalTarget() + " min, then " + (C.questionsMinutes || 10) + ' min of questions. <span style="color:var(--spruce)">●</span> = short path (' + shortMin + " min).</p>" +
      '<ol class="menu-list">' + S.map((s, i) => {
        const start = cum; cum += target(s.id);
        return '<li><button type="button" data-jump="' + i + '" class="' + (i === state.i ? "cur" : "") + '"><span class="n">' + (i + 1) + '</span><span class="' + (short.has(s.id) ? "short" : "") + '">' + esc(s.nav) + '</span><span class="h">' + esc(s.headline) + '</span><span class="t">' + target(s.id) + ' min</span><span class="t muted">@' + mmss(start * 60000) + "</span></button></li>";
      }).join("") + "</ol>" +
      '<p class="small" style="margin-top:.9rem"><kbd>→</kbd> <kbd>Space</kbd> next · <kbd>←</kbd> back · <kbd>1</kbd>–<kbd>4</kbd> simulator presets · <kbd>N</kbd> notes · <kbd>Q</kbd> questions · <kbd>D</kbd> technical detail · ' +
        "<kbd>T</kbd> timer (<kbd>Shift</kbd>+<kbd>T</kbd> reset) · <kbd>C</kbd> clean mode · <kbd>L</kbd> theme · <kbd>Esc</kbd> close</p>" +
      '<p class="small" style="margin-top:.4rem"><a href="tests.html">Run the tests</a> · <a href="cheatsheet.html">Cheat sheet</a> · <button type="button" class="btn small quiet" data-show-fills>Placeholders left: ' + fills.length + "</button></p></div>";
  }
  function toggleMenu(open) {
    const m = $("#menu");
    m.hidden = open != null ? !open : !m.hidden;
    if (m.hidden) return;
    m.innerHTML = menuHTML();
    $$("[data-jump]", m).forEach((b) => b.addEventListener("click", () => { m.hidden = true; go(Number(b.dataset.jump)); }));
    $("[data-close-menu]", m).addEventListener("click", () => { m.hidden = true; });
    $("[data-show-fills]", m).addEventListener("click", () => { m.hidden = true; showFills(true); });
    m.onclick = (e) => { if (e.target === m) m.hidden = true; };
    const cur = $(".cur", m) || $("[data-jump]", m);
    cur.focus();
  }

  let fills = [];
  function showFills(force) {
    const w = $("#fillwarn");
    if (!fills.length) { w.hidden = true; return; }
    const n = (k) => fills.filter((f) => f.kind === k).length;
    w.innerHTML = '<div class="fw-bar"><details' + (force ? " open" : "") + '><summary>Before you present: ' + n("FILL") + " to fill · " + n("DRAFT") + " drafts · " + n("CONFIRM") + " to confirm</summary>" +
      '<p class="xsmall muted" style="margin:.3rem 0 0">Presenter only, hidden in clean mode. Edit config.js, then reload. The same list is in the console.</p>' +
      "<ol>" + fills.map((f) => "<li>" + esc(f.kind) + " · " + esc(f.path) + "</li>").join("") + "</ol></details>" +
      '<button type="button" class="fw-x" id="fill-close" aria-label="Dismiss">×</button></div>';
    w.hidden = false;
    $("#fill-close", w).addEventListener("click", () => { w.hidden = true; });
  }

  function toggleClean() { state.clean = !state.clean; document.body.classList.toggle("clean", state.clean); }
  function cycleTheme() {
    const html = document.documentElement, order = ["light", "dark", "auto"];
    html.dataset.theme = order[(order.indexOf(html.dataset.theme) + 1) % order.length];
    announce("Theme: " + html.dataset.theme);
  }
  function closeOverlays() {
    const any = !$("#menu").hidden || !$("#notes").hidden || !$("#questions").hidden || !$("#tooltip").hidden;
    $("#menu").hidden = true; $("#notes").hidden = true; $("#questions").hidden = true; hideTip();
    return any;
  }

  /* ================================================================ keyboard */
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, tag = t && t.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable);
    if (typing) { if (e.key === "Escape") t.blur(); return; }
    const menuOpen = !$("#menu").hidden;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (menuOpen && k !== "Escape" && k !== "m") return;
    // In the simulator, 1–4 pick a preset query.
    if (S[state.i].id === "simulation" && /^[1-4]$/.test(k)) {
      const p = K.presets[Number(k) - 1];
      if (p) { setPreset(p.id); if (sim.mode === "guided") $("#step-next").focus(); }
      return;
    }
    switch (k) {
      case "ArrowRight": case "PageDown": e.preventDefault(); step(1); break;
      case "ArrowLeft": case "PageUp": e.preventDefault(); step(-1); break;
      case " ":
        if (tag === "BUTTON" || tag === "A" || tag === "SUMMARY" || (t.getAttribute && t.getAttribute("role") === "tab")) return;
        e.preventDefault(); step(e.shiftKey ? -1 : 1); break;
      case "Home": e.preventDefault(); go(0); break;
      case "End": e.preventDefault(); go(S.length - 1); break;
      case "m": e.preventDefault(); toggleMenu(); break;
      case "n": toggleDrawer("notes"); break;
      case "q": toggleDrawer("questions"); break;
      case "d": setTech(state.i); break;
      case "t": timerKey(e.shiftKey); break;
      case "c": toggleClean(); break;
      case "l": cycleTheme(); break;
      case "Escape": closeOverlays(); break;
      default: return;
    }
  }

  /* ================================================================ glossary */
  const tip = $("#tooltip");
  function showTip(el) {
    const g = X.glossary[el.dataset.gl];
    if (!g) return;
    tip.innerHTML = "<strong>" + esc(g.term) + "</strong>" + esc(g.def) + '<span class="an">In the library: ' + esc(g.analogy) + "</span>";
    tip.hidden = false;
    const r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = Math.min(window.innerWidth - tw - 12, Math.max(12, r.left + r.width / 2 - tw / 2));
    let y = r.bottom + 8;
    if (y + th > window.innerHeight - 8) y = r.top - th - 8;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function hideTip() { tip.hidden = true; }

  function announce(msg) { const l = $("#live"); l.textContent = ""; setTimeout(() => { l.textContent = msg; }, 30); }

  /* ==================================================================== init */
  function init() {
    document.documentElement.dataset.theme = ["light", "dark", "auto"].indexOf(C.theme) !== -1 ? C.theme : "light";
    build();
    document.addEventListener("keydown", onKey);
    document.addEventListener("mouseover", (e) => { const g = e.target.closest && e.target.closest(".gl"); if (g) showTip(g); });
    document.addEventListener("mouseout", (e) => { if (e.target.closest && e.target.closest(".gl")) hideTip(); });
    document.addEventListener("focusin", (e) => { if (e.target.classList && e.target.classList.contains("gl")) showTip(e.target); });
    document.addEventListener("focusout", (e) => { if (e.target.classList && e.target.classList.contains("gl")) hideTip(); });
    $$("#pbar [data-key]").forEach((b) => b.addEventListener("click", () => onKey({ key: b.dataset.key, target: document.body, preventDefault() {}, shiftKey: false })));
    let rz;
    window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(redraw, 120); });
    window.addEventListener("hashchange", () => { const i = idxOf(location.hash.slice(1)); if (i !== -1 && i !== state.i) go(i); });

    fills = scanConfig();
    if (fills.length) {
      console.groupCollapsed("%c[config.js] " + fills.length + " items to fill or confirm before presenting", "color:#A04A00;font-weight:600");
      fills.forEach((f) => console.warn(f.kind + "  " + f.path + (f.value ? "  — “" + f.value + "”" : "")));
      console.groupEnd();
      showFills(false);
    } else console.info("[config.js] All placeholders filled.");

    const start = idxOf(location.hash.slice(1));
    state.i = start === -1 ? 0 : start;
    go(state.i, { instant: true });
  }

  init();
})();
