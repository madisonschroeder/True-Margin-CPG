import React, { useState, useMemo } from 'react';
import { NumericCell } from './NumericCell';
import { computeChannelOutputs } from '../utils/calculations';
import {
  PipelineDeal,
  DealStatus,
  ChannelInputs,
  CogsFreightState,
  BlendedFinancials,
  GlobalOverhead,
  LogisticsState,
  SKULibraryState,
} from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

type ChannelType = 'kehe' | 'club' | 'dsd' | 'online' | 'altfdsvc';

interface PipelineActualsProps {
  deals: PipelineDeal[];
  onUpdateDeals: (deals: PipelineDeal[]) => void;
  blended: BlendedFinancials;
  channels: Record<string, ChannelInputs>;
  dashboardMix: Record<string, number>;
  cogsFreight: CogsFreightState;
  globalOverhead: GlobalOverhead;
  logistics: LogisticsState;
  skuLibrary: SKULibraryState;
  channelCogsMap: Record<string, CogsFreightState>;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<ChannelType, string> = {
  kehe: "Nat'l Distribution",
  club: 'Club',
  dsd: 'DSD',
  online: 'Online D2B',
  altfdsvc: 'Alt FdSvc',
};

const CHANNEL_IDS: ChannelType[] = ['kehe', 'club', 'dsd', 'online', 'altfdsvc'];

const STATUS_ORDER: DealStatus[] = ['prospect', 'negotiating', 'committed', 'live', 'lost'];

const STATUS_CONFIG: Record<DealStatus, { label: string; bg: string; text: string; border: string }> = {
  prospect:    { label: 'Prospect',    bg: 'bg-base-300',      text: 'text-base-content', border: 'border-base-300' },
  negotiating: { label: 'Negotiating', bg: 'bg-yellow-100',    text: 'text-yellow-800',   border: 'border-yellow-300' },
  committed:   { label: 'Committed',   bg: 'bg-blue-100',      text: 'text-blue-800',     border: 'border-blue-300' },
  live:        { label: 'Live',        bg: 'bg-green-100',     text: 'text-green-800',    border: 'border-green-300' },
  lost:        { label: 'Lost',        bg: 'bg-red-100',       text: 'text-red-800',      border: 'border-red-300' },
};

const STATUS_COLORS: Record<DealStatus, string> = {
  prospect: '#9ca3af',
  negotiating: '#eab308',
  committed: '#3b82f6',
  live: '#22c55e',
  lost: '#ef4444',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDollar(v: number): string {
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDollarDec(v: number): string {
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

function fmtNum(v: number): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PipelineActuals({
  deals,
  onUpdateDeals,
  blended,
  channels,
  dashboardMix,
  cogsFreight,
  globalOverhead,
  logistics,
  skuLibrary,
  channelCogsMap,
}: PipelineActualsProps) {
  // ── Local state ──────────────────────────────────────────────────────────────
  const [targetUpspw, setTargetUpspw] = useState<Record<string, number>>({ kehe: 2, club: 2, dsd: 2, online: 2, altfdsvc: 2 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'status' | 'retailerName' | 'channelType' | 'doors' | 'annualNetRevenue'>('status');
  const [sortAsc, setSortAsc] = useState(true);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'doors' | 'revenue'>('doors');

  // New deal form state
  const [newDeal, setNewDeal] = useState<{
    retailerName: string;
    channelType: ChannelType;
    status: DealStatus;
    doors: number;
    velocity: number;
    notes: string;
  }>({
    retailerName: '',
    channelType: 'kehe',
    status: 'prospect',
    doors: 100,
    velocity: 2,
    notes: '',
  });

  // Edit form state
  const [editForm, setEditForm] = useState<{ doors: number; velocity: number; notes: string }>({
    doors: 0, velocity: 0, notes: '',
  });

  // ── Computed: channel outputs for deal economics ─────────────────────────────

  const channelOutputsMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeChannelOutputs>> = {};
    for (const chId of CHANNEL_IDS) {
      map[chId] = computeChannelOutputs(channels[chId], channelCogsMap[chId], logistics, skuLibrary);
    }
    return map;
  }, [channels, channelCogsMap, logistics, skuLibrary]);

  // ── Computed: architecture targets ───────────────────────────────────────────

  const archTargets = useMemo(() => {
    return CHANNEL_IDS.filter(id => (dashboardMix[id] || 0) > 0).map(id => {
      const mix = dashboardMix[id] || 0;
      const impliedUnits = blended.impliedUnits * mix;
      const chOut = channelOutputsMap[id];
      const netRevPerUnit = chOut.netRevenue;
      const impliedRevenue = impliedUnits * netRevPerUnit;
      const upspw = targetUpspw[id] || 2;
      const targetDoors = upspw > 0 ? impliedUnits / 52 / upspw : 0;
      return {
        id: id as ChannelType,
        name: CHANNEL_LABELS[id],
        mix,
        impliedUnits,
        netRevPerUnit,
        impliedRevenue,
        targetDoors: Math.round(targetDoors),
        upspw,
        contribMarginPerUnit: chOut.contributionMarginDollar,
      };
    });
  }, [blended, dashboardMix, channelOutputsMap, targetUpspw]);

  // ── Computed: pipeline summary by status ─────────────────────────────────────

  const pipelineSummary = useMemo(() => {
    const summary: Record<DealStatus, { count: number; revenue: number }> = {
      prospect: { count: 0, revenue: 0 },
      negotiating: { count: 0, revenue: 0 },
      committed: { count: 0, revenue: 0 },
      live: { count: 0, revenue: 0 },
      lost: { count: 0, revenue: 0 },
    };
    for (const deal of deals) {
      summary[deal.status].count++;
      summary[deal.status].revenue += deal.annualNetRevenue;
    }
    return summary;
  }, [deals]);

  // ── Computed: gap analysis ───────────────────────────────────────────────────

  const gapAnalysis = useMemo(() => {
    return archTargets.map(target => {
      const chDeals = deals.filter(d => d.channelType === target.id && d.status !== 'lost');
      const liveDeals = chDeals.filter(d => d.status === 'live');

      const pipelineDoors = chDeals.reduce((s, d) => s + d.doors, 0);
      const liveDoors = liveDeals.reduce((s, d) => s + d.doors, 0);
      const doorGap = liveDoors - target.targetDoors;
      const doorPctFilled = target.targetDoors > 0 ? liveDoors / target.targetDoors : 0;

      const pipelineRev = chDeals.reduce((s, d) => s + d.annualNetRevenue, 0);
      const liveRev = liveDeals.reduce((s, d) => s + d.annualNetRevenue, 0);
      const revGap = liveRev - target.impliedRevenue;

      return {
        ...target,
        pipelineDoors,
        liveDoors,
        doorGap,
        doorPctFilled,
        pipelineRev,
        liveRev,
        revGap,
      };
    });
  }, [archTargets, deals]);

  // ── Computed: sorted deals ───────────────────────────────────────────────────

  const sortedDeals = useMemo(() => {
    const sorted = [...deals].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'status') {
        cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      } else if (sortField === 'retailerName') {
        cmp = a.retailerName.localeCompare(b.retailerName);
      } else if (sortField === 'channelType') {
        cmp = a.channelType.localeCompare(b.channelType);
      } else if (sortField === 'doors') {
        cmp = a.doors - b.doors;
      } else if (sortField === 'annualNetRevenue') {
        cmp = a.annualNetRevenue - b.annualNetRevenue;
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [deals, sortField, sortAsc]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleStatusChange = (dealId: string, newStatus: DealStatus) => {
    const updated = deals.map(d =>
      d.id === dealId ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d
    );
    onUpdateDeals(updated);
    setStatusDropdownId(null);
  };

  const handleDeleteDeal = (dealId: string) => {
    if (!confirm('Delete this deal from the pipeline?')) return;
    onUpdateDeals(deals.filter(d => d.id !== dealId));
  };

  const handleStartEdit = (deal: PipelineDeal) => {
    setEditingDealId(deal.id);
    setEditForm({ doors: deal.doors, velocity: deal.velocity, notes: deal.notes });
  };

  const handleSaveEdit = (dealId: string) => {
    const chType = deals.find(d => d.id === dealId)?.channelType;
    if (!chType) return;
    const annualUnits = editForm.doors * editForm.velocity * 52;
    const chOut = channelOutputsMap[chType];
    const updated = deals.map(d =>
      d.id === dealId
        ? {
            ...d,
            doors: editForm.doors,
            velocity: editForm.velocity,
            notes: editForm.notes,
            annualUnits,
            annualNetRevenue: annualUnits * chOut.netRevenue,
            netRevPerUnit: chOut.netRevenue,
            contribMarginPerUnit: chOut.contributionMarginDollar,
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    onUpdateDeals(updated);
    setEditingDealId(null);
  };

  const handleAddDeal = () => {
    if (!newDeal.retailerName.trim()) return;
    const ch = channels[newDeal.channelType];
    const chOut = channelOutputsMap[newDeal.channelType];
    const annualUnits = newDeal.doors * newDeal.velocity * 52;
    const now = new Date().toISOString();

    const deal: PipelineDeal = {
      id: generateId(),
      retailerName: newDeal.retailerName,
      channelType: newDeal.channelType,
      status: newDeal.status,
      doors: newDeal.doors,
      velocity: newDeal.velocity,
      retailerMarginPct: ch.retailerMarginPct,
      distMarginPct: ch.distMarginPct,
      productMarginPct: ch.productMarginPct,
      earlyPayPct: ch.earlyPayPct,
      brokerCommPct: ch.brokerCommPct,
      spoilagePct: ch.spoilagePct,
      otherDeductionsPct: ch.otherDeductionsPct,
      tradeSpendPct: ch.tradeSpendPct,
      slottingPerSkuPerStore: ch.slottingPerSkuPerStore,
      annualUnits,
      netRevPerUnit: chOut.netRevenue,
      annualNetRevenue: annualUnits * chOut.netRevenue,
      contribMarginPerUnit: chOut.contributionMarginDollar,
      notes: newDeal.notes,
      createdAt: now,
      updatedAt: now,
    };

    onUpdateDeals([...deals, deal]);
    setShowAddForm(false);
    setNewDeal({ retailerName: '', channelType: 'kehe', status: 'prospect', doors: 100, velocity: 2, notes: '' });
  };

  // ── Go-Get prescriptive text ─────────────────────────────────────────────────

  const goGetText = useMemo(() => {
    if (gapAnalysis.length === 0) return ['Add channels to your dashboard mix and deals to your pipeline to see prescriptive guidance.'];

    const lines: string[] = [];
    const allAbove80 = gapAnalysis.every(g => g.doorPctFilled >= 0.8);

    if (allAbove80) {
      lines.push('🎉 Your pipeline covers your architecture. Focus on converting committed deals to live.');
    } else {
      // Find biggest gap
      const sorted = [...gapAnalysis].sort((a, b) => a.doorPctFilled - b.doorPctFilled);
      const biggest = sorted[0];
      const negotiatingDoors = deals
        .filter(d => d.channelType === biggest.id && d.status === 'negotiating')
        .reduce((s, d) => s + d.doors, 0);
      const withNegotiating = biggest.targetDoors > 0
        ? ((biggest.liveDoors + negotiatingDoors) / biggest.targetDoors * 100).toFixed(0)
        : '0';

      lines.push(
        `You need ${fmtNum(Math.abs(biggest.doorGap))} more doors in ${biggest.name} to hit your architecture.` +
        (negotiatingDoors > 0
          ? ` Your pipeline has ${fmtNum(negotiatingDoors)} doors in negotiation — close those and you're at ${withNegotiating}% of target.`
          : ' No deals currently in negotiation for this channel.')
      );

      // Check over-indexed channels
      const overIndexed = gapAnalysis.filter(g => g.doorPctFilled > 1.2);
      const underIndexed = gapAnalysis.filter(g => g.doorPctFilled < 0.5);
      if (overIndexed.length > 0 && underIndexed.length > 0) {
        lines.push(
          `Your ${overIndexed[0].name} channel is over-indexed in pipeline (${(overIndexed[0].doorPctFilled * 100).toFixed(0)}% of target) — consider shifting focus to ${underIndexed[0].name} where you're only at ${(underIndexed[0].doorPctFilled * 100).toFixed(0)}%.`
        );
      }
    }

    // Revenue summary
    const totalLiveRev = gapAnalysis.reduce((s, g) => s + g.liveRev, 0);
    const totalTargetRev = gapAnalysis.reduce((s, g) => s + g.impliedRevenue, 0);
    if (totalTargetRev > 0) {
      lines.push(
        `Overall live revenue: ${fmtDollar(totalLiveRev)} of ${fmtDollar(totalTargetRev)} target (${(totalLiveRev / totalTargetRev * 100).toFixed(0)}%).`
      );
    }

    return lines;
  }, [gapAnalysis, deals]);

  // ── SVG Pipeline Velocity Chart ──────────────────────────────────────────────

  const renderVelocityChart = () => {
    if (gapAnalysis.length === 0) return null;

    const barHeight = 36;
    const labelWidth = 120;
    const chartWidth = 500;
    const gap = 8;
    const svgHeight = gapAnalysis.length * (barHeight + gap) + 20;

    return (
      <svg width="100%" viewBox={`0 0 ${labelWidth + chartWidth + 80} ${svgHeight}`} className="max-w-2xl">
        {gapAnalysis.map((g, idx) => {
          const y = idx * (barHeight + gap) + 10;
          const maxVal = chartMode === 'doors'
            ? Math.max(g.targetDoors, g.pipelineDoors, 1)
            : Math.max(g.impliedRevenue, g.pipelineRev, 1);

          const scale = (v: number) => (v / maxVal) * chartWidth;

          const liveDoors = deals.filter(d => d.channelType === g.id && d.status === 'live');
          const committedDoors = deals.filter(d => d.channelType === g.id && d.status === 'committed');
          const negotiatingDoors = deals.filter(d => d.channelType === g.id && d.status === 'negotiating');
          const prospectDoors = deals.filter(d => d.channelType === g.id && d.status === 'prospect');

          const liveVal = chartMode === 'doors'
            ? liveDoors.reduce((s, d) => s + d.doors, 0)
            : liveDoors.reduce((s, d) => s + d.annualNetRevenue, 0);
          const committedVal = chartMode === 'doors'
            ? committedDoors.reduce((s, d) => s + d.doors, 0)
            : committedDoors.reduce((s, d) => s + d.annualNetRevenue, 0);
          const negotiatingVal = chartMode === 'doors'
            ? negotiatingDoors.reduce((s, d) => s + d.doors, 0)
            : negotiatingDoors.reduce((s, d) => s + d.annualNetRevenue, 0);
          const prospectVal = chartMode === 'doors'
            ? prospectDoors.reduce((s, d) => s + d.doors, 0)
            : prospectDoors.reduce((s, d) => s + d.annualNetRevenue, 0);

          const targetVal = chartMode === 'doors' ? g.targetDoors : g.impliedRevenue;

          let x = labelWidth;

          return (
            <g key={g.id}>
              <text x={0} y={y + barHeight / 2 + 4} fontSize="12" fill="currentColor" className="text-base-content">{g.name}</text>
              {/* Target outline */}
              <rect x={labelWidth} y={y} width={scale(targetVal)} height={barHeight} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" rx="3" />
              {/* Live */}
              {liveVal > 0 && (
                <rect x={x} y={y + 2} width={scale(liveVal)} height={barHeight - 4} fill={STATUS_COLORS.live} rx="2" />
              )}
              {/* Committed */}
              {committedVal > 0 && (
                <rect x={x + scale(liveVal)} y={y + 2} width={scale(committedVal)} height={barHeight - 4} fill={STATUS_COLORS.committed} rx="2" />
              )}
              {/* Negotiating */}
              {negotiatingVal > 0 && (
                <rect x={x + scale(liveVal) + scale(committedVal)} y={y + 2} width={scale(negotiatingVal)} height={barHeight - 4} fill={STATUS_COLORS.negotiating} rx="2" />
              )}
              {/* Prospect */}
              {prospectVal > 0 && (
                <rect x={x + scale(liveVal) + scale(committedVal) + scale(negotiatingVal)} y={y + 2} width={scale(prospectVal)} height={barHeight - 4} fill={STATUS_COLORS.prospect} rx="2" />
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  // ── Progress bar helper ──────────────────────────────────────────────────────

  const renderProgressBar = (pct: number) => {
    const clampedPct = Math.min(pct, 1);
    const colorClass = pct < 0.5 ? 'bg-red-500' : pct < 0.8 ? 'bg-yellow-500' : 'bg-green-500';
    return (
      <div className="w-full bg-base-200 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${Math.max(clampedPct * 100, 0)}%` }} />
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── 1. Intro Banner ── */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📊</span>
          <h2 className="text-xl font-bold text-indigo-900">Pipeline &amp; Actuals</h2>
        </div>
        <p className="text-sm text-indigo-700/80 ml-10">
          Track real deals against your architectural targets. See exactly where you are vs where you need to be.
        </p>
      </div>

      {/* ── 2. Architecture Targets Summary ── */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60 mb-3">Architecture Targets (from Executive Dashboard)</h3>
        {archTargets.length === 0 ? (
          <div className="text-sm text-base-content/50 italic">Set channel mix &gt; 0% on the Executive Dashboard to see targets.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {archTargets.map(t => (
              <div key={t.id} className="bg-base-100 border border-base-300 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{t.name}</span>
                  <span className="badge badge-sm badge-outline">{fmtPct(t.mix)} mix</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="text-base-content/50">Implied Units/yr</div>
                  <div className="font-mono text-right">{fmtNum(t.impliedUnits)}</div>
                  <div className="text-base-content/50">Net Rev/Unit</div>
                  <div className="font-mono text-right">{fmtDollarDec(t.netRevPerUnit)}</div>
                  <div className="text-base-content/50">Implied Rev/yr</div>
                  <div className="font-mono text-right">{fmtDollar(t.impliedRevenue)}</div>
                  <div className="text-base-content/50">Target Doors</div>
                  <div className="font-mono text-right font-bold">{fmtNum(t.targetDoors)}</div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-base-200">
                  <span className="text-xs text-base-content/50 whitespace-nowrap">Target UPSPW</span>
                  <NumericCell
                    value={targetUpspw[t.id] || 2}
                    onChange={v => setTargetUpspw(prev => ({ ...prev, [t.id]: v }))}
                    className="input input-bordered input-xs w-16 text-right font-mono"
                    min={0.1}
                    decimals={1}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. Pipeline Summary Cards ── */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60 mb-3">Pipeline Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(['prospect', 'negotiating', 'committed', 'live'] as DealStatus[]).map(status => {
            const cfg = STATUS_CONFIG[status];
            const data = pipelineSummary[status];
            return (
              <div key={status} className={`rounded-lg p-4 border ${cfg.border} ${cfg.bg}`}>
                <div className={`text-xs font-bold uppercase tracking-wider ${cfg.text} mb-1`}>{cfg.label}</div>
                <div className={`text-2xl font-bold ${cfg.text}`}>{data.count}</div>
                <div className={`text-xs ${cfg.text} opacity-70`}>{fmtDollar(data.revenue)} projected</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Architecture Gap Analysis ── */}
      {archTargets.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60 mb-3">Architecture Gap Analysis — Doors</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="text-xs uppercase tracking-wider">
                  <th>Channel</th>
                  <th className="text-right">Target Doors</th>
                  <th className="text-right">Pipeline Doors</th>
                  <th className="text-right">Live Doors</th>
                  <th className="text-right">Gap</th>
                  <th className="text-right">% Filled</th>
                  <th className="w-32">Progress</th>
                </tr>
              </thead>
              <tbody>
                {gapAnalysis.map(g => (
                  <tr key={g.id}>
                    <td className="font-medium">{g.name}</td>
                    <td className="text-right font-mono">{fmtNum(g.targetDoors)}</td>
                    <td className="text-right font-mono">{fmtNum(g.pipelineDoors)}</td>
                    <td className="text-right font-mono font-bold">{fmtNum(g.liveDoors)}</td>
                    <td className={`text-right font-mono font-bold ${g.doorGap < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {g.doorGap < 0 ? '' : '+'}{fmtNum(g.doorGap)}
                    </td>
                    <td className="text-right font-mono">{(g.doorPctFilled * 100).toFixed(1)}%</td>
                    <td>{renderProgressBar(g.doorPctFilled)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60 mb-3 mt-5">Architecture Gap Analysis — Revenue</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="text-xs uppercase tracking-wider">
                  <th>Channel</th>
                  <th className="text-right">Target Rev</th>
                  <th className="text-right">Pipeline Rev</th>
                  <th className="text-right">Live Rev</th>
                  <th className="text-right">Gap</th>
                </tr>
              </thead>
              <tbody>
                {gapAnalysis.map(g => (
                  <tr key={g.id}>
                    <td className="font-medium">{g.name}</td>
                    <td className="text-right font-mono">{fmtDollar(g.impliedRevenue)}</td>
                    <td className="text-right font-mono">{fmtDollar(g.pipelineRev)}</td>
                    <td className="text-right font-mono font-bold">{fmtDollar(g.liveRev)}</td>
                    <td className={`text-right font-mono font-bold ${g.revGap < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {g.revGap < 0 ? '-' : '+'}{fmtDollar(Math.abs(g.revGap))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. Deal Pipeline Table ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60">Deal Pipeline</h3>
          <button className="btn btn-primary btn-sm gap-1" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '✕ Cancel' : '+ Add Deal Manually'}
          </button>
        </div>

        {/* ── 6. Add Deal Form ── */}
        {showAddForm && (
          <div className="bg-base-200 border border-base-300 rounded-lg p-4 mb-4 space-y-3">
            <div className="text-sm font-bold mb-2">Add New Deal</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="label label-text text-xs">Retailer Name</label>
                <input
                  className="input input-bordered input-sm w-full"
                  placeholder="e.g. Whole Foods"
                  value={newDeal.retailerName}
                  onChange={e => setNewDeal(prev => ({ ...prev, retailerName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label label-text text-xs">Channel</label>
                <select
                  className="select select-bordered select-sm w-full"
                  value={newDeal.channelType}
                  onChange={e => setNewDeal(prev => ({ ...prev, channelType: e.target.value as ChannelType }))}
                >
                  {CHANNEL_IDS.map(id => (
                    <option key={id} value={id}>{CHANNEL_LABELS[id]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label label-text text-xs">Status</label>
                <select
                  className="select select-bordered select-sm w-full"
                  value={newDeal.status}
                  onChange={e => setNewDeal(prev => ({ ...prev, status: e.target.value as DealStatus }))}
                >
                  {STATUS_ORDER.filter(s => s !== 'lost').map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label label-text text-xs">Doors</label>
                <NumericCell
                  value={newDeal.doors}
                  onChange={v => setNewDeal(prev => ({ ...prev, doors: v }))}
                  className="input input-bordered input-sm w-full text-right font-mono"
                  min={0}
                />
              </div>
              <div>
                <label className="label label-text text-xs">Velocity (UPSPW)</label>
                <NumericCell
                  value={newDeal.velocity}
                  onChange={v => setNewDeal(prev => ({ ...prev, velocity: v }))}
                  className="input input-bordered input-sm w-full text-right font-mono"
                  min={0}
                  decimals={1}
                />
              </div>
              <div>
                <label className="label label-text text-xs">Notes</label>
                <input
                  className="input input-bordered input-sm w-full"
                  placeholder="Optional"
                  value={newDeal.notes}
                  onChange={e => setNewDeal(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-base-content/50">
              <span>Auto-calculates: {fmtNum(newDeal.doors * newDeal.velocity * 52)} annual units</span>
              <span>·</span>
              <span>{fmtDollar(newDeal.doors * newDeal.velocity * 52 * (channelOutputsMap[newDeal.channelType]?.netRevenue || 0))} annual net revenue</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAddDeal} disabled={!newDeal.retailerName.trim()}>
              Add to Pipeline
            </button>
          </div>
        )}

        {deals.length === 0 ? (
          <div className="text-center py-8 text-base-content/40 text-sm">
            No deals yet. Add deals from Deal Scorer or manually above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="text-xs uppercase tracking-wider">
                  <th className="cursor-pointer hover:text-primary" onClick={() => handleSort('status')}>
                    Status {sortField === 'status' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="cursor-pointer hover:text-primary" onClick={() => handleSort('retailerName')}>
                    Retailer {sortField === 'retailerName' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="cursor-pointer hover:text-primary" onClick={() => handleSort('channelType')}>
                    Channel {sortField === 'channelType' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('doors')}>
                    Doors {sortField === 'doors' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="text-right">UPSPW</th>
                  <th className="text-right">Annual Units</th>
                  <th className="text-right">Net Rev/Unit</th>
                  <th className="text-right cursor-pointer hover:text-primary" onClick={() => handleSort('annualNetRevenue')}>
                    Annual Net Rev {sortField === 'annualNetRevenue' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="text-right">CM/Unit</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedDeals.map(deal => {
                  const cfg = STATUS_CONFIG[deal.status];
                  const isEditing = editingDealId === deal.id;
                  return (
                    <tr key={deal.id} className="hover">
                      <td>
                        <div className="relative">
                          <button
                            className={`badge badge-sm ${cfg.bg} ${cfg.text} border ${cfg.border} cursor-pointer`}
                            onClick={() => setStatusDropdownId(statusDropdownId === deal.id ? null : deal.id)}
                          >
                            {cfg.label}
                          </button>
                          {statusDropdownId === deal.id && (
                            <div className="absolute z-20 top-full left-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-[120px]">
                              {STATUS_ORDER.map(s => (
                                <button
                                  key={s}
                                  className={`block w-full text-left px-3 py-1 text-xs hover:bg-base-200 ${deal.status === s ? 'font-bold' : ''}`}
                                  onClick={() => handleStatusChange(deal.id, s)}
                                >
                                  {STATUS_CONFIG[s].label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="font-medium">{deal.retailerName}</td>
                      <td className="text-xs">{CHANNEL_LABELS[deal.channelType]}</td>
                      <td className="text-right font-mono">
                        {isEditing ? (
                          <NumericCell value={editForm.doors} onChange={v => setEditForm(p => ({ ...p, doors: v }))} className="input input-bordered input-xs w-20 text-right font-mono" min={0} />
                        ) : fmtNum(deal.doors)}
                      </td>
                      <td className="text-right font-mono">
                        {isEditing ? (
                          <NumericCell value={editForm.velocity} onChange={v => setEditForm(p => ({ ...p, velocity: v }))} className="input input-bordered input-xs w-16 text-right font-mono" min={0} decimals={1} />
                        ) : deal.velocity.toFixed(1)}
                      </td>
                      <td className="text-right font-mono">{fmtNum(deal.annualUnits)}</td>
                      <td className="text-right font-mono">{fmtDollarDec(deal.netRevPerUnit)}</td>
                      <td className="text-right font-mono font-bold">{fmtDollar(deal.annualNetRevenue)}</td>
                      <td className="text-right font-mono">{fmtDollarDec(deal.contribMarginPerUnit)}</td>
                      <td className="max-w-[120px]">
                        {isEditing ? (
                          <input className="input input-bordered input-xs w-full" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                        ) : (
                          <span className="text-xs truncate block" title={deal.notes}>{deal.notes || '—'}</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <button className="btn btn-xs btn-success" onClick={() => handleSaveEdit(deal.id)}>Save</button>
                              <button className="btn btn-xs btn-ghost" onClick={() => setEditingDealId(null)}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-xs btn-ghost" onClick={() => handleStartEdit(deal)}>Edit</button>
                              <button className="btn btn-xs btn-ghost text-error" onClick={() => handleDeleteDeal(deal.id)}>Del</button>
                            </>
                          )}
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

      {/* ── 7. Pipeline Velocity Chart ── */}
      {gapAnalysis.length > 0 && deals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60">Pipeline Velocity Chart</h3>
            <div className="flex gap-1">
              <button className={`btn btn-xs ${chartMode === 'doors' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setChartMode('doors')}>Doors</button>
              <button className={`btn btn-xs ${chartMode === 'revenue' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setChartMode('revenue')}>Revenue</button>
            </div>
          </div>
          <div className="bg-base-100 border border-base-300 rounded-lg p-4">
            {renderVelocityChart()}
            <div className="flex items-center gap-4 mt-3 text-xs text-base-content/60">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS.live }} /> Live</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS.committed }} /> Committed</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS.negotiating }} /> Negotiating</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: STATUS_COLORS.prospect }} /> Prospect</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-red-400 border-dashed" /> Target</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. The GO-GET ── */}
      <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-800 mb-3">🎯 The GO-GET</h3>
        <div className="space-y-2">
          {goGetText.map((line, i) => (
            <p key={i} className="text-sm text-purple-900/80">{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
