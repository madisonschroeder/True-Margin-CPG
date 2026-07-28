import React, { useState, useMemo } from 'react';
import {
  BlendedFinancials,
  ChannelInputs,
  GlobalOverhead,
  CogsFreightState,
  LogisticsState,
  SKULibraryState,
} from '../types';
import { computeChannelOutputs } from '../utils/calculations';
import { fmtCurrency, fmtNumber, fmtPct } from '../utils/formatters';
import { SectionHeader, OutputRow } from './InputRow';
import { NumericCell } from './NumericCell';

/* ── constants ── */

type TargetMetric = 'EBITDA $' | 'Net Profit $' | 'Contribution Margin $' | 'Net Revenue $';
const METRIC_OPTIONS: TargetMetric[] = ['EBITDA $', 'Net Profit $', 'Contribution Margin $', 'Net Revenue $'];

/* ── per-channel unit economics ── */
interface ChannelEcon {
  id: string;
  label: string;
  netRevPerUnit: number;
  contribPerUnit: number;
  cogsPerUnit: number;
  grossRevPerUnit: number;
  upspw: number;
  marketingPerUnit: number;
  adjustedContrib: number;
  cccDays: number;
  profitable: boolean;
}

/* ── scenario row ── */
interface ScenarioChannel {
  id: string;
  label: string;
  mixPct: number;
  units: number;
  doors: number;
  upspw: number;
  netRev: number;
  contrib: number;
}

interface Scenario {
  label: string;
  emoji: string;
  borderClass: string;
  channels: ScenarioChannel[];
  totalUnits: number;
  totalDoors: number;
  totalNetRev: number;
  totalContrib: number;
  totalEbitda: number;
  workingCapital: number;
  capitalType: string;
  prescription: string;
}

interface Props {
  blended: BlendedFinancials;
  channels: Record<string, ChannelInputs>;
  dashboardMix: Record<string, number>;
  globalOverhead: GlobalOverhead;
  channelCogsMap: Record<string, CogsFreightState>;
  logistics: LogisticsState;
  skuLibrary: SKULibraryState;
  upspwByChannel: Record<string, number>;
}

/* ── helpers ── */
const safe = (n: number) => (isFinite(n) ? n : 0);

function annualOverhead(go: GlobalOverhead): number {
  return (
    go.peoplePayroll +
    go.salesMarketing +
    go.facilitiesInsurance +
    go.professionalServices +
    go.technologySoftware +
    go.travelEntertainment +
    go.rdProductDev +
    go.generalAdmin +
    go.miscellaneous
  );
}

const MAX_DOORS = 15_000;

export const StrategyOptimizer: React.FC<Props> = ({
  blended,
  channels,
  dashboardMix,
  globalOverhead,
  channelCogsMap,
  logistics,
  skuLibrary,
  upspwByChannel,
}) => {
  const [targetMetric, setTargetMetric] = useState<TargetMetric>('EBITDA $');
  const [targetAmount, setTargetAmount] = useState(500_000);

  /* ── Step 1: Per-channel unit economics ── */
  const channelEcons = useMemo<ChannelEcon[]>(() => {
    return Object.keys(channels).map((id) => {
      const ch = channels[id];
      const cogs = channelCogsMap[id];
      if (!ch || !cogs) {
        return {
          id,
          label: ch?.name || id,
          netRevPerUnit: 0,
          contribPerUnit: 0,
          cogsPerUnit: 0,
          grossRevPerUnit: 0,
          upspw: 1,
          marketingPerUnit: 0,
          adjustedContrib: 0,
          cccDays: 0,
          profitable: false,
        };
      }
      const out = computeChannelOutputs(ch, cogs, logistics, skuLibrary);
      const netRevPerUnit = out.netRevenue;
      const contribPerUnit = out.contributionMarginDollar;
      const cogsPerUnit = out.blendedCogs;
      const grossRevPerUnit = out.priceToDistrib;
      const upspw = upspwByChannel[id] || 1;
      const marketingPerUnit = netRevPerUnit * globalOverhead.marketingPctOfNetRev;
      const adjustedContrib = contribPerUnit - marketingPerUnit;
      return {
        id,
        label: ch?.name || id,
        netRevPerUnit,
        contribPerUnit,
        cogsPerUnit,
        grossRevPerUnit,
        upspw,
        marketingPerUnit,
        adjustedContrib,
        cccDays: out.cashConversionCycle,
        profitable: adjustedContrib > 0,
      };
    });
  }, [channels, channelCogsMap, logistics, skuLibrary, globalOverhead, upspwByChannel]);

  /* ── Step 2: Rank by adjusted contrib ── */
  const ranked = useMemo(
    () => [...channelEcons].sort((a, b) => b.adjustedContrib - a.adjustedContrib),
    [channelEcons],
  );

  const overhead = useMemo(() => annualOverhead(globalOverhead), [globalOverhead]);

  /* ── Step 3 + 4 + 5: Generate scenarios ── */
  const scenarios = useMemo<Scenario[]>(() => {
    if (!targetAmount || targetAmount <= 0) return [];

    const profitableRanked = ranked.filter((c) => c.profitable);

    /* helper: build ScenarioChannel from units */
    const buildRow = (ec: ChannelEcon, units: number): ScenarioChannel => ({
      id: ec.id,
      label: ec.label,
      mixPct: 0, // filled after
      units: Math.round(units),
      doors: ec.upspw > 0 ? Math.round(units / (52 * ec.upspw)) : 0,
      upspw: ec.upspw,
      netRev: units * ec.netRevPerUnit,
      contrib: units * ec.adjustedContrib,
    });

    const computeTotals = (rows: ScenarioChannel[]): Scenario => {
      const totalUnits = rows.reduce((s, r) => s + r.units, 0);
      // fill mix %
      rows.forEach((r) => (r.mixPct = totalUnits > 0 ? r.units / totalUnits : 0));
      const totalNetRev = rows.reduce((s, r) => s + r.netRev, 0);
      const totalContrib = rows.reduce((s, r) => s + r.contrib, 0);
      const totalEbitda = totalContrib - overhead;
      const totalDoors = rows.reduce((s, r) => s + r.doors, 0);
      // Working capital rough estimate
      const blendedCogsW =
        totalUnits > 0
          ? rows.reduce((s, r) => {
              const ec = channelEcons.find((e) => e.id === r.id);
              return s + (ec ? ec.cogsPerUnit * r.units : 0);
            }, 0) / totalUnits
          : blended.blendedCogs;
      const blendedCCCW =
        totalUnits > 0
          ? rows.reduce((s, r) => {
              const ec = channelEcons.find((e) => e.id === r.id);
              return s + (ec ? ec.cccDays * r.units : 0);
            }, 0) / totalUnits
          : blended.blendedCCC;
      const workingCapital = safe(totalUnits * blendedCogsW * (blendedCCCW / 365));
      const capitalType = totalEbitda > 0 ? 'LOC-eligible' : 'Equity needed';
      return {
        label: '',
        emoji: '',
        borderClass: '',
        channels: rows.filter((r) => r.units > 0),
        totalUnits,
        totalDoors,
        totalNetRev,
        totalContrib,
        totalEbitda,
        workingCapital,
        capitalType,
        prescription: '',
      };
    };

    /* --- SCENARIO A: MOST EFFICIENT --- */
    const buildA = (): Scenario => {
      const rows: ScenarioChannel[] = [];
      let remaining = targetAmount;

      // For EBITDA / Net Profit: we need to cover overhead too
      if (targetMetric === 'EBITDA $' || targetMetric === 'Net Profit $') {
        remaining = targetAmount + overhead;
      }

      for (const ec of profitableRanked) {
        if (remaining <= 0) break;
        let unitsNeeded: number;
        if (targetMetric === 'EBITDA $' || targetMetric === 'Net Profit $') {
          unitsNeeded = ec.adjustedContrib > 0 ? remaining / ec.adjustedContrib : 0;
        } else if (targetMetric === 'Net Revenue $') {
          unitsNeeded = ec.netRevPerUnit > 0 ? remaining / ec.netRevPerUnit : 0;
        } else {
          // Contribution Margin $
          unitsNeeded = ec.adjustedContrib > 0 ? remaining / ec.adjustedContrib : 0;
        }
        if (unitsNeeded <= 0) continue;

        const maxUnits = ec.upspw > 0 ? MAX_DOORS * 52 * ec.upspw : Infinity;
        const actualUnits = Math.min(unitsNeeded, maxUnits);
        rows.push(buildRow(ec, actualUnits));

        if (targetMetric === 'Net Revenue $') {
          remaining -= actualUnits * ec.netRevPerUnit;
        } else {
          remaining -= actualUnits * ec.adjustedContrib;
        }
      }

      const scenario = computeTotals(rows);
      scenario.label = 'MOST EFFICIENT';
      scenario.emoji = '🏆';
      scenario.borderClass = 'border-l-4 border-success';

      // Build prescription
      const chanDescs = scenario.channels
        .map((c) => `${fmtNumber(c.doors)} ${c.label} doors (${c.upspw.toFixed(1)} UPSPW)`)
        .join(' + ');
      scenario.prescription = `Hit ${fmtCurrency(targetAmount, 0)} ${targetMetric} with ${chanDescs}. Requires ${fmtCurrency(scenario.workingCapital, 0)} working capital (${scenario.capitalType}).`;
      return scenario;
    };

    /* --- SCENARIO B: BALANCED --- */
    const buildB = (): Scenario => {
      if (profitableRanked.length === 0)
        return {
          ...computeTotals([]),
          label: 'BALANCED RISK',
          emoji: '⚖️',
          borderClass: 'border-l-4 border-info',
          prescription: 'No profitable channels available.',
        };

      // Calculate total units needed using blended approach across profitable channels
      const blendedAdj =
        profitableRanked.reduce((s, c) => s + c.adjustedContrib, 0) / profitableRanked.length;
      const blendedNetR =
        profitableRanked.reduce((s, c) => s + c.netRevPerUnit, 0) / profitableRanked.length;

      let totalUnitsNeeded: number;
      if (targetMetric === 'EBITDA $' || targetMetric === 'Net Profit $') {
        totalUnitsNeeded = blendedAdj > 0 ? (targetAmount + overhead) / blendedAdj : 0;
      } else if (targetMetric === 'Net Revenue $') {
        totalUnitsNeeded = blendedNetR > 0 ? targetAmount / blendedNetR : 0;
      } else {
        totalUnitsNeeded = blendedAdj > 0 ? targetAmount / blendedAdj : 0;
      }

      // Start with equal distribution
      const n = profitableRanked.length;
      const allocPct: Record<string, number> = {};
      profitableRanked.forEach((c) => (allocPct[c.id] = 1 / n));

      // Iterate to enforce 40% cap
      for (let iter = 0; iter < 10; iter++) {
        let excess = 0;
        let belowCount = 0;
        for (const c of profitableRanked) {
          if (allocPct[c.id] > 0.4) {
            excess += allocPct[c.id] - 0.4;
            allocPct[c.id] = 0.4;
          } else {
            belowCount++;
          }
        }
        if (excess <= 0) break;
        for (const c of profitableRanked) {
          if (allocPct[c.id] < 0.4 && belowCount > 0) {
            allocPct[c.id] += excess / belowCount;
          }
        }
      }

      const rows = profitableRanked.map((ec) => {
        const units = totalUnitsNeeded * (allocPct[ec.id] || 0);
        return buildRow(ec, units);
      });

      const scenario = computeTotals(rows);
      scenario.label = 'BALANCED RISK';
      scenario.emoji = '⚖️';
      scenario.borderClass = 'border-l-4 border-info';

      const chanDescs = scenario.channels
        .map((c) => `${fmtNumber(c.doors)} ${c.label}`)
        .join(', ');
      scenario.prescription = `Spread across ${scenario.channels.length} channels: ${chanDescs}. Max 40% concentration per channel. Requires ${fmtCurrency(scenario.workingCapital, 0)} working capital (${scenario.capitalType}).`;
      return scenario;
    };

    /* --- SCENARIO C: CURRENT MIX --- */
    const buildC = (): Scenario => {
      // Use blended rates from dashboard
      let totalUnitsNeeded: number;
      const bAdj = blended.adjustedContribMargin || 0;
      const bNetRev = blended.blendedNetRev || 0;

      if (targetMetric === 'EBITDA $' || targetMetric === 'Net Profit $') {
        totalUnitsNeeded = bAdj > 0 ? (targetAmount + overhead) / bAdj : 0;
      } else if (targetMetric === 'Net Revenue $') {
        totalUnitsNeeded = bNetRev > 0 ? targetAmount / bNetRev : 0;
      } else {
        const bContrib = blended.blendedContribMargin || 0;
        totalUnitsNeeded = bContrib > 0 ? targetAmount / bContrib : 0;
      }

      const rows = channelEcons.map((ec) => {
        const mixPct = dashboardMix[ec.id] || 0;
        const units = totalUnitsNeeded * mixPct;
        return buildRow(ec, units);
      });

      const scenario = computeTotals(rows);
      scenario.label = 'CURRENT MIX';
      scenario.emoji = '📊';
      scenario.borderClass = 'border-l-4 border-warning';

      const chanDescs = scenario.channels
        .map((c) => `${fmtPct(c.mixPct)} ${c.label} (${fmtNumber(c.doors)} doors)`)
        .join(', ');
      scenario.prescription = `Using your current channel mix: ${chanDescs}. Requires ${fmtCurrency(scenario.workingCapital, 0)} working capital (${scenario.capitalType}).`;
      return scenario;
    };

    return [buildA(), buildB(), buildC()];
  }, [
    targetAmount,
    targetMetric,
    ranked,
    channelEcons,
    overhead,
    blended,
    dashboardMix,
  ]);

  /* ── Render helpers ── */
  const renderChannelTable = (sc: Scenario) => (
    <div className="overflow-x-auto">
      <table className="table table-xs table-zebra w-full">
        <thead>
          <tr className="text-xs">
            <th>Channel</th>
            <th className="text-right">Mix %</th>
            <th className="text-right">Units</th>
            <th className="text-right">Doors</th>
            <th className="text-right">UPSPW</th>
            <th className="text-right">Net Rev</th>
            <th className="text-right">Contrib $</th>
          </tr>
        </thead>
        <tbody>
          {sc.channels.map((c) => (
            <tr key={c.id}>
              <td className="font-medium">{c.label}</td>
              <td className="text-right font-mono">{fmtPct(c.mixPct, 1)}</td>
              <td className="text-right font-mono">{fmtNumber(c.units)}</td>
              <td className="text-right font-mono">{fmtNumber(c.doors)}</td>
              <td className="text-right font-mono">{c.upspw.toFixed(1)}</td>
              <td className="text-right font-mono">{fmtCurrency(c.netRev, 0)}</td>
              <td className="text-right font-mono">{fmtCurrency(c.contrib, 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-bold text-xs">
            <td>TOTAL</td>
            <td className="text-right">100%</td>
            <td className="text-right font-mono">{fmtNumber(sc.totalUnits)}</td>
            <td className="text-right font-mono">{fmtNumber(sc.totalDoors)}</td>
            <td />
            <td className="text-right font-mono">{fmtCurrency(sc.totalNetRev, 0)}</td>
            <td className="text-right font-mono">{fmtCurrency(sc.totalContrib, 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderScenarioCard = (sc: Scenario) => (
    <div key={sc.label} className={`card bg-base-100 shadow-md ${sc.borderClass} mb-4`}>
      <div className="card-body p-4 gap-3">
        <div className="flex items-center justify-between">
          <h3 className="card-title text-sm">
            {sc.emoji} SCENARIO: {sc.label}
          </h3>
          <span
            className={`badge badge-sm ${
              sc.label === 'MOST EFFICIENT'
                ? 'badge-success'
                : sc.label === 'BALANCED RISK'
                  ? 'badge-info'
                  : 'badge-warning'
            }`}
          >
            {sc.capitalType}
          </span>
        </div>

        {renderChannelTable(sc)}

        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-1">
          <div className="bg-base-200 rounded p-2">
            <div className="text-base-content/50">Total EBITDA</div>
            <div className={`font-mono font-bold ${sc.totalEbitda < 0 ? 'text-error' : 'text-success'}`}>
              {fmtCurrency(sc.totalEbitda, 0)}
            </div>
          </div>
          <div className="bg-base-200 rounded p-2">
            <div className="text-base-content/50">Working Capital</div>
            <div className="font-mono font-bold">{fmtCurrency(sc.workingCapital, 0)}</div>
          </div>
          <div className="bg-base-200 rounded p-2">
            <div className="text-base-content/50">Total Units</div>
            <div className="font-mono font-bold">{fmtNumber(sc.totalUnits)}</div>
          </div>
          <div className="bg-base-200 rounded p-2">
            <div className="text-base-content/50">Total Doors</div>
            <div className="font-mono font-bold">{fmtNumber(sc.totalDoors)}</div>
          </div>
        </div>

        {/* GO-GET Prescription */}
        <div className="alert alert-sm mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          <span className="text-xs">
            <strong>GO-GET:</strong> {sc.prescription}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Target Input ── */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body p-4 gap-3">
          <SectionHeader title="🎯 WHAT'S YOUR TARGET?" subtitle="Pick a metric and set a dollar goal" />
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="form-control">
              <label className="label py-0">
                <span className="label-text text-xs">Target Metric</span>
              </label>
              <select
                className="select select-bordered select-sm w-52"
                value={targetMetric}
                onChange={(e) => setTargetMetric(e.target.value as TargetMetric)}
              >
                {METRIC_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label py-0">
                <span className="label-text text-xs">Target Amount ($)</span>
              </label>
              <NumericCell
                value={targetAmount}
                onChange={setTargetAmount}
                decimals={0}
                className="input input-bordered input-sm w-40 text-right font-mono"
              />
            </div>
          </div>
          <p className="text-xs text-base-content/50 mt-1">
            Using per-channel unit economics from your model
          </p>
        </div>
      </div>

      {/* ── Channel Efficiency Ranking ── */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4 gap-2">
          <SectionHeader title="CHANNEL EFFICIENCY RANKING" subtitle="Sorted by adjusted contribution margin per unit" />
          <div className="overflow-x-auto mt-2">
            <table className="table table-xs table-zebra w-full">
              <thead>
                <tr className="text-xs">
                  <th>#</th>
                  <th>Channel</th>
                  <th className="text-right">Net Rev / Unit</th>
                  <th className="text-right">Adj Contrib / Unit</th>
                  <th className="text-right">COGS / Unit</th>
                  <th className="text-right">UPSPW</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((ec, i) => (
                  <tr key={ec.id}>
                    <td className="font-bold">{i + 1}</td>
                    <td className="font-medium">{ec.label}</td>
                    <td className="text-right font-mono">{fmtCurrency(ec.netRevPerUnit)}</td>
                    <td className={`text-right font-mono ${ec.adjustedContrib < 0 ? 'text-error' : ''}`}>
                      {fmtCurrency(ec.adjustedContrib)}
                    </td>
                    <td className="text-right font-mono">{fmtCurrency(ec.cogsPerUnit)}</td>
                    <td className="text-right font-mono">{ec.upspw.toFixed(1)}</td>
                    <td className="text-center">
                      {ec.profitable ? (
                        <span className="badge badge-success badge-xs">PROFITABLE</span>
                      ) : (
                        <span className="badge badge-error badge-xs">UNPROFITABLE</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <OutputRow label="Annual Fixed Overhead" value={fmtCurrency(overhead, 0)} accent />
          <OutputRow label="Marketing % of Net Rev" value={fmtPct(globalOverhead.marketingPctOfNetRev)} />
        </div>
      </div>

      {/* ── Scenarios ── */}
      {targetAmount > 0 && scenarios.length > 0 ? (
        <div className="space-y-4">
          <SectionHeader
            title="OPTIMIZATION SCENARIOS"
            subtitle={`Target: ${fmtCurrency(targetAmount, 0)} ${targetMetric}`}
          />
          {scenarios.map(renderScenarioCard)}
        </div>
      ) : (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          <span>Set a target above to see your winning paths</span>
        </div>
      )}
    </div>
  );
};
