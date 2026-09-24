export type PortfolioPosition = {
  symbol?: string;
  name: string;
  value: number;
  sector?: string;
  industry?: string;
  assetClass?: string;
  region?: string;
  currency?: string;
  account?: string;
};

export type Exposure = { label: string; value: number; weight: number };

export type PortfolioAnalytics = {
  totalValue: number;
  lineItemCount: number;
  positionCount: number;
  weights: Array<PortfolioPosition & { weight: number }>;
  hhi: number;
  effectiveHoldings: number;
  top1Weight: number;
  top3Weight: number;
  top5Weight: number;
  sectorExposure: Exposure[];
  industryExposure: Exposure[];
  assetClassExposure: Exposure[];
  regionExposure: Exposure[];
  currencyExposure: Exposure[];
  accountExposure: Exposure[];
  alerts: string[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function groupExposure(positions: PortfolioPosition[], key: keyof PortfolioPosition, total: number): Exposure[] {
  const map = new Map<string, number>();
  for (const position of positions) {
    const label = clean(position[key]) || "Unknown";
    map.set(label, (map.get(label) ?? 0) + position.value);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value, weight: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

function holdingKey(position: PortfolioPosition) {
  const symbol = clean(position.symbol).toUpperCase();
  if (symbol) return `symbol:${symbol}`;
  return `name:${clean(position.name).toLowerCase()}`;
}

function aggregateHoldings(positions: PortfolioPosition[]) {
  const map = new Map<string, PortfolioPosition>();
  for (const position of positions) {
    const key = holdingKey(position);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...position, account: undefined });
      continue;
    }
    map.set(key, {
      ...existing,
      value: existing.value + position.value,
      sector: existing.sector || position.sector,
      industry: existing.industry || position.industry,
      assetClass: existing.assetClass || position.assetClass,
      region: existing.region || position.region,
      currency: existing.currency || position.currency,
    });
  }
  return [...map.values()];
}

function unknownWeight(rows: Exposure[]) {
  return rows.find((row) => row.label === "Unknown")?.weight ?? 0;
}

export function analyzePortfolio(raw: PortfolioPosition[]): PortfolioAnalytics {
  const positions = raw
    .map((position) => ({
      ...position,
      symbol: clean(position.symbol),
      name: clean(position.name) || clean(position.symbol) || "Unnamed",
      value: Number(position.value),
      sector: clean(position.sector),
      industry: clean(position.industry),
      assetClass: clean(position.assetClass),
      region: clean(position.region),
      currency: clean(position.currency).toUpperCase(),
      account: clean(position.account),
    }))
    .filter((position) => Number.isFinite(position.value) && position.value > 0);

  const totalValue = positions.reduce((sum, position) => sum + position.value, 0);
  const holdings = aggregateHoldings(positions);
  const weights = holdings
    .map((position) => ({ ...position, weight: totalValue > 0 ? position.value / totalValue : 0 }))
    .sort((a, b) => b.weight - a.weight);
  const hhi = weights.reduce((sum, position) => sum + position.weight ** 2, 0);
  const effectiveHoldings = hhi > 0 ? 1 / hhi : 0;
  const sumTop = (count: number) => weights.slice(0, count).reduce((sum, position) => sum + position.weight, 0);

  const sectorExposure = groupExposure(positions, "sector", totalValue);
  const industryExposure = groupExposure(positions, "industry", totalValue);
  const assetClassExposure = groupExposure(positions, "assetClass", totalValue);
  const regionExposure = groupExposure(positions, "region", totalValue);
  const currencyExposure = groupExposure(positions, "currency", totalValue);
  const accountExposure = groupExposure(positions, "account", totalValue);
  const alerts: string[] = [];

  if ((weights[0]?.weight ?? 0) > 0.25) alerts.push(`Largest security is ${(weights[0].weight * 100).toFixed(1)}% of portfolio value.`);
  if (sumTop(3) > 0.6) alerts.push(`Top 3 securities represent ${(sumTop(3) * 100).toFixed(1)}% of portfolio value.`);
  const topSector = sectorExposure.find((row) => row.label !== "Unknown");
  if (topSector && topSector.weight > 0.4) alerts.push(`${topSector.label} sector exposure is ${(topSector.weight * 100).toFixed(1)}%.`);
  const topIndustry = industryExposure.find((row) => row.label !== "Unknown");
  if (topIndustry && topIndustry.weight > 0.35) alerts.push(`${topIndustry.label} industry exposure is ${(topIndustry.weight * 100).toFixed(1)}%.`);
  const topRegion = regionExposure.find((row) => row.label !== "Unknown");
  if (topRegion && topRegion.weight > 0.85 && regionExposure.filter((row) => row.label !== "Unknown").length > 1) alerts.push(`${topRegion.label} represents ${(topRegion.weight * 100).toFixed(1)}% of geographic exposure.`);
  const topCurrency = currencyExposure.find((row) => row.label !== "Unknown");
  if (topCurrency && topCurrency.weight > 0.9 && currencyExposure.filter((row) => row.label !== "Unknown").length > 1) alerts.push(`${topCurrency.label} represents ${(topCurrency.weight * 100).toFixed(1)}% of currency exposure.`);

  for (const [label, rows] of [["sector", sectorExposure], ["industry", industryExposure], ["region", regionExposure], ["currency", currencyExposure], ["asset class", assetClassExposure]] as const) {
    const missing = unknownWeight(rows);
    if (missing > 0.1) alerts.push(`${(missing * 100).toFixed(1)}% of the portfolio lacks ${label} classification.`);
  }
  if (holdings.length < 5) alerts.push("Portfolio has fewer than five unique positive-value securities; diversification may be limited.");
  if (effectiveHoldings < Math.min(5, holdings.length) && holdings.length >= 5) alerts.push(`Concentration reduces effective holdings to ${effectiveHoldings.toFixed(1)} despite ${holdings.length} unique securities.`);
  if (positions.length > holdings.length) alerts.push(`${positions.length - holdings.length} duplicate account line item${positions.length - holdings.length === 1 ? " was" : "s were"} aggregated into security-level concentration metrics.`);

  return {
    totalValue,
    lineItemCount: positions.length,
    positionCount: holdings.length,
    weights,
    hhi,
    effectiveHoldings,
    top1Weight: sumTop(1),
    top3Weight: sumTop(3),
    top5Weight: sumTop(5),
    sectorExposure,
    industryExposure,
    assetClassExposure,
    regionExposure,
    currencyExposure,
    accountExposure,
    alerts,
  };
}

export function analyticsToPrompt(analytics: PortfolioAnalytics) {
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  const topPositions = analytics.weights.slice(0, 15).map((position) => `${position.symbol || position.name}: ${pct(position.weight)} (${position.sector || "sector unknown"}; ${position.industry || "industry unknown"})`).join("\n");
  const exposure = (rows: Exposure[]) => rows.slice(0, 12).map((row) => `${row.label}: ${pct(row.weight)}`).join("; ");
  return `Deterministic portfolio analytics:\nTotal value: ${analytics.totalValue.toFixed(2)}\nRaw line items: ${analytics.lineItemCount}\nUnique securities: ${analytics.positionCount}\nSecurity HHI: ${analytics.hhi.toFixed(4)}\nEffective holdings: ${analytics.effectiveHoldings.toFixed(2)}\nTop 1 / 3 / 5 securities: ${pct(analytics.top1Weight)} / ${pct(analytics.top3Weight)} / ${pct(analytics.top5Weight)}\n\nTop securities (duplicates across accounts already aggregated):\n${topPositions}\n\nSector exposure: ${exposure(analytics.sectorExposure)}\nIndustry exposure: ${exposure(analytics.industryExposure)}\nAsset-class exposure: ${exposure(analytics.assetClassExposure)}\nRegion exposure: ${exposure(analytics.regionExposure)}\nCurrency exposure: ${exposure(analytics.currencyExposure)}\nAccount exposure: ${exposure(analytics.accountExposure)}\n\nFlags:\n${analytics.alerts.length ? analytics.alerts.map((item) => `- ${item}`).join("\n") : "- No threshold flags triggered."}\n\nThese are allocation/concentration analytics, not forecasts or expected-return estimates.`;
}
