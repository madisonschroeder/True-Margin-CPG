import React, { useMemo } from 'react';
import { BlendedFinancials, ChannelInputs } from '../types';
import { fmtCurrency } from '../utils/formatters';
import { SectionHeader } from './InputRow';

interface CashTimelineProps {
  blended: BlendedFinancials;
  channelInputs: Record<string, ChannelInputs>;
  dashboardMix: Record<string, number>;
}

const CHANNEL_IDS = ['kehe', 'club', 'dsd', 'online', 'altfdsvc'];

/* ── colour tokens ── */
const COL = {
  inventory: '#6366f1',
  ar: '#f59e0b',
  ap: '#22c55e',
  underwater: '#ef4444',
  text: '#e5e7eb',
  textMuted: '#9ca3af',
  line: '#4b5563',
};

export const CashTimeline: React.FC<CashTimelineProps> = ({
  blended,
  channelInputs,
  dashboardMix,
}) => {
  const {
    blendedARDays,
    blendedAPDays,
    blendedInvDays,
    totalDays,
    underwaterStart,
    underwaterDays,
    hasData,
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
      totalDays: Math.round(total),
      underwaterStart: Math.round(ap),
      underwaterDays: Math.round(inv + ar - ap),
      hasData: total > 0,
    };
  }, [channelInputs, dashboardMix]);

  /* ── empty state ── */
  if (!hasData) {
    return (
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <SectionHeader
            title="CASH CONVERSION TIMELINE"
            subtitle="WHEN DOES YOUR MONEY COME BACK?"
          />
          <p className="text-center text-base-content/50 py-8 text-sm">
            Configure channel inputs to see timeline
          </p>
        </div>
      </div>
    );
  }

  /* ── SVG geometry ── */
  const svgW = 800;
  const svgH = 220;
  const pad = { left: 50, right: 50, top: 30, bottom: 50 };
  const barY = 90;
  const barH = 32;
  const usableW = svgW - pad.left - pad.right;
  const maxDay = totalDays || 1;
  const x = (day: number) => pad.left + (day / maxDay) * usableW;

  /* ── key x-positions ── */
  const xDay0 = x(0);
  const xAP = x(Math.min(blendedAPDays, maxDay));
  const xINV = x(Math.min(blendedInvDays, maxDay));
  const xEnd = x(maxDay);

  /* ── helpers ── */
  const DayMarker = ({
    day,
    label,
    yOff = 0,
  }: {
    day: number;
    label: string;
    yOff?: number;
  }) => {
    const cx = x(Math.min(day, maxDay));
    return (
      <g>
        <line
          x1={cx}
          y1={barY - 6}
          x2={cx}
          y2={barY + barH + 6}
          stroke={COL.line}
          strokeWidth={1}
          strokeDasharray="3,2"
        />
        <circle cx={cx} cy={barY + barH / 2} r={3} fill={COL.text} />
        <text
          x={cx}
          y={barY + barH + 22 + yOff}
          textAnchor="middle"
          fill={COL.text}
          fontSize={11}
          fontWeight={600}
        >
          Day {day}
        </text>
        <text
          x={cx}
          y={barY + barH + 36 + yOff}
          textAnchor="middle"
          fill={COL.textMuted}
          fontSize={9}
        >
          {label}
        </text>
      </g>
    );
  };

  const ZoneBar = ({
    x1,
    x2,
    y,
    h,
    color,
    label,
    labelY,
  }: {
    x1: number;
    x2: number;
    y: number;
    h: number;
    color: string;
    label: string;
    labelY: number;
  }) => {
    const width = Math.max(x2 - x1, 0);
    if (width < 1) return null;
    return (
      <g>
        <rect x={x1} y={y} width={width} height={h} rx={4} fill={color} opacity={0.4} />
        <text
          x={x1 + width / 2}
          y={labelY}
          textAnchor="middle"
          fill={color}
          fontSize={10}
          fontWeight={700}
          letterSpacing={0.5}
        >
          {label}
        </text>
      </g>
    );
  };

  const summaryText = `You pay on Day 0, but don\u2019t get paid until Day ${totalDays} \u2014 that\u2019s ${underwaterDays} days of floating ${fmtCurrency(blended.netWorkingCapital)}`;

  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <SectionHeader
          title="CASH CONVERSION TIMELINE"
          subtitle="WHEN DOES YOUR MONEY COME BACK?"
        />

        {/* ── SVG Timeline ── */}
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          {/* Underwater zone (behind everything) */}
          <rect
            x={xAP}
            y={barY - 18}
            width={Math.max(xEnd - xAP, 0)}
            height={barH + 36}
            rx={6}
            fill={COL.underwater}
            opacity={0.15}
          />
          <text
            x={xAP + Math.max(xEnd - xAP, 0) / 2}
            y={barY - 24 + 4}
            textAnchor="middle"
            fill={COL.underwater}
            fontSize={10}
            fontWeight={700}
            opacity={0.9}
          >
            ⚠ CASH UNDERWATER — {underwaterDays} DAYS
          </text>

          {/* AP grace zone */}
          <ZoneBar
            x1={xDay0}
            x2={xAP}
            y={barY + barH + 2}
            h={8}
            color={COL.ap}
            label={`AP Grace (${blendedAPDays}d)`}
            labelY={barY + barH + 52}
          />

          {/* Inventory zone */}
          <ZoneBar
            x1={xDay0}
            x2={xINV}
            y={barY}
            h={barH / 2}
            color={COL.inventory}
            label={`Inventory (${blendedInvDays}d)`}
            labelY={barY - 6}
          />

          {/* AR zone */}
          <ZoneBar
            x1={xINV}
            x2={xEnd}
            y={barY + barH / 2}
            h={barH / 2}
            color={COL.ar}
            label={`AR Wait (${blendedARDays}d)`}
            labelY={barY - 6}
          />

          {/* Main timeline axis */}
          <line
            x1={xDay0}
            y1={barY + barH / 2}
            x2={xEnd}
            y2={barY + barH / 2}
            stroke={COL.line}
            strokeWidth={2}
          />

          {/* Arrows on axis ends */}
          <polygon
            points={`${xEnd},${barY + barH / 2} ${xEnd - 6},${barY + barH / 2 - 4} ${xEnd - 6},${barY + barH / 2 + 4}`}
            fill={COL.line}
          />

          {/* Day markers */}
          <DayMarker day={0} label="Cash OUT" />
          {blendedAPDays > 0 && blendedAPDays < totalDays && (
            <DayMarker day={blendedAPDays} label="AP Due" />
          )}
          {blendedInvDays > 0 && blendedInvDays < totalDays && (
            <DayMarker day={blendedInvDays} label="Ships / Invoice" yOff={blendedAPDays === blendedInvDays ? 20 : 0} />
          )}
          <DayMarker day={totalDays} label="Cash IN" />

          {/* Cash amounts on bars */}
          {blended.peakInventoryCash > 0 && (
            <text
              x={xDay0 + (xINV - xDay0) / 2}
              y={barY + barH / 4 + 4}
              textAnchor="middle"
              fill={COL.inventory}
              fontSize={10}
              fontWeight={600}
            >
              {fmtCurrency(blended.peakInventoryCash)}
            </text>
          )}
          {blended.accountsReceivable > 0 && (
            <text
              x={xINV + (xEnd - xINV) / 2}
              y={barY + (3 * barH) / 4 + 4}
              textAnchor="middle"
              fill={COL.ar}
              fontSize={10}
              fontWeight={600}
            >
              {fmtCurrency(blended.accountsReceivable)}
            </text>
          )}
          {blended.accountsPayable > 0 && blendedAPDays > 0 && (
            <text
              x={xDay0 + (xAP - xDay0) / 2}
              y={barY + barH + 22}
              textAnchor="middle"
              fill={COL.ap}
              fontSize={10}
              fontWeight={600}
            >
              {fmtCurrency(blended.accountsPayable)}
            </text>
          )}
        </svg>

        {/* ── Summary sentence ── */}
        <p className="text-center text-sm text-base-content/70 mt-2 mb-4 italic">
          {summaryText}
        </p>

        {/* ── Cash Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Peak Inventory Cash"
            value={fmtCurrency(blended.peakInventoryCash)}
            color="text-indigo-400"
            sub="Tied up in inventory"
          />
          <MetricCard
            label="Accounts Receivable"
            value={fmtCurrency(blended.accountsReceivable)}
            color="text-amber-400"
            sub="Waiting to collect"
          />
          <MetricCard
            label="AP Offset"
            value={fmtCurrency(blended.accountsPayable)}
            color="text-green-400"
            sub="Deferred payment"
          />
          <MetricCard
            label="Net Working Capital"
            value={fmtCurrency(blended.netWorkingCapital)}
            color="text-red-400"
            sub="Total cash needed"
          />
        </div>

        {/* ── Runway indicator ── */}
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
      </div>
    </div>
  );
};

/* ── Small metric card ── */
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
