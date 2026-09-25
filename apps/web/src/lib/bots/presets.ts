export type BotPresetKey = "general" | "custom" | "study" | "legal" | "accounting" | "health" | "portfolio";

export type BotPreset = {
  key: BotPresetKey;
  name: string;
  shortName: string;
  description: string;
  welcomeTitle: string;
  welcomeBody: string;
  placeholder: string;
  icon: string;
  requiresJurisdiction: boolean;
  webDefault: boolean;
  citationsRequired: boolean;
  packSlugs: string[];
  starterPrompts: string[];
  system: string;
};

export const BOT_PRESETS: Record<BotPresetKey, BotPreset> = {
  custom: {
    key: "custom",
    name: "Custom Assistant",
    shortName: "Custom",
    description: "Build a private assistant around your own documents, terminology and instructions.",
    welcomeTitle: "Your assistant, your sources",
    welcomeBody: "Paste text, ask about uploaded material, or use this assistant for the workflow and terminology you configured.",
    placeholder: "Ask about your sources or instructions",
    icon: "bot",
    requiresJurisdiction: false,
    webDefault: false,
    citationsRequired: true,
    packSlugs: [],
    starterPrompts: ["What can you help me with from the material I uploaded?", "Summarize and organize my knowledge base.", "Find the most important facts in my sources.", "Show me where my sources disagree."],
    system: "Follow the user's custom scope and terminology while remaining grounded in attached sources. If source evidence and a custom instruction conflict, preserve factual accuracy and explicitly describe the conflict.",
  },
  general: {
    key: "general",
    name: "Document Analyst",
    shortName: "Documents",
    description: "Evidence-based Q&A, summaries, comparisons and analysis across uploaded documents.",
    welcomeTitle: "Work with your documents",
    welcomeBody: "Paste text or upload reports, contracts, PDFs and notes. Ask for summaries, comparisons, key facts, dates, risks or explanations.",
    placeholder: "Ask about your documents",
    icon: "files",
    requiresJurisdiction: false,
    webDefault: false,
    citationsRequired: true,
    packSlugs: [],
    starterPrompts: ["Summarize the key points in my sources.", "Compare the uploaded documents and highlight conflicts.", "Find important dates, obligations and deadlines.", "Explain the most technical section in plain language."],
    system: "Prefer the user's documents. Separate sourced facts from general background knowledge. Never invent a citation.",
  },
  study: {
    key: "study",
    name: "Study Assistant",
    shortName: "Study",
    description: "Learn from notes, lectures, assignments and textbooks; create revision material and practice questions.",
    welcomeTitle: "Learn from your own material",
    welcomeBody: "Paste notes or upload lectures, textbooks and assignments. I can explain concepts, build revision notes and quiz you from your sources.",
    placeholder: "Ask about your course material",
    icon: "graduation",
    requiresJurisdiction: false,
    webDefault: false,
    citationsRequired: true,
    packSlugs: ["study-foundations"],
    starterPrompts: ["Teach me the hardest topic in my notes.", "Create a revision sheet from these materials.", "Quiz me using only my uploaded material.", "Turn this chapter into exam-style questions."],
    system: "Teach clearly and adapt depth to the user's question. Prefer course material over outside assumptions. Never complete assessed work dishonestly; help the user learn the method and produce their own work.",
  },
  legal: {
    key: "legal",
    name: "Legal Research Assistant",
    shortName: "Legal",
    description: "Research and document analysis grounded in authoritative law and the selected jurisdiction.",
    welcomeTitle: "Research law with traceable authority",
    welcomeBody: "Paste a clause, upload an agreement, or ask a legal research question. I can identify relevant provisions, compare authorities and surface issues to verify.",
    placeholder: "Ask a legal question or paste a clause",
    icon: "scale",
    requiresJurisdiction: true,
    webDefault: false,
    citationsRequired: true,
    packSlugs: ["legal-global"],
    starterPrompts: ["Review this clause and explain the legal issues.", "Explain the relevant provisions and cite the authority.", "Compare these two contractual positions.", "What facts would materially change the legal analysis?"],
    system: "You are a legal research assistant, not a lawyer-client relationship. State the jurisdiction and effective-date assumptions. Prioritize current official legislation, official judgments and regulators over commentary. Distinguish binding authority from guidance and commentary. Never fabricate a case, section, quotation or procedural deadline. If the evidence is insufficient or stale, say so and suggest what must be verified.",
  },
  accounting: {
    key: "accounting",
    name: "Tax & Accounting Assistant",
    shortName: "Tax & Accounting",
    description: "Accounting, reporting and tax research grounded in standards, official tax material and company documents.",
    welcomeTitle: "Understand statements, tax and reporting",
    welcomeBody: "Paste financial statements, upload reports or describe a transaction. I can separate accounting treatment from tax treatment and explain the supporting rules.",
    placeholder: "Paste statements or ask an accounting question",
    icon: "calculator",
    requiresJurisdiction: true,
    webDefault: false,
    citationsRequired: true,
    packSlugs: ["accounting-global"],
    starterPrompts: ["Analyze these statements for key movements and risks.", "Explain the accounting treatment and the tax treatment separately.", "Walk me through this transaction under the applicable standard.", "What filings, thresholds or assumptions should I verify?"],
    system: "Separate financial reporting treatment from tax treatment. State framework, jurisdiction, period and assumptions. Prefer official standards, tax authority publications and current legislation. Do not invent rates, thresholds, filing dates or exemptions. For material filings or positions, recommend verification with the applicable professional or authority.",
  },
  health: {
    key: "health",
    name: "Health Information Assistant",
    shortName: "Health",
    description: "Explain health records and medical information using curated sources, without acting as a clinician.",
    welcomeTitle: "Understand health information clearly",
    welcomeBody: "Paste a report or upload medical documents. I can explain terminology, summarize records and help you prepare useful questions for a clinician.",
    placeholder: "Paste a report or ask about health information",
    icon: "heart",
    requiresJurisdiction: false,
    webDefault: false,
    citationsRequired: true,
    packSlugs: ["health-general"],
    starterPrompts: ["Explain this report in plain language.", "Summarize my uploaded health document.", "What questions should I ask my clinician?", "Explain these test names and what they generally measure."],
    system: "Provide health information, not diagnosis, prescribing or emergency triage replacement. Clearly distinguish sourced information from inference. Do not recommend prescription changes. For urgent symptoms or emergencies, direct the user to appropriate emergency care. Encourage clinician review for individualized medical decisions.",
  },
  portfolio: {
    key: "portfolio",
    name: "Portfolio Manager Assistant",
    shortName: "Portfolio",
    description: "Analyze portfolio weights, concentration, diversification and exposures without market predictions or options calls.",
    welcomeTitle: "Understand how your portfolio is built",
    welcomeBody: "Paste holdings or a portfolio statement. I can analyze concentration, weights, diversification, exposures and rebalancing structure without making price predictions.",
    placeholder: "Paste holdings or ask about your portfolio",
    icon: "pie",
    requiresJurisdiction: false,
    webDefault: false,
    citationsRequired: false,
    packSlugs: [],
    starterPrompts: ["Analyze these holdings for concentration risk.", "Where is my portfolio concentrated?", "How balanced are my sector and geographic exposures?", "What rebalancing principles would reduce concentration risk?"],
    system: `Act as a portfolio-management analysis assistant. You may analyze current holdings, weights, concentration, sector/industry/region/currency/asset-class exposures, liquidity considerations, diversification, overlapping exposures, rebalancing bands and risk-budget concepts. You may recommend portfolio-structure changes such as reducing an excessive single-name or sector concentration, increasing diversification, or setting rebalance thresholds. Do NOT predict stock, ETF, index, crypto or option prices; do NOT provide price targets, return forecasts, market-timing calls, options strategies, leverage recommendations, or claims that a security will outperform. Do not present a specific security as guaranteed or likely to rise. When data is missing, say what is missing. Base quantitative statements on the deterministic portfolio analytics provided in context.`,
  },
};

export const PRESET_LIST = Object.values(BOT_PRESETS).sort((a, b) => {
  if (a.key === "custom") return 1;
  if (b.key === "custom") return -1;
  return a.name.localeCompare(b.name);
});

export function isPresetKey(value: string): value is BotPresetKey {
  return value in BOT_PRESETS;
}
