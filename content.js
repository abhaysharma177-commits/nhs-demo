/* content.js — the narrative copy, taken from the brief.
 *
 * Facts about the real project live in config.js, not here. Text that needs a fact calls
 * F(...) on a config value, so an unset fact shows as [FILL] instead of being invented.
 *
 * Markup in strings:  [[key]] or [[key|shown text]] = glossary term,  **bold**.
 */
var CONTENT = {
  spine: ["Problem", "What I found", "What I built", "How it works", "Trade-offs", "Getting it adopted", "What I’d change"],

  roles: {
    ba:        { label: "Business analyst" },
    architect: { label: "Solution architect" },
    builder:   { label: "Builder" },
    change:    { label: "Change lead" }
  },

  // stage = index into spine. Headlines state the point, not the topic.
  sections: [
    { id: "opening", nav: "Opening", stage: 0, roles: [],
      headline: "A 30–45 minute document hunt became a cited answer in seconds",
      notes: [
        "Press Run both before saying anything",
        "One line each: problem, outcome, my role",
        "Point at the banner: recreation, synthetic data, not production",
        "The bar at the top is the agenda"
      ] },
    { id: "problem", nav: "The problem", stage: 0, roles: ["ba"],
      headline: "The real problem was trust, not speed: people couldn’t tell which document was current, or whether a figure was right",
      notes: [
        "Walk the lanes left to right, don’t read every step",
        "Land the two marked steps: “which is current?” and “is this right?”",
        "Say it plainly: speed was the symptom, trust was the problem",
        "Change one calculator input live, then switch on “cost of a wrong figure”"
      ] },
    { id: "found", nav: "What I found", stage: 1, roles: ["ba"],
      headline: "Each group worried about something different, and every design choice traces back to one of those worries",
      notes: [
        "Methods row: how many people, which roles",
        "Grid: start with finance directors (liability)",
        "Requirements: hover R2 to show it’s met by the gate",
        "Pin one requirement; it reappears on the architecture",
        "Success measures: be honest about the unknown actuals"
      ] },
    { id: "architecture", nav: "Architecture", stage: 2, roles: ["architect", "builder"],
      headline: "One pipeline files the documents ahead of time; the other answers each question with its sources, or hands it to a person",
      notes: [
        "20 seconds on the analogy key; everything after depends on it",
        "Top row: ahead of time. Bottom row: live",
        "Press Animate a question",
        "Click the gate first, then the chunker (my prototype, team productionised)",
        "The badges say what I built versus designed"
      ] },
    { id: "simulation", nav: "Live simulation", stage: 3, roles: ["builder"],
      headline: "Two kinds of search find the right page, and a confidence check decides whether to answer at all",
      notes: [
        "Query 1: step all six stages with → (about 90 s). Librarian A picks the chairs page",
        "Press 2, then dot 4 (compare): meaning alone picks the general page (30 s)",
        "Press 3, then dot 4: neither list has it first, combined does (30 s)",
        "Press 4, step to the gate and pause: the board moment",
        "Chunking toggle only if time allows or asked: a confident, cited, wrong answer",
        "If asked: Full view, then let them type a question"
      ] },
    { id: "copilot", nav: "Copilot Studio", stage: 3, roles: ["builder", "change"],
      headline: "Copilot Studio was the front door: the conversation, the branch to a human, and the reason anyone used it",
      notes: [
        "Click through the seven steps left to right (about 90 s)",
        "Linger on Branch on confidence and Escalate: that is the human-in-the-loop",
        "Right-hand column: what a learner builds vs what this needed",
        "If asked why not knowledge sources: black box, no table handling, no gate"
      ] },
    { id: "tradeoffs", nav: "Trade-offs", stage: 4, roles: ["architect"],
      headline: "Every choice gave something up; here is what, and when I’d choose differently",
      notes: [
        "Open hybrid search first: it links to what they just saw",
        "Read only the last row of each record: when I’d choose differently",
        "Copilot Studio alone is what I’d have a learner build first"
      ] },
    { id: "guardrails", nav: "Guardrails", stage: 5, roles: ["architect"],
      headline: "Three safety layers each guard against a different failure, and together they made the system safe to adopt",
      notes: [
        "One failure per layer, using the simulator examples",
        "Be clear about what gets through all three: the cut table",
        "Governance: only present boxes that are filled"
      ] },
    { id: "adoption", nav: "Getting it adopted", stage: 5, roles: ["change"],
      headline: "Adoption was won on trust, not capability",
      notes: [
        "Board worry was liability, not whether AI could find documents",
        "Replay the moment: query 4 refusing",
        "Each principle has something I actually did",
        "Escalation rate: say why nonzero is healthy",
        "Current status: say it plainly"
      ] },
    { id: "wrong", nav: "What I’d change", stage: 6, roles: ["architect", "builder"],
      headline: "Testing caught three failures and I fixed them; the gap I didn’t close was systematic evaluation",
      notes: [
        "Three failures, each caught and fixed",
        "Then the gap: no golden set, no precision/recall, no CI evaluation",
        "Retrieval and generation fail independently, so test them separately",
        "Last line, slowly: evaluation is the first thing I’d invest in"
      ] },
    { id: "learners", nav: "For learners", stage: 6, roles: [],
      headline: "A Copilot Studio agent runs the same machinery, so two questions tell a learner where a wrong answer came from",
      notes: [
        "Keep it short; this is the bridge to the role",
        "Two questions: right page? faithful to the page?"
      ] },
    { id: "close", nav: "Close", stage: 6, roles: [],
      headline: "Trust was the problem, the design principle, and the reason it got funded",
      notes: [
        "Three lines, then stop talking",
        "Ask: where would you like to go deeper?",
        "Let them pick a tile"
      ] }
  ],

  // `real` may contain [[glossary]] markers; `realPlain` is the same without them (for print).
  analogy: [
    { id: "library", name: "The library", real: "The [[index|search index]] (Azure AI Search): every [[chunk|chunk]] and its [[embedding|embedding]]",
      plain: "Every document, cut into pages and filed so it can be found." },
    { id: "librarian", name: "The librarians", real: "Retrieval: [[bm25|BM25]] + [[vector|vector search]], merged with [[rrf|RRF]]",
      plain: "One searches by exact words, one by meaning. They compare lists." },
    { id: "exam", name: "The open-book exam", real: "[[grounding|Grounded]] prompt to GPT-4, the [[llm|LLM]]",
      plain: "The model may only answer from the pages it’s handed, and must cite the page." },
    { id: "invigilator", name: "The invigilator", real: "[[gate|Confidence gate]] + [[hitl|human-in-the-loop]] review",
      plain: "If the pages are poor, the student says “I can’t answer this” and a person checks." }
  ],

  // Section 10. Maps what the panel just saw onto what the role actually asks for.
  // Four only, phrased as evidence rather than claims. Keep it understated.
  jdBridge: [
    { ask: "Copilot Studio", shown: "Built the conversational layer, the escalation branch and the agents\u2019 topics \u2014 and the service behind them" },
    { ask: "Business change", shown: "Discovery, process mapping, requirements, stakeholder work, and the board case" },
    { ask: "AI governance", shown: "Guardrails as a design constraint from day one, not a review at the end" },
    { ask: "Coaching", shown: "Two weeks taking clinical and finance leads from sceptical to sponsoring was mostly translation" }
  ],

  // Section 6. The Copilot Studio topic, step by step, in the order it runs.
  copilotFlow: [
    { id: "trigger", name: "Trigger phrases", cs: "Topic trigger",
      what: "Ten or so examples of how a manager actually asks: \u201chow long is the wait for\u2026\u201d, \u201cwhat\u2019s the current waiting time\u2026\u201d, \u201creferral to treatment\u2026\u201d.",
      why: "Copilot Studio matches on meaning rather than exact words, so a handful of real phrasings covers most of how people ask.",
      learner: "Identical. This is the first thing a learner builds, and the first place they see an agent behave unpredictably." },
    { id: "capture", name: "Capture the question", cs: "System.Activity.Text",
      what: "Stores whatever the manager typed in a variable, so the next step can send it on.",
      why: "A system variable, so nothing is lost if the person phrases it as a sentence rather than answering a prompt.",
      learner: "Identical." },
    { id: "http", name: "Call the service", cs: "Send HTTP request",
      what: "POSTs the question to the FastAPI endpoint and stores the JSON that comes back.",
      why: "This is the handover point. Everything before it is low-code; everything after it is the retrieval pipeline I wrote.",
      learner: "A learner points at a SharePoint knowledge source here instead, and Copilot Studio does the retrieval itself." },
    { id: "parse", name: "Read the response", cs: "Response data type, from sample",
      what: "Paste one example response and Copilot Studio works out its shape, exposing answer, citations and confidence as variables.",
      why: "Without it the response is one opaque string and nothing downstream can branch on it.",
      learner: "Not needed with a knowledge source: the platform hands back the answer and its citations already." },
    { id: "condition", name: "Branch on confidence", cs: "Condition node",
      what: "If the service reports low confidence, take the escalation branch. Otherwise show the answer.",
      why: "The threshold is calculated in Python; the routing is a condition node here. Knowing which half does what is the whole architecture in one sentence.",
      learner: "A learner can build the same shape with a simpler test: did the agent find anything at all?" },
    { id: "answer", name: "Show the answer", cs: "Adaptive card",
      what: "The answer, with its citations listed underneath as a separate block rather than a wall of text.",
      why: "A manager has to be able to see at a glance which document a figure came from, or the citation may as well not be there.",
      learner: "A plain message node is fine to start with; the card is a refinement." },
    { id: "escalate", name: "Escalate to a person", cs: "Branch \u2192 the trust\u2019s task system",
      what: "Creates a review task for a senior administrator and tells the manager it has been passed on.",
      why: "This is the human-in-the-loop, and it went into the task system staff already used rather than a new dashboard nobody opens.",
      learner: "The same shape with Power Automate. A realistic second project, and a genuinely useful one." }
  ],

  glossary: {
    chunk:      { term: "Chunk", def: "A short passage cut from a document: the unit the system searches and cites.", analogy: "One page, filed on its own in the library." },
    embedding:  { term: "Embedding", def: "A list of numbers that captures what a passage means, so similar meanings get similar numbers.", analogy: "A catalogue card about what the page means, not which words it uses." },
    index:      { term: "Search index", def: "The searchable store of every chunk: its words and its embedding.", analogy: "The library itself." },
    bm25:       { term: "BM25", def: "A keyword-scoring formula: rare words that appear often in a short passage score highest.", analogy: "Librarian A, who matches your exact words." },
    vector:     { term: "Vector search", def: "Finds passages whose embeddings sit closest to the question’s embedding.", analogy: "Librarian B, who finds pages about the same thing, whatever the wording." },
    hybrid:     { term: "Hybrid search", def: "Running keyword and vector search together and merging the results.", analogy: "Asking both librarians, then comparing lists." },
    rrf:        { term: "RRF", def: "Reciprocal Rank Fusion: merges ranked lists by position only, so the two different score scales don’t matter.", analogy: "The librarians compare top-ten lists; pages high on both win." },
    cosine:     { term: "Cosine similarity", def: "A score for how closely two embeddings point the same way: near 1 means similar meaning.", analogy: "How alike two catalogue cards are." },
    gate:       { term: "Confidence gate", def: "A minimum score the best result must reach before the system answers.", analogy: "The invigilator’s pass mark for the pages." },
    grounding:  { term: "Grounding", def: "Making the model answer only from supplied passages, and cite them.", analogy: "The open-book exam: only the pages handed over, cite the page." },
    llm:        { term: "LLM", def: "Large language model: software that writes text by predicting likely next words.", analogy: "The exam student: fluent, but only as good as the pages it’s given." },
    rag:        { term: "RAG", def: "Retrieval-augmented generation: find relevant passages first, then have the model answer from them.", analogy: "Fetch the pages, then sit the open-book exam." },
    finetune:   { term: "Fine-tuning", def: "Retraining a model on your own examples to change how it behaves.", analogy: "Making the student memorise the books: they forget which page a fact came from." },
    lcel:       { term: "LCEL", def: "LangChain Expression Language: a way to wire steps (search, prompt, model) into one explicit chain.", analogy: "The written exam procedure, step by step." },
    hitl:       { term: "Human-in-the-loop", def: "A person reviews the cases the system isn’t confident about.", analogy: "When the invigilator flags a paper, a teacher marks it by hand." },
    copilot:    { term: "Copilot Studio", def: "Microsoft’s low-code tool for building conversational agents.", analogy: "The library’s front desk." },
    fastapi:    { term: "FastAPI", def: "A Python framework for building web services.", analogy: "The back office where the librarians work." },
    precision:  { term: "Precision@k", def: "Of the top k results, the share that are actually relevant.", analogy: "How many of the pages handed over were useful." },
    recall:     { term: "Recall", def: "Of all the relevant passages, the share that search found.", analogy: "Whether the librarian found every useful page, not just some." },
    faithful:   { term: "Faithfulness", def: "Whether an answer says only what its sources support.", analogy: "Did the student copy the page correctly?" },
    judge:      { term: "LLM-as-judge", def: "Using a model to grade answers, checked against human grades.", analogy: "A second marker, moderated by a human." },
    ci:         { term: "CI", def: "Continuous integration: automated checks that run on every change.", analogy: "Re-sitting a practice exam every time the library is rearranged." },
    dpia:       { term: "DPIA", def: "Data protection impact assessment: the formal check of privacy risks before processing personal data.", analogy: "The rules on what the library may hold at all." }
  },

  // Architecture nodes. own = key into CONFIG.ownership.
  nodes: [
    { id: "blob", name: "Document storage", lane: "index", plain: "Holds the documents", product: "Azure Blob Storage",
      what: "Where the trust’s Word documents, PDF reports and legacy system exports are stored.",
      why: "One place for the scheduled indexer to read from, so every document takes the same path into the index.",
      tradeoff: "Only documents that reach this storage can ever be answered from.",
      prevents: "Answers drawn from personal copies scattered across drives." },
    { id: "indexer", name: "Scheduled indexer", lane: "index", plain: "Files new and changed documents on a schedule", product: "Scheduled Azure Function",
      what: "Reads documents from storage on a schedule and runs the filing steps below.",
      why: "Freshness without retraining: re-index, and the next question sees the change.",
      tradeoff: "Answers are only as fresh as the last indexing run, so a document changed this morning may not be searchable yet.",
      prevents: "Answers from out-of-date documents: the “which document is current?” problem." },
    { id: "chunker", name: "Structure-aware chunker", lane: "index", plain: "Cuts documents into pages, keeping tables whole", product: "python-docx · pdfplumber · RecursiveCharacterTextSplitter",
      what: "Two paths. Tables are lifted out whole and tagged as tables. Prose is split inside each section, with a little overlap.",
      why: "In testing, fixed 500-character splits cut clinical tables mid-row.",
      tradeoff: "Two code paths and format-specific parsers to maintain.",
      prevents: "Figures separated from their column headings, which produces plausible wrong answers." },
    { id: "embeddings", name: "Embeddings", lane: "index", plain: "Describes what each page means, as numbers", product: "Azure OpenAI text-embedding-ada-002 (1,536 dimensions)",
      what: "Turns every chunk into an [[embedding]], so search can match meaning, not just words.",
      why: "Managers ask in their own words; documents use clinical terms.",
      tradeoff: "A model change means re-embedding everything.",
      prevents: "Missing a page because it uses a different word for the same thing." },
    { id: "index", name: "Search index", lane: "index", plain: "The library: words and meanings in one place", product: "Azure AI Search, single index (text + vectors)",
      what: "Stores each chunk’s text, its embedding and its source (document, section, type).",
      why: "One service, one set of credentials, and keyword plus vector search in a single query.",
      tradeoff: "Tied to Azure’s feature set; fewer tuning options than a specialist vector database.",
      prevents: "Two separate stores drifting out of sync." },
    { id: "copilot", name: "Copilot Studio front end", lane: "live", plain: "Where managers ask, in plain English", product: "Copilot Studio",
      what: "The conversation. Sends the question to the service over HTTP and shows the cited answer.",
      why: "Meet people in a tool they already use.",
      tradeoff: "Little control over retrieval inside the platform, which is why the heavy logic is in code.",
      prevents: "Yet another app to learn." },
    { id: "api", name: "Answering service", lane: "live", plain: "Runs the answering steps in a fixed order", product: "Python FastAPI service + LangChain LCEL chain",
      what: "Receives the question and runs the chain in a fixed order: hybrid search → gate → grounded prompt → GPT-4.",
      why: "RetrievalQA gave too little control over the prompt; an explicit [[lcel|LCEL]] chain let me insert steps.",
      tradeoff: "A service to host, secure and maintain.",
      prevents: "Logic that can’t be tested, versioned or tuned." },
    { id: "search", name: "Hybrid search", lane: "live", plain: "Two librarians: exact words and meaning", product: "Hybrid search: BM25 + vector, merged with RRF",
      what: "Runs [[bm25|keyword]] and [[vector|vector]] search in parallel and merges the lists with [[rrf|RRF]], by rank position.",
      why: "Meaning search understood intent but missed exact codes, ward numbers and consultant names.",
      tradeoff: function (F, C) { return "One more setting to tune: the vector query’s weight, tuned on " + F(C.hybridTuningQueries) + " representative queries."; },
      prevents: "Missing exact identifiers, and missing questions worded differently from the documents." },
    { id: "gate", name: "Confidence gate", lane: "live", plain: "The invigilator: is the evidence good enough?", product: "Confidence threshold, checked before the model is called",
      what: "If the top result scores below a calibrated threshold, the chain stops and returns a structured “low confidence” response.",
      why: "The finance directors’ worry was liability. Better “I can’t answer” than a plausible wrong figure.",
      tradeoff: "A slower path for some questions: about 15–20% were handed to a person in the pilot.",
      prevents: "Confident answers built on weak evidence." },
    { id: "answer", name: "Grounded answer", lane: "live", plain: "Writes a cited answer from the pages only", product: "Grounded prompt → Azure OpenAI GPT-4 (AzureChatOpenAI)",
      what: "The [[grounding|open-book exam]]: answer only from the retrieved context, say so if it isn’t there, cite document and section for every claim.",
      why: "Clinical leads needed to check any figure against its source.",
      tradeoff: "Strict grounding gives plainer, sometimes shorter answers.",
      prevents: "Answers from the model’s general knowledge instead of the trust’s documents.",
      ownNote: "I built the prompt; GPT-4 is an Azure OpenAI service." },
    { id: "review", name: "Human review", lane: "live", plain: "A person checks it, in their usual task list", product: "Copilot Studio branch → the trust’s existing task system",
      what: "On a low-confidence response, creates a review task for a senior administrator.",
      why: "Human review plugs into a workflow staff already used, not a new dashboard.",
      tradeoff: "A slower answer for hard questions, and reviewer workload.",
      prevents: "A weak question silently getting a guess." }
  ],

  ownershipLabels: {
    built:      { label: "I built", cls: "own-built" },
    designed:   { label: "I designed, team built", cls: "own-designed" },
    prototyped: { label: "I prototyped, team productionised", cls: "own-proto" },
    platform:   { label: "Platform service", cls: "own-platform" }
  },

  futureState: [
    { lane: "manager", step: "Asks in plain English" },
    { lane: "agent", step: "Finds the best pages (two searches)" },
    { lane: "agent", step: "Checks the evidence is good enough" },
    { lane: "manager", step: "Gets a cited answer", branch: "pass" },
    { lane: "reviewer", step: "Gets a review task", branch: "fail" },
    { lane: "manager", step: "Gets a human-checked answer", branch: "fail" }
  ],

  // plain = the learner-friendly label; choice/alternative may contain [[glossary]] markers;
  // traces = requirement ids from config.js this decision served.
  tradeoffs: [
    { id: "rag", plain: "Look it up, don’t memorise it", traces: ["R1", "R4"],
      choice: "Retrieval ([[rag|RAG]])", alternative: "[[finetune|fine-tuning]] a model on the documents",
      headline: "People act on these figures, so every answer had to trace back to a page",
      why: "Auditability: every answer traces to a chunk. Freshness: policies and pathway data change often, and re-indexing beats retraining.",
      gaveUp: "Answers depend on search quality. If search misses the page, the model can’t answer.",
      differently: "Fine-tuning for style or format consistency, never for facts." },
    { id: "hybrid", plain: "Search by words and by meaning", traces: ["R3", "R6"],
      choice: "[[hybrid|Hybrid search]]: keyword + vector, merged by [[rrf|RRF]]", alternative: "pure semantic ([[vector|vector]]) search",
      headline: "Pure semantic search missed exact ward numbers and codes, so I combined two kinds of search",
      why: "Meaning search finds “arthroplasty” from “hip replacement”. Keyword search finds procedure codes, ward numbers and consultant names exactly.",
      gaveUp: function (F, C) { return "Another setting to tune, and the tuning set was informal: " + F(C.hybridTuningQueries) + " representative queries."; },
      differently: "Pure vector search for conversational content with no identifiers in it." },
    { id: "chunking", plain: "Keep tables whole", traces: ["R1", "R10"],
      choice: "Structure-aware [[chunk|chunking]]", alternative: "fixed 500-character chunks",
      headline: "Fixed-size chunks cut clinical tables mid-row, so tables are kept whole",
      why: "Tables are extracted whole (python-docx for Word, pdfplumber for PDF) and tagged; prose is split inside sections. The mid-row failure was seen in testing.",
      gaveUp: "Two code paths, format-specific parsers, and uneven chunk sizes.",
      differently: "Text-to-SQL when a figure must be computed from raw structured data, rather than read from a report." },
    { id: "lcel", plain: "Build every step explicitly", traces: ["R1", "R2"],
      choice: "An explicit LangChain [[lcel|LCEL]] chain", alternative: "LangChain RetrievalQA",
      headline: "RetrievalQA hid the prompt, so I built the chain step by step",
      why: "Control over the prompt structure (source metadata, citation rules) and somewhere to put the confidence gate, mid-chain.",
      gaveUp: "More code to own and test.",
      differently: "A ready-made chain for a quick prototype, where the default prompt is good enough." },
    { id: "store", plain: "One search service, not two", traces: ["R3"],
      choice: "Azure AI Search as the vector store", alternative: "Pinecone or pgvector",
      headline: "One service did keyword and vector search together, so there was no second database to run",
      why: "One service, one set of credentials, hybrid search in a single query.",
      gaveUp: "Tied to Azure’s feature set; fewer vector-tuning options than a specialist database.",
      differently: "A separate vector database at very large scale, or for multi-cloud." },
    { id: "code", plain: "Low-code at the front, code behind", traces: ["R6", "R2"],
      choice: "[[copilot|Copilot Studio]] front end + code backend", alternative: "Copilot Studio on its own",
      headline: "Copilot Studio ran the conversation; code ran the retrieval and guardrails that needed fine control",
      why: "Copilot Studio for the conversation and the review hand-off. A FastAPI service for multi-step logic and fine control over retrieval and the gate.",
      gaveUp: "A service to host, secure and maintain, which a no-code team can’t easily change.",
      differently: "Copilot Studio alone, with a SharePoint knowledge source, for simpler single-source agents. That’s what I’d have a learner build first." }
  ],

  // req = the requirement (and so the stakeholder) each layer answers.
  guardrails: [
    { id: "prompt", name: "[[grounding|Grounded prompt]]", analogy: "Open-book exam rules", req: "R1",
      catches: "Reduces answers drawn from the [[llm|model]]’s general knowledge instead of the trust’s documents, and requires a source for every claim. A prompt lowers this risk; it can’t remove it.",
      example: "Every simulator answer cites document and section." },
    { id: "gate", name: "[[gate|Confidence gate]]", analogy: "The invigilator", req: "R2",
      catches: "Weak evidence. The chain stops before the model is called, so there is nothing to guess from.",
      example: "Query 4 (parking policy) stops here." },
    { id: "review", name: "[[hitl|Human review]]", analogy: "A teacher marks it by hand", req: "R9",
      catches: "Questions the system declined. A senior administrator answers them, in their existing task system.",
      example: "Query 4 becomes a review task, not a guess." }
  ],

  failures: [
    { what: "Tables split by fixed-size chunks", how: "Figures lost their column headings, so answers could be plausible and wrong.", fix: "Structure-aware chunking: tables kept whole and tagged." },
    { what: "Exact codes missed by pure semantic search", how: "Procedure codes, ward numbers and consultant names didn’t match by meaning.", fix: "Hybrid search: BM25 alongside vectors, merged with RRF." },
    { what: "RetrievalQA too rigid", how: "Too little control over the prompt, and nowhere to put the confidence gate.", fix: "An explicit LCEL chain, built step by step." }
  ],

  gaps: [
    "No labelled golden dataset",
    "No formal precision or recall",
    "No systematic faithfulness scoring",
    "No evaluation in CI"
  ],

  learnerQuestions: [
    { q: "Did it find the right page?", layer: "Retrieval", ifNo: "Fix the knowledge source: is the document there, current, and readable? Are tables intact? Try the user’s own wording." },
    { q: "Did it answer faithfully from that page?", layer: "Generation", ifNo: "Fix the instructions: answer only from sources, cite them, and say “I don’t know” when the page doesn’t say." }
  ],

  closeThings: [
    "The real problem was trust, not speed.",
    "Every design choice traced back to a stakeholder need.",
    "Being honest about uncertainty is what got it funded and used."
  ],

  tiles: [
    { label: "The retrieval mechanism", section: "simulation" },
    { label: "My business analysis", section: "found" },
    { label: "The trade-offs", section: "tradeoffs" },
    { label: "Governance and data", section: "guardrails" },
    { label: "Adoption", section: "adoption" },
    { label: "What I’d change", section: "wrong" }
  ],

  // Anticipated questions. a(F, C) returns HTML; F() renders a config value or [FILL].
  // Which requirement each simulator preset demonstrates (shown under the answer).
  presetTraces: { intent: ["R6"], identifier: ["R3"], hybrid: ["R3", "R6"], outofscope: ["R2"] },

  questions: [
    { q: "How did you find out what managers actually needed?",
      a: function (F, C) {
        return C.discoveryMethods.map(function (m) { return F(m.method); }).join("; ") + ". The finding that shaped the design: the two worst steps were about trust (which document is current, and whether a figure is right), not about search speed.";
      } },
    { q: "Why not just Copilot Studio?",
      a: function () { return "For a simpler, single-source agent I would, and it’s what I’d have a learner build first. This one needed hybrid search, a calibrated confidence gate and control over the prompt. Those are easier to build, test and tune in code, so Copilot Studio ran the conversation and called a FastAPI service."; } },
    { q: "How did you know it worked?",
      a: function (F, C) { return "User acceptance testing with " + F(C.pilot.cohort) + " " + F(C.pilot.cohortRole) + " on real queries over " + F(C.pilot.duration) + "; task completion tracking; an escalation rate of " + F(C.pilot.escalationRate) + "; manual spot-checks against source documents. What I didn’t have: a golden dataset, formal precision and recall, or automated faithfulness checks."; } },
    { q: "What about patient data?",
      a: function () { return "The system indexed planning and performance reports, not patient records, and the figures it returns are aggregate: waits by specialty, referral volumes, occupancy by ward. Everything ran inside the trust's own Azure tenant, so no document left infrastructure the trust already governed. PRESENTER: give the DPIA, access-control and retention specifics verbally, and only what you can stand behind."; } },
    { q: "What exactly did you build yourself?",
      a: function (F, C) { return "I built the indexing pipeline, the FastAPI service, the LangChain chain and the Azure AI Search integration, plus Copilot Studio topics for " + F(C.otherAgents.builtTopicsFor) + " of the simpler agents. I prototyped table-extraction chunking; a junior engineer productionised it. The other " + F(C.otherAgents.designedTeamBuilt) + " agents were built by the team to my design, with my review. This agent’s Copilot Studio topic: " + F(ownLabel(C.ownership.copilot)) + "."; } },
    { q: "Why RAG rather than fine-tuning?",
      a: function () { return "Auditability and freshness. Every answer traces to a chunk, and when a document changes we re-index rather than retrain. Fine-tuning changes style and format; it doesn’t give you reliable, citable facts, and people acted on these figures."; } },
    { q: "What happens when documents change?",
      a: function () { return "The scheduled Azure Function re-indexes from Blob Storage. The next question sees the new version. No retraining, which is one of the two reasons I chose RAG."; } },
    { q: "How was the threshold set?",
      a: function (F, C) { return "It thresholds the " + (C.thresholdScoreType === "semanticReranker" ? "semantic reranker score (0\u20134)" : "vector similarity") + " of the top result, never the fused RRF score \u2014 that one is rank-based, not a similarity measure. I calibrated it by hand against the informal query set, raising it until out-of-scope questions escalated reliably."; } },
    { q: "Isn’t a 15–20% escalation rate high?",
      a: function () { return "In healthcare a nonzero rate is healthy: it means the system declines when the evidence is weak. The real question is whether it escalates the right ones, which is exactly what a labelled evaluation set would show."; } },
    { q: "How would a Level 3 learner build a version of this?",
      a: function () { return "Copilot Studio with a SharePoint knowledge source: the platform does the chunking, retrieval and citations. Then the two diagnostic questions: did it find the right page, and did it answer faithfully from it? A next step is a fallback that sends unanswered questions to a person, for example with Power Automate."; } },
    { q: "What went wrong?",
      a: function () { return "Fixed 500-character chunks split tables mid-row; pure semantic search missed exact codes and ward numbers; RetrievalQA was too rigid. All three were caught in testing and fixed. The gap I didn’t close was systematic evaluation."; } }
  ]
};

// Used by the questions above.
function ownLabel(v) {
  if (!v || v === "[FILL]") return v;
  var map = { built: "I built it", designed: "I designed it, the team built it", prototyped: "I prototyped it, the team productionised it", platform: "a platform service" };
  return map[v] || v;
}

if (typeof module !== "undefined" && module.exports) module.exports = CONTENT;
