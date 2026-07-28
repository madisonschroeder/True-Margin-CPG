import React from 'react';
import { BlendedFinancials, BreakevenInputs, ChannelInputs, GlobalOverhead, CogsFreightState, LogisticsState, SKULibraryState } from '../types';
import { computeChannelOutputs, computeBreakeven } from '../utils/calculations';
import { fmtCurrency, fmtNumber, fmtPct } from '../utils/formatters';
import { SectionHeader, OutputRow, InputRow } from './InputRow';
import { NumericCell } from './NumericCell';

interface Props {
  blended: BlendedFinancials;
  channels: Record<string, ChannelInputs>;
  dashboardMix: Record<string, number>;
  globalOverhead: GlobalOverhead;
  targetRev: number;
  upspwByChannel: Record<string, number>;
  channelCogsMap: Record<string, CogsFreightState>;
  logistics: LogisticsState;
  skuLibrary: SKULibraryState;
  breakeven: BreakevenInputs;
  onBreakevenChange: (inputs: BreakevenInputs) => void;
}

const CHANNEL_LABELS: Record<string, string> = {
  kehe: 'KeHE / UNFI',
  club: 'Club',
  dsd: 'DSD',
  online: 'Online / DTC',
  altfdsvc: 'Alt Food Service',
};

/* ── helpers ─────────────────────────────────────────────────────── */

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function marginVerdict(m: number): { emoji: string; label: string; badge: string } {
  if (m < 0.20) return { emoji: '🔴', label: 'UNINVESTABLE: Margin too thin for lenders or investors', badge: 'badge-error' };
  if (m < 0.30) return { emoji: '🟡', label: 'MARGINAL: Below typical CPG investment threshold', badge: 'badge-warning' };
  if (m < 0.40) return { emoji: '🟢', label: 'VIABLE: Acceptable CPG margin profile', badge: 'badge-success' };
  return { emoji: '🟢🟢', label: 'STRONG: Attractive to both debt and equity', badge: 'badge-success' };
}

function shortVerdict(m: number): string {
  if (m < 0.20) return 'Uninvestable';
  if (m < 0.30) return 'Marginal';
  if (m < 0.40) return 'Viable';
  return 'Strong';
}

/* ── component ───────────────────────────────────────────────────── */

export const ViabilityCheck: React.FC<Props> = ({
  blended,
  channels,
  dashboardMix,
  globalOverhead,
  targetRev,
  upspwByChannel,
  channelCogsMap,
  logistics,
  skuLibrary,
  breakeven,
  onBreakevenChange,
}) => {
  /* ---------- Breakeven computation ---------- */
  const beOut = computeBreakeven(blended, breakeven);

  const updateScenario = (index: number, field: 'label' | 'targetEbitda', value: string | number) => {
    const updated = [...breakeven.scenarios];
    updated[index] = { ...updated[index], [field]: value };
    onBreakevenChange({ ...breakeven, scenarios: updated });
  };

  const addScenario = () => {
    onBreakevenChange({
      ...breakeven,
      scenarios: [...breakeven.scenarios, { label: `Scenario ${breakeven.scenarios.length + 1}`, targetEbitda: 0 }],
    });
  };

  const removeScenario = (index: number) => {
    onBreakevenChange({ ...breakeven, scenarios: breakeven.scenarios.filter((_, i) => i !== index) });
  };
  /* ---------- Derived values ---------- */
  const annualOverhead = safe(blended.annualOverhead);
  const blendedContribPct = safe(blended.blendedContribMarginPct);
  const ebitda = safe(blended.operatingCashFlow);
  const totalCashFloat = safe(blended.totalCashFloat);
  const netRev = safe(blended.blendedNetRev);
  const marketingPerUnit = safe(blended.marketingPerUnit);

  const activeChannels = Object.entries(dashboardMix).filter(([, pct]) => (pct as number) > 0);
  const activeCount = activeChannels.length;

  // Per-channel outputs
  const channelData = activeChannels.map(([id, mixPct]) => {
    const outputs = computeChannelOutputs(channels[id], channelCogsMap[id], logistics, skuLibrary);
    const contribDollar = safe(outputs?.contributionMarginDollar ?? 0);
    const contribPct = safe(outputs?.contributionMarginPct ?? 0);
    const contribPerUnit = contribDollar - marketingPerUnit;
    const channelOverheadShare = annualOverhead * (mixPct as number);
    const upspw = safe(upspwByChannel[id] ?? 0);
    const breakevenUnits = contribPerUnit > 0 ? channelOverheadShare / contribPerUnit : Infinity;
    const breakevenDoors = upspw > 0 ? breakevenUnits / (upspw * 52) : Infinity;
    return { id, mixPct: mixPct as number, contribDollar, contribPct, contribPerUnit, channelOverheadShare, upspw, breakevenUnits, breakevenDoors };
  });

  // Blended UPSPW (weighted avg)
  const blendedUPSPW = activeChannels.reduce((acc, [id, pct]) => acc + safe(upspwByChannel[id] ?? 0) * (pct as number), 0);

  /* ── 1. CONTRIBUTION MARGIN VERDICT ─────────────────────────── */
  const cmVerdict = marginVerdict(blendedContribPct);

  /* ── 3. MINIMUM VIABLE REVENUE ──────────────────────────────── */
  const minViableRevenue = blendedContribPct > 0 ? annualOverhead / blendedContribPct : Infinity;
  const revenueGap = targetRev - minViableRevenue;
  const revenueGapPct = minViableRevenue > 0 ? targetRev / minViableRevenue : 0;
  const revBadge = revenueGapPct < 1 ? 'badge-error' : revenueGapPct < 1.2 ? 'badge-warning' : 'badge-success';
  const revLabel = revenueGapPct < 1 ? 'Below breakeven' : revenueGapPct < 1.2 ? 'Tight — within 20% of breakeven' : 'Above breakeven';

  /* ── 4. CASH-TO-FIRST-DOLLAR ────────────────────────────────── */
  const inventoryCash = safe(blended.inventoryCash ?? 0);
  const arCash = safe(blended.arCash ?? 0);
  const apCash = safe(blended.apCash ?? 0);
  const overheadDuringCCC = safe(blended.overheadDuringCCC ?? 0);

  /* ── 5. DEBT ELIGIBILITY ────────────────────────────────────── */
  const annualInterestRate = safe(globalOverhead.annualInterestRate ?? 0.10);
  const annualDebtService = totalCashFloat * annualInterestRate;
  const requiredEBITDA = annualDebtService * 1.25;
  const requiredRevForDebt = blendedContribPct > 0 ? (requiredEBITDA + annualOverhead) / blendedContribPct : Infinity;
  const requiredUnitsForDebt = blendedContribPct > 0 && blended.blendedNetPrice > 0
    ? requiredRevForDebt / blended.blendedNetPrice
    : Infinity;
  const requiredDoorsForDebt = blendedUPSPW > 0 ? requiredUnitsForDebt / (52 * blendedUPSPW) : Infinity;
  const debtEligible = targetRev >= requiredRevForDebt;

  /* ── 6. INVESTOR ATTRACTIVENESS SCORE ───────────────────────── */
  // Contribution Margin (0-30)
  const cmScore = blendedContribPct >= 0.40 ? 30 : blendedContribPct >= 0.30 ? 20 : blendedContribPct >= 0.20 ? 10 : 0;
  // EBITDA (0-20)
  const ebitdaMargin = netRev > 0 ? ebitda / netRev : 0;
  const ebitdaScore = ebitdaMargin > 0.10 ? 20 : ebitdaMargin > 0 ? 10 : 0;
  // Self-funded growth rate (0-20) — use ebitda / totalCashFloat as proxy
  const selfFunded = totalCashFloat > 0 ? ebitda / totalCashFloat : 0;
  const growthScore = selfFunded > 0.50 ? 20 : selfFunded > 0 ? 10 : 0;
  // Capital efficiency (0-15)
  const capEfficiency = netRev > 0 ? totalCashFloat / netRev : Infinity;
  const capScore = capEfficiency < 0.5 ? 15 : capEfficiency <= 1 ? 8 : 0;
  // Channel diversification (0-15)
  const divScore = activeCount >= 3 ? 15 : activeCount === 2 ? 5 : 0;

  const totalScore = cmScore + ebitdaScore + growthScore + capScore + divScore;
  const scoreLabel =
    totalScore >= 86 ? 'ELITE — HIGHLY ATTRACTIVE' :
    totalScore >= 71 ? 'STRONG INVESTMENT PROFILE' :
    totalScore >= 51 ? 'FUNDABLE WITH RIGHT STORY' :
    totalScore >= 31 ? 'EARLY STAGE — NEEDS WORK' :
    'NOT INVESTABLE';
  const scoreColor =
    totalScore >= 71 ? 'progress-success' :
    totalScore >= 51 ? 'progress-info' :
    totalScore >= 31 ? 'progress-warning' :
    'progress-error';

  /* ── 8. THE GO-GET ──────────────────────────────────────────── */
  const totalBreakevenDoors = channelData.reduce((acc, c) => acc + (Number.isFinite(c.breakevenDoors) ? c.breakevenDoors : 0), 0);
  const targetEBITDA = ebitda; // at current target scale
  const marginsUnderwater = blendedContribPct <= 0;
  const fundingMethod = debtEligible && ebitda > 0 ? 'Debt or equity' : ebitda > 0 ? 'Equity (debt requires more scale)' : 'Equity only (EBITDA-negative)';

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── 1. CONTRIBUTION MARGIN VERDICT ────────────────────── */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <SectionHeader label="1. Contribution Margin Verdict" />

          <div className="flex items-center gap-4 mt-2 mb-4">
            <div className="stat-value text-3xl">{fmtPct(blendedContribPct)}</div>
            <span className={`badge ${cmVerdict.badge} badge-lg gap-1`}>
              {cmVerdict.emoji} {cmVerdict.label}
            </span>
          </div>

          <p className="text-sm opacity-70 mb-3">
            CPG brands typically need 30%+ contribution margin to attract capital.
          </p>

          {channelData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-sm table-zebra">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th className="text-right">Margin %</th>
                    <th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {channelData.map((c) => (
                    <tr key={c.id}>
                      <td>{CHANNEL_LABELS[c.id] ?? c.id}</td>
                      <td className="text-right">{fmtPct(c.contribPct)}</td>
                      <td>
                        <span className={`badge badge-sm ${marginVerdict(c.contribPct).badge}`}>
                          {shortVerdict(c.contribPct)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. BREAKEVEN DOOR COUNT ───────────────────────────── */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <SectionHeader label="2. Breakeven Door Count" />
          <div className="overflow-x-auto mt-2">
            <table className="table table-sm table-zebra">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th className="text-right">Mix %</th>
                  <th className="text-right">Contrib / Unit</th>
                  <th className="text-right">BE Units</th>
                  <th className="text-right">UPSPW</th>
                  <th className="text-right">BE Doors</th>
                </tr>
              </thead>
              <tbody>
                {channelData.map((c) => (
                  <tr key={c.id}>
                    <td>{CHANNEL_LABELS[c.id] ?? c.id}</td>
                    <td className="text-right">{fmtPct(c.mixPct)}</td>
                    <td className="text-right">{fmtCurrency(c.contribPerUnit)}</td>
                    <td className="text-right">{Number.isFinite(c.breakevenUnits) ? fmtNumber(Math.ceil(c.breakevenUnits)) : '—'}</td>
                    <td className="text-right">{fmtNumber(c.upspw)}</td>
                    <td className="text-right">{Number.isFinite(c.breakevenDoors) ? fmtNumber(Math.ceil(c.breakevenDoors)) : '—'}</td>
                  </tr>
                ))}
                <tr className="font-bold border-t-2">
                  <td>Total (Blended)</td>
                  <td className="text-right">100%</td>
                  <td className="text-right">—</td>
                  <td className="text-right">
                    {fmtNumber(Math.ceil(channelData.reduce((a, c) => a + (Number.isFinite(c.breakevenUnits) ? c.breakevenUnits : 0), 0)))}
                  </td>
                  <td className="text-right">{fmtNumber(safe(blendedUPSPW))}</td>
                  <td className="text-right">{fmtNumber(Math.ceil(totalBreakevenDoors))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Physical Breakeven Summary */}
          <div className="mt-4 p-3 bg-base-200 rounded-lg">
            <span className="text-sm font-semibold">Physical Breakeven: </span>
            <span className="font-mono text-sm text-primary">
              {fmtNumber(typeof beOut.breakevenPallets === 'number' ? beOut.breakevenPallets : 0, 1)} pallets
            </span>
            <span className="text-sm text-base-content/50"> / </span>
            <span className="font-mono text-sm text-primary">
              {fmtNumber(typeof beOut.breakevenContainers === 'number' ? beOut.breakevenContainers : 0, 1)} 40ft containers
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. MINIMUM VIABLE REVENUE ─────────────────────────── */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <SectionHeader label="3. Minimum Viable Revenue" />

          <div className="mt-2 space-y-2">
            <OutputRow label="Annual Overhead" value={fmtCurrency(annualOverhead)} />
            <OutputRow label="Blended Contribution Margin" value={fmtPct(blendedContribPct)} />
            <OutputRow label="Breakeven Revenue" value={Number.isFinite(minViableRevenue) ? fmtCurrency(minViableRevenue) : 'N/A (margin ≤ 0)'} />
            <OutputRow label="Target Revenue" value={fmtCurrency(targetRev)} />
          </div>

          <div className={`alert mt-4 ${revenueGapPct < 1 ? 'alert-error' : revenueGapPct < 1.2 ? 'alert-warning' : 'alert-success'}`}>
            <div>
              <span className={`badge ${revBadge} mr-2`}>{revLabel}</span>
              {Number.isFinite(minViableRevenue) ? (
                <span>
                  You need <strong>{fmtCurrency(minViableRevenue)}</strong> net revenue to break even.
                  Your target is <strong>{fmtCurrency(targetRev)}</strong>.
                  Gap: <strong>{fmtCurrency(Math.abs(revenueGap))}</strong> {revenueGap >= 0 ? 'surplus' : 'shortfall'}.
                </span>
              ) : (
                <span>Contribution margin is zero or negative — breakeven is unreachable.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. CASH-TO-FIRST-DOLLAR ──────────────────────────── */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <SectionHeader label="4. Cash-to-First-Dollar" />

          <div className="mt-2 space-y-2">
            <OutputRow label="Inventory Cash Outlay" value={fmtCurrency(inventoryCash)} />
            <OutputRow label="Accounts Receivable Float" value={fmtCurrency(arCash)} />
            <OutputRow label="Less: Accounts Payable" value={fmtCurrency(-apCash)} />
            <OutputRow label="Overhead During CCC" value={fmtCurrency(overheadDuringCCC)} />
            <div className="divider my-1" />
            <OutputRow label="Total Cash Float Required" value={fmtCurrency(totalCashFloat)} />
          </div>

          <div className="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Before collecting any revenue, you need <strong>{fmtCurrency(totalCashFloat)}</strong> in working capital
              to fund your first production run and bridge the cash conversion cycle.
            </span>
          </div>
        </div>
      </div>

      {/* ── 5. DEBT ELIGIBILITY ───────────────────────────────── */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <SectionHeader label="5. Debt Eligibility" />

          <div className="mt-2 space-y-2">
            <OutputRow label="LOC Size (= Cash Float)" value={fmtCurrency(totalCashFloat)} />
            <OutputRow label="Annual Interest Rate" value={fmtPct(annualInterestRate)} />
            <OutputRow label="Annual Debt Service" value={fmtCurrency(annualDebtService)} />
            <OutputRow label="Required EBITDA (1.25× DSCR)" value={fmtCurrency(requiredEBITDA)} />
            <OutputRow label="Required Revenue for Debt" value={Number.isFinite(requiredRevForDebt) ? fmtCurrency(requiredRevForDebt) : 'N/A'} />
            <OutputRow label="Required Doors for Debt" value={Number.isFinite(requiredDoorsForDebt) ? fmtNumber(Math.ceil(requiredDoorsForDebt)) : 'N/A'} />
          </div>

          <div className={`alert mt-4 ${debtEligible ? 'alert-success' : 'alert-error'}`}>
            <span className={`badge ${debtEligible ? 'badge-success' : 'badge-error'} mr-2`}>
              {debtEligible ? 'Eligible' : 'Not Yet Eligible'}
            </span>
            {Number.isFinite(requiredRevForDebt) ? (
              <span>
                To qualify for a <strong>{fmtCurrency(totalCashFloat)}</strong> LOC at{' '}
                <strong>{fmtPct(annualInterestRate)}</strong> rate, you need{' '}
                <strong>{fmtCurrency(requiredEBITDA)}</strong> annual EBITDA, which requires{' '}
                <strong>{fmtCurrency(requiredRevForDebt)}</strong> net revenue
                (~<strong>{fmtNumber(Math.ceil(safe(requiredDoorsForDebt)))}</strong> doors).
              </span>
            ) : (
              <span>Margin structure does not support debt financing at current levels.</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. INVESTOR ATTRACTIVENESS SCORE ──────────────────── */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <SectionHeader label="6. Investor Attractiveness Score" />

          <div className="flex items-center gap-4 mt-3 mb-2">
            <div className="stat-value text-4xl">{totalScore}</div>
            <span className="text-lg font-semibold opacity-80">/ 100</span>
            <span className={`badge badge-lg ${totalScore >= 71 ? 'badge-success' : totalScore >= 51 ? 'badge-info' : totalScore >= 31 ? 'badge-warning' : 'badge-error'}`}>
              {scoreLabel}
            </span>
          </div>

          <progress className={`progress ${scoreColor} w-full h-4`} value={totalScore} max={100} />

          <div className="overflow-x-auto mt-4">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th className="text-right">Points</th>
                  <th className="text-right">Max</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Contribution Margin ({fmtPct(blendedContribPct)})</td><td className="text-right">{cmScore}</td><td className="text-right">30</td></tr>
                <tr><td>EBITDA Margin ({fmtPct(ebitdaMargin)})</td><td className="text-right">{ebitdaScore}</td><td className="text-right">20</td></tr>
                <tr><td>Self-Funded Growth ({fmtPct(selfFunded)})</td><td className="text-right">{growthScore}</td><td className="text-right">20</td></tr>
                <tr><td>Capital Efficiency ({safe(capEfficiency).toFixed(2)}×)</td><td className="text-right">{capScore}</td><td className="text-right">15</td></tr>
                <tr><td>Channel Diversification ({activeCount} channel{activeCount !== 1 ? 's' : ''})</td><td className="text-right">{divScore}</td><td className="text-right">15</td></tr>
                <tr className="font-bold border-t-2"><td>Total</td><td className="text-right">{totalScore}</td><td className="text-right">100</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 7. TARGET EBITDA SCENARIOS ─────────────────────────── */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <SectionHeader label="7. Target EBITDA Scenarios" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-3">
            {/* Left: Single Target */}
            <div className="space-y-1">
              <InputRow
                label="Target Annual EBITDA $"
                value={breakeven.targetEbitdaDollars}
                onChange={(v) => onBreakevenChange({ ...breakeven, targetEbitdaDollars: v })}
                type="currency"
                highlight
              />
              <OutputRow label="Required Units (Annual)" value={fmtNumber(beOut.targetUnits)} accent bold />
              <OutputRow label="Required Net Revenue" value={fmtCurrency(typeof beOut.targetRevenue === 'number' ? beOut.targetRevenue : 0)} />
              <OutputRow label="Required Pallets" value={fmtNumber(beOut.targetPallets, 1)} />
              <OutputRow label="Required 40ft Containers" value={fmtNumber(beOut.targetContainers, 1)} />
            </div>

            {/* Right: Scenario Modeler */}
            <div className="space-y-1">
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="bg-base-300">
                      <th className="text-xs">SCENARIO</th>
                      <th className="text-xs text-right">TARGET EBITDA</th>
                      <th className="text-xs text-right">UNITS NEEDED</th>
                      <th className="text-xs text-right">REVENUE NEEDED</th>
                      <th className="text-xs text-right">PALLETS</th>
                      <th className="text-xs w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {beOut.scenarios.map((s, i) => (
                      <tr key={i} className="hover">
                        <td>
                          <input
                            type="text"
                            value={breakeven.scenarios[i].label}
                            onChange={(e) => updateScenario(i, 'label', e.target.value)}
                            className="input input-bordered input-xs w-28 font-mono"
                          />
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-base-content/50">$</span>
                            <NumericCell
                              value={breakeven.scenarios[i].targetEbitda}
                              onChange={(v) => updateScenario(i, 'targetEbitda', v)}
                              decimals={0}
                              className="input input-bordered input-xs w-24 text-right font-mono border-warning/50 bg-warning/5 text-warning"
                            />
                          </div>
                        </td>
                        <td className="text-right font-mono text-sm">{fmtNumber(s.requiredUnits)}</td>
                        <td className="text-right font-mono text-sm">{fmtCurrency(typeof s.requiredRevenue === 'number' ? s.requiredRevenue : 0)}</td>
                        <td className="text-right font-mono text-sm">{fmtNumber(s.requiredPallets, 0)}</td>
                        <td>
                          <button className="btn btn-ghost btn-xs text-error" onClick={() => removeScenario(i)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-outline btn-sm mt-2" onClick={addScenario}>+ Add Scenario</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 8. THE GO-GET ─────────────────────────────────────── */}
      <div className="card bg-primary text-primary-content shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl">🎯 The Go-Get</h2>
          <p className="text-lg opacity-90 mb-4">
            To build a viable business with this cost structure, you need:
          </p>

          {marginsUnderwater ? (
            <div className="alert alert-warning text-warning-content">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-lg font-bold">
                ⚠️ STOP: Your unit economics are underwater. Fix COGS or pricing before scaling.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="stat bg-primary-focus rounded-lg p-4">
                <div className="stat-title text-primary-content opacity-70">Total Breakeven Doors</div>
                <div className="stat-value">{fmtNumber(Math.ceil(totalBreakevenDoors))}</div>
                <div className="stat-desc text-primary-content opacity-60">across {activeCount} channel{activeCount !== 1 ? 's' : ''}</div>
              </div>

              <div className="stat bg-primary-focus rounded-lg p-4">
                <div className="stat-title text-primary-content opacity-70">Breakeven Revenue</div>
                <div className="stat-value text-2xl">{Number.isFinite(minViableRevenue) ? fmtCurrency(minViableRevenue) : 'N/A'}</div>
                <div className="stat-desc text-primary-content opacity-60">minimum to cover overhead</div>
              </div>

              <div className="stat bg-primary-focus rounded-lg p-4">
                <div className="stat-title text-primary-content opacity-70">Target Revenue</div>
                <div className="stat-value text-2xl">{fmtCurrency(targetRev)}</div>
                <div className="stat-desc text-primary-content opacity-60">EBITDA at target: {fmtCurrency(targetEBITDA)}</div>
              </div>

              <div className="stat bg-primary-focus rounded-lg p-4">
                <div className="stat-title text-primary-content opacity-70">Working Capital Required</div>
                <div className="stat-value text-2xl">{fmtCurrency(totalCashFloat)}</div>
                <div className="stat-desc text-primary-content opacity-60">before you collect a dollar</div>
              </div>
            </div>
          )}

          {!marginsUnderwater && (
            <div className="mt-4 p-4 rounded-lg bg-primary-focus">
              <p className="text-lg font-semibold">
                💰 Funding Path: <span className="underline">{fundingMethod}</span>
              </p>
              {debtEligible ? (
                <p className="opacity-80 mt-1">
                  At your target revenue, you generate enough EBITDA to service a line of credit covering your working capital needs.
                </p>
              ) : (
                <p className="opacity-80 mt-1">
                  You'll need equity or grants to fund the first phase. Debt becomes accessible once you reach{' '}
                  {Number.isFinite(requiredRevForDebt) ? fmtCurrency(requiredRevForDebt) : 'higher'} in net revenue.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
