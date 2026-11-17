/* corpus.js — synthetic documents for the recreation.
 *
 * EVERYTHING IN THIS FILE IS FICTIONAL. "Northbridge Health Trust", its wards, consultants,
 * figures and the NBX- procedure codes are invented. Do not replace them with real data.
 *
 * How it's organised
 *   concepts   – the 16 "meanings" the simplified semantic layer understands
 *   lexicon    – hand-written map from words/phrases to those meanings (the stand-in for an
 *                embedding model: a real model learns these associations from text)
 *   documents  – authored as sections of prose and tables. The chunkers in engine.js cut these
 *                up, so the "Fixed 500-char / Structure-aware" toggle is real, not canned.
 *   presets    – the four demo queries and what each is guaranteed to show (tests.js checks them)
 *
 * Editing tips
 *   - Keep the words "hip" and "hip replacement" OUT of the documents. Query 1 depends on the
 *     corpus only ever saying "arthroplasty".
 *   - Keep "parking" OUT of the documents. Query 4 depends on nothing being relevant.
 *   - After any edit, open tests.html (or run `node tests.js`) to check the presets still behave.
 *   - Table answer templates use {Column name}; {lc:Column name} lower-cases the first letter.
 */
var CORPUS = {
  trust: "Northbridge Health Trust",
  label: "Synthetic data. Fictional trust, people, wards and codes.",

  concepts: [
    { id: "waiting", label: "waiting times" },
    { id: "ortho", label: "joints and orthopaedics" },
    { id: "cardio", label: "heart and cardiology" },
    { id: "eyes", label: "eyes" },
    { id: "referrals", label: "referrals" },
    { id: "beds", label: "beds and occupancy" },
    { id: "emergency", label: "emergency care" },
    { id: "elective", label: "planned surgery" },
    { id: "outpatients", label: "outpatient clinics" },
    { id: "workforce", label: "staff and recruitment" },
    { id: "estates", label: "buildings and facilities" },
    { id: "governance", label: "records and policy" },
    { id: "infection", label: "infection control" },
    { id: "discharge", label: "discharge and flow" },
    { id: "finance", label: "money and budgets" },
    { id: "travel", label: "travel and parking" }
  ],

  lexicon: {
    // waiting times
    "wait": { waiting: 1 }, "waits": { waiting: 1 }, "waiting": { waiting: 1 }, "waited": { waiting: 1 },
    "waiting time": { waiting: 1 }, "waiting times": { waiting: 1 }, "waiting list": { waiting: 1 },
    "how long": { waiting: 1 }, "delay": { waiting: 0.8 }, "delays": { waiting: 0.8 },
    "backlog": { waiting: 0.9 }, "weeks": { waiting: 0.4 },
    "referral to treatment": { waiting: 0.6, referrals: 0.4 },
    // a waiting AREA is a room, not a wait: the phrase wins over the single word
    "waiting area": { estates: 1 }, "waiting room": { estates: 1 },

    // orthopaedics
    "orthopaedics": { ortho: 1 }, "orthopaedic": { ortho: 1 }, "trauma and orthopaedics": { ortho: 1 },
    "arthroplasty": { ortho: 1 }, "hip": { ortho: 1 }, "knee": { ortho: 1 },
    "hip replacement": { ortho: 1 }, "knee replacement": { ortho: 1 }, "joint replacement": { ortho: 1 },
    "joint": { ortho: 0.8 }, "joints": { ortho: 0.8 }, "musculoskeletal": { ortho: 0.8 }, "fracture": { ortho: 0.8 },

    // cardiology
    "cardiology": { cardio: 1 }, "cardiac": { cardio: 1 }, "heart": { cardio: 1 }, "heart failure": { cardio: 1 },
    "angiography": { cardio: 0.8 }, "arrhythmia": { cardio: 0.8 }, "chest pain": { cardio: 0.9 },
    "echocardiography": { cardio: 0.8 }, "cardiologist": { cardio: 1 },

    // eyes
    "ophthalmology": { eyes: 1 }, "cataract": { eyes: 1 }, "cataracts": { eyes: 1 }, "eye": { eyes: 1 }, "eyes": { eyes: 1 },

    // referrals
    "referral": { referrals: 1 }, "referrals": { referrals: 1 }, "referred": { referrals: 0.9 },
    "gp": { referrals: 0.4 }, "demand": { referrals: 0.5 },

    // beds
    "bed": { beds: 1 }, "beds": { beds: 1 }, "occupancy": { beds: 1 }, "ward": { beds: 0.6 }, "wards": { beds: 0.6 },
    "capacity": { beds: 0.5 }, "inpatient": { beds: 0.5 }, "inpatients": { beds: 0.5 },

    // emergency care ("A&E" is tokenised as "a and e")
    "emergency": { emergency: 1 }, "emergency department": { emergency: 1 }, "a and e": { emergency: 1 },
    "urgent": { emergency: 0.7 }, "ambulance": { emergency: 0.9 }, "attendances": { emergency: 0.6 },

    // planned surgery
    "elective": { elective: 1 }, "planned care": { elective: 1 }, "surgery": { elective: 0.8 },
    "surgical": { elective: 0.6 }, "theatre": { elective: 0.9 }, "theatres": { elective: 0.9 },
    "operation": { elective: 0.8 }, "operations": { elective: 0.8 }, "procedure": { elective: 0.6 },
    "procedures": { elective: 0.6 }, "day case": { elective: 0.7 },

    // outpatients
    "outpatient": { outpatients: 1 }, "outpatients": { outpatients: 1 }, "clinic": { outpatients: 1 },
    "clinics": { outpatients: 1 }, "appointment": { outpatients: 0.9 }, "appointments": { outpatients: 0.9 },
    "follow up": { outpatients: 0.7 },

    // workforce ("staff" is deliberately weak: almost every document mentions staff)
    "staff": { workforce: 0.2 }, "staffing": { workforce: 1 }, "staffed": { workforce: 0.6 },
    "workforce": { workforce: 1 }, "recruitment": { workforce: 1 }, "vacancy": { workforce: 1 },
    "vacancies": { workforce: 1 }, "nurse": { workforce: 0.8 }, "nurses": { workforce: 0.8 },
    "nursing": { workforce: 0.8 }, "consultant": { workforce: 0.4 }, "appointed": { workforce: 0.8 },
    "rota": { workforce: 0.8 }, "training": { workforce: 0.6 },

    // estates
    "estates": { estates: 1 }, "facilities": { estates: 1 }, "building": { estates: 0.8 },
    "seating": { estates: 1 }, "chairs": { estates: 0.6 }, "refurbishment": { estates: 1 },
    "maintenance": { estates: 1 }, "roof": { estates: 0.8 }, "lift": { estates: 0.6 },

    // records and policy ("policy" is weak for the same reason as "staff")
    "policy": { governance: 0.3 }, "data protection": { governance: 1 }, "records": { governance: 0.8 },
    "record": { governance: 0.8 }, "retention": { governance: 1 }, "governance": { governance: 1 },
    "information governance": { governance: 1 }, "privacy": { governance: 1 }, "confidential": { governance: 0.8 },

    // infection control
    "infection": { infection: 1 }, "hygiene": { infection: 1 }, "norovirus": { infection: 1 },
    "flu": { infection: 0.8 }, "vaccination": { infection: 0.8 },

    // discharge and flow
    "discharge": { discharge: 1 }, "discharges": { discharge: 1 }, "delayed discharges": { discharge: 1 },
    "length of stay": { discharge: 1 }, "social care": { discharge: 0.7 }, "care home": { discharge: 0.7 },

    // money
    "budget": { finance: 1 }, "funding": { finance: 1 }, "cost": { finance: 0.8 }, "costs": { finance: 0.8 },
    "spend": { finance: 0.8 },

    // travel and parking (nothing in the corpus is about this: that is the point of query 4)
    "parking": { travel: 1 }, "car park": { travel: 1 }, "car parking": { travel: 1 },
    "permit": { travel: 0.7 }, "permits": { travel: 0.7 }, "bus": { travel: 0.8 }, "travel": { travel: 1 },
    "cycle": { travel: 0.6 }
  },

  documents: [
    {
      id: "erp", title: "Elective Recovery Plan 2025/26", short: "Elective Recovery Plan",
      kind: "Word", version: "v3.2", updated: "2 Oct 2025",
      sections: [
        { id: "s1", heading: "1. Purpose", blocks: [{ type: "prose", text:
          "This plan sets out how Northbridge Health Trust will reduce the elective backlog during 2025/26. " +
          "It covers planned surgery, diagnostics and outpatient follow up across all specialties. " +
          "The Elective Care Board reviews progress every month and reports to the Trust Board each quarter." }] },
        { id: "s2", heading: "2. Where we are now", blocks: [{ type: "prose", text:
          "Demand for planned care has grown faster than capacity since 2023. " +
          "Theatre utilisation averaged 78% in the first half of the year, against a local goal of 85%. " +
          "Cancelled operations on the day fell for the third month in a row, and the number of patients " +
          "treated each week is now close to the level the plan assumes." }] },
        { id: "s3", heading: "3. Waits by specialty", blocks: [{
          type: "table", id: "t2",
          caption: "Table 2. Elective waits by specialty, September 2025",
          columns: ["Specialty", "Procedure group", "Longest wait (weeks)", "Median wait (weeks)", "Patients on list"],
          rows: [
            ["General surgery", "Hernia repair", "39", "14", "412"],
            ["Cardiology", "Diagnostic angiography", "30", "11", "286"],
            ["Ophthalmology", "Cataract surgery", "26", "9", "690"],
            ["Trauma and orthopaedics", "Primary arthroplasty", "63", "41", "1,145"],
            ["Urology", "Cystoscopy", "33", "12", "318"],
            ["Ear, nose and throat", "Tonsillectomy", "44", "18", "205"]
          ],
          note: "Patients waiting more than 52 weeks are reviewed weekly by the specialty lead. " +
                "Waits are in weeks, from referral to treatment. Source: PAS extract, 30 September 2025.",
          answer: "In September 2025 the median wait for {lc:Procedure group} ({lc:Specialty}) was " +
                  "{Median wait (weeks)} weeks. The longest wait was {Longest wait (weeks)} weeks, " +
                  "with {Patients on list} patients on the list."
        }] },
        { id: "s4", heading: "4. Actions", blocks: [{ type: "prose", text:
          "Extra Saturday theatre lists for trauma and orthopaedics began in August and add around 40 " +
          "arthroplasty procedures a month. Ophthalmology has moved cataract surgery to a dedicated day case unit. " +
          "Each specialty lead reports progress against these actions at the Elective Care Board." }] }
      ]
    },
    {
      id: "tno", title: "Trauma and Orthopaedics Pathway Guide", short: "T&O Pathway Guide",
      kind: "Word", version: "v1.4", updated: "16 Jun 2025",
      sections: [
        { id: "s2", heading: "2. Referral pathway", blocks: [{ type: "prose", text:
          "GP referrals for patients with persistent joint pain go first to the musculoskeletal triage service. " +
          "Patients who meet the criteria are referred to an orthopaedic consultant, who assesses whether " +
          "arthroplasty is appropriate. The consultant agrees a treatment plan with the patient before listing." }] },
        { id: "s5", heading: "5. Pre-operative assessment", blocks: [{ type: "prose", text:
          "Every patient listed for arthroplasty completes a pre-operative assessment before a date is booked. " +
          "The assessment checks fitness for anaesthetic, medicines and support at home after discharge. " +
          "Patients who are not yet fit are referred back to their GP with a plan." }] }
      ]
    },
    {
      id: "bed", title: "Bed Capacity Review, Q2 2025/26", short: "Bed Capacity Review",
      kind: "PDF", version: "final", updated: "14 Oct 2025",
      sections: [
        { id: "s1", heading: "1. Summary", blocks: [{ type: "prose", text:
          "Adult general and acute bed occupancy averaged 93% across the trust in Q2, above the 92% planning level. " +
          "Inpatient capacity was tightest on Mondays, when beds freed at the weekend refilled from planned admissions. " +
          "Medical specialties ran fuller than surgical ones throughout the quarter." }] },
        { id: "s3", heading: "3. Occupancy by ward", blocks: [{
          type: "table", id: "t4",
          caption: "Table 4. Bed occupancy by ward, Q2 2025/26",
          columns: ["Ward", "Specialty", "Beds", "Average occupancy", "Peak occupancy"],
          rows: [
            ["Ward 4A", "Cardiology", "24", "91%", "100%"],
            ["Ward 6", "General medicine", "30", "96%", "100%"],
            ["Ward 7A", "Trauma (emergency admissions)", "26", "94%", "100%"],
            ["Ward 7B", "Elective orthopaedics", "28", "98%", "100%"],
            ["Ward 9", "Surgical assessment", "18", "88%", "97%"]
          ],
          note: "Occupancy is measured at midnight. Ward 7B has been ring-fenced for elective orthopaedics since July.",
          answer: "{Ward} ({lc:Specialty}, {Beds} beds) averaged {Average occupancy} occupancy in Q2 2025/26, " +
                  "with a peak of {Peak occupancy}."
        }] },
        { id: "s4", heading: "4. Discharge", blocks: [{ type: "prose", text:
          "Delayed discharges took up an average of 37 beds a day in Q2. Most delays were for a care home place " +
          "or a package of social care. The discharge team now reviews every patient with a length of stay over 21 days." }] }
      ]
    },
    {
      id: "perf", title: "Monthly Performance Report, September 2025", short: "Performance Report (Sept)",
      kind: "PDF", version: "board pack", updated: "9 Oct 2025",
      sections: [
        { id: "s2", heading: "2. Referrals", blocks: [{ type: "prose", text:
          "GP referrals across all specialties rose 6% on the same period last year. Cardiology and dermatology " +
          "saw the sharpest rises. Referral demand for trauma and orthopaedics was flat." }] },
        { id: "s21", heading: "2.1 Referrals by month", blocks: [{
          type: "table", id: "t1",
          caption: "Table 1. GP referrals by month, April to September 2025",
          columns: ["Specialty", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
          rows: [
            ["Cardiology", "410", "432", "398", "455", "470", "488"],
            ["Dermatology", "352", "371", "380", "402", "415", "433"],
            ["Trauma and orthopaedics", "618", "604", "611", "597", "620", "609"],
            ["Ophthalmology", "288", "301", "295", "310", "306", "315"]
          ],
          note: "Counts are new GP referrals received, excluding internal transfers.",
          answer: "{Specialty} received {Apr} GP referrals in April, {May} in May, {Jun} in June, {Jul} in July, " +
                  "{Aug} in August and {Sep} in September 2025."
        }] },
        { id: "s4", heading: "4. Emergency department", blocks: [{ type: "prose", text:
          "The emergency department saw 9,412 attendances in September. 71% of patients were admitted, " +
          "transferred or sent home within four hours. Ambulance handovers over 60 minutes fell to 38." }] }
      ]
    },
    {
      id: "card", title: "Cardiology Service Review", short: "Cardiology Review",
      kind: "Word", version: "v2.0", updated: "29 Sep 2025",
      sections: [
        { id: "s2", heading: "2. Access to heart outpatients", blocks: [{ type: "prose", text:
          "Waits for a first heart outpatient appointment have grown since the spring. The cardiology backlog is " +
          "now the largest of any medical specialty, and waits for heart failure appointments are the longest. " +
          "Delays are worst for patients referred as routine." }] },
        { id: "s3", heading: "3. Waits by consultant", blocks: [{
          type: "table", id: "t5",
          caption: "Table 5. Cardiology outpatient waits by consultant, September 2025",
          columns: ["Consultant", "Clinic", "Median wait to first appointment (weeks)", "Patients on list"],
          rows: [
            ["Dr J. Whitlow", "Heart failure", "14", "230"],
            ["Dr L. Harrow", "Arrhythmia", "9", "145"],
            ["Dr S. Penrose", "General cardiology", "11", "310"]
          ],
          note: "Waits are measured from referral to first appointment.",
          answer: "{Consultant}'s {lc:Clinic} clinic had a median wait of {Median wait to first appointment (weeks)} " +
                  "weeks to a first appointment in September 2025, with {Patients on list} patients on the list."
        }] },
        { id: "s4", heading: "4. Diagnostics", blocks: [{ type: "prose", text:
          "Echocardiography capacity rose by 20% after a third scanner was installed in June. " +
          "Reporting times for routine scans are now under two weeks." }] }
      ]
    },
    {
      id: "wf", title: "Workforce Bulletin, October 2025", short: "Workforce Bulletin",
      kind: "PDF", version: "issue 41", updated: "6 Oct 2025",
      sections: [
        { id: "s1", heading: "New clinical lead for cardiology", blocks: [{ type: "prose", text:
          "Dr Jonah Whitlow has been appointed clinical lead for cardiology. Dr Whitlow has worked at Northbridge " +
          "for a long time and joins the leadership team from the heart failure service. Dr Whitlow will lead " +
          "recruitment to two new consultant posts. Dr Whitlow's existing clinic bookings are not affected." }] },
        { id: "s2", heading: "Nursing recruitment", blocks: [{ type: "prose", text:
          "The trust welcomed 46 newly qualified nurses in September. Ward-based vacancy rates fell to 7.8%. " +
          "Staff can book onto the preceptorship programme through the learning hub." }] }
      ]
    },
    {
      id: "est", title: "Estates and Facilities Update, Q2", short: "Estates Update",
      kind: "PDF", version: "Q2", updated: "3 Oct 2025",
      sections: [
        { id: "s1", heading: "Outpatients waiting area", blocks: [{ type: "prose", text:
          "Replacement of the seating in the main Outpatients waiting area finishes in November. People told us the " +
          "old seating was uncomfortable during long clinics, so the replacement chairs are higher and have arms. " +
          "The waiting area stays open throughout the work." }] },
        { id: "s2", heading: "Maintenance", blocks: [{ type: "prose", text:
          "The roof over the main kitchen will be repaired in January. Lift 3 in the north block is out of service " +
          "until further notice. Report building faults through the estates helpdesk." }] }
      ]
    },
    {
      id: "rec", title: "Records and Data Protection Policy", short: "Records Policy",
      kind: "Word", version: "v5.1", updated: "1 Apr 2025",
      sections: [
        { id: "s1", heading: "1. Scope", blocks: [{ type: "prose", text:
          "This policy applies to all staff, contractors and volunteers who create or handle trust records. " +
          "It sets out how records are created, stored, shared and destroyed, in line with data protection law." }] },
        { id: "s4", heading: "4. Retention", blocks: [{ type: "prose", text:
          "Health records are kept for the periods in the national retention schedule. Departments must not keep " +
          "their own copies of patient records on shared drives. Ask the information governance team before " +
          "destroying any record." }] }
      ]
    },
    {
      id: "win", title: "Winter Plan 2025/26", short: "Winter Plan",
      kind: "Word", version: "v1.0", updated: "22 Sep 2025",
      sections: [
        { id: "s3", heading: "3. Escalation beds", blocks: [{ type: "prose", text:
          "Ward 7A will open six escalation beds from 1 December if bed occupancy stays above 95% for three days " +
          "during a flu or norovirus surge. Escalation beds are staffed from the bank and agency nursing rota, and " +
          "the site team decides when to open and close them." }] },
        { id: "s5", heading: "5. Flu vaccination", blocks: [{ type: "prose", text:
          "Staff flu vaccination opens on 1 October. Peer vaccinators will visit every department in the first " +
          "two weeks, and walk-in sessions run in the education centre on Tuesdays." }] }
      ]
    },
    {
      id: "ipc", title: "Infection Prevention Annual Report 2024/25", short: "Infection Prevention Report",
      kind: "PDF", version: "final", updated: "30 Jun 2025",
      sections: [
        { id: "s2", heading: "2. Hand hygiene", blocks: [{ type: "prose", text:
          "Hand hygiene audits were completed on every ward each month. Compliance averaged 96%. Ward 6 and Ward 9 " +
          "had the lowest scores and now have weekly audits." }] },
        { id: "s3", heading: "3. Norovirus", blocks: [{ type: "prose", text:
          "Two wards closed to new admissions for norovirus in February, for a total of nine days. " +
          "Deep cleaning was completed before each reopened." }] }
      ]
    },
    {
      id: "opt", title: "Outpatient Transformation Programme Update", short: "Outpatient Programme",
      kind: "Word", version: "v0.9", updated: "11 Sep 2025",
      sections: [
        { id: "s1", heading: "Progress", blocks: [{ type: "prose", text:
          "Patient-initiated follow up now covers 14 specialties. Video clinics make up 18% of outpatient " +
          "appointments, and text reminders have cut missed appointments by a fifth since March." }] }
      ]
    },
    {
      id: "pas", title: "Legacy PAS export: procedure codes", short: "PAS code export",
      kind: "Export", version: "extract", updated: "30 Sep 2025",
      sections: [
        { id: "s1", heading: "Code list", blocks: [{
          type: "table", id: "tc",
          caption: "Procedure code lookup (fictional codes)",
          columns: ["Code", "Description", "Specialty"],
          rows: [
            ["NBX-4471", "Primary arthroplasty", "Trauma and orthopaedics"],
            ["NBX-4473", "Revision arthroplasty", "Trauma and orthopaedics"],
            ["NBX-2207", "Diagnostic angiography", "Cardiology"],
            ["NBX-3150", "Cataract extraction", "Ophthalmology"],
            ["NBX-1102", "Hernia repair", "General surgery"]
          ],
          note: "NBX codes are fictional and exist only in this recreation.",
          answer: "{Code} is the (fictional) code for {lc:Description}, in {lc:Specialty}."
        }] }
      ]
    }
  ],

  /* The four preset queries. `expect` is what tests.js asserts (structure-aware chunking,
     default balance, default threshold, both score types). */
  presets: [
    {
      id: "intent", label: "Intent",
      query: "How long are people waiting for a hip replacement?",
      proves: "Meaning search finds “arthroplasty” even though nobody typed it. Word search alone picks a page about chairs.",
      expect: { winner: "erp:t2", keywordTopIsNot: "erp:t2", vectorTop: "erp:t2", gate: "pass", answerIncludes: "41 weeks" }
    },
    {
      id: "identifier", label: "Exact ward",
      query: "Bed occupancy on Ward 7B",
      proves: "Word search nails the exact ward. Meaning search alone prefers a general page about beds.",
      expect: { winner: "bed:t4", keywordTop: "bed:t4", vectorTop: "bed:s1", gate: "pass", answerIncludes: "98%" }
    },
    {
      id: "hybrid", label: "Needs both",
      query: "How long is the wait for Dr Whitlow's clinic?",
      proves: "Neither search puts the right page first on its own. Both rank it highly, so combining the lists lifts it to the top.",
      expect: { winner: "card:t5", keywordTopIsNot: "card:t5", vectorTopIsNot: "card:t5", gate: "pass", answerIncludes: "14 weeks" }
    },
    {
      id: "outofscope", label: "Out of scope",
      query: "What's the staff parking policy?",
      proves: "Both searches still return something. The confidence check sees it isn't good enough and hands the question to a person.",
      expect: { gate: "fail" }
    }
  ]
};

if (typeof module !== "undefined" && module.exports) module.exports = CORPUS;
