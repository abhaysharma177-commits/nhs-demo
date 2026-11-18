/* config.js — YOUR FACTS. The only file you must edit before presenting.
 *
 * Three kinds of value:
 *   FILL               Unknown. Renders as an amber "[FILL — do not present]" badge.
 *   "[DRAFT] text"     Wording I drafted from the brief. Renders with an amber dotted outline.
 *                      Confirm it (delete the "[DRAFT] " prefix) or replace it.
 *   anything else      Presented as fact. Only leave it if it is true.
 *
 * On load, the page lists every FILL and DRAFT left (browser console + a presenter-only panel).
 * Never put real patient data, real trust names or confidential figures in this file.
 */
var FILL = "[FILL]";

var CONFIG = {
  /* ------------------------------------------------------------------ you */
  presenterName: "Abhay",
  roleLine: "Technical design lead across 8 GenAI agents.",
  agentsLed: 8,
  programme: "an NHS transformation programme",

  /* -------------------------------------------------------------- display */
  theme: "light",               // "light" (best for screenshare) | "dark" | "auto" (follows the OS)

  /* --------------------------------------------------------------- timing */
  // Minutes per section. These add up to 20; the short path (1-2-4-5-6-9-10-12) is about 15.
  // Business analysis gets as much time as the architecture on purpose.
  // The brief's original per-section numbers added up to 25:
  //   opening 1.5, problem 2, found 2.5, architecture 3.5, simulation 4.5, tradeoffs 3,
  //   guardrails 2, adoption 2.5, wrong 2, learners 1, close 0.5
  sectionTimings: {
    opening: 1.5, problem: 1.5, found: 2, architecture: 2, simulation: 3.5, copilot: 2.5,
    tradeoffs: 1.5, guardrails: 1.5, adoption: 1.5, wrong: 1.5, learners: 0.5, close: 0.5
  },
  questionsMinutes: 10,

  /* ------------------------------------------------------ the problem (2) */
  problem: {
    lookupMinutes: "30–45",                 // from the brief
    lookupsDescription: "dozens a day, per trust",
    documentsDescription: "hundreds of Word documents, PDF reports and legacy system exports",
    figuresExamples: "average waiting times per specialty, referral volumes, bed occupancy patterns"
  },
  // Cost calculator defaults. Each has a source note shown next to the input.
  costCalculator: {
    minutesPerLookup: 30, minutesNote: "low end of the observed 30–45 minutes",
    lookupsPerDay: 24,    lookupsNote: "low end of “dozens a day”; replace with your real figure",
    workingDays: 250,     daysNote: "assumption: working days in a year"
  },

  /* ------------------------------------------------- business analysis (3) */
  // How you learned how managers actually searched. Delete methods you didn't use.
  discoveryMethods: [
    { method: "Interviews with operational managers and clinical leads" },
    { method: "Shadowing a figure lookup end to end" },
    { method: "Requirements workshops with the trust" }
  ],

  // The manual lookup today. lane: "manager" | "documents" | "colleagues".
  // Per-step minutes are rough estimates (never measured) that add up to ~39, inside the observed 30-45.
  // `worst: true` marks the two steps that revealed the real problem was trust.
  currentStateSteps: [
    { lane: "manager",    step: "A question arrives", minutes: "~1", pain: "Usually needed for a meeting or a return, so it can't wait" },
    { lane: "documents",  step: "Search shared drives and folders", minutes: "~8", pain: "Figures sit across Word documents, PDF reports and legacy exports" },
    { lane: "documents",  step: "Open and scan likely documents", minutes: "~10", pain: "No way to search inside them all at once" },
    { lane: "manager",    step: "Which document is current?", minutes: "~7", pain: "Several versions of the same report, and no quick way to tell which is latest", worst: true },
    { lane: "colleagues", step: "Ask a colleague who might know", minutes: "~6", pain: "Costs someone else's time, and the answer is often second-hand" },
    { lane: "manager",    step: "Is this figure right?", minutes: "~5", pain: "No quick way to check a figure against its source, so people double-check or re-derive it", worst: true },
    { lane: "manager",    step: "Copy the figure into the report", minutes: "~2", pain: "Re-keyed by hand, with no link back to where it came from" }
  ],

  // Who mattered. power/interest are 0–1 positions on the grid (my estimate: confirm below).
  // requirements: ids from the list further down.
  stakeholders: [
    { id: "managers",  role: "Operational managers", concern: "\u201cI just need the number, and I need it now\u201d",
      howAddressed: "Ask in plain English inside Teams, where they already work \u2014 no new tool, no new login",
      power: 0.32, interest: 0.92, requirements: ["R6", "R4", "R8"] },
    { id: "clinical",  role: "Clinical leads", concern: "\u201cIf the figure is wrong, I can\u2019t tell\u201d",
      howAddressed: "A citation on every factual claim, so any figure can be traced back to its document and section",
      power: 0.78, interest: 0.78, requirements: ["R1", "R3"] },
    { id: "finance",   role: "Finance directors", concern: "\u201cWho is liable when it gets one wrong?\u201d",
      howAddressed: "A confidence gate that refuses rather than guesses, and human review on every low-confidence question",
      power: 0.92, interest: 0.55, requirements: ["R2"] },
    { id: "ig",        role: "Information governance / DPO", concern: "\u201cWhere does trust data end up, and who else can see it?\u201d",
      howAddressed: "Built inside the trust\u2019s own Azure tenant with no new data store, so no new third-party processor needed assessing",
      power: 0.82, interest: 0.38, requirements: ["R5"] },
    { id: "it",        role: "IT and platform", concern: "\u201cAnother service for my team to run, patch and support\u201d",
      howAddressed: "One Azure search service and one set of credentials instead of a separate vector database, and a managed Function rather than a server to maintain",
      power: 0.6, interest: 0.28, requirements: [] },
    { id: "admins",    role: "Senior administrators (reviewers)", concern: "\u201cAm I going to be checking the AI\u2019s homework all day?\u201d",
      howAddressed: "They see only the questions it declined, as a task in the system they already use \u2014 not a new review dashboard",
      power: 0.22, interest: 0.66, requirements: ["R9"] }
  ],
  stakeholderPositionsConfirmed: true,   // set true once the grid positions above are right

  // MoSCoW. from: stakeholder id. metBy: architecture node ids
  // (blob, indexer, chunker, embeddings, index, copilot, api, search, gate, answer, review, tenant).
  requirements: [
    { id: "R1", priority: "Must", text: "Every answer cites its source document and section", from: "clinical", metBy: ["answer"] },
    { id: "R2", priority: "Must", text: "Say “I can’t answer” and route to a person when unsure", from: "finance", metBy: ["gate", "review"] },
    { id: "R3", priority: "Must", text: "Find exact clinical terms, codes, ward numbers and names", from: "clinical", metBy: ["search"] },
    { id: "R4", priority: "Must", text: "Answers reflect the latest documents", from: "managers", metBy: ["indexer", "blob"] },
    { id: "R5", priority: "Must", text: "Meets information governance requirements", from: "ig", metBy: ["tenant"] },
    { id: "R6", priority: "Must", text: "Ask in plain English, in a tool people already use", from: "managers", metBy: ["copilot"] },
    { id: "R8", priority: "Should", text: "Answer in seconds, not minutes", from: "managers", metBy: ["api", "search"] },
    { id: "R9", priority: "Should", text: "Review happens in the existing task system, not a new tool", from: "admins", metBy: ["review"] },
    { id: "R10", priority: "Could", text: "Keep tables whole so figures keep their headings", from: "clinical", metBy: ["chunker"] },
    { id: "R11", priority: "Won't", text: "Calculate new figures from raw data (retrieve, don't compute)", from: "finance", metBy: [] }
  ],

  // Defined up front: baseline → target → actual. Never estimate an actual.
  successMeasures: [
    { measure: "Time to find a figure", baseline: "30–45 min", target: "Seconds", actual: "Not formally measured" },
    { measure: "Answers that cite a source", baseline: "None", target: "Every answer", actual: "Every answer (by design)" },
    { measure: "Questions handed to a person", baseline: "n/a", target: "Low, but never zero", actual: "About 15–20% (pilot)" }
  ],

  businessCase: {
    boardConcern: "Liability, not capability",
    whatIShowed: "The guardrail architecture, including the prototype refusing to answer and passing the question to a person",
    timeToSponsorship: "about two weeks",
    funding: "£1.2m",
    fundingScope: "the wider transformation programme, not this agent alone",  // rough estimate agreed for presenting: be able to defend it
    wonBy: "partly"            // the guardrail demo PARTLY won the funding; keep it that way
  },

  /* ------------------------------------------------------------ ownership */
  // Allowed: "built" | "designed" (I designed, team built) | "prototyped" (I prototyped, team
  // productionised) | "platform" (managed service, nobody built it) | FILL
  ownership: {
    blob: "platform",
    indexer: "built",      // indexing pipeline (scheduled Azure Function)
    chunker: "prototyped", // table-extraction chunking: you prototyped, a junior engineer productionised
    embeddings: "built",   // part of the indexing pipeline
    index: "built",        // Azure AI Search integration
    api: "built",          // FastAPI service + LangChain chain
    search: "built",       // hybrid retrieval in the chain
    gate: "built",         // confidence gate in the chain
    answer: "built",       // grounded prompt in the chain (GPT-4 itself is a platform service)
    copilot: "built",      // this agent's Copilot Studio topic
    review: "built"        // the branch that creates the review task
  },
  otherAgents: { builtTopicsFor: 2, designedTeamBuilt: 6 },

  /* ------------------------------------------------------- technical facts */
  // Which score the production gate thresholded:
  //   "vectorSimilarity"  cosine similarity of the top result
  //   "semanticReranker"  Azure AI Search semantic ranker score, 0–4
  thresholdScoreType: "vectorSimilarity",
  thresholdScoreTypeConfirmed: true,     // ### CONFIRM: is the line above right?
  hybridTuningQueries: "about 40",        // informal set used to tune the keyword/vector weight

  /* ------------------------------------------------------------ simulator */
  simulator: {
    defaultBalance: 0.5,                  // 0 = words only, 1 = meaning only
    defaultThresholds: { vectorSimilarity: 0.5, semanticReranker: 2.0 },   // simulator values, not production
    defaultChunking: "structure"          // "structure" | "fixed"
  },

  /* ------------------------------------------------------------ pilot (8) */
  pilot: {
    cohort: 8, cohortRole: "managers",
    duration: "several weeks",
    escalationRate: "about 15–20%",
    checks: "Manual spot-checks of answers against source documents"
  },

  // Optional. Leave empty to hide the block. e.g. { who: "...", concern: "...", response: "..." }
  resistanceAndResponse: [],

  /* ------------------------------------------------- current status (8) */
  // The panel asked for something "in use". Fill these truthfully.
  deploymentStatus: "Pilot complete, in use by the pilot group",  // rough estimate agreed for presenting: be able to defend it
  currentUsers: "8 managers (pilot cohort)",  // rough estimate agreed for presenting: be able to defend it
  since: "2024"  // rough estimate agreed for presenting: be able to defend it
};

if (typeof module !== "undefined" && module.exports) module.exports = CONFIG;
