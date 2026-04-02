import React, { useMemo } from 'react';
import { CashPlanInputs, BlendedFinancials } from '../types';
import { NumericCell } from './NumericCell';

interface CashPlanTabProps {
  inputs: CashPlanInputs;
  onChange: (inputs: CashPlanInputs) => void;
  blended: BlendedFinancials;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n: number) => {
  const abs = Math.abs(n);
  const s = abs >= 1000
    ? abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : abs.toFixed(2);
  return n < 0 ? `-$${s}` : `$${s}`;
};

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

interface WeekRow {
  week: number;
  units: number;
  grossRev: number;
  cogsOut: number;
  nonCogsOut: number;
  netCF: number;
  balance: number;
}

function buildWeeks(inputs: CashPlanInputs, blended: BlendedFinancials): WeekRow[] {
  const { cashOnHand, startingWeeklyUnits, weeklyRampPct, overheadMode, monthlyPlugAmount } = inputs;

  const weeklyOverhead = overheadMode === 'full'
    ? blended.annualOverhead / 52
    : monthlyPlugAmount / 4.33;

  const rows: WeekRow[] = [];

  // Week 0
  rows.push({ week: 0, units: 0, grossRev: 0, cogsOut: 0, nonCogsOut: 0, netCF: 0, balance: cashOnHand });

  for (let w = 1; w <= 13; w++) {
    const units = Math.round(startingWeeklyUnits * Math.pow(1 + weeklyRampPct, w - 1));
    const grossRev = units * blended.blendedNetRev; // net revenue per unit (after GtN)
    const cogsOut = units * blended.blendedCogs;
    const nonCogsOut = weeklyOverhead;
    const netCF = grossRev - cogsOut - nonCogsOut;
    const balance = rows[w - 1].balance + netCF;
    rows.push({ week: w, units, grossRev, cogsOut, nonCogsOut, netCF, balance });
  }

  return rows;
}

// ── SVG chart ────────────────────────────────────────────────────────────────
const RunwayChart: React.FC<{ weeks: WeekRow[] }> = ({ weeks }) => {
  const W = 700;
  const H = 300;
  const PAD_L = 70;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 40;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const balances = weeks.map(w => w.balance);
  const minBal = Math.min(...balances, 0);
  const maxBal = Math.max(...balances, 0);
  const range = maxBal - minBal || 1;

  const x = (i: number) => PAD_L + (i / 13) * plotW;
  const y = (val: number) => PAD_T + plotH - ((val - minBal) / range) * plotH;

  const zeroY = y(0);

  // Build polyline points
  const linePoints = weeks.map((w, i) => `${x(i)},${y(w.balance)}`).join(' ');

  // Area below zero (red zone)
  // Clip to below zero line
  const redAreaPoints: string[] = [];
  // Start from bottom-left of the chart at zero line
  for (let i = 0; i < weeks.length; i++) {
    const bx = x(i);
    const by = Math.max(y(weeks[i].balance), zeroY); // clamp above zero line → show only below
    // Actually we want the area between the line and zero when balance < 0
    if (i === 0) {
      redAreaPoints.push(`${bx},${zeroY}`);
    }
  }
  // Build red fill polygon: go along zero line, then trace the min(balance, 0) path
  let hasRed = balances.some(b => b < 0);
  let redFillPath = '';
  if (hasRed) {
    // Build the path as: move along x at zero, then back along x at clamped balance
    const pts: string[] = [];
    pts.push(`${x(0)},${zeroY}`);
    for (let i = 0; i <= 13; i++) {
      const bal = weeks[i].balance;
      const clampedY = bal < 0 ? y(bal) : zeroY;
      pts.push(`${x(i)},${clampedY}`);
    }
    pts.push(`${x(13)},${zeroY}`);
    redFillPath = pts.join(' ');
  }

  // Line segments colored by sign
  const lineSegments: React.ReactNode[] = [];
  for (let i = 0; i < weeks.length - 1; i++) {
    const b1 = weeks[i].balance;
    const b2 = weeks[i + 1].balance;
    const color = (b1 >= 0 && b2 >= 0) ? '#22c55e' : (b1 < 0 && b2 < 0) ? '#ef4444' : '#eab308';
    lineSegments.push(
      <line
        key={i}
        x1={x(i)} y1={y(b1)}
        x2={x(i + 1)} y2={y(b2)}
        stroke={color} strokeWidth={2.5} strokeLinecap="round"
      />
    );
  }

  // Y-axis labels
  const yTicks = 5;
  const yLabels: React.ReactNode[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const val = minBal + (range * i) / yTicks;
    const ty = y(val);
    yLabels.push(
      <g key={i}>
        <line x1={PAD_L - 5} y1={ty} x2={PAD_L + plotW} y2={ty} stroke="#64748b" strokeWidth={0.3} />
        <text x={PAD_L - 8} y={ty + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{fmt$(val)}</text>
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Y labels & grid */}
      {yLabels}

      {/* Red zone fill */}
      {hasRed && <polygon points={redFillPath} fill="#ef4444" fillOpacity={0.12} />}

      {/* Zero line */}
      <line x1={PAD_L} y1={zeroY} x2={PAD_L + plotW} y2={zeroY} stroke="#94a3b8" strokeWidth={1} strokeDasharray="6,4" />
      <text x={PAD_L + plotW + 4} y={zeroY + 4} fontSize={10} fill="#94a3b8">$0</text>

      {/* Balance line */}
      {lineSegments}

      {/* Dots */}
      {weeks.map((w, i) => (
        <circle key={i} cx={x(i)} cy={y(w.balance)} r={3.5}
          fill={w.balance >= 0 ? '#22c55e' : '#ef4444'} stroke="#1e293b" strokeWidth={1} />
      ))}

      {/* X labels */}
      {weeks.map((w, i) => (
        <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize={10} fill="#94a3b8">
          {w.week === 0 ? 'Now' : `W${w.week}`}
        </text>
      ))}

      {/* Axes */}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="#475569" strokeWidth={1} />
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#475569" strokeWidth={1} />
    </svg>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
export const CashPlanTab: React.FC<CashPlanTabProps> = ({ inputs, onChange, blended }) => {
  const update = <K extends keyof CashPlanInputs>(key: K, val: CashPlanInputs[K]) =>
    onChange({ ...inputs, [key]: val });

  const weeks = useMemo(() => buildWeeks(inputs, blended), [inputs, blended]);

  const weeklyOverheadFullModel = blended.annualOverhead / 52;
  const monthlyOverheadFullModel = blended.annualOverhead / 12;

  // Blended AR / AP days (weighted by mix)
  const blendedARDays = blended.channels.reduce((s, ch) => s + (ch.cccDays > 0 ? 30 : 30) * ch.mixPct, 0); // simplified
  const blendedAPDays = 30; // simplified

  // Verdict
  const negWeek = weeks.find(w => w.week > 0 && w.balance < 0);
  const lastWeek = weeks[weeks.length - 1];
  const isPositive = !negWeek;

  // If cash goes negative, how much additional capital needed?
  const minBalance = Math.min(...weeks.map(w => w.balance));
  const additionalCapitalNeeded = minBalance < 0 ? Math.abs(minBalance) : 0;

  const inputCls = 'input input-sm input-bordered w-28 text-right font-mono bg-base-100';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── INPUTS ──────────────────────────────────────────── */}
      <div className="bg-base-200 rounded-lg p-4 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-base-content/70">Inputs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Cash on Hand */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-base-content/60">Cash on Hand</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-base-content/50">$</span>
              <NumericCell value={inputs.cashOnHand} onChange={v => update('cashOnHand', v)} className={inputCls} decimals={0} />
            </div>
          </div>
          {/* Starting Weekly Units */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-base-content/60">Starting Weekly Units</label>
            <NumericCell value={inputs.startingWeeklyUnits} onChange={v => update('startingWeeklyUnits', v)} className={inputCls} decimals={0} />
          </div>
          {/* Weekly Ramp Rate */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-base-content/60">Weekly Ramp Rate</label>
            <div className="flex items-center gap-1">
              <NumericCell value={inputs.weeklyRampPct} onChange={v => update('weeklyRampPct', v)} className={inputCls} isPercent decimals={1} />
              <span className="text-sm text-base-content/50">%</span>
            </div>
          </div>
          {/* Non-COGS Mode Toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-base-content/60">Non-COGS Mode</label>
            <div className="flex items-center gap-2">
              <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${inputs.overheadMode === 'full' ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'bg-base-300/50 text-base-content/50'}`}>
                <input type="radio" name="ohMode" checked={inputs.overheadMode === 'full'} onChange={() => update('overheadMode', 'full')} className="radio radio-primary radio-xs" />
                Full Model
              </label>
              <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${inputs.overheadMode === 'plug' ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'bg-base-300/50 text-base-content/50'}`}>
                <input type="radio" name="ohMode" checked={inputs.overheadMode === 'plug'} onChange={() => update('overheadMode', 'plug')} className="radio radio-primary radio-xs" />
                Simple Plug
              </label>
            </div>
          </div>
          {/* Monthly Plug Amount */}
          <div className={`flex flex-col gap-1 transition-opacity ${inputs.overheadMode === 'full' ? 'opacity-30 pointer-events-none' : ''}`}>
            <label className="text-xs font-medium text-base-content/60">Monthly Non-COGS Plug</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-base-content/50">$</span>
              <NumericCell value={inputs.monthlyPlugAmount} onChange={v => update('monthlyPlugAmount', v)} className={inputCls} decimals={0} disabled={inputs.overheadMode === 'full'} />
            </div>
          </div>
        </div>
      </div>

      {/* ── MODEL CONTEXT (read-only) ──────────────────────── */}
      <div className="bg-base-200 rounded-lg p-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-base-content/70 mb-3">Model Context <span className="font-normal text-xs text-base-content/40">(auto-derived)</span></h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-base-content/50">Blended Net Rev / Unit</div>
            <div className="font-mono font-semibold">{fmt$(blended.blendedNetRev)}</div>
          </div>
          <div>
            <div className="text-xs text-base-content/50">Blended COGS / Unit</div>
            <div className="font-mono font-semibold">{fmt$(blended.blendedCogs)}</div>
          </div>
          <div>
            <div className="text-xs text-base-content/50">Blended CCC</div>
            <div className="font-mono font-semibold">{Math.round(blended.blendedCCC)} days</div>
          </div>
          <div>
            <div className="text-xs text-base-content/50">Monthly Overhead (Full Model)</div>
            <div className="font-mono font-semibold">{fmt$(monthlyOverheadFullModel)}</div>
          </div>
        </div>
      </div>

      {/* ── 13-WEEK CASH FLOW TABLE ────────────────────────── */}
      <div className="bg-base-200 rounded-lg p-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-base-content/70 mb-3">13-Week Cash Flow</h3>
        <div className="overflow-x-auto">
          <table className="table table-sm w-full text-xs">
            <thead>
              <tr className="text-base-content/50 border-b border-base-300">
                <th className="text-center w-12">Wk</th>
                <th className="text-right">Units</th>
                <th className="text-right">Gross Rev</th>
                <th className="text-right">COGS Out</th>
                <th className="text-right">Non-COGS</th>
                <th className="text-right">Net CF</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const isNeg = w.balance < 0;
                const rowCls = isNeg
                  ? 'bg-error/10 text-error'
                  : w.week % 2 === 0
                    ? 'bg-base-200'
                    : 'bg-base-100/50';
                return (
                  <tr key={w.week} className={`${rowCls} font-mono`}>
                    <td className="text-center font-semibold">{w.week}</td>
                    {w.week === 0 ? (
                      <>
                        <td className="text-right text-base-content/30">—</td>
                        <td className="text-right text-base-content/30">—</td>
                        <td className="text-right text-base-content/30">—</td>
                        <td className="text-right text-base-content/30">—</td>
                        <td className="text-right text-base-content/30">—</td>
                        <td className="text-right font-semibold">{fmt$(w.balance)}</td>
                      </>
                    ) : (
                      <>
                        <td className="text-right">{w.units.toLocaleString()}</td>
                        <td className="text-right">{fmt$(w.grossRev)}</td>
                        <td className="text-right">{fmt$(w.cogsOut)}</td>
                        <td className="text-right">{fmt$(w.nonCogsOut)}</td>
                        <td className={`text-right font-semibold ${w.netCF >= 0 ? 'text-success' : 'text-error'}`}>
                          {w.netCF >= 0 ? '+' : ''}{fmt$(w.netCF)}
                        </td>
                        <td className={`text-right font-semibold ${isNeg ? 'text-error' : ''}`}>{fmt$(w.balance)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CASH RUNWAY CHART ──────────────────────────────── */}
      <div className="bg-base-200 rounded-lg p-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-base-content/70 mb-3">Cash Runway</h3>
        <RunwayChart weeks={weeks} />
      </div>

      {/* ── VERDICT ────────────────────────────────────────── */}
      <div className={`rounded-lg p-5 border-2 ${isPositive ? 'bg-success/5 border-success/30' : 'bg-error/5 border-error/30'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{isPositive ? '🟢' : '🔴'}</span>
          <div>
            {isPositive ? (
              <>
                <p className="font-bold text-base text-success">Cash positive through Week 13.</p>
                <p className="text-sm text-base-content/70 mt-1">
                  Ending balance: <span className="font-semibold font-mono">{fmt$(lastWeek.balance)}</span>
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-base text-error">Cash runs out in Week {negWeek!.week}.</p>
                <p className="text-sm text-base-content/70 mt-1">
                  You need <span className="font-semibold font-mono text-error">{fmt$(additionalCapitalNeeded)}</span> additional capital to survive 13 weeks at this ramp.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
