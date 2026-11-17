/* tests.js — checks the simulator does what the demo promises.
 *
 * Run either way:
 *   node tests.js          (from this folder)
 *   open tests.html        (double-click; runs the same checks in the browser)
 *
 * Every preset is checked with structure-aware chunking, the default keyword/vector balance,
 * and the default threshold for BOTH score types, so changing `thresholdScoreType` in
 * config.js can't silently break the demo.
 */
(function (root) {
  "use strict";

  function runTests(Engine, CORPUS, CONFIG) {
    var results = [];
    function check(name, cond, detail) { results.push({ name: name, pass: !!cond, detail: cond ? "" : (detail || "") }); }

    var sim = (CONFIG && CONFIG.simulator) || {};
    var balance = sim.defaultBalance != null ? sim.defaultBalance : 0.5;
    var thresholds = sim.defaultThresholds || { vectorSimilarity: 0.5, semanticReranker: 2 };
    var scoreTypes = ["vectorSimilarity", "semanticReranker"];

    var structure = Engine.buildIndex(CORPUS, { chunking: "structure" });
    var fixed = Engine.buildIndex(CORPUS, { chunking: "fixed" });
    function run(index, query, scoreType, overrides) {
      var o = { balance: balance, scoreType: scoreType, threshold: thresholds[scoreType] };
      Object.keys(overrides || {}).forEach(function (k) { o[k] = overrides[k]; });
      return Engine.run(index, query, o);
    }
    function top(list) { return list.length ? list[0].chunk.id : "(none)"; }

    /* ---------- the engine is the real thing */
    check("BM25 uses k1 = 1.2 and b = 0.75", Engine.constants.K1 === 1.2 && Engine.constants.B === 0.75);
    check("RRF uses k = 60", Engine.constants.RRF_K === 60);
    check("Fixed chunker cuts every 500 characters", Engine.constants.FIXED_CHUNK === 500);
    check("Structure-aware corpus has 25–35 chunks", structure.N >= 25 && structure.N <= 35, "got " + structure.N);

    var kw = Engine.bm25Search(structure, CORPUS.presets[1].query);
    var vs = Engine.vectorSearch(structure, CORPUS.presets[1].query);
    var scaled = kw.map(function (r) { return { chunk: r.chunk, score: r.score * 1000 }; });
    check("RRF merges by rank, not raw score (scaling BM25 scores changes nothing)",
      Engine.fuse(kw, vs, 0.5).map(function (e) { return e.chunk.id; }).join() ===
      Engine.fuse(scaled, vs, 0.5).map(function (e) { return e.chunk.id; }).join());
    check("Balance 0 = words only: combined top equals keyword top",
      top(Engine.fuse(kw, vs, 0)) === top(kw), top(Engine.fuse(kw, vs, 0)) + " vs " + top(kw));
    check("Balance 1 = meaning only: combined top equals vector top",
      top(Engine.fuse(kw, vs, 1)) === top(vs), top(Engine.fuse(kw, vs, 1)) + " vs " + top(vs));

    /* ---------- corpus hygiene the presets depend on */
    var allTokens = new Set();
    structure.chunks.forEach(function (c) { Engine.rawTokens(c.text).forEach(function (t) { allTokens.add(t); }); });
    check("Corpus never says “hip” (query 1 relies on “arthroplasty” only)", !allTokens.has("hip"));
    check("Corpus never mentions parking (query 4 relies on it)", !allTokens.has("parking"));

    /* ---------- the four presets */
    CORPUS.presets.forEach(function (p) {
      scoreTypes.forEach(function (st) {
        var r = run(structure, p.query, st), e = p.expect, tag = "[" + p.id + ", " + st + "] ";
        if (e.winner) check(tag + "combined top is " + e.winner, top(r.fused) === e.winner, "got " + top(r.fused));
        if (e.keywordTop) check(tag + "word search alone ranks " + e.keywordTop + " first", top(r.keyword) === e.keywordTop, "got " + top(r.keyword));
        if (e.keywordTopIsNot) check(tag + "word search alone misses it", top(r.keyword) !== e.keywordTopIsNot, "got " + top(r.keyword));
        if (e.vectorTop) check(tag + "meaning search alone ranks " + e.vectorTop + " first", top(r.vector) === e.vectorTop, "got " + top(r.vector));
        if (e.vectorTopIsNot) check(tag + "meaning search alone misses it", top(r.vector) !== e.vectorTopIsNot, "got " + top(r.vector));
        check(tag + (e.gate === "pass" ? "gate passes" : "gate fails"), (e.gate === "pass") === r.gate.pass,
          r.gate.label + " " + r.gate.score.toFixed(2) + " vs threshold " + r.gate.threshold);
        if (e.gate === "fail") check(tag + "escalates to a review task, no answer", r.answer.kind === "escalation" && r.answer.task && r.answer.task.queue);
        if (e.answerIncludes) check(tag + "answer says “" + e.answerIncludes + "”", r.answer.text.indexOf(e.answerIncludes) !== -1, r.answer.text);
        if (e.gate === "pass") check(tag + "answer is cited", r.answer.citations && r.answer.citations[0] && r.answer.citations[0].doc);
      });
    });

    /* ---------- the chunking toggle */
    var erpTable = structure.chunks.find(function (c) { return c.id === "erp:t2"; });
    check("Structure-aware: waiting-times table is one chunk tagged type: table",
      erpTable && erpTable.type === "table" && erpTable.body.indexOf("Median wait (weeks)") !== -1 && erpTable.body.indexOf("Tonsillectomy") !== -1);

    var erpFixed = fixed.chunks.filter(function (c) { return c.docId === "erp"; });
    var rowText = "Trauma and orthopaedics | Primary arthroplasty | 63 | 41 | 1,145";
    var splitAt = erpFixed.findIndex(function (c, i) {
      var next = erpFixed[i + 1];
      return next && c.body.indexOf(rowText) === -1 && (c.body + next.body).indexOf(rowText) !== -1;
    });
    check("Fixed 500: the orthopaedics row is cut mid-row across two chunks", splitAt !== -1);

    scoreTypes.forEach(function (st) {
      var tag = "[fixed 500, " + st + "] ";
      var good = run(structure, CORPUS.presets[0].query, st);
      var bad = run(fixed, CORPUS.presets[0].query, st);
      check(tag + "query 1 retrieves a fragment without the column headings",
        bad.top && bad.top.type === "fixed" && bad.top.body.indexOf("Median wait (weeks)") === -1, bad.top && bad.top.id);
      check(tag + "the wrong answer still passes the gate (why evaluation matters)", bad.gate.pass);
      check(tag + "answer changes from 41 weeks to a confident, cited 63 weeks",
        good.answer.text.indexOf("41 weeks") !== -1 && bad.answer.text.indexOf("63 weeks") !== -1 && bad.answer.text.indexOf("41") === -1 && bad.answer.citations.length,
        "structure: " + good.answer.text + " | fixed: " + bad.answer.text);
      check(tag + "diagnosis names the column mix-up",
        bad.answer.diagnosis && bad.answer.diagnosis.usedColumn === "Longest wait (weeks)" && bad.answer.diagnosis.intendedColumn === "Median wait (weeks)",
        JSON.stringify(bad.answer.diagnosis && { used: bad.answer.diagnosis.usedColumn, intended: bad.answer.diagnosis.intendedColumn }));
    });

    /* ---------- the threshold is what stops guessing */
    var low = run(structure, CORPUS.presets[3].query, "vectorSimilarity", { threshold: 0.1 });
    check("Query 4 with the threshold dragged to 0.10 answers anyway (a guess)", low.gate.pass && low.answer.kind === "answer");
    var kwOnly = run(structure, CORPUS.presets[0].query, "vectorSimilarity", { balance: 0 });
    check("Query 1 with words only: top page is the chairs page, and the gate refuses it",
      kwOnly.top && kwOnly.top.id === "est:s1" && !kwOnly.gate.pass, kwOnly.top && kwOnly.top.id);

    return results;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = runTests;
    if (typeof require !== "undefined" && require.main === module) {
      var results = runTests(require("./engine.js"), require("./corpus.js"), require("./config.js"));
      results.forEach(function (r) { console.log((r.pass ? "PASS  " : "FAIL  ") + r.name + (r.pass ? "" : "\n      " + r.detail)); });
      var failed = results.filter(function (r) { return !r.pass; }).length;
      console.log("\n" + (results.length - failed) + "/" + results.length + " passed");
      process.exit(failed ? 1 : 0);
    }
  } else {
    root.runTests = runTests;
  }
})(this);
