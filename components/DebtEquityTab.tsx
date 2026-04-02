import React, { useMemo, useState } from 'react';
import { BlendedFinancials, DebtEquityInputs, ChannelInputs } from '../types';
import { computeDebtVsEquity } from '../utils/calculations';
import { fmtCurrency, fmtPct, fmtNumber } from '../utils/formatters';
import { InputRow, OutputRow, SectionHeader } from './InputRow';

interface Props {
  blended: BlendedFinancials;
  inputs: DebtEquityInputs;
  onChange: (inputs: DebtEquityInputs) => void;
  channelInputs: Record<string, ChannelInputs>;
  dashboardMix: Record<string, number>;
}

/* ── Cash Timeline colour tokens ── */
const CT_COL = {
  inventory: '#6366f1',
  ar: '#f59e0b',
  ap: '#22c55e',
  underwater: '#ef4444',
  text: '#e5e7eb',
  textMuted: '#9ca3af',
  line: '#4b5563',
};

const CHANNEL_IDS = ['kehe', 'club', 'dsd', 'online', 'altfdsvc'];

/* ── Small metric card (for cash timeline) ── */
const MetricCard: React.FC<{
  label: string;
  value: string;
  color: string;
  sub: string;
}> = ({ label, value, color, sub }) => (
  <div className="rounded-lg bg-base-300/50 p-3 text-center">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50 mb-1">
      {label}
    </div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
    <div className="text-[10px] text-base-content/40 mt-0.5">{sub}</div>
  </div>
);

export const DebtEquityTab: React.FC<Props> = ({ blended, inputs, onChange, channelInputs, dashboardMix }) => {
  const out = computeDebtVsEquity(blended, inputs);
  const [timelineOpen, setTimelineOpen] = useState(true);

  /* ── Cash timeline calculations ── */
  const {
    blendedARDays,
    blendedAPDays,
    blendedInvDays,
    ctTotalDays,
    ctUnderwaterDays,
    ctHasData,
  } = useMemo(() => {
    const ar = CHANNEL_IDS.reduce(
      (s, id) => s + (dashboardMix[id] || 0) * (channelInputs[id]?.arDays ?? 0),
      0,
    );
    const ap = CHANNEL_IDS.reduce(
      (s, id) => s + (dashboardMix[id] || 0) * (channelInputs[id]?.apDays ?? 0),
      0,
    );
    const inv = CHANNEL_IDS.reduce(
      (s, id) => s + (dashboardMix[id] || 0) * (channelInputs[id]?.blendedInventoryDays ?? 0),
      0,
    );
    const total = inv + ar;
    return {
      blendedARDays: Math.round(ar),
      blendedAPDays: Math.round(ap),
      blendedInvDays: Math.round(inv),
      ctTotalDays: Math.round(total),
      ctUnderwaterDays: Math.round(inv + ar - ap),
      ctHasData: total > 0,
    };
  }, [channelInputs, dashboardMix]);

  const update = (field: keyof DebtEquityInputs, value: number) => {
    onChange({ ...inputs, [field]: value });
  };

  const verdictColor = out.recommendation.startsWith('ALL DEBT') ? 'bg-success/10 border-success' :
    out.recommendation.startsWith('ALL EQUITY') ? 'bg-info/10 border-info' :
    out.recommendation.startsWith('BLENDED') ? 'bg-warning/10 border-warning' :
    out.recommendation.startsWith('NO CAPITAL') ? 'bg-success/10 border-success' :
    out.recommendation.startsWith('EQUITY-HEAVY') ? 'bg-info/10 border-info' :
    'bg-base-200 border-base-300';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Context Banner */}
      <div className="alert alert-info text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>Auto-calculates capital needs from your <strong>blended channel reality</strong>. EBITDA: <strong>{fmtCurrency(blended.operatingCashFlow)}</strong> · Working Capital Float: <strong>{fmtCurrency(blended.totalCashFloat)}</strong></span>
      </div>

      {/* ═══ SECTION 1: CAPITAL NEEDS ANALYZER ═══ */}
      <div className="card bg-base-200">
        <div className="card-body p-4 space-y-1">
          <h2 className="card-title text-sm">📊 CAPITAL NEEDS ANALYZER</h2>
          <p className="text-xs text-base-content/60 mb-2">Auto-calculated from your blended model — the tool knows what type of capital each need requires.</p>

          <SectionHeader title="WORKING CAPITAL (DEBT-APPROPRIATE)" subtitle="AUTO-CALCULATED" />
          <OutputRow label="Cash Conversion Cycle" value={fmtNumber(blended.blendedCCC, 0) + ' days'} />
          <OutputRow label="Peak Inventory Cash" value={fmtCurrency(blended.peakInventoryCash)} />
          <OutputRow label="Accounts Receivable" value={fmtCurrency(blended.accountsReceivable)} />
          <OutputRow label="Less: Accounts Payable" value={'(' + fmtCurrency(blended.accountsPayable) + ')'} />
          <OutputRow label="Overhead Burn During CCC" value={fmtCurrency(blended.overheadBurnDuringCycle)} />
          <OutputRow label="→ Total Working Capital Need" value={fmtCurrency(out.workingCapitalNeed)} bold accent />
          <p className="text-xs text-base-content/50 italic pl-2">Asset-backed, revolving, self-liquidating → LOC / short-term note candidate</p>

          <div className="divider my-1"></div>

          <SectionHeader title="OPERATING RUNWAY (EQUITY-APPROPRIATE)" subtitle={blended.operatingCashFlow >= 0 ? 'EBITDA-POSITIVE' : 'EBITDA-NEGATIVE'} />
          {blended.operatingCashFlow >= 0 ? (
            <div className="px-2 py-2">
              <p className="text-sm text-success font-medium">✅ Your blended model is EBITDA-positive — no operating runway burn.</p>
            </div>
          ) : (
            <>
              <OutputRow label="Monthly Burn Rate" value={fmtCurrency(out.monthlyBurn)} danger />
              <InputRow label="Desired Runway (Months)" value={inputs.runwayMonths} onChange={(v) => update('runwayMonths', v)} highlight />
              <OutputRow label="→ Operating Runway Need" value={fmtCurrency(out.operatingRunwayNeed)} bold danger />
              <p className="text-xs text-base-content/50 italic pl-2">No collateral backing — requires equity or convertible note</p>
            </>
          )}

          <div className="divider my-1"></div>

          <SectionHeader title="ADDITIONAL CAPITAL" subtitle="OPTIONAL" />
          <InputRow label="CapEx / R&D / Other" value={inputs.additionalCapital} onChange={(v) => update('additionalCapital', v)} type="currency" highlight />

          <div className="divider my-1"></div>

          {/* Capital Stack Summary */}
          <div className="bg-base-300 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm">TOTAL CAPITAL NEED</span>
              <span className="font-mono font-bold text-lg">{fmtCurrency(out.totalCapitalNeed)}</span>
            </div>
            <div className="flex gap-2 h-4 rounded-full overflow-hidden">
              {out.debtAppropriate > 0 && (
                <div
                  className="bg-success h-full rounded-l-full transition-all"
                  style={{ width: `${out.optimalDebtPct * 100}%` }}
                  title={`Debt: ${fmtCurrency(out.debtAppropriate)}`}
                />
              )}
              {out.equityAppropriate > 0 && (
                <div
                  className="bg-info h-full rounded-r-full transition-all"
                  style={{ width: `${out.optimalEquityPct * 100}%` }}
                  title={`Equity: ${fmtCurrency(out.equityAppropriate)}`}
                />
              )}
              {out.totalCapitalNeed <= 0 && (
                <div className="bg-success/30 h-full w-full rounded-full" />
              )}
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-success font-medium">🏦 Debt (LOC): {fmtCurrency(out.debtAppropriate)} ({fmtPct(out.optimalDebtPct)})</span>
              <span className="text-info font-medium">📈 Equity: {fmtCurrency(out.equityAppropriate)} ({fmtPct(out.optimalEquityPct)})</span>
            </div>
          </div>

          {/* ═══ CASH CONVERSION VISUALIZATION (absorbed from Cash Timeline) ═══ */}
          <div className="divider my-1"></div>
          <button
            className="flex items-center gap-2 w-full text-left"
            onClick={() => setTimelineOpen(!timelineOpen)}
          >
            <span className="text-xs font-bold tracking-wider text-base-content/70">
              {timelineOpen ? '▾' : '▸'} CASH CONVERSION VISUALIZATION
            </span>
            <span className="text-[10px] text-base-content/40 uppercase">When does your money come back?</span>
          </button>

          {timelineOpen && (
            <div className="mt-2 space-y-3">
              {!ctHasData ? (
                <p className="text-center text-base-content/50 py-6 text-sm">
                  Configure channel inputs to see timeline
                </p>
              ) : (() => {
                /* ── SVG geometry ── */
                const svgW = 800;
                const svgH = 220;
                const pad = { left: 50, right: 50, top: 30, bottom: 50 };
                const barY = 90;
                const barH = 32;
                const usableW = svgW - pad.left - pad.right;
                const maxDay = ctTotalDays || 1;
                const xFn = (day: number) => pad.left + (day / maxDay) * usableW;

                const xDay0 = xFn(0);
                const xAP = xFn(Math.min(blendedAPDays, maxDay));
                const xINV = xFn(Math.min(blendedInvDays, maxDay));
                const xEnd = xFn(maxDay);

                const DayMarker = ({ day, label, yOff = 0 }: { day: number; label: string; yOff?: number }) => {
                  const cx = xFn(Math.min(day, maxDay));
                  return (
                    <g>
                      <line x1={cx} y1={barY - 6} x2={cx} y2={barY + barH + 6} stroke={CT_COL.line} strokeWidth={1} strokeDasharray="3,2" />
                      <circle cx={cx} cy={barY + barH / 2} r={3} fill={CT_COL.text} />
                      <text x={cx} y={barY + barH + 22 + yOff} textAnchor="middle" fill={CT_COL.text} fontSize={11} fontWeight={600}>Day {day}</text>
                      <text x={cx} y={barY + barH + 36 + yOff} textAnchor="middle" fill={CT_COL.textMuted} fontSize={9}>{label}</text>
                    </g>
                  );
                };

                const ZoneBar = ({ x1, x2, y, h, color, label, labelY }: { x1: number; x2: number; y: number; h: number; color: string; label: string; labelY: number }) => {
                  const width = Math.max(x2 - x1, 0);
                  if (width < 1) return null;
                  return (
                    <g>
                      <rect x={x1} y={y} width={width} height={h} rx={4} fill={color} opacity={0.4} />
                      <text x={x1 + width / 2} y={labelY} textAnchor="middle" fill={color} fontSize={10} fontWeight={700} letterSpacing={0.5}>{label}</text>
                    </g>
                  );
                };

                const summaryText = `You pay on Day 0, but don\u2019t get paid until Day ${ctTotalDays} \u2014 that\u2019s ${ctUnderwaterDays} days of floating ${fmtCurrency(blended.netWorkingCapital)}`;

                return (
                  <>
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                      {/* Underwater zone */}
                      <rect x={xAP} y={barY - 18} width={Math.max(xEnd - xAP, 0)} height={barH + 36} rx={6} fill={CT_COL.underwater} opacity={0.15} />
                      <text x={xAP + Math.max(xEnd - xAP, 0) / 2} y={barY - 24 + 4} textAnchor="middle" fill={CT_COL.underwater} fontSize={10} fontWeight={700} opacity={0.9}>
                        ⚠ CASH UNDERWATER — {ctUnderwaterDays} DAYS
                      </text>

                      {/* AP grace zone */}
                      <ZoneBar x1={xDay0} x2={xAP} y={barY + barH + 2} h={8} color={CT_COL.ap} label={`AP Grace (${blendedAPDays}d)`} labelY={barY + barH + 52} />

                      {/* Inventory zone */}
                      <ZoneBar x1={xDay0} x2={xINV} y={barY} h={barH / 2} color={CT_COL.inventory} label={`Inventory (${blendedInvDays}d)`} labelY={barY - 6} />

                      {/* AR zone */}
                      <ZoneBar x1={xINV} x2={xEnd} y={barY + barH / 2} h={barH / 2} color={CT_COL.ar} label={`AR Wait (${blendedARDays}d)`} labelY={barY - 6} />

                      {/* Main timeline axis */}
                      <line x1={xDay0} y1={barY + barH / 2} x2={xEnd} y2={barY + barH / 2} stroke={CT_COL.line} strokeWidth={2} />
                      <polygon points={`${xEnd},${barY + barH / 2} ${xEnd - 6},${barY + barH / 2 - 4} ${xEnd - 6},${barY + barH / 2 + 4}`} fill={CT_COL.line} />

                      {/* Day markers */}
                      <DayMarker day={0} label="Cash OUT" />
                      {blendedAPDays > 0 && blendedAPDays < ctTotalDays && (
                        <DayMarker day={blendedAPDays} label="AP Due" />
                      )}
                      {blendedInvDays > 0 && blendedInvDays < ctTotalDays && (
                        <DayMarker day={blendedInvDays} label="Ships / Invoice" yOff={blendedAPDays === blendedInvDays ? 20 : 0} />
                      )}
                      <DayMarker day={ctTotalDays} label="Cash IN" />

                      {/* Cash amounts on bars */}
                      {blended.peakInventoryCash > 0 && (
                        <text x={xDay0 + (xINV - xDay0) / 2} y={barY + barH / 4 + 4} textAnchor="middle" fill={CT_COL.inventory} fontSize={10} fontWeight={600}>
                          {fmtCurrency(blended.peakInventoryCash)}
                        </text>
                      )}
                      {blended.accountsReceivable > 0 && (
                        <text x={xINV + (xEnd - xINV) / 2} y={barY + (3 * barH) / 4 + 4} textAnchor="middle" fill={CT_COL.ar} fontSize={10} fontWeight={600}>
                          {fmtCurrency(blended.accountsReceivable)}
                        </text>
                      )}
                      {blended.accountsPayable > 0 && blendedAPDays > 0 && (
                        <text x={xDay0 + (xAP - xDay0) / 2} y={barY + barH + 22} textAnchor="middle" fill={CT_COL.ap} fontSize={10} fontWeight={600}>
                          {fmtCurrency(blended.accountsPayable)}
                        </text>
                      )}
                    </svg>

                    {/* Summary sentence */}
                    <p className="text-center text-sm text-base-content/70 mt-2 mb-4 italic">
                      {summaryText}
                    </p>

                    {/* Cash Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <MetricCard label="Peak Inventory Cash" value={fmtCurrency(blended.peakInventoryCash)} color="text-indigo-400" sub="Tied up in inventory" />
                      <MetricCard label="Accounts Receivable" value={fmtCurrency(blended.accountsReceivable)} color="text-amber-400" sub="Waiting to collect" />
                      <MetricCard label="AP Offset" value={fmtCurrency(blended.accountsPayable)} color="text-green-400" sub="Deferred payment" />
                      <MetricCard label="Net Working Capital" value={fmtCurrency(blended.netWorkingCapital)} color="text-red-400" sub="Total cash needed" />
                    </div>

                    {/* Runway indicator */}
                    <div className="mt-3 rounded-lg bg-base-300/60 px-4 py-3 text-xs text-base-content/80">
                      <span className="font-semibold text-base-content">💰 Working Capital Requirement:</span>{' '}
                      At a {blended.blendedCCC}-day cash conversion cycle, you need{' '}
                      <span className="font-bold text-warning">{fmtCurrency(blended.totalCashFloat)}</span>{' '}
                      in working capital to sustain operations
                      {blended.overheadBurnDuringCycle > 0 && (
                        <span className="text-base-content/50">
                          {' '}(includes {fmtCurrency(blended.overheadBurnDuringCycle)} overhead burn during cycle)
                        </span>
                      )}
                      {blended.totalCashFloat > 100000 && (
                        <span className="ml-2 badge badge-warning badge-xs">⚠ High float</span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 2 & 3: SIDE-BY-SIDE ANALYSIS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DEBT PATH — LOC */}
        <div className={`card ${out.locFeasible ? 'ring-2 ring-success' : ''} bg-base-200`}>
          <div className="card-body p-4 space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-sm">🏦 DEBT PATH — LINE OF CREDIT</h2>
              {out.locFeasible && <span className="badge badge-success badge-sm">FEASIBLE</span>}
            </div>
            <p className="text-xs text-base-content/60">Revolving facility to fund working capital cycle</p>

            <SectionHeader title="LOC TERMS" subtitle="INPUTS" />
            <OutputRow label="Facility Size (WC Need)" value={fmtCurrency(out.debtAppropriate)} bold />
            <InputRow label="Annual Interest Rate" value={inputs.locRate} onChange={(v) => update('locRate', v)} type="percent" highlight />
            <InputRow label="Commitment Fee (Undrawn)" value={inputs.locCommitmentFee} onChange={(v) => update('locCommitmentFee', v)} type="percent" highlight />
            <InputRow label="Avg Utilization %" value={inputs.locUtilization} onChange={(v) => update('locUtilization', v)} type="percent" highlight />

            <SectionHeader title="LOC ANALYSIS" subtitle="OUTPUTS" />
            <OutputRow label="Avg Draw Amount" value={fmtCurrency(out.locDrawAmount)} />
            <OutputRow label="Annual Interest Cost" value={fmtCurrency(out.annualLocInterest)} />
            <OutputRow label="Annual Commitment Fee" value={fmtCurrency(out.annualCommitmentFee)} />
            <OutputRow label="Total Annual LOC Cost" value={fmtCurrency(out.totalAnnualLocCost)} bold />
            <OutputRow
              label="LOC Coverage Ratio"
              value={out.locDscr >= 99 ? 'N/A' : fmtNumber(out.locDscr, 2) + 'x'}
              accent={out.locFeasible}
              danger={!out.locFeasible}
            />
            <OutputRow
              label="FEASIBILITY"
              value={out.debtAppropriate <= 0 ? '— No WC need' : out.locFeasible ? '✅ SERVICEABLE (DSCR ≥ 1.25x)' : '🛑 CASH FLOW INSUFFICIENT'}
              accent={out.locFeasible}
              danger={!out.locFeasible && out.debtAppropriate > 0}
              bold
            />

            {inputs.additionalCapital > 0 && (
              <>
                <div className="divider my-1"></div>
                <SectionHeader title="TERM LOAN (ADDITIONAL CAPITAL)" subtitle="IF DEBT-ROUTED" />
                <OutputRow label="Principal" value={fmtCurrency(inputs.additionalCapital)} />
                <InputRow label="Term Loan APR" value={inputs.termLoanApr} onChange={(v) => update('termLoanApr', v)} type="percent" highlight />
                <InputRow label="Term (Years)" value={inputs.termLoanYears} onChange={(v) => update('termLoanYears', v)} highlight />
                <OutputRow label="Monthly Payment" value={fmtCurrency(out.termMonthlyPayment)} />
                <OutputRow label="Annual Debt Service" value={fmtCurrency(out.termAnnualService)} bold />
                <OutputRow label="Total Interest Paid" value={fmtCurrency(out.termTotalInterest)} />
                <OutputRow
                  label="DSCR"
                  value={fmtNumber(out.termDscr, 2) + 'x'}
                  accent={out.termFeasible}
                  danger={!out.termFeasible}
                />
              </>
            )}
          </div>
        </div>

        {/* EQUITY PATH */}
        <div className={`card ${out.equityAppropriate > 0 ? 'ring-2 ring-info' : ''} bg-base-200`}>
          <div className="card-body p-4 space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-sm">📈 EQUITY PATH — GROWTH CAPITAL</h2>
              {out.equityAppropriate > 0 && <span className="badge badge-info badge-sm">NEEDED</span>}
            </div>
            <p className="text-xs text-base-content/60">Funds operating runway, team buildout, SG&A ramp</p>

            {out.equityAppropriate <= 0 ? (
              <div className="px-2 py-4">
                <p className="text-sm text-success font-medium">✅ No equity needed — model is EBITDA-positive with no additional capital requested.</p>
                <p className="text-xs text-base-content/50 mt-1">Working capital is fully fundable via LOC. Add "Additional Capital" above to model an equity raise.</p>
              </div>
            ) : (
              <>
                <SectionHeader title="RAISE DETAILS" subtitle="INPUTS" />
                <OutputRow label="Equity Raise Amount" value={fmtCurrency(out.equityRaiseAmount)} bold />
                <InputRow label="Pre-Money Valuation" value={inputs.equityPreMoneyVal} onChange={(v) => update('equityPreMoneyVal', v)} type="currency" highlight />

                <SectionHeader title="DILUTION ANALYSIS" subtitle="OUTPUTS" />
                <OutputRow label="Post-Money Valuation" value={fmtCurrency(out.postMoneyVal)} />
                <OutputRow label="Investor Ownership %" value={fmtPct(out.equityDilution)} danger />
                <OutputRow label="Founder Retained %" value={fmtPct(out.impliedOwnershipRetained)} accent />

                <SectionHeader title="EXIT PROJECTION" subtitle="INPUTS" />
                <InputRow label="Revenue Multiple (Exit)" value={inputs.revenueMultiple} onChange={(v) => update('revenueMultiple', v)} highlight />
                <InputRow label="Years to Exit" value={inputs.projectedExitYear} onChange={(v) => update('projectedExitYear', v)} highlight />
                <InputRow label="Projected Exit Revenue" value={inputs.projectedExitRevenue} onChange={(v) => update('projectedExitRevenue', v)} type="currency" highlight />

                <SectionHeader title="EXIT OUTCOMES" subtitle="OUTPUTS" />
                <OutputRow label="Projected Exit Valuation" value={fmtCurrency(inputs.projectedExitRevenue * inputs.revenueMultiple)} />
                <OutputRow label="Investor Return at Exit" value={fmtCurrency(out.investorReturnAtExit)} />
                <OutputRow label="Founder Value at Exit" value={fmtCurrency(out.founderValueAtExit)} accent bold />
                <OutputRow label="Implied Cost of Equity" value={fmtCurrency(out.costOfEquity)} bold />
                <OutputRow label="Cost as Multiple of Raise" value={fmtNumber(out.equityCostAsMultiple, 2) + 'x'} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SECTION 4: BLENDED VERDICT ═══ */}
      <div className={`p-6 rounded-xl text-center border-2 ${verdictColor}`}>
        <h3 className="text-lg font-bold mb-2">⚖️ OPTIMAL CAPITAL STRUCTURE</h3>
        <p className="text-base font-semibold">{out.recommendation}</p>

        {out.totalCapitalNeed > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <span className="text-base-content/60 block">Total Need</span>
              <span className="font-mono font-bold">{fmtCurrency(out.totalCapitalNeed)}</span>
            </div>
            <div>
              <span className="text-base-content/60 block">Debt Portion</span>
              <span className="font-mono font-bold text-success">{fmtCurrency(out.debtAppropriate)}</span>
            </div>
            <div>
              <span className="text-base-content/60 block">Equity Portion</span>
              <span className="font-mono font-bold text-info">{fmtCurrency(out.equityAppropriate)}</span>
            </div>
            <div>
              <span className="text-base-content/60 block">Blended Annual Cost</span>
              <span className="font-mono font-bold">{fmtCurrency(out.blendedAnnualCost)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
