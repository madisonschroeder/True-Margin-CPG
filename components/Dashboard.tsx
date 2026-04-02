import React from 'react';
import { BlendedFinancials } from '../types';
import { fmtCurrency, fmtPct, fmtNumber } from '../utils/formatters';
import { OutputRow, SectionHeader } from './InputRow';
import { NumericCell } from './NumericCell';

interface DashboardProps {
  blended: BlendedFinancials;
  dashboardMix: Record<string, number>;
  targetRev: number;
  onMixChange: (id: string, val: number) => void;
  onTargetRevChange: (val: number) => void;
  upspwByChannel: Record<string, number>;
  onUpspwChange: (id: string, val: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  blended,
  dashboardMix,
  targetRev,
  onMixChange,
  onTargetRevChange,
  upspwByChannel,
  onUpspwChange,
}) => {
  const mixValues: number[] = Object.values(dashboardMix) as number[];
  const totalMix = mixValues.reduce((s: number, v: number) => s + v, 0);

  // Per-channel implied units and doors
  const channelDistribution = blended.channels.map((ch) => {
    const channelImpliedUnits = blended.impliedUnits * ch.mixPct;
    const upspw = upspwByChannel[ch.id] || 1;
    const doorsNeeded = upspw > 0 ? channelImpliedUnits / 52 / upspw : 0;
    return {
      id: ch.id,
      name: ch.name,
      mixPct: ch.mixPct,
      impliedUnits: channelImpliedUnits,
      upspw,
      doorsNeeded,
    };
  });

  const totalDoors = channelDistribution.reduce((s, c) => s + c.doorsNeeded, 0);

  // Per-channel EBITDA per unit (contribution margin minus allocated overhead per unit)
  const overheadPerUnit = blended.impliedUnits > 0 ? blended.annualOverhead / blended.impliedUnits : 0;

  // Industry benchmark badge helper
  const benchBadge = (value: number, thresholds: [number, number], labels: [string, string, string]) => {
    const [low, high] = thresholds;
    const [lowLabel, midLabel, highLabel] = labels;
    if (value < low) return <span className="badge badge-sm badge-error gap-1 ml-2 text-[10px]">⚠️ {lowLabel}</span>;
    if (value < high) return <span className="badge badge-sm badge-warning gap-1 ml-2 text-[10px]">✅ {midLabel}</span>;
    return <span className="badge badge-sm badge-success gap-1 ml-2 text-[10px]">🌟 {highLabel}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Channel Summary Table */}
      <div className="overflow-x-auto">
        <table className="table table-sm w-full">
          <thead>
            <tr className="bg-base-300">
              <th className="text-xs">CHANNEL</th>
              <th className="text-xs text-right">MIX %</th>
              <th className="text-xs text-right">NET REV/UNIT</th>
              <th className="text-xs text-right">CONTRIB $/UNIT</th>
              <th className="text-xs text-right">CONTRIB %</th>
              <th className="text-xs text-right">COGS/UNIT</th>
              <th className="text-xs text-right">EBITDA $/UNIT</th>
              <th className="text-xs text-right">CCC DAYS</th>
            </tr>
          </thead>
          <tbody>
            {blended.channels.map((ch) => (
              <tr key={ch.id} className="hover">
                <td className="font-semibold text-sm">{ch.name}</td>
                <td className="text-right">
                  <NumericCell
                    value={dashboardMix[ch.id] as number}
                    onChange={(v) => onMixChange(ch.id, v)}
                    isPercent
                    decimals={0}
                    className="input input-bordered input-xs w-16 text-right font-mono border-warning/50 bg-warning/5 text-warning"
                  />
                  <span className="text-xs ml-0.5 text-base-content/50">%</span>
                </td>
                <td className="text-right font-mono text-sm">{fmtCurrency(ch.netRevPerUnit)}</td>
                <td className="text-right font-mono text-sm">{fmtCurrency(ch.contributionMarginPerUnit)}</td>
                <td className="text-right font-mono text-sm">{fmtPct(ch.contributionMarginPct)}</td>
                <td className="text-right font-mono text-sm">{fmtCurrency(ch.cogsPerUnit)}</td>
                <td className={`text-right font-mono text-sm font-semibold ${(ch.contributionMarginPerUnit - overheadPerUnit) >= 0 ? 'text-success' : 'text-error'}`}>{fmtCurrency(ch.contributionMarginPerUnit - overheadPerUnit)}</td>
                <td className="text-right font-mono text-sm">{ch.cccDays.toFixed(0)}</td>
              </tr>
            ))}
            <tr className="bg-base-300 font-bold">
              <td className="text-primary">BLENDED TOTALS</td>
              <td className={`text-right font-mono ${Math.abs(totalMix - 1) > 0.001 ? 'text-error' : 'text-primary'}`}>
                {fmtPct(totalMix)}
              </td>
              <td className="text-right font-mono text-primary">{fmtCurrency(blended.blendedNetRev)}</td>
              <td className="text-right font-mono text-primary">{fmtCurrency(blended.blendedContribMargin)}</td>
              <td className="text-right font-mono text-primary">{fmtPct(blended.blendedContribMarginPct)}</td>
              <td className="text-right font-mono text-primary">{fmtCurrency(blended.blendedCogs)}</td>
              <td className={`text-right font-mono font-semibold ${(blended.blendedContribMargin - overheadPerUnit) >= 0 ? 'text-success' : 'text-error'}`}>{fmtCurrency(blended.blendedContribMargin - overheadPerUnit)}</td>
              <td className="text-right font-mono text-primary">{blended.blendedCCC.toFixed(0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {Math.abs(totalMix - 1) > 0.001 && (
        <div className="alert alert-warning text-sm">
          ⚠️ Channel mix totals {fmtPct(totalMix)} — must equal 100% for accurate blended figures.
        </div>
      )}

      {/* Row 1: Overhead Impact + Run-Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <SectionHeader title="GLOBAL OVERHEAD IMPACT" subtitle="BLENDED" />
            <OutputRow label="Total Fixed Overhead (Annual)" value={fmtCurrency(blended.totalFixedCosts)} />
            <OutputRow label="Marketing $ per Unit (Variable)" value={fmtCurrency(blended.marketingPerUnit)} />
            <OutputRow label="Adjusted Contribution / Unit" value={<>{fmtCurrency(blended.adjustedContribMargin)}{blended.blendedNetRev > 0 && benchBadge(blended.adjustedContribMargin / blended.blendedNetRev, [0.15, 0.30], ['Below 15%', 'CPG Avg', 'Best-in-Class'])}</>} accent bold />
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body p-4">
            <SectionHeader title="RUN-RATE CASH GENERATOR" />
            <div className="flex items-center justify-between py-1.5 px-3 rounded bg-warning/10">
              <span className="text-sm text-base-content/80">Target Annual Net Revenue</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-base-content/50">$</span>
                <NumericCell
                  value={targetRev}
                  onChange={onTargetRevChange}
                  decimals={0}
                  className="input input-bordered input-sm w-32 text-right font-mono border-warning/50 bg-warning/5 text-warning"
                />
              </div>
            </div>
            <OutputRow label="Implied Units Sold" value={fmtNumber(blended.impliedUnits)} />
            <OutputRow label="Gross Revenue (Brand P&L)" value={fmtCurrency(blended.grossRevenue)} />
            <OutputRow label="GtN Dilution" value={fmtCurrency(blended.grossRevenue - blended.targetAnnualNetRev)} />
            <OutputRow label="Net Revenue" value={fmtCurrency(blended.targetAnnualNetRev)} accent />
            <OutputRow label="Blended Cash Generated" value={fmtCurrency(blended.blendedCashGenerated)} accent />
            <OutputRow label="Annual Fixed Overhead" value={fmtCurrency(blended.annualOverhead)} />
            <OutputRow label="OPERATING CASH FLOW (EBITDA)" value={<>{fmtCurrency(blended.operatingCashFlow)}{blended.targetAnnualNetRev > 0 && benchBadge(blended.operatingCashFlow / blended.targetAnnualNetRev, [0.05, 0.15], ['Below 5%', 'CPG Avg', 'Strong EBITDA'])}</>} accent bold />
          </div>
        </div>
      </div>

      {/* Distribution Calculator — doors needed per channel */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <SectionHeader title="DISTRIBUTION CALCULATOR" subtitle="WHERE DO YOU NEED TO SELL?" />
          <p className="text-xs text-base-content/50 mb-2">
            Enter your expected Units Per Store Per Week (UPSPW) for each channel to see how many doors you need to hit your revenue target.
          </p>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="bg-base-300">
                  <th className="text-xs">CHANNEL</th>
                  <th className="text-xs text-right">MIX %</th>
                  <th className="text-xs text-right">IMPLIED UNITS</th>
                  <th className="text-xs text-right">UPSPW</th>
                  <th className="text-xs text-right">DOORS NEEDED</th>
                </tr>
              </thead>
              <tbody>
                {channelDistribution.map((ch) => (
                  <tr key={ch.id} className="hover">
                    <td className="font-semibold text-sm">{ch.name}</td>
                    <td className="text-right font-mono text-sm">{fmtPct(ch.mixPct)}</td>
                    <td className="text-right font-mono text-sm">{fmtNumber(ch.impliedUnits)}</td>
                    <td className="text-right">
                      <NumericCell
                        value={ch.upspw}
                        onChange={(v) => onUpspwChange(ch.id, v)}
                        min={0.1}
                        decimals={1}
                        className="input input-bordered input-xs w-16 text-right font-mono border-warning/50 bg-warning/5 text-warning"
                      />
                    </td>
                    <td className="text-right font-mono text-sm font-bold text-primary">
                      {fmtNumber(ch.doorsNeeded)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-base-300 font-bold">
                  <td className="text-primary">TOTAL</td>
                  <td className="text-right font-mono text-primary">{fmtPct(totalMix)}</td>
                  <td className="text-right font-mono text-primary">{fmtNumber(blended.impliedUnits)}</td>
                  <td className="text-right text-xs text-base-content/40">—</td>
                  <td className="text-right font-mono text-primary">{fmtNumber(totalDoors)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 2: Working Capital + Cost of Capital + SFG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <SectionHeader title="WORKING CAPITAL" subtitle="BLENDED COMPANY VIEW" />
            <OutputRow label="Peak Inventory Cash" value={fmtCurrency(blended.peakInventoryCash)} />
            <OutputRow label="Accounts Receivable" value={fmtCurrency(blended.accountsReceivable)} />
            <OutputRow label="Less: Accounts Payable" value={fmtCurrency(-blended.accountsPayable)} />
            <OutputRow label="Net Working Capital" value={fmtCurrency(blended.netWorkingCapital)} bold />
            <OutputRow label="Overhead Burn During CCC" value={fmtCurrency(blended.overheadBurnDuringCycle)} />
            <OutputRow label="TOTAL CASH FLOAT" value={fmtCurrency(blended.totalCashFloat)} accent bold />
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body p-4">
            <SectionHeader title="COST OF CAPITAL" subtitle="THE DEBT REALITY" />
            <OutputRow label="Annual Interest Cost" value={fmtCurrency(blended.annualInterestCost)} />
            <OutputRow label="Debt Burden / Unit" value={fmtCurrency(blended.debtBurdenPerUnit)} />
            <OutputRow label='FINAL "CASH IN BANK" / UNIT' value={fmtCurrency(blended.finalCashMarginPerUnit)} accent bold />
            <OutputRow label="Max Allowable APR (Tripwire)" value={fmtPct(blended.maxAllowableApr)} />
            <OutputRow
              label="DEBT VIABILITY"
              value={blended.debtViability}
              danger={blended.debtViability.includes('ABORT') || blended.debtViability.includes('WARNING')}
              accent={blended.debtViability === 'VIABLE FINANCING'}
              bold
            />
          </div>
        </div>

        <div className="card bg-base-200">
          <div className="card-body p-4">
            <SectionHeader title="SELF-FUNDED GROWTH" subtitle="THE VERDICT" />
            <OutputRow label="New Units Funded by 1 Sold" value={fmtNumber(blended.newUnitsPerSold, 2)} />
            <OutputRow label="Annual Capital Turns" value={fmtNumber(blended.annualCapitalTurns, 2)} />
            <OutputRow label="MAX SELF-FUNDED GROWTH (YoY)" value={<>{fmtPct(blended.maxSelfFundedGrowth)}{benchBadge(blended.maxSelfFundedGrowth, [0.10, 0.30], ['<10% Growth', 'Moderate', 'High Growth'])}</>} accent bold />
            <div className="divider my-1"></div>
            <OutputRow label="Blended CCC (Days)" value={blended.blendedCCC.toFixed(0)} />
            <OutputRow label="Blended COGS / Unit" value={fmtCurrency(blended.blendedCogs)} />
          </div>
        </div>
      </div>
    </div>
  );
};
