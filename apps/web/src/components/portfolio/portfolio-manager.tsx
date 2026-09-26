"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { AlertTriangle, Download, FileUp, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { analyzePortfolio, type Exposure, type PortfolioPosition } from "@/lib/portfolio/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, PageShell, SectionHeading, Surface } from "@/components/app/page-shell";

const empty: PortfolioPosition = { symbol: "", name: "", value: 0, sector: "", industry: "", assetClass: "Equity", region: "India", currency: "INR", account: "" };
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const money = (value: number, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(value);

function ExposureRows({ title, rows }: { title: string; rows: Exposure[] }) {
  return (
    <div className="border-t border-border pt-5 first:border-t-0 first:pt-0 lg:border-t-0 lg:border-l lg:pl-6 lg:first:border-l-0 lg:first:pl-0">
      <h3 className="text-xs font-medium text-[#cbd0d7]">{title}</h3>
      <div className="mt-4 space-y-3.5">
        {rows.slice(0, 7).map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]"><span className="truncate text-muted-foreground">{row.label}</span><span className="text-[#c9ced5]">{pct(row.weight)}</span></div>
            <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#8da7cf]" style={{ width: `${Math.max(1, row.weight * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortfolioManager() {
  const [name, setName] = useState("My Portfolio");
  const [baseCurrency, setBaseCurrency] = useState("INR");
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/portfolio").then((response) => response.json()).then((data) => {
      if (data.portfolio) { setName(data.portfolio.name); setBaseCurrency(data.portfolio.base_currency); setPositions(data.positions || []); }
    }).catch(() => undefined);
  }, []);

  const analytics = useMemo(() => analyzePortfolio(positions), [positions]);

  function update(index: number, key: keyof PortfolioPosition, value: string | number) {
    setPositions((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: key === "value" ? Number(value) : value } : row));
  }

  function parseCsv(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete(result) {
        const normalized = result.data.map((row) => ({
          symbol: row.symbol || row.Symbol || row.ticker || row.Ticker || "",
          name: row.name || row.Name || row.company || row.Company || row.symbol || row.Symbol || "",
          value: Number(row.value || row.Value || row.current_value || row.market_value || row["Market Value"] || 0),
          sector: row.sector || row.Sector || "", industry: row.industry || row.Industry || "",
          assetClass: row.asset_class || row.assetClass || row["Asset Class"] || "Equity",
          region: row.region || row.Region || "India", currency: row.currency || row.Currency || baseCurrency, account: row.account || row.Account || "",
        })).filter((row) => row.name && Number.isFinite(row.value) && row.value > 0);
        if (!normalized.length) { toast.error("No valid rows found. Use the CSV template columns."); return; }
        setPositions(normalized); toast.success(`Imported ${normalized.length} positions`);
      },
    });
  }

  async function save() {
    if (!analytics.positionCount) { toast.error("Add at least one positive-value position."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/portfolio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, baseCurrency, positions }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Save failed");
      toast.success("Portfolio saved. Your Portfolio assistant can now analyze it.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <PageShell className="max-w-7xl">
      <PageHeader
        eyebrow="Portfolio"
        title="Exposure & diversification"
        description="Inspect current allocation, concentration and diversification. This workspace deliberately does not forecast prices or recommend market timing."
        actions={<><input ref={inputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) parseCsv(file); event.currentTarget.value = ""; }} /><Button variant="secondary" onClick={() => inputRef.current?.click()}><FileUp className="size-4" />Import CSV</Button><a href="/portfolio-template.csv" download><Button variant="ghost"><Download className="size-4" />Template</Button></a><Button onClick={save} disabled={saving}><Save className="size-4" />{saving ? "Saving…" : "Save"}</Button></>}
      />

      <Surface className="mt-7 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
          <div><label className="field-label" htmlFor="portfolio-name">Portfolio name</label><Input id="portfolio-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div><label className="field-label" htmlFor="base-currency">Base currency</label><Input id="base-currency" value={baseCurrency} maxLength={8} onChange={(event) => setBaseCurrency(event.target.value.toUpperCase())} /></div>
          <Link href="/app/bots"><Button variant="secondary" className="w-full sm:w-auto">Open Portfolio assistant</Button></Link>
        </div>
      </Surface>

      {analytics.positionCount > 0 ? (
        <>
          <div className="mt-4 grid overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Portfolio value", money(analytics.totalValue, baseCurrency), null],
              ["Unique securities", String(analytics.positionCount), `${analytics.lineItemCount} line items`],
              ["Largest position", pct(analytics.top1Weight), null],
              ["Top 3 concentration", pct(analytics.top3Weight), null],
              ["Effective holdings", analytics.effectiveHoldings.toFixed(1), "1 / HHI"],
            ].map(([label, value, note], index) => (
              <div key={label} className={`p-4 sm:p-5 ${index ? "border-t border-border sm:border-t-0 sm:border-l" : ""}`}><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-2 text-xl font-semibold tracking-[-0.025em] text-foreground">{value}</div>{note ? <div className="mt-1 text-[10px] text-subtle-foreground">{note}</div> : null}</div>
            ))}
          </div>

          {analytics.alerts.length ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-400/15 bg-amber-300/[.03] p-4"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300/80" /><div><h3 className="text-sm font-medium">Concentration flags</h3><ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">{analytics.alerts.map((alert) => <li key={alert}>• {alert}</li>)}</ul></div></div>
          ) : null}

          <Surface className="mt-4 p-5 sm:p-6">
            <SectionHeading title="Exposure breakdown" description="Deterministic allocation by the classification fields in your positions." />
            <div className="mt-6 grid gap-6 lg:grid-cols-3"><ExposureRows title="Sector" rows={analytics.sectorExposure} /><ExposureRows title="Industry" rows={analytics.industryExposure} /><ExposureRows title="Asset class" rows={analytics.assetClassExposure} /></div>
            <div className="mt-6 grid gap-6 border-t border-border pt-6 lg:grid-cols-3"><ExposureRows title="Region" rows={analytics.regionExposure} /><ExposureRows title="Currency" rows={analytics.currencyExposure} /><ExposureRows title="Account" rows={analytics.accountExposure} /></div>
          </Surface>
        </>
      ) : null}

      <Surface className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border p-4 sm:px-5"><SectionHeading title="Positions" description="Use current market value. Classification fields drive the exposure analysis." /><Button size="sm" variant="secondary" onClick={() => setPositions((current) => [...current, { ...empty, currency: baseCurrency }])}><Plus className="size-4" />Add</Button></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-xs">
            <thead className="bg-surface-soft text-subtle-foreground"><tr>{["Symbol", "Name", "Value", "Sector", "Industry", "Asset class", "Region", "Currency", "Account", ""].map((heading) => <th key={heading} className="px-3 py-2.5 font-medium">{heading}</th>)}</tr></thead>
            <tbody>{positions.map((position, index) => <tr key={index} className="border-t border-border hover:bg-white/[.012]"><td className="p-2"><Input value={position.symbol || ""} onChange={(event) => update(index, "symbol", event.target.value)} /></td><td className="p-2"><Input value={position.name} onChange={(event) => update(index, "name", event.target.value)} /></td><td className="p-2"><Input type="number" min="0" step="0.01" value={position.value || ""} onChange={(event) => update(index, "value", event.target.value)} /></td><td className="p-2"><Input value={position.sector || ""} onChange={(event) => update(index, "sector", event.target.value)} /></td><td className="p-2"><Input value={position.industry || ""} onChange={(event) => update(index, "industry", event.target.value)} /></td><td className="p-2"><Input value={position.assetClass || ""} onChange={(event) => update(index, "assetClass", event.target.value)} /></td><td className="p-2"><Input value={position.region || ""} onChange={(event) => update(index, "region", event.target.value)} /></td><td className="p-2"><Input value={position.currency || ""} onChange={(event) => update(index, "currency", event.target.value)} /></td><td className="p-2"><Input value={position.account || ""} onChange={(event) => update(index, "account", event.target.value)} /></td><td className="p-2"><button aria-label={`Delete ${position.name || position.symbol || "position"}`} onClick={() => setPositions((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="grid size-9 place-items-center rounded-lg text-subtle-foreground hover:bg-red-500/[.06] hover:text-red-300"><Trash2 className="size-4" /></button></td></tr>)}{!positions.length ? <tr><td colSpan={10} className="p-10 text-center text-sm text-muted-foreground">Import a CSV or add your first position.</td></tr> : null}</tbody>
          </table>
        </div>
      </Surface>

      {analytics.weights.length ? (
        <Surface className="mt-4 p-5 sm:p-6"><SectionHeading title="Position weights" description="Largest holdings first." aside={<span className="text-[10px] uppercase tracking-[.12em] text-subtle-foreground">Deterministic</span>} /><div className="mt-5 space-y-3">{analytics.weights.slice(0, 20).map((position) => <div key={`${position.symbol}-${position.name}`} className="grid grid-cols-[minmax(90px,1fr)_minmax(100px,3fr)_56px] items-center gap-3"><div className="truncate text-xs text-[#c7ccd3]">{position.symbol || position.name}</div><div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#8da7cf]" style={{ width: `${Math.max(1, position.weight * 100)}%` }} /></div><div className="text-right text-[11px] text-muted-foreground">{pct(position.weight)}</div></div>)}</div></Surface>
      ) : null}
    </PageShell>
  );
}
