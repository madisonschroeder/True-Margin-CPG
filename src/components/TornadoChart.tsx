import React, { useMemo } from 'react';
import { ChannelInputs, CogsFreightState, GlobalOverhead, LogisticsState, SKULibraryState } from '../types';
import { computeBlendedFinancials } from '../utils/calculations';
import { SectionHeader } from './InputRow';

interface TornadoChartProps {
  channelInputs: Record<string, ChannelInputs>;
  cogsState: CogsFreightState;
  globalOverhead: GlobalOverhead;
  dashboardMix: Record<string, number>;
  targetRev: number;
  logistics?: LogisticsState;
  skuLibrary?: SKULibraryState;
}

interface SensitivityResult {
  label: string;
  lowDelta: number;  // EBITDA change when input is decreased 10%
  highDelta: number; // EBITDA change when input is increased 10%
  swing: number;     // total absolute swing
}

function fmtDollar(v: number): string {
  const sign = v < 0 ? '-' : '+';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
  return `${sign}$${Math.round(abs)}`;
}

function fmtDollarPlain(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(abs).toLocaleString('en-US')}`;
}

export const TornadoChart: React.FC<TornadoChartProps> = ({
  channelInputs,
  cogsState,
  globalOverhead,
  dashboardMix,
  targetRev,
  logistics,
  skuLibrary,
}) => {
  const data = useMemo(() => {
    // Check if COGS data exists
    const node0 = cogsState.nodes[0];
    const hasCogs = node0.rawIngredients > 0 || (node0.plantOverhead || 0) > 0 || (node0.globalOverhead || 0) > 0 || node0.ltlFreightPerPallet > 0;
    if (!hasCogs) return null;

    const baseline = computeBlendedFinancials(channelInputs, cogsState, globalOverhead, dashboardMix, targetRev, undefined, logistics, skuLibrary);
    const baselineEbitda = baseline.operatingCashFlow;

    const results: SensitivityResult[] = [];

    // Helper: compute EBITDA with modified inputs
    const compute = (
      ci: Record<string, ChannelInputs>,
      cs: CogsFreightState,
      go: GlobalOverhead,
      tr: number,
    ) => computeBlendedFinancials(ci, cs, go, dashboardMix, tr, undefined, logistics, skuLibrary).operatingCashFlow;

    // --- Global Overhead Variables ---
    const overheadVars: { key: keyof GlobalOverhead; label: string }[] = [
      { key: 'peoplePayroll', label: 'People & Payroll' },
      { key: 'salesMarketing', label: 'Sales & Marketing' },
      { key: 'facilitiesInsurance', label: 'Facilities & Insurance' },
      { key: 'professionalServices', label: 'Professional Services' },
      { key: 'technologySoftware', label: 'Technology & Software' },
      { key: 'travelEntertainment', label: 'Travel & Entertainment' },
      { key: 'rdProductDev', label: 'R&D / Product Dev' },
      { key: 'generalAdmin', label: 'General & Admin' },
      { key: 'miscellaneous', label: 'Miscellaneous' },
      { key: 'marketingPctOfNetRev', label: 'Marketing % of Rev' },
      { key: 'annualInterestRate', label: 'Interest Rate' },
    ];

    for (const { key, label } of overheadVars) {
      const val = globalOverhead[key];
      if (val === 0) continue;
      const goLow = { ...globalOverhead, [key]: val * 0.9 };
      const goHigh = { ...globalOverhead, [key]: val * 1.1 };
      const lowEbitda = compute(channelInputs, cogsState, goLow, targetRev);
      const highEbitda = compute(channelInputs, cogsState, goHigh, targetRev);
      results.push({
        label,
        lowDelta: lowEbitda - baselineEbitda,
        highDelta: highEbitda - baselineEbitda,
        swing: Math.abs(lowEbitda - baselineEbitda) + Math.abs(highEbitda - baselineEbitda),
      });
    }

    // --- Channel Variables ---
    const channelVars: { key: keyof ChannelInputs; label: string }[] = [
      { key: 'retailerMarginPct', label: 'Retailer Margin %' },
      { key: 'distMarginPct', label: 'Distributor Margin %' },
      { key: 'productMarginPct', label: 'Product Margin %' },
      { key: 'earlyPayPct', label: 'Early Pay Discount' },
      { key: 'tradeSpendPct', label: 'Trade Spend %' },
      { key: 'spoilagePct', label: 'Spoilage %' },
    ];

    for (const { key, label } of channelVars) {
      const modLow: Record<string, ChannelInputs> = {};
      const modHigh: Record<string, ChannelInputs> = {};
      for (const id of Object.keys(channelInputs)) {
        const v = channelInputs[id][key] as number;
        modLow[id] = { ...channelInputs[id], [key]: v * 0.9 };
        modHigh[id] = { ...channelInputs[id], [key]: v * 1.1 };
      }
      const lowEbitda = compute(modLow, cogsState, globalOverhead, targetRev);
      const highEbitda = compute(modHigh, cogsState, globalOverhead, targetRev);
      results.push({
        label,
        lowDelta: lowEbitda - baselineEbitda,
        highDelta: highEbitda - baselineEbitda,
        swing: Math.abs(lowEbitda - baselineEbitda) + Math.abs(highEbitda - baselineEbitda),
      });
    }

    // --- Supply Chain Node 0 Variables ---
    const cogsVars: { key: keyof typeof node0; label: string }[] = [
      { key: 'rawIngredients', label: 'Raw Ingredients' },
      { key: 'plantOverhead', label: 'Plant Overhead' },
      { key: 'globalOverhead', label: 'Global Overhead' },
      { key: 'ltlFreightPerPallet', label: 'Freight per Pallet' },
    ];

    for (const { key, label } of cogsVars) {
      const val = node0[key] as number;
      if (val === 0) continue;
      const makeMod = (mult: number): CogsFreightState => {
        const modified = { ...cogsState, nodes: [...cogsState.nodes] as [typeof node0, typeof node0, typeof node0] };
        modified.nodes[0] = { ...modified.nodes[0], [key]: val * mult };
        return modified;
      };
      const lowEbitda = compute(channelInputs, makeMod(0.9), globalOverhead, targetRev);
      const highEbitda = compute(channelInputs, makeMod(1.1), globalOverhead, targetRev);
      results.push({
        label,
        lowDelta: lowEbitda - baselineEbitda,
        highDelta: highEbitda - baselineEbitda,
        swing: Math.abs(lowEbitda - baselineEbitda) + Math.abs(highEbitda - baselineEbitda),
      });
    }

    // --- Target Revenue ---
    {
      const lowEbitda = compute(channelInputs, cogsState, globalOverhead, targetRev * 0.9);
      const highEbitda = compute(channelInputs, cogsState, globalOverhead, targetRev * 1.1);
      results.push({
        label: 'Target Revenue',
        lowDelta: lowEbitda - baselineEbitda,
        highDelta: highEbitda - baselineEbitda,
        swing: Math.abs(lowEbitda - baselineEbitda) + Math.abs(highEbitda - baselineEbitda),
      });
    }

    // Sort by swing, take top 12
    results.sort((a, b) => b.swing - a.swing);
    const top = results.slice(0, 12).filter(r => r.swing > 0);

    return { top, baselineEbitda };
  }, [channelInputs, cogsState, globalOverhead, dashboardMix, targetRev]);

  if (!data) {
    return (
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <SectionHeader title="SENSITIVITY TORNADO" subtitle="WHICH INPUTS SWING EBITDA THE MOST?" />
          <p className="text-sm text-base-content/50 text-center py-8">
            Enter COGS data to see sensitivity analysis
          </p>
        </div>
      </div>
    );
  }

  const { top, baselineEbitda } = data;

  if (top.length === 0) {
    return (
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <SectionHeader title="SENSITIVITY TORNADO" subtitle="WHICH INPUTS SWING EBITDA THE MOST?" />
          <p className="text-sm text-base-content/50 text-center py-8">
            No sensitivity data to display. Adjust inputs above.
          </p>
        </div>
      </div>
    );
  }

  // SVG layout
  const barHeight = 28;
  const barGap = 6;
  const labelWidth = 150;
  const valueWidth = 70;
  const chartWidth = 400;
  const totalWidth = labelWidth + valueWidth + chartWidth + valueWidth;
  const topPadding = 30;
  const bottomPadding = 30;
  const totalHeight = topPadding + top.length * (barHeight + barGap) + bottomPadding;

  // Find max absolute delta for scaling
  const maxDelta = Math.max(
    ...top.flatMap(r => [Math.abs(r.lowDelta), Math.abs(r.highDelta)])
  );
  const scale = maxDelta > 0 ? (chartWidth / 2) / maxDelta : 1;
  const centerX = labelWidth + valueWidth + chartWidth / 2;

  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <SectionHeader title="SENSITIVITY TORNADO" subtitle="WHICH INPUTS SWING EBITDA THE MOST?" />

        <svg
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="w-full"
          style={{ maxHeight: '500px' }}
        >
          {/* Center baseline label */}
          <text
            x={centerX}
            y={topPadding - 10}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="10"
            fontFamily="monospace"
          >
            Baseline EBITDA: {fmtDollarPlain(baselineEbitda)}
          </text>

          {/* Center line */}
          <line
            x1={centerX}
            y1={topPadding}
            x2={centerX}
            y2={totalHeight - bottomPadding}
            stroke="#6b7280"
            strokeWidth="1"
            strokeDasharray="4,2"
          />

          {/* -10% / +10% labels */}
          <text x={labelWidth + valueWidth + 4} y={topPadding - 2} fill="#6b7280" fontSize="9" fontFamily="monospace">
            ← −10%
          </text>
          <text x={labelWidth + valueWidth + chartWidth - 4} y={topPadding - 2} textAnchor="end" fill="#6b7280" fontSize="9" fontFamily="monospace">
            +10% →
          </text>

          {top.map((item, i) => {
            const y = topPadding + i * (barHeight + barGap);

            // For each item, we draw two bars: one for lowDelta (−10%), one for highDelta (+10%)
            // lowDelta: if negative, bar goes left; if positive, bar goes right
            // highDelta: if negative, bar goes left; if positive, bar goes right

            const lowBarWidth = Math.abs(item.lowDelta) * scale;
            const highBarWidth = Math.abs(item.highDelta) * scale;

            const lowBarX = item.lowDelta < 0 ? centerX - lowBarWidth : centerX;
            const highBarX = item.highDelta < 0 ? centerX - highBarWidth : centerX;

            // Color: red if makes EBITDA worse, green if better
            const lowColor = item.lowDelta < 0 ? '#ef4444' : '#22c55e';
            const highColor = item.highDelta < 0 ? '#ef4444' : '#22c55e';

            // Left value label (for −10% perturbation)
            const leftVal = item.lowDelta;
            const leftLabelX = item.lowDelta < 0
              ? centerX - lowBarWidth - 4
              : centerX + lowBarWidth + 4;

            // Right value label (for +10% perturbation)
            const rightVal = item.highDelta;
            const rightLabelX = item.highDelta < 0
              ? centerX - highBarWidth - 4
              : centerX + highBarWidth + 4;

            return (
              <g key={item.label}>
                {/* Variable label */}
                <text
                  x={labelWidth - 8}
                  y={y + barHeight / 2 + 4}
                  textAnchor="end"
                  fill="#e5e7eb"
                  fontSize="11"
                  fontFamily="system-ui, sans-serif"
                >
                  {item.label}
                </text>

                {/* Low bar (−10% perturbation) */}
                {lowBarWidth > 0.5 && (
                  <rect
                    x={lowBarX}
                    y={y}
                    width={lowBarWidth}
                    height={barHeight / 2 - 1}
                    fill={lowColor}
                    opacity={0.8}
                    rx={2}
                  />
                )}

                {/* High bar (+10% perturbation) */}
                {highBarWidth > 0.5 && (
                  <rect
                    x={highBarX}
                    y={y + barHeight / 2}
                    width={highBarWidth}
                    height={barHeight / 2 - 1}
                    fill={highColor}
                    opacity={0.8}
                    rx={2}
                  />
                )}

                {/* Value labels */}
                {lowBarWidth > 0.5 && (
                  <text
                    x={leftLabelX}
                    y={y + barHeight / 4 + 4}
                    textAnchor={item.lowDelta < 0 ? 'end' : 'start'}
                    fill="#d1d5db"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {fmtDollar(leftVal)}
                  </text>
                )}
                {highBarWidth > 0.5 && (
                  <text
                    x={rightLabelX}
                    y={y + (3 * barHeight) / 4 + 4}
                    textAnchor={item.highDelta < 0 ? 'end' : 'start'}
                    fill="#d1d5db"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {fmtDollar(rightVal)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <p className="text-xs text-base-content/50 mt-2">
          Each bar shows the EBITDA impact of a ±10% change in that input. Sorted by total swing.
        </p>
      </div>
    </div>
  );
};
