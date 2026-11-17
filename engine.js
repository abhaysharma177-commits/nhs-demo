/* engine.js — the retrieval mechanism behind the simulator.
 *
 * This is a teaching version of the production design, small enough to read in one sitting.
 * Nothing here calls a network or a language model.
 *
 *   Library    = the index          buildIndex()        chunks + word counts + concept vectors
 *   Librarian A = exact words        bm25Search()        BM25, k1 = 1.2, b = 0.75
 *   Librarian B = meaning            vectorSearch()      cosine over 16 hand-written concepts
 *   Compare lists                    fuse()              Reciprocal Rank Fusion, k = 60
 *   Invigilator = confidence gate    confidence()        reads the configured score type
 *   Open-book exam                   compose()           template answer from retrieved text only
 *
 * What is simplified, honestly:
 *   - Production used Azure OpenAI text-embedding-ada-002 (1,536 dimensions). Here a hand-written
 *     lexicon maps words and phrases to 16 concepts. Same idea (similar meaning → similar vector),
 *     far cruder.
 *   - Production answers came from GPT-4 with a grounded prompt. Here answers are filled from
 *     templates using only the retrieved chunk. buildPrompt() shows what the model would receive.
 *   - The "semantic reranker" score is a stand-in formula (see confidence()).
 */
var Engine = (function () {
  "use strict";

  var K1 = 1.2;            // BM25 term-frequency saturation
  var B = 0.75;            // BM25 length normalisation
  var RRF_K = 60;          // RRF constant: dampens the gap between rank 1 and rank 2
  var LIST_DEPTH = 10;     // how many results each search hands to fusion
  var PROSE_CHUNK = 700;   // structure-aware prose chunk size (characters)
  var PROSE_OVERLAP = 80;  // overlap between prose chunks inside one section
  var FIXED_CHUNK = 500;   // the naive splitter we replaced

  // Common words that carry no meaning for search. No stemming: "waiting" and "wait" are
  // different words to Librarian A, which is part of the lesson.
  var STOPWORDS = new Set((
    "a an the and or of to in on for at by with from is are was were be been being it its this that " +
    "these those as what whats which who whom how when where why do does did s i we our you your my me " +
    "there their they them has have had will would can could should may not no so than then into over " +
    "under about per up all any each more most also if but such only other just now very same"
  ).split(" "));

  // Words that are never treated as identifiers even when capitalised.
  var NOT_IDENTIFIERS = new Set(["dr", "mr", "mrs", "ms", "prof", "ward", "table", "trust", "nhs"]);

  /* ---------------------------------------------------------------- tokenising */

  // Every lower-case word, including stopwords (needed to match phrases like "how long").
  function rawTokens(text) {
    return String(text).toLowerCase().replace(/&/g, " and ").split(/[^a-z0-9]+/).filter(Boolean);
  }

  // The words Librarian A indexes: no stopwords, no single letters (single digits are kept).
  function tokenize(text) {
    return rawTokens(text).filter(function (t) {
      return !STOPWORDS.has(t) && (t.length > 1 || /\d/.test(t));
    });
  }

  function countTerms(terms) {
    var tf = Object.create(null);
    terms.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
    return tf;
  }

  /* ---------------------------------------------------------- concept vectors */

  // Index lexicon phrases by their first word, longest phrase first, so "waiting area"
  // is matched before "waiting".
  function compileLexicon(lexicon) {
    var byFirst = Object.create(null);
    Object.keys(lexicon).forEach(function (phrase) {
      var toks = rawTokens(phrase);
      (byFirst[toks[0]] = byFirst[toks[0]] || []).push({ phrase: phrase, toks: toks, weights: lexicon[phrase] });
    });
    Object.keys(byFirst).forEach(function (k) {
      byFirst[k].sort(function (a, b) { return b.toks.length - a.toks.length; });
    });
    return { byFirst: byFirst, single: new Set(Object.keys(lexicon).filter(function (p) { return rawTokens(p).length === 1; })) };
  }

  function matchesAt(toks, i, phraseToks) {
    for (var j = 0; j < phraseToks.length; j++) if (toks[i + j] !== phraseToks[j]) return false;
    return true;
  }

  // Repeated mentions add up, but with diminishing returns (log), so one long table
  // doesn't drown everything else.
  function damp(x) { return x <= 1 ? x : 1 + Math.log(x); }

  // Map text to a 16-number vector, one number per concept. Also returns which phrases fired,
  // so the UI can say *why* two texts are similar.
  function conceptVector(text, lex, conceptIds) {
    var toks = rawTokens(text), sums = Object.create(null), hits = [];
    for (var i = 0; i < toks.length;) {
      var cands = lex.byFirst[toks[i]], hit = null;
      if (cands) for (var c = 0; c < cands.length; c++) if (matchesAt(toks, i, cands[c].toks)) { hit = cands[c]; break; }
      if (hit) {
        Object.keys(hit.weights).forEach(function (concept) {
          sums[concept] = (sums[concept] || 0) + hit.weights[concept];
          hits.push({ phrase: hit.phrase, concept: concept, weight: hit.weights[concept] });
        });
        i += hit.toks.length;
      } else i++;
    }
    return { vec: conceptIds.map(function (id) { return damp(sums[id] || 0); }), hits: hits };
  }

  function cosine(a, b) {
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  }

  /* ------------------------------------------------------------------- chunking */

  function tableLines(t) {
    var lines = [t.caption, t.columns.join(" | ")];
    t.rows.forEach(function (r) { lines.push(r.join(" | ")); });
    if (t.note) lines.push(t.note);
    return lines;
  }

  // A simple RecursiveCharacterTextSplitter: try paragraph breaks, then lines, then sentences,
  // then spaces; pack pieces up to `size` characters with `overlap` characters carried over.
  function splitRecursive(text, size, overlap, seps) {
    seps = seps || ["\n\n", "\n", ". ", " "];
    if (text.length <= size) return [text];
    var sep = seps.find(function (s) { return text.indexOf(s) !== -1; }) || "";
    var parts = sep ? text.split(sep).map(function (p, i, arr) { return i < arr.length - 1 ? p + sep : p; }) : text.split("");
    var chunks = [], current = "";
    parts.forEach(function (part) {
      if (part.length > size) {
        if (current) { chunks.push(current); current = ""; }
        chunks.push.apply(chunks, splitRecursive(part, size, overlap, seps.slice(1)));
        return;
      }
      if ((current + part).length > size && current) {
        chunks.push(current);
        current = current.slice(Math.max(0, current.length - overlap)) + part;
      } else current += part;
    });
    if (current) chunks.push(current);
    return chunks;
  }

  // Structure-aware (what production did): tables are kept whole and tagged; prose is split
  // only inside a section, never across a heading. Each chunk carries its section heading.
  function chunkStructureAware(doc) {
    var out = [];
    doc.sections.forEach(function (sec) {
      var prose = sec.blocks.filter(function (b) { return b.type === "prose"; }).map(function (b) { return b.text; }).join("\n\n");
      if (prose) {
        var pieces = splitRecursive(prose, PROSE_CHUNK, PROSE_OVERLAP);
        pieces.forEach(function (piece, i) {
          out.push({
            id: doc.id + ":" + sec.id + (pieces.length > 1 ? "-" + (i + 1) : ""),
            type: "prose", docId: doc.id, sectionId: sec.id, section: sec.heading,
            body: piece, text: sec.heading + "\n" + piece
          });
        });
      }
      sec.blocks.filter(function (b) { return b.type === "table"; }).forEach(function (t) {
        out.push({
          id: doc.id + ":" + t.id, type: "table", docId: doc.id, sectionId: sec.id, section: sec.heading,
          table: t, body: tableLines(t).join("\n"), text: sec.heading + "\n" + tableLines(t).join("\n")
        });
      });
    });
    return out;
  }

  // Flatten a document to plain text, the way a naive pipeline sees it. Records where each
  // table line starts so the UI can draw the cut.
  function serialise(doc) {
    var text = doc.title + "\n", spans = [];
    doc.sections.forEach(function (sec) {
      text += "\n" + sec.heading + "\n";
      sec.blocks.forEach(function (b) {
        if (b.type === "prose") { text += b.text + "\n"; return; }
        tableLines(b).forEach(function (line, i) {
          spans.push({ tableId: b.id, line: i, start: text.length, end: text.length + line.length });
          text += line + "\n";
        });
      });
      spans.push({ sectionId: sec.id, heading: sec.heading, sectionEnd: text.length });
    });
    return { text: text, spans: spans };
  }

  // Fixed-size (what we replaced): every 500 characters, regardless of what is there.
  function chunkFixed(doc) {
    var s = serialise(doc), out = [];
    for (var start = 0, n = 1; start < s.text.length; start += FIXED_CHUNK, n++) {
      var end = Math.min(s.text.length, start + FIXED_CHUNK);
      out.push({
        id: doc.id + ":f" + n, type: "fixed", docId: doc.id, start: start, end: end,
        section: "characters " + (start + 1) + "–" + end,
        body: s.text.slice(start, end), text: s.text.slice(start, end)
      });
    }
    return out;
  }

  /* ---------------------------------------------------------------- the index */

  function buildIndex(corpus, opts) {
    var mode = (opts && opts.chunking) === "fixed" ? "fixed" : "structure";
    var lex = compileLexicon(corpus.lexicon);
    var conceptIds = corpus.concepts.map(function (c) { return c.id; });
    var chunks = [];
    corpus.documents.forEach(function (doc) {
      (mode === "fixed" ? chunkFixed(doc) : chunkStructureAware(doc)).forEach(function (c) {
        c.doc = doc;
        c.order = chunks.length;
        c.terms = tokenize(c.text);
        c.tf = countTerms(c.terms);
        c.len = c.terms.length;
        var cv = conceptVector(c.text, lex, conceptIds);
        c.vec = cv.vec;
        c.conceptHits = cv.hits;
        chunks.push(c);
      });
    });
    var df = Object.create(null), total = 0;
    chunks.forEach(function (c) { total += c.len; Object.keys(c.tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; }); });
    return { mode: mode, corpus: corpus, chunks: chunks, df: df, N: chunks.length, avgdl: total / chunks.length, lex: lex, conceptIds: conceptIds };
  }

  /* ------------------------------------------------------- Librarian A: BM25 */

  // Rare words matter more: inverse document frequency (Lucene's form, never negative).
  function idf(index, term) {
    var n = index.df[term] || 0;
    return Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
  }

  function bm25Search(index, query) {
    var qTerms = Array.from(new Set(tokenize(query)));
    return index.chunks.map(function (c) {
      var score = 0, matched = [];
      qTerms.forEach(function (t) {
        var tf = c.tf[t] || 0;
        if (!tf) return;
        var s = idf(index, t) * (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * c.len / index.avgdl));
        score += s;
        matched.push({ term: t, tf: tf, score: s });
      });
      return { chunk: c, score: score, matched: matched };
    }).filter(function (r) { return r.score > 0; }).sort(byScore);
  }

  /* --------------------------------------------------- Librarian B: meaning */

  function queryConcepts(index, query) {
    return conceptVector(query, index.lex, index.conceptIds);
  }

  function sharedConcepts(index, a, b) {
    return index.conceptIds.filter(function (id, i) { return a[i] > 0 && b[i] > 0; });
  }

  function vectorSearch(index, query) {
    var q = queryConcepts(index, query);
    return index.chunks.map(function (c) {
      return { chunk: c, score: cosine(q.vec, c.vec), shared: sharedConcepts(index, q.vec, c.vec) };
    }).filter(function (r) { return r.score > 0; }).sort(byScore);
  }

  function byScore(a, b) { return b.score - a.score || a.chunk.order - b.chunk.order; }

  /* ------------------------------------------------ comparing lists: RRF */

  // balance: 0 = words only, 0.5 = equal, 1 = meaning only.
  // In Azure AI Search the text query's weight is fixed at 1 and you set `weight` on the vector
  // query; vectorWeightEquivalent() gives the matching value for a balance.
  function weightsFor(balance) {
    return { keyword: 2 * (1 - balance), vector: 2 * balance };
  }
  function vectorWeightEquivalent(balance) {
    return balance >= 1 ? Infinity : balance / (1 - balance);
  }

  // RRF looks only at rank positions, never at raw scores, because BM25 scores and cosine
  // similarities are on different scales. Each list contributes weight / (k + rank).
  function fuse(keywordList, vectorList, balance) {
    var w = weightsFor(balance == null ? 0.5 : balance), byId = Object.create(null), out = [];
    function add(list, name) {
      list.slice(0, LIST_DEPTH).forEach(function (r, i) {
        var e = byId[r.chunk.id] || (byId[r.chunk.id] = { chunk: r.chunk, score: 0, ranks: {}, parts: {} });
        e.ranks[name] = i + 1;
        e.parts[name] = w[name] / (RRF_K + i + 1);
        e.score += e.parts[name];
      });
    }
    add(keywordList, "keyword");
    add(vectorList, "vector");
    Object.keys(byId).forEach(function (id) { if (byId[id].score > 0) out.push(byId[id]); });
    return out.sort(function (a, b) {
      return b.score - a.score || bestRank(a) - bestRank(b) || a.chunk.order - b.chunk.order;
    });
  }
  function bestRank(e) { return Math.min(e.ranks.keyword || 99, e.ranks.vector || 99); }

  /* ------------------------------------------------ the invigilator: gate */

  // Identifiers: words with digits ("7b", "4471"), or capitalised words the concept lexicon
  // doesn't know but the documents contain ("Whitlow"). Meaning search can't see these.
  function identifiers(index, query) {
    var seen = new Set();
    String(query).split(/[^A-Za-z0-9]+/).forEach(function (w, i) {
      var t = w.toLowerCase();
      if (!t || STOPWORDS.has(t) || NOT_IDENTIFIERS.has(t)) return;
      if (/\d/.test(t)) { seen.add(t); return; }
      if (/^[A-Z]/.test(w) && !index.lex.single.has(t) && index.df[t]) seen.add(t);
    });
    return Array.from(seen);
  }

  var SCORE_TYPES = {
    vectorSimilarity: { label: "Vector similarity", max: 1, digits: 2 },
    semanticReranker: { label: "Reranker score", max: 4, digits: 1 }
  };

  // The gate reads ONE score for the top combined result. Which score is a configuration value:
  //   vectorSimilarity  – cosine between query and chunk (0–1)
  //   semanticReranker  – stand-in for Azure's semantic ranker (0–4): reads query and chunk
  //                       together, so it also checks exact identifiers are present.
  // The fused RRF score is never used here: it is rank-based and says nothing about relevance.
  function confidence(index, query, chunk, scoreType) {
    if (!chunk) return 0;
    var cos = cosine(queryConcepts(index, query).vec, chunk.vec);
    if (scoreType !== "semanticReranker") return cos;
    var ids = identifiers(index, query);
    if (!ids.length) return 4 * cos;
    var covered = ids.filter(function (t) { return chunk.tf[t]; }).length / ids.length;
    return 4 * (0.6 * cos + 0.4 * covered);
  }

  /* --------------------------------------------- the open-book exam: answer */

  function lcFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function isFigure(cell) { return /^[\d.,]+%?$/.test(String(cell).trim()); }

  function fillTemplate(template, columns, row) {
    return template.replace(/\{(lc:)?([^}]+)\}/g, function (_, lc, col) {
      var i = columns.indexOf(col);
      var v = i === -1 ? "" : row[i];
      return lc ? lcFirst(v) : v;
    });
  }

  // How well a piece of text (a row, a sentence) matches the query: exact identifiers count
  // most, then shared meaning, then shared words.
  function matchScore(index, query, text) {
    var ids = identifiers(index, query), toks = new Set(tokenize(text));
    var idHits = ids.filter(function (t) { return toks.has(t); }).length;
    var wordHits = Array.from(new Set(tokenize(query))).filter(function (t) { return toks.has(t); }).length;
    var cos = cosine(queryConcepts(index, query).vec, conceptVector(text, index.lex, index.conceptIds).vec);
    return 3 * idHits + 2 * cos + 0.5 * wordHits;
  }

  function bestOf(items, scoreFn) {
    var best = null, bestScore = -1;
    items.forEach(function (it) { var s = scoreFn(it); if (s > bestScore) { best = it; bestScore = s; } });
    return best;
  }

  function citationFor(chunk) {
    var detail = chunk.type === "table" ? chunk.table.caption.split(".")[0] : null;
    return { doc: chunk.doc.title, section: chunk.section, detail: detail, chunkId: chunk.id, kind: chunk.doc.kind };
  }

  // Find the original table a plain-text line came from (used to explain the fixed-chunk failure).
  // A line cut at a chunk boundary is only the start or the end of a row, so match either.
  function tableContaining(doc, line) {
    var found = null;
    doc.sections.forEach(function (sec) {
      sec.blocks.forEach(function (b) {
        if (b.type !== "table" || found) return;
        b.rows.forEach(function (r, i) {
          var full = r.join(" | ");
          if (!found && line.length > 8 && (full === line || full.endsWith(line) || full.startsWith(line))) {
            found = { table: b, rowIndex: i, offset: r.length - line.split(" | ").length, cut: full !== line };
          }
        });
      });
    });
    return found;
  }

  function compose(index, query, chunk) {
    var cite = citationFor(chunk);
    var wantsWait = queryConcepts(index, query).vec[index.conceptIds.indexOf("waiting")] > 0;

    // 1. A whole table, tagged as one: read the right row with its headings.
    if (chunk.type === "table") {
      var t = chunk.table;
      var row = bestOf(t.rows, function (r) { return matchScore(index, query, r.join(" | ")); });
      return { kind: "answer", method: "table", text: fillTemplate(t.answer, t.columns, row), citations: [cite], row: row, table: t };
    }

    var lines = chunk.body.split("\n").filter(function (l) { return l.trim(); });
    var rowLines = lines.filter(function (l) { return l.indexOf(" | ") !== -1; });

    // 2. A fragment that contains table rows (only happens with fixed-size chunks). If a row
    //    genuinely matches the question (shared meaning or an identifier), the row is the answer.
    var line = rowLines.length ? bestOf(rowLines, function (l) { return matchScore(index, query, l); }) : null;
    var lineCells = line ? line.split(" | ").map(function (c) { return c.trim(); }) : [];
    if (line && matchScore(index, query, line) >= 1 && lineCells.some(isFigure)) {
      var origin = tableContaining(chunk.doc, line.trim());
      var hasHeader = origin && chunk.body.indexOf(origin.table.columns.join(" | ")) !== -1;
      if (origin && hasHeader && !origin.cut) {
        var r = origin.table.rows[origin.rowIndex];
        return { kind: "answer", method: "table", text: fillTemplate(origin.table.answer, origin.table.columns, r), citations: [cite], row: r, table: origin.table };
      }
      // No headings in this chunk. A model given this text tends to take the first figure
      // beside the label and state it confidently. Simulated here, then explained in the UI.
      var firstFig = lineCells.findIndex(isFigure);
      // Drop label fragments left by the cut (e.g. "cs" from "orthopaedi|cs").
      var label = lineCells.slice(0, firstFig).filter(function (c, i) { return c && !(origin && origin.cut && i === 0 && origin.offset === 0 && c.length < 6); });
      var unit = wantsWait && /\bweeks\b/i.test(chunk.body) ? " weeks" : "";
      var what = lcFirst(label[label.length - 1] || "this item");
      var text = wantsWait ? "The wait for " + what + " is " + lineCells[firstFig] + unit + "." : (label.join(", ") + ": " + lineCells[firstFig] + ".");
      var diagnosis = null;
      if (origin) {
        var t2 = origin.table, orig = t2.rows[origin.rowIndex];
        var intendedCol = (t2.answer.match(/\{(?:lc:)?([^}]+)\}/g) || [])
          .map(function (m) { return m.replace(/[{}]|lc:/g, ""); })
          .find(function (col) { return isFigure(orig[t2.columns.indexOf(col)] || ""); });
        diagnosis = {
          line: line.trim(), table: t2, rowIndex: origin.rowIndex, cutLabel: origin.cut,
          usedColumn: t2.columns[origin.offset + firstFig], usedValue: lineCells[firstFig],
          intendedColumn: intendedCol,
          intendedValue: intendedCol ? orig[t2.columns.indexOf(intendedCol)] : null
        };
      }
      return { kind: "answer", method: "headerless-fragment", text: text, citations: [cite], diagnosis: diagnosis };
    }

    // 3. Prose: quote the best-matching sentence (lines are sentence boundaries too).
    var sentences = [];
    lines.forEach(function (l) { sentences.push.apply(sentences, l.split(/(?<=[.!?])\s+/)); });
    sentences = sentences.filter(function (s) { return s.trim().length > 3 && s.indexOf(" | ") === -1; });
    var sentence = bestOf(sentences, function (s) { return matchScore(index, query, s); }) || chunk.body;
    return { kind: "answer", method: "prose", text: sentence.trim(), citations: [cite] };
  }

  // The grounded prompt the production chain built (LCEL: retrieval → prompt → model).
  // Shown in the technical view so the panel can see the "open-book exam paper".
  function buildPrompt(query, fused, n) {
    var ctx = fused.slice(0, n || 3).map(function (e, i) {
      return "[" + (i + 1) + "] " + e.chunk.doc.title + " › " + e.chunk.section + "\n" + e.chunk.body;
    }).join("\n\n");
    return [
      "System: Answer only from the context below. If the answer is not in the context, say you",
      "cannot answer. Cite the source document and section for every factual claim, as [n].",
      "",
      "Context:",
      ctx,
      "",
      "Question: " + query
    ].join("\n");
  }

  function escalation(query, score, threshold, scoreType, fused) {
    var h = 0;
    for (var i = 0; i < query.length; i++) h = (h * 31 + query.charCodeAt(i)) >>> 0;
    var st = SCORE_TYPES[scoreType] || SCORE_TYPES.vectorSimilarity;
    return {
      kind: "escalation",
      text: "I can’t answer this confidently from the documents I have. I’ve passed your question to a senior administrator to check.",
      task: {
        id: "REV-" + String(1000 + (h % 9000)),
        title: "Check and answer: “" + query + "”",
        queue: "Senior administrator review",
        reason: "Low retrieval confidence: " + st.label.toLowerCase() + " " + score.toFixed(st.digits) + " is below " + threshold.toFixed(st.digits),
        attached: fused.slice(0, 3).map(function (e) { return e.chunk.doc.short + " › " + e.chunk.section; }),
        status: "Open"
      }
    };
  }

  /* -------------------------------------------------------------- one query */

  // opts: { balance: 0–1, scoreType: "vectorSimilarity" | "semanticReranker", threshold: number }
  function run(index, query, opts) {
    opts = opts || {};
    var scoreType = SCORE_TYPES[opts.scoreType] ? opts.scoreType : "vectorSimilarity";
    var threshold = opts.threshold != null ? opts.threshold : (scoreType === "semanticReranker" ? 2 : 0.5);
    var keyword = bm25Search(index, query);
    var vector = vectorSearch(index, query);
    var fused = fuse(keyword, vector, opts.balance);
    var top = fused.length ? fused[0].chunk : null;
    var score = confidence(index, query, top, scoreType);
    var pass = !!top && score >= threshold;
    return {
      query: query, mode: index.mode,
      keyword: keyword, vector: vector, fused: fused, top: top,
      queryTerms: Array.from(new Set(tokenize(query))),
      queryConcepts: queryConcepts(index, query),
      identifiers: identifiers(index, query),
      gate: { scoreType: scoreType, label: SCORE_TYPES[scoreType].label, max: SCORE_TYPES[scoreType].max, digits: SCORE_TYPES[scoreType].digits, score: score, threshold: threshold, pass: pass },
      answer: pass ? compose(index, query, top) : escalation(query, score, threshold, scoreType, fused),
      prompt: buildPrompt(query, fused, 3)
    };
  }

  return {
    constants: { K1: K1, B: B, RRF_K: RRF_K, LIST_DEPTH: LIST_DEPTH, FIXED_CHUNK: FIXED_CHUNK, PROSE_CHUNK: PROSE_CHUNK, PROSE_OVERLAP: PROSE_OVERLAP },
    SCORE_TYPES: SCORE_TYPES,
    tokenize: tokenize, rawTokens: rawTokens, cosine: cosine, conceptVector: conceptVector,
    serialise: serialise, chunkFixed: chunkFixed, chunkStructureAware: chunkStructureAware, splitRecursive: splitRecursive,
    buildIndex: buildIndex, bm25Search: bm25Search, vectorSearch: vectorSearch, fuse: fuse,
    weightsFor: weightsFor, vectorWeightEquivalent: vectorWeightEquivalent,
    identifiers: identifiers, confidence: confidence, compose: compose, buildPrompt: buildPrompt,
    queryConcepts: queryConcepts, idf: idf, run: run
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Engine;
