import React, { useMemo } from 'react';
import { VelocityTrackerState, VelocityEntry, ChannelInputs, BlendedFinancials } from '../types';
import { NumericCell } from './NumericCell';

// ── Channel metadata ──────────────────────────────────────────────────────────
const CHANNEL_LABELS: Record<string, string> = {
  kehe: "Nat'l Distribution",
  club: 'Club',
  dsd: 'DSD',
  online: 'Online D2B',
  altfdsvc: 'Alt FdSvc',
};

const CHANNEL_COLORS: Record<string, string> = {
  kehe: '#4f46e5',
  club: '#7c3aed',
  dsd: '#06b6d4',
  online: '#10b981',
  altfdsvc: '#f59e0b',
};

const CHANNEL_IDS: Array<'kehe' | 'club' | 'dsd' | 'online' | 'altfdsvc'> = [
  'kehe', 'club', 'dsd', 'online', 'altfdsvc',
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface VelocityTrackerProps {
  state: VelocityTrackerState;
  onChange: (state: VelocityTrackerState) => void;
  dashboardMix: Record<string, number>;
  channels: Record<string, ChannelInputs>;
  blended: BlendedFinancials;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcUPSPW(entry: VelocityEntry): number {
  if (entry.doors <= 0 || entry.periodWeeks <= 0) return 0;
  return entry.unitsSold / entry.doors / entry.periodWeeks;
}

function getTier(upspw: number, high: number, low: number): 'A' | 'B' | 'C' {
  if (upspw >= high) return 'A';
  if (upspw >= low) return 'B';
  return 'C';
}

function fmt(n: number, d = 2): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtDollar(n: number): string {
  return '$' + Math.round(n).toLocaleString();
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

// ── Component ─────────────────────────────────────────────────────────────────
export function VelocityTracker({ state, onChange, dashboardMix, channels, blended }: VelocityTrackerProps) {
  const { entries, categoryBenchmark, totalCategoryDoors } = state;

  // ── Mutators ──────────────────────────────────────────────────────────────
  const setEntries = (newEntries: VelocityEntry[]) => onChange({ ...state, entries: newEntries });
  const setBenchmark = (b: typeof categoryBenchmark) => onChange({ ...state, categoryBenchmark: b });
  const setTotalDoors = (n: number) => onChange({ ...state, totalCategoryDoors: n });

  const addEntry = () => {
    const newEntry: VelocityEntry = {
      id: crypto.randomUUID(),
      retailerName: '',
      channelType: 'kehe',
      doors: 0,
      unitsSold: 0,
      periodWeeks: 4,
      periodLabel: '',
      enteredAt: new Date().toISOString(),
    };
    setEntries([...entries, newEntry]);
  };

  const updateEntry = (id: string, patch: Partial<VelocityEntry>) => {
    setEntries(entries.map(e => (e.id === id ? { ...e, ...patch } : e)));
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const entryUPSPW = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) map[e.id] = calcUPSPW(e);
    return map;
  }, [entries]);

  // Per-channel aggregates
  const channelAggregates = useMemo(() => {
    const agg: Record<string, {
      totalDoors: number;
      weightedUPSPW: number;
      entries: VelocityEntry[];
      latestPerRetailer: Record<string, VelocityEntry>;
    }> = {};

    for (const chId of CHANNEL_IDS) {
      const chEntries = entries.filter(e => e.channelType === chId);
      // Latest entry per retailer
      const latestMap: Record<string, VelocityEntry> = {};
      for (const e of chEntries) {
        const existing = latestMap[e.retailerName];
        if (!existing || new Date(e.enteredAt) > new Date(existing.enteredAt)) {
          latestMap[e.retailerName] = e;
        }
      }
      const latestEntries = Object.values(latestMap);
      const totalDoors = latestEntries.reduce((s, e) => s + e.doors, 0);
      const weightedUPSPW = totalDoors > 0
        ? latestEntries.reduce((s, e) => s + calcUPSPW(e) * e.doors, 0) / totalDoors
        : 0;

      agg[chId] = { totalDoors, weightedUPSPW, entries: chEntries, latestPerRetailer: latestMap };
    }
    return agg;
  }, [entries]);

  // Trend per channel (compare most recent 2 entries per retailer)
  const channelTrends = useMemo(() => {
    const trends: Record<string, 'up' | 'stable' | 'down' | 'none'> = {};
    for (const chId of CHANNEL_IDS) {
      const chEntries = entries.filter(e => e.channelType === chId);
      if (chEntries.length < 2) { trends[chId] = 'none'; continue; }

      // Group by retailer, sort by enteredAt
      const byRetailer: Record<string, VelocityEntry[]> = {};
      for (const e of chEntries) {
        if (!byRetailer[e.retailerName]) byRetailer[e.retailerName] = [];
        byRetailer[e.retailerName].push(e);
      }

      let totalDelta = 0;
      let count = 0;
      for (const retailerEntries of Object.values(byRetailer)) {
        if (retailerEntries.length < 2) continue;
        const sorted = [...retailerEntries].sort((a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime());
        const prev = calcUPSPW(sorted[sorted.length - 2]);
        const curr = calcUPSPW(sorted[sorted.length - 1]);
        if (prev > 0) {
          totalDelta += (curr - prev) / prev;
          count++;
        }
      }

      if (count === 0) { trends[chId] = 'none'; continue; }
      const avgDelta = totalDelta / count;
      if (avgDelta > 0.05) trends[chId] = 'up';
      else if (avgDelta < -0.05) trends[chId] = 'down';
      else trends[chId] = 'stable';
    }
    return trends;
  }, [entries]);

  // Your total unique doors (latest per retailer across all channels)
  const yourTotalDoors = useMemo(() => {
    return CHANNEL_IDS.reduce((s, ch) => s + channelAggregates[ch].totalDoors, 0);
  }, [channelAggregates]);

  const acvPct = totalCategoryDoors > 0 ? yourTotalDoors / totalCategoryDoors : 0;

  // Tier assignments for all latest entries
  const tierAssignments = useMemo(() => {
    const assignments: Array<{ retailer: string; channel: string; upspw: number; tier: 'A' | 'B' | 'C'; doors: number }> = [];
    for (const chId of CHANNEL_IDS) {
      const latestMap = channelAggregates[chId].latestPerRetailer;
      for (const [retailer, entry] of Object.entries(latestMap) as [string, VelocityEntry][]) {
        const upspw = calcUPSPW(entry);
        assignments.push({
          retailer,
          channel: chId,
          upspw,
          tier: getTier(upspw, categoryBenchmark.highVelocity, categoryBenchmark.lowVelocity),
          doors: entry.doors,
        });
      }
    }
    return assignments;
  }, [entries, channelAggregates, categoryBenchmark]);

  const tierCounts = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0 };
    for (const a of tierAssignments) counts[a.tier]++;
    return counts;
  }, [tierAssignments]);

  // GO-GET verdict
  const goGetVerdict = useMemo(() => {
    if (entries.length === 0) return null;

    const activeChannels = CHANNEL_IDS.filter(ch => channelAggregates[ch].entries.length > 0);
    const belowArchChannels = activeChannels.filter(ch => {
      const archUPSPW = channels[ch]?.estUnitsPerWeekPerStore || 0;
      return archUPSPW > 0 && channelAggregates[ch].weightedUPSPW < archUPSPW;
    });

    const cTierAccounts = tierAssignments.filter(a => a.tier === 'C');
    const bThreshold = categoryBenchmark.lowVelocity; // B tier minimum = lowVelocity
    // Revenue impact if C-tier accounts hit B-tier velocity
    let revenueImpact = 0;
    for (const acc of cTierAccounts) {
      const currentUnitsPerWeek = acc.upspw * acc.doors;
      const bUnitsPerWeek = bThreshold * acc.doors;
      const deltaUnits = (bUnitsPerWeek - currentUnitsPerWeek) * 52;
      revenueImpact += deltaUnits * (blended.blendedNetRev || 0);
    }

    // Calculate overall velocity vs architecture
    let totalActualWeighted = 0;
    let totalArchWeighted = 0;
    let totalWeight = 0;
    for (const ch of activeChannels) {
      const doors = channelAggregates[ch].totalDoors;
      if (doors <= 0) continue;
      totalActualWeighted += channelAggregates[ch].weightedUPSPW * doors;
      totalArchWeighted += (channels[ch]?.estUnitsPerWeekPerStore || 0) * doors;
      totalWeight += doors;
    }
    const overallActual = totalWeight > 0 ? totalActualWeighted / totalWeight : 0;
    const overallArch = totalWeight > 0 ? totalArchWeighted / totalWeight : 0;
    const overallGapPct = overallArch > 0 ? (overallActual - overallArch) / overallArch : 0;

    if (acvPct < 0.10) {
      return `Your ACV is ${fmtPct(acvPct)} — you're early stage. Focus on door growth before optimizing velocity. You're in ${yourTotalDoors.toLocaleString()} of ${totalCategoryDoors.toLocaleString()} category doors.`;
    }

    if (belowArchChannels.length === 0 && activeChannels.length > 0) {
      return `Your velocity is ${Math.abs(Math.round(overallGapPct * 100))}% above architecture across ${activeChannels.length} channel${activeChannels.length > 1 ? 's' : ''}. You're outperforming your own model — consider raising your target revenue.`;
    }

    // Find worst channel
    let worstChannel = '';
    let worstGap = 0;
    for (const ch of belowArchChannels) {
      const archU = channels[ch]?.estUnitsPerWeekPerStore || 0;
      const gap = archU > 0 ? (channelAggregates[ch].weightedUPSPW - archU) / archU : 0;
      if (gap < worstGap) { worstGap = gap; worstChannel = ch; }
    }

    let msg = `${belowArchChannels.length} of ${activeChannels.length} active channel${activeChannels.length > 1 ? 's' : ''} ${belowArchChannels.length === 1 ? 'is' : 'are'} below architecture velocity.`;
    if (worstChannel) {
      msg += ` Focus on ${CHANNEL_LABELS[worstChannel]} where you're ${Math.abs(Math.round(worstGap * 100))}% below target.`;
    }
    if (cTierAccounts.length > 0 && revenueImpact > 0) {
      msg += ` Converting your ${cTierAccounts.length} C-tier account${cTierAccounts.length > 1 ? 's' : ''} to B-tier would add ${fmtDollar(revenueImpact)} in annual net revenue.`;
    }
    return msg;
  }, [entries, channelAggregates, channels, tierAssignments, categoryBenchmark, acvPct, blended, yourTotalDoors, totalCategoryDoors]);

  // ── SVG Trend Chart data ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (entries.length === 0) return null;

    // Group by retailer, sort chronologically
    const byRetailer: Record<string, { label: string; upspw: number; channel: string }[]> = {};
    for (const e of entries) {
      if (!byRetailer[e.retailerName]) byRetailer[e.retailerName] = [];
      byRetailer[e.retailerName].push({
        label: e.periodLabel || new Date(e.enteredAt).toLocaleDateString(),
        upspw: calcUPSPW(e),
        channel: e.channelType,
      });
    }

    // Get all unique period labels in order of appearance
    const allLabels: string[] = [];
    const sorted = [...entries].sort((a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime());
    for (const e of sorted) {
      const label = e.periodLabel || new Date(e.enteredAt).toLocaleDateString();
      if (!allLabels.includes(label)) allLabels.push(label);
    }

    // Find max UPSPW for scaling
    let maxUPSPW = 0;
    for (const e of entries) {
      const u = calcUPSPW(e);
      if (u > maxUPSPW) maxUPSPW = u;
    }

    // Architecture target (weighted avg)
    const activeChannels = CHANNEL_IDS.filter(ch => channelAggregates[ch].entries.length > 0);
    let archTarget = 0;
    if (activeChannels.length > 0) {
      let totalDoors = 0;
      let weighted = 0;
      for (const ch of activeChannels) {
        const d = channelAggregates[ch].totalDoors;
        weighted += (channels[ch]?.estUnitsPerWeekPerStore || 0) * d;
        totalDoors += d;
      }
      archTarget = totalDoors > 0 ? weighted / totalDoors : 0;
    }

    maxUPSPW = Math.max(maxUPSPW, archTarget) * 1.2;
    if (maxUPSPW === 0) maxUPSPW = 5;

    return { byRetailer, allLabels, maxUPSPW, archTarget };
  }, [entries, channelAggregates, channels]);

  // ── ACV stage badge ───────────────────────────────────────────────────────
  function acvBadge(pct: number): { label: string; cls: string } {
    if (pct >= 0.50) return { label: 'Market Leader', cls: 'badge badge-success' };
    if (pct >= 0.25) return { label: 'Scaling', cls: 'badge badge-info' };
    if (pct >= 0.10) return { label: 'Growth', cls: 'badge badge-warning' };
    return { label: 'Early Stage', cls: 'badge badge-error' };
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* ── Section 1: Sales Actuals ──────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-base-content mb-1">Sales Actuals</h2>
        <p className="text-sm text-base-content/60 mb-4">Enter real sales data per retailer per period. UPSPW and tier are auto-calculated.</p>

        {entries.length === 0 ? (
          <div className="text-center py-12 text-base-content/40 border border-dashed border-base-300 rounded-xl">
            <p className="text-lg mb-2">No sales data yet.</p>
            <p className="text-sm mb-4">Add your first entry to start tracking velocity.</p>
            <button className="btn btn-primary btn-sm" onClick={addEntry}>+ Add Entry</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs text-base-content/50">
                    <th className="w-40">Retailer</th>
                    <th className="w-36">Channel</th>
                    <th className="w-24 text-right">Doors</th>
                    <th className="w-28 text-right">Units Sold</th>
                    <th className="w-24 text-right">Period (wks)</th>
                    <th className="w-32">Period Label</th>
                    <th className="w-24 text-right">UPSPW</th>
                    <th className="w-16 text-center">Tier</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const upspw = entryUPSPW[entry.id] || 0;
                    const tier = getTier(upspw, categoryBenchmark.highVelocity, categoryBenchmark.lowVelocity);
                    const tierBadge = tier === 'A' ? 'badge badge-success badge-sm' : tier === 'B' ? 'badge badge-warning badge-sm' : 'badge badge-error badge-sm';
                    return (
                      <tr key={entry.id} className={idx % 2 === 1 ? 'bg-base-200/30' : ''}>
                        <td>
                          <input
                            type="text"
                            className="input input-xs input-bordered w-full"
                            value={entry.retailerName}
                            placeholder="Retailer name"
                            onChange={e => updateEntry(entry.id, { retailerName: e.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            className="select select-xs select-bordered w-full"
                            value={entry.channelType}
                            onChange={e => updateEntry(entry.id, { channelType: e.target.value as VelocityEntry['channelType'] })}
                          >
                            {CHANNEL_IDS.map(ch => (
                              <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <NumericCell
                            value={entry.doors}
                            onChange={v => updateEntry(entry.id, { doors: v })}
                            min={0}
                            decimals={0}
                            className="input input-xs input-bordered w-full text-right"
                          />
                        </td>
                        <td>
                          <NumericCell
                            value={entry.unitsSold}
                            onChange={v => updateEntry(entry.id, { unitsSold: v })}
                            min={0}
                            decimals={0}
                            className="input input-xs input-bordered w-full text-right"
                          />
                        </td>
                        <td>
                          <NumericCell
                            value={entry.periodWeeks}
                            onChange={v => updateEntry(entry.id, { periodWeeks: v })}
                            min={0.1}
                            decimals={1}
                            className="input input-xs input-bordered w-full text-right"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input input-xs input-bordered w-full"
                            value={entry.periodLabel}
                            placeholder="e.g. Feb 2024"
                            onChange={e => updateEntry(entry.id, { periodLabel: e.target.value })}
                          />
                        </td>
                        <td className="text-right font-mono font-semibold text-sm">
                          {fmt(upspw)}
                        </td>
                        <td className="text-center">
                          <span className={tierBadge}>{tier}</span>
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => deleteEntry(entry.id)}
                            title="Delete entry"
                          >🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button className="btn btn-primary btn-sm mt-3" onClick={addEntry}>+ Add Entry</button>
          </>
        )}
      </section>

      {entries.length > 0 && (
        <>
          {/* ── Section 2: Velocity Scorecard ──────────────────────────────── */}
          <section>
            <h2 className="text-lg font-bold text-base-content mb-1">Velocity Scorecard</h2>
            <p className="text-sm text-base-content/60 mb-4">Per-channel summary comparing actual velocity to your architecture model.</p>

            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs text-base-content/50">
                    <th>Channel</th>
                    <th className="text-right">Total Doors</th>
                    <th className="text-right">Avg UPSPW</th>
                    <th className="text-center">Trend</th>
                    <th className="text-right">vs Architecture</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {CHANNEL_IDS.filter(ch => channelAggregates[ch].entries.length > 0).map((ch, idx) => {
                    const agg = channelAggregates[ch];
                    const archUPSPW = channels[ch]?.estUnitsPerWeekPerStore || 0;
                    const gap = archUPSPW > 0 ? (agg.weightedUPSPW - archUPSPW) / archUPSPW : 0;
                    const trend = channelTrends[ch];
                    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'stable' ? '→' : '—';
                    const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-base-content/50';

                    let statusBadge: string;
                    if (gap >= 0) statusBadge = 'badge badge-success badge-sm';
                    else if (gap >= -0.10) statusBadge = 'badge badge-warning badge-sm';
                    else statusBadge = 'badge badge-error badge-sm';
                    const statusLabel = gap >= 0 ? 'On Track' : gap >= -0.10 ? 'Close' : 'Below';

                    return (
                      <tr key={ch} className={idx % 2 === 1 ? 'bg-base-200/30' : ''}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: CHANNEL_COLORS[ch] }}></span>
                            {CHANNEL_LABELS[ch]}
                          </div>
                        </td>
                        <td className="text-right font-mono">{agg.totalDoors.toLocaleString()}</td>
                        <td className="text-right font-mono font-semibold">{fmt(agg.weightedUPSPW)}</td>
                        <td className={`text-center text-lg ${trendColor}`}>{trendIcon}</td>
                        <td className={`text-right font-mono ${gap >= 0 ? 'text-success' : 'text-error'}`}>
                          {gap >= 0 ? '+' : ''}{Math.round(gap * 100)}% {gap >= 0 ? 'above' : 'below'} plan
                        </td>
                        <td className="text-center">
                          <span className={statusBadge}>{statusLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Section 3: ACV & Distribution Reach ───────────────────────── */}
          <section>
            <h2 className="text-lg font-bold text-base-content mb-1">ACV &amp; Distribution Reach</h2>
            <p className="text-sm text-base-content/60 mb-4">Your door coverage as a percentage of total category doors.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-base-200/50 rounded-xl p-4">
                <div className="text-xs text-base-content/50 mb-1">Total Category Doors</div>
                <NumericCell
                  value={totalCategoryDoors}
                  onChange={setTotalDoors}
                  min={1}
                  decimals={0}
                  className="input input-sm input-bordered w-full text-right font-mono"
                />
              </div>
              <div className="bg-base-200/50 rounded-xl p-4">
                <div className="text-xs text-base-content/50 mb-1">Your Doors</div>
                <div className="text-2xl font-bold font-mono">{yourTotalDoors.toLocaleString()}</div>
              </div>
              <div className="bg-base-200/50 rounded-xl p-4">
                <div className="text-xs text-base-content/50 mb-1">Overall ACV %</div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold font-mono">{fmtPct(acvPct)}</span>
                  <span className={acvBadge(acvPct).cls}>{acvBadge(acvPct).label}</span>
                </div>
              </div>
            </div>

            {/* Per-channel ACV */}
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs text-base-content/50">
                    <th>Channel</th>
                    <th className="text-right">Doors</th>
                    <th className="text-right">ACV %</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {CHANNEL_IDS.filter(ch => channelAggregates[ch].totalDoors > 0).map((ch, idx) => {
                    const chAcv = totalCategoryDoors > 0 ? channelAggregates[ch].totalDoors / totalCategoryDoors : 0;
                    const badge = acvBadge(chAcv);
                    return (
                      <tr key={ch} className={idx % 2 === 1 ? 'bg-base-200/30' : ''}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: CHANNEL_COLORS[ch] }}></span>
                            {CHANNEL_LABELS[ch]}
                          </div>
                        </td>
                        <td className="text-right font-mono">{channelAggregates[ch].totalDoors.toLocaleString()}</td>
                        <td className="text-right font-mono">{fmtPct(chAcv)}</td>
                        <td><span className={badge.cls}>{badge.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Section 4: Door Performance Tiers ─────────────────────────── */}
          <section>
            <h2 className="text-lg font-bold text-base-content mb-1">Door Performance Tiers</h2>
            <p className="text-sm text-base-content/60 mb-4">Group accounts into A/B/C tiers based on velocity benchmarks.</p>

            {/* Benchmark inputs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="text-xs text-base-content/50 mb-1 block">Category</label>
                <input
                  type="text"
                  className="input input-sm input-bordered w-full"
                  value={categoryBenchmark.category}
                  onChange={e => setBenchmark({ ...categoryBenchmark, category: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-base-content/50 mb-1 block">A Tier (UPSPW ≥)</label>
                <NumericCell
                  value={categoryBenchmark.highVelocity}
                  onChange={v => setBenchmark({ ...categoryBenchmark, highVelocity: v })}
                  min={0}
                  decimals={1}
                  className="input input-sm input-bordered w-full text-right"
                />
              </div>
              <div>
                <label className="text-xs text-base-content/50 mb-1 block">B Tier (UPSPW ≥)</label>
                <NumericCell
                  value={categoryBenchmark.lowVelocity}
                  onChange={v => setBenchmark({ ...categoryBenchmark, lowVelocity: v })}
                  min={0}
                  decimals={1}
                  className="input input-sm input-bordered w-full text-right"
                />
              </div>
              <div>
                <label className="text-xs text-base-content/50 mb-1 block">C Tier</label>
                <div className="input input-sm input-bordered w-full flex items-center text-base-content/50 bg-base-200/30">
                  Below {fmt(categoryBenchmark.lowVelocity, 1)}
                </div>
              </div>
            </div>

            {/* Tier distribution bar */}
            {tierAssignments.length > 0 && (
              <>
                <div className="flex gap-1 h-8 rounded-lg overflow-hidden mb-4">
                  {tierCounts.A > 0 && (
                    <div
                      className="flex items-center justify-center text-xs font-bold text-success-content bg-success"
                      style={{ flex: tierCounts.A }}
                    >
                      A: {tierCounts.A}
                    </div>
                  )}
                  {tierCounts.B > 0 && (
                    <div
                      className="flex items-center justify-center text-xs font-bold text-warning-content bg-warning"
                      style={{ flex: tierCounts.B }}
                    >
                      B: {tierCounts.B}
                    </div>
                  )}
                  {tierCounts.C > 0 && (
                    <div
                      className="flex items-center justify-center text-xs font-bold text-error-content bg-error"
                      style={{ flex: tierCounts.C }}
                    >
                      C: {tierCounts.C}
                    </div>
                  )}
                </div>

                {/* Tier details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['A', 'B', 'C'] as const).map(tier => {
                    const accounts = tierAssignments.filter(a => a.tier === tier);
                    const borderColor = tier === 'A' ? 'border-success/30' : tier === 'B' ? 'border-warning/30' : 'border-error/30';
                    const headerBg = tier === 'A' ? 'bg-success/10' : tier === 'B' ? 'bg-warning/10' : 'bg-error/10';
                    return (
                      <div key={tier} className={`rounded-xl border ${borderColor} overflow-hidden`}>
                        <div className={`px-3 py-2 ${headerBg} text-sm font-bold`}>
                          Tier {tier} — {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                        </div>
                        <div className="p-2">
                          {accounts.length === 0 ? (
                            <p className="text-xs text-base-content/40 p-2">None</p>
                          ) : (
                            accounts.sort((a, b) => b.upspw - a.upspw).map(a => (
                              <div key={`${a.retailer}-${a.channel}`} className="flex items-center justify-between px-2 py-1 text-sm">
                                <div>
                                  <span className="font-medium">{a.retailer || '(unnamed)'}</span>
                                  <span className="text-xs text-base-content/40 ml-2">{CHANNEL_LABELS[a.channel]}</span>
                                </div>
                                <span className="font-mono text-xs">{fmt(a.upspw)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── Section 5: Velocity Trend Chart ───────────────────────────── */}
          {chartData && Object.keys(chartData.byRetailer).length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-base-content mb-1">Velocity Trend</h2>
              <p className="text-sm text-base-content/60 mb-4">UPSPW over time by retailer. Dashed line = architecture target.</p>

              <div className="bg-base-200/30 rounded-xl p-4">
                <svg viewBox="0 0 800 350" className="w-full" style={{ maxHeight: '350px' }}>
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const y = 20 + (1 - pct) * 280;
                    const val = pct * chartData.maxUPSPW;
                    return (
                      <g key={pct}>
                        <line x1="60" y1={y} x2="780" y2={y} stroke="currentColor" strokeOpacity={0.1} />
                        <text x="55" y={y + 4} textAnchor="end" fill="currentColor" fillOpacity={0.4} fontSize="10">
                          {fmt(val, 1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* X-axis labels */}
                  {chartData.allLabels.map((label, i) => {
                    const x = chartData.allLabels.length === 1
                      ? 420
                      : 80 + (i / (chartData.allLabels.length - 1)) * 680;
                    return (
                      <text key={i} x={x} y={320} textAnchor="middle" fill="currentColor" fillOpacity={0.4} fontSize="10">
                        {label.length > 12 ? label.slice(0, 12) + '…' : label}
                      </text>
                    );
                  })}

                  {/* Architecture target dashed line */}
                  {chartData.archTarget > 0 && (
                    <>
                      <line
                        x1="60"
                        y1={20 + (1 - chartData.archTarget / chartData.maxUPSPW) * 280}
                        x2="780"
                        y2={20 + (1 - chartData.archTarget / chartData.maxUPSPW) * 280}
                        stroke="#a855f7"
                        strokeWidth="1.5"
                        strokeDasharray="6,4"
                        strokeOpacity={0.6}
                      />
                      <text
                        x="782"
                        y={20 + (1 - chartData.archTarget / chartData.maxUPSPW) * 280 + 4}
                        fill="#a855f7"
                        fontSize="9"
                        fillOpacity={0.8}
                      >
                        Target
                      </text>
                    </>
                  )}

                  {/* Lines per retailer */}
                  {(Object.entries(chartData.byRetailer) as [string, { label: string; upspw: number; channel: string }[]][]).map(([retailer, points]) => {
                    if (points.length === 0) return null;
                    const color = CHANNEL_COLORS[points[0].channel] || '#888';
                    const polyPoints = points.map(p => {
                      const xi = chartData.allLabels.indexOf(p.label);
                      const x = chartData.allLabels.length === 1
                        ? 420
                        : 80 + (xi / (chartData.allLabels.length - 1)) * 680;
                      const y = 20 + (1 - p.upspw / chartData.maxUPSPW) * 280;
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <g key={retailer}>
                        <polyline
                          points={polyPoints}
                          fill="none"
                          stroke={color}
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        {points.map((p, i) => {
                          const xi = chartData.allLabels.indexOf(p.label);
                          const x = chartData.allLabels.length === 1
                            ? 420
                            : 80 + (xi / (chartData.allLabels.length - 1)) * 680;
                          const y = 20 + (1 - p.upspw / chartData.maxUPSPW) * 280;
                          return <circle key={i} cx={x} cy={y} r="3.5" fill={color} />;
                        })}
                        {/* Label at end */}
                        {(() => {
                          const last = points[points.length - 1];
                          const xi = chartData.allLabels.indexOf(last.label);
                          const x = chartData.allLabels.length === 1
                            ? 420
                            : 80 + (xi / (chartData.allLabels.length - 1)) * 680;
                          const y = 20 + (1 - last.upspw / chartData.maxUPSPW) * 280;
                          return (
                            <text x={x + 8} y={y + 4} fill={color} fontSize="9" fontWeight="600">
                              {retailer.length > 15 ? retailer.slice(0, 15) + '…' : retailer}
                            </text>
                          );
                        })()}
                      </g>
                    );
                  })}
                </svg>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-3 px-2">
                  {Object.entries(chartData.byRetailer).map(([retailer, points]) => (
                    <div key={retailer} className="flex items-center gap-1.5 text-xs">
                      <span className="w-3 h-1 rounded" style={{ background: CHANNEL_COLORS[points[0]?.channel] || '#888' }}></span>
                      {retailer || '(unnamed)'}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Section 6: THE GO-GET ─────────────────────────────────────── */}
          {goGetVerdict && (
            <section>
              <h2 className="text-lg font-bold text-base-content mb-1">The GO-GET</h2>
              <p className="text-sm text-base-content/60 mb-4">Prescriptive verdict based on your velocity data vs. architecture.</p>
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎯</span>
                  <p className="text-sm text-base-content leading-relaxed">{goGetVerdict}</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
