import React, { useState, useMemo } from 'react';
import {
  ChannelInputs,
  CogsFreightState,
  GlobalOverhead,
  BreakevenInputs,
  DebtEquityInputs,
  ChannelRealization,
  CircuitBreakerThresholds,
  BlendedFinancials,
  SKULibraryState,
  LogisticsState,
  CompanyProfile,
} from '../types';
import { computeBlendedFinancials } from '../utils/calculations';
import { fmtCurrency, fmtPct } from '../utils/formatters';
import { SectionHeader } from './InputRow';
import { Save, Trash2, GitCompare, Upload } from 'lucide-react';

export interface SavedScenario {
  id: string;
  name: string;
  timestamp: number;
  channels: Record<string, ChannelInputs>;
  cogsFreight: CogsFreightState;
  globalOverhead: GlobalOverhead;
  dashboardMix: Record<string, number>;
  targetRev: number;
  breakevenInputs: BreakevenInputs;
  debtEquityInputs: DebtEquityInputs;
  channelRealization: ChannelRealization;
  circuitBreakerThresholds: CircuitBreakerThresholds;
  skuLibrary?: SKULibraryState;
  logistics?: LogisticsState;
  channelSKUToggles?: Record<string, Record<string, boolean>>;
  companyProfile?: CompanyProfile;
}

export interface ScenarioManagerProps {
  channels: Record<string, ChannelInputs>;
  cogsFreight: CogsFreightState;
  globalOverhead: GlobalOverhead;
  dashboardMix: Record<string, number>;
  targetRev: number;
  breakevenInputs: BreakevenInputs;
  debtEquityInputs: DebtEquityInputs;
  channelRealization: ChannelRealization;
  circuitBreakerThresholds: CircuitBreakerThresholds;
  skuLibrary: SKULibraryState;
  logistics: LogisticsState;
  channelSKUToggles: Record<string, Record<string, boolean>>;
  companyProfile: CompanyProfile;
  onLoadScenario: (scenario: SavedScenario) => void;
  scenarios: SavedScenario[];
  onScenariosChange: (scenarios: SavedScenario[]) => void;
}

/* ── helpers ─────────────────────────────────────────────── */

function generateId(): string {
  return 'sc_' + Math.random().toString(36).substr(2, 9);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Compute quick-summary metrics for a scenario row */
function scenarioMetrics(s: SavedScenario): BlendedFinancials {
  return computeBlendedFinancials(
    s.channels,
    s.cogsFreight,
    s.globalOverhead,
    s.dashboardMix,
    s.targetRev,
  );
}

/* ── comparison metric definitions ───────────────────────── */

interface MetricDef {
  label: string;
  value: (b: BlendedFinancials, s: SavedScenario) => string;
  raw: (b: BlendedFinancials, s: SavedScenario) => number;
  format: 'currency' | 'pct' | 'number' | 'text';
  /** When positive delta means improvement, set true (revenue, margin).
   *  When lower is better (cash float), set false. */
  positiveIsGood: boolean;
}

const METRICS: MetricDef[] = [
  {
    label: 'Blended Net Rev / Unit',
    value: (b) => fmtCurrency(b.blendedNetRev),
    raw: (b) => b.blendedNetRev,
    format: 'currency',
    positiveIsGood: true,
  },
  {
    label: 'Blended Contrib Margin / Unit',
    value: (b) => fmtCurrency(b.blendedContribMargin),
    raw: (b) => b.blendedContribMargin,
    format: 'currency',
    positiveIsGood: true,
  },
  {
    label: 'Blended Contrib Margin %',
    value: (b) => fmtPct(b.blendedContribMarginPct),
    raw: (b) => b.blendedContribMarginPct,
    format: 'pct',
    positiveIsGood: true,
  },
  {
    label: 'Target Revenue',
    value: (_, s) => fmtCurrency(s.targetRev),
    raw: (_, s) => s.targetRev,
    format: 'currency',
    positiveIsGood: true,
  },
  {
    label: 'Implied Units',
    value: (b) => b.impliedUnits.toLocaleString('en-US', { maximumFractionDigits: 0 }),
    raw: (b) => b.impliedUnits,
    format: 'number',
    positiveIsGood: true,
  },
  {
    label: 'Gross Revenue',
    value: (b) => fmtCurrency(b.grossRevenue),
    raw: (b) => b.grossRevenue,
    format: 'currency',
    positiveIsGood: true,
  },
  {
    label: 'EBITDA',
    value: (b) => fmtCurrency(b.operatingCashFlow),
    raw: (b) => b.operatingCashFlow,
    format: 'currency',
    positiveIsGood: true,
  },
  {
    label: 'Total Cash Float',
    value: (b) => fmtCurrency(b.totalCashFloat),
    raw: (b) => b.totalCashFloat,
    format: 'currency',
    positiveIsGood: false, // lower cash float = better
  },
  {
    label: 'Working Capital',
    value: (b) => fmtCurrency(b.netWorkingCapital),
    raw: (b) => b.netWorkingCapital,
    format: 'currency',
    positiveIsGood: true,
  },
  {
    label: 'Self-Funded Growth',
    value: (b) => fmtPct(b.maxSelfFundedGrowth),
    raw: (b) => b.maxSelfFundedGrowth,
    format: 'pct',
    positiveIsGood: true,
  },
];

/* ── delta formatting ────────────────────────────────────── */

function formatDelta(
  rawA: number,
  rawB: number,
  format: 'currency' | 'pct' | 'number' | 'text',
  positiveIsGood: boolean,
): { text: string; color: string } {
  const diff = rawB - rawA;
  if (Math.abs(diff) < 0.0001) return { text: '—', color: 'text-base-content/50' };

  const sign = diff > 0 ? '+' : '';
  let text: string;
  if (format === 'currency') {
    text = sign + fmtCurrency(diff);
  } else if (format === 'pct') {
    text = sign + fmtPct(diff);
  } else {
    text = sign + diff.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  const isImprovement = positiveIsGood ? diff > 0 : diff < 0;
  const color = isImprovement ? 'text-success font-semibold' : 'text-error font-semibold';
  return { text, color };
}

/* ── component ───────────────────────────────────────────── */

export const ScenarioManager: React.FC<ScenarioManagerProps> = (props) => {
  const {
    channels,
    cogsFreight,
    globalOverhead,
    dashboardMix,
    targetRev,
    breakevenInputs,
    debtEquityInputs,
    channelRealization,
    circuitBreakerThresholds,
    skuLibrary,
    logistics,
    channelSKUToggles,
    companyProfile,
    onLoadScenario,
    scenarios,
    onScenariosChange,
  } = props;

  const [scenarioName, setScenarioName] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  /* ── save ──────────────────────────────────────────────── */

  const handleSave = () => {
    const name = scenarioName.trim();
    if (!name) return;
    const newScenario: SavedScenario = {
      id: generateId(),
      name,
      timestamp: Date.now(),
      channels: JSON.parse(JSON.stringify(channels)),
      cogsFreight: JSON.parse(JSON.stringify(cogsFreight)),
      globalOverhead: JSON.parse(JSON.stringify(globalOverhead)),
      dashboardMix: { ...dashboardMix },
      targetRev,
      breakevenInputs: JSON.parse(JSON.stringify(breakevenInputs)),
      debtEquityInputs: JSON.parse(JSON.stringify(debtEquityInputs)),
      channelRealization: JSON.parse(JSON.stringify(channelRealization)),
      circuitBreakerThresholds: JSON.parse(JSON.stringify(circuitBreakerThresholds)),
      skuLibrary: JSON.parse(JSON.stringify(skuLibrary)),
      logistics: JSON.parse(JSON.stringify(logistics)),
      channelSKUToggles: JSON.parse(JSON.stringify(channelSKUToggles)),
      companyProfile: JSON.parse(JSON.stringify(companyProfile)),
    };
    onScenariosChange([newScenario, ...scenarios]);
    setScenarioName('');
  };

  /* ── delete ────────────────────────────────────────────── */

  const handleDelete = (id: string) => {
    onScenariosChange(scenarios.filter((s) => s.id !== id));
    setCompareIds((prev) => prev.filter((cid) => cid !== id));
  };

  /* ── compare toggle ────────────────────────────────────── */

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((cid) => cid !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  };

  /* ── memoized comparison data ──────────────────────────── */

  const comparisonData = useMemo(() => {
    if (compareIds.length < 2) return null;
    const selected = compareIds
      .map((id) => scenarios.find((s) => s.id === id))
      .filter(Boolean) as SavedScenario[];
    if (selected.length < 2) return null;
    return selected.map((s) => ({
      scenario: s,
      blended: scenarioMetrics(s),
    }));
  }, [compareIds, scenarios]);

  /* ── quick metrics for list rows (memoized) ────────────── */

  const rowMetrics = useMemo(() => {
    const map = new Map<string, BlendedFinancials>();
    scenarios.forEach((s) => map.set(s.id, scenarioMetrics(s)));
    return map;
  }, [scenarios]);

  /* ── channel mix summary for comparison ────────────────── */

  const mixSummary = (mix: Record<string, number>) =>
    Object.entries(mix)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
      .join(', ');

  /* ── render ────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ─── Section 1: Save Current State ─────────────────── */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4">
          <SectionHeader title="Save Current Scenario" />
          <div className="flex items-center gap-3 mt-2">
            <input
              type="text"
              placeholder='e.g. "Board Deck – Conservative"'
              className="input input-bordered input-warning flex-1"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              className="btn btn-primary btn-sm gap-1"
              disabled={!scenarioName.trim()}
              onClick={handleSave}
            >
              <Save size={14} />
              Save Scenario
            </button>
          </div>
          {scenarios.length > 0 && (
            <p className="text-xs text-base-content/60 mt-1">
              {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} saved
            </p>
          )}
        </div>
      </div>

      {/* ─── Section 2: Saved Scenarios List ───────────────── */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4">
          <SectionHeader title="Saved Scenarios" />

          {scenarios.length === 0 ? (
            <p className="text-sm text-base-content/50 italic mt-2">
              No saved scenarios yet. Save your first scenario above.
            </p>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs uppercase tracking-wider">
                    <th className="w-8">
                      <GitCompare size={13} className="opacity-50" />
                    </th>
                    <th>Name</th>
                    <th>Saved</th>
                    <th className="text-right">Net Rev/U</th>
                    <th className="text-right">Contrib %</th>
                    <th className="text-right">EBITDA</th>
                    <th className="text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => {
                    const m = rowMetrics.get(s.id);
                    const isSelected = compareIds.includes(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={isSelected ? 'bg-primary/10' : 'hover'}
                      >
                        <td>
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs checkbox-primary"
                            checked={isSelected}
                            onChange={() => toggleCompare(s.id)}
                            disabled={!isSelected && compareIds.length >= 3}
                          />
                        </td>
                        <td className="font-medium text-sm">{s.name}</td>
                        <td className="text-xs text-base-content/60">
                          {formatDate(s.timestamp)}
                        </td>
                        <td className="text-right font-mono text-xs">
                          {m ? fmtCurrency(m.blendedNetRev) : '—'}
                        </td>
                        <td className="text-right font-mono text-xs">
                          {m ? fmtPct(m.blendedContribMarginPct) : '—'}
                        </td>
                        <td className="text-right font-mono text-xs">
                          {m ? fmtCurrency(m.operatingCashFlow) : '—'}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn btn-ghost btn-xs gap-1 text-info"
                              onClick={() => onLoadScenario(s)}
                              title="Load this scenario"
                            >
                              <Upload size={13} />
                              Load
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => handleDelete(s.id)}
                              title="Delete scenario"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 3: Comparison View ────────────────────── */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4">
          <SectionHeader title="Scenario Comparison" />

          {!comparisonData ? (
            <p className="text-sm text-base-content/50 italic mt-2 flex items-center gap-2">
              <GitCompare size={14} />
              Select 2–3 scenarios above to compare side-by-side.
            </p>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs uppercase tracking-wider">
                    <th>Metric</th>
                    {comparisonData.map(({ scenario }) => (
                      <th key={scenario.id} className="text-right">
                        {scenario.name}
                      </th>
                    ))}
                    {comparisonData.length >= 2 && (
                      <th className="text-right">
                        Δ {comparisonData[0].scenario.name.slice(0, 8)}→
                        {comparisonData[1].scenario.name.slice(0, 8)}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((metric, idx) => {
                    const rawValues = comparisonData.map(({ blended, scenario }) =>
                      metric.raw(blended, scenario),
                    );
                    const delta =
                      comparisonData.length >= 2
                        ? formatDelta(rawValues[0], rawValues[1], metric.format, metric.positiveIsGood)
                        : null;

                    return (
                      <tr key={metric.label} className={idx % 2 === 0 ? 'bg-base-300/30' : ''}>
                        <td className="text-xs font-medium">{metric.label}</td>
                        {comparisonData.map(({ blended, scenario }) => (
                          <td key={scenario.id} className="text-right font-mono text-xs">
                            {metric.value(blended, scenario)}
                          </td>
                        ))}
                        {delta && (
                          <td className={`text-right font-mono text-xs ${delta.color}`}>
                            {delta.text}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Channel Mix row */}
                  <tr className={METRICS.length % 2 === 0 ? 'bg-base-300/30' : ''}>
                    <td className="text-xs font-medium">Channel Mix</td>
                    {comparisonData.map(({ scenario }) => (
                      <td key={scenario.id} className="text-right text-xs max-w-[160px] truncate">
                        {mixSummary(scenario.dashboardMix)}
                      </td>
                    ))}
                    {comparisonData.length >= 2 && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export type { SavedScenario as SavedScenarioType };
