import type { BotPresetKey } from "@/lib/bots/presets";

export const ASSISTANT_CATALOG: Array<{ key: BotPresetKey; name: string }> = [
  { key: "general", name: "Document Analyst" },
  { key: "health", name: "Health Information Assistant" },
  { key: "legal", name: "Legal Research Assistant" },
  { key: "portfolio", name: "Portfolio Manager Assistant" },
  { key: "study", name: "Study Assistant" },
  { key: "accounting", name: "Tax & Accounting Assistant" },
  { key: "custom", name: "Custom Assistant" },
];
