import React, { useMemo } from 'react';
import { BlendedFinancials, ChannelOutputs } from '../types';
import { SectionHeader } from './InputRow';

interface WaterfallChartProps {
  blended: BlendedFinancials;
  channelOutputs: { id: string; name: string; outputs: ChannelOutputs }[];
  dashboardMix: Record<string, number>;
}

interface WaterfallStep {
  label: string;
  value: number;
  type: 'total' | 'deduction' | 'subtotal' | 'highlight' | 'final-green' | 'cogs';
}

const fmt = (v: number) => `$${v.toFixed(2)}`;

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  blended,
  channelOutputs,
  dashboardMix,
}) => {
  const steps = useMemo<WaterfallStep[]>(() => {
    // Compute blended per-unit values
    let msrp = 0;
    let retailerMargin = 0;
    let priceToRetailer = 0;
    let distMargin = 0;
    let priceToDistrib = 0;
    let earlyPay = 0;
    let broker = 0;
    let spoilage = 0;
    let tradeSpend = 0;
    let slotting = 0;
    let freight = 0;

    for (const ch of channelOutputs) {
      const mix = (dashboardMix[ch.id] ?? 0) / 100;
      msrp += ch.outputs.msrp * mix;
      retailerMargin += ch.outputs.retailerMarginDollar * mix;
      priceToRetailer += ch.outputs.priceToRetailer * mix;
      distMargin += ch.outputs.distMarginDollar * mix;
      priceToDistrib += ch.outputs.priceToDistrib * mix;
      earlyPay += ch.outputs.earlyPayDollar * mix;
      broker += ch.outputs.brokerCommDollar * mix;
      spoilage += ch.outputs.spoilageDollar * mix;
      tradeSpend += ch.outputs.tradeSpendDollar * mix;
      slotting += ch.outputs.slottingCostPerUnit * mix;
      freight += ch.outputs.freightOutDollar * mix;
    }

    const netRevenue =
      priceToDistrib - (earlyPay + broker + spoilage + tradeSpend + slotting + freight);
    const cogs = blended.blendedCogs;
    const contributionMargin = netRevenue - cogs;

    return [
      { label: 'MSRP', value: msrp, type: 'total' },
      { label: 'Retailer Margin', value: -retailerMargin, type: 'deduction' },
      { label: 'Price to Retailer', value: priceToRetailer, type: 'subtotal' },
      { label: 'Dist. Margin', value: -distMargin, type: 'deduction' },
      { label: 'Price to Distrib.', value: priceToDistrib, type: 'highlight' },
      { label: 'Early Pay Disc.', value: -earlyPay, type: 'deduction' },
      { label: 'Broker Comm.', value: -broker, type: 'deduction' },
      { label: 'Spoilage', value: -spoilage, type: 'deduction' },
      { label: 'Trade Spend', value: -tradeSpend, type: 'deduction' },
      { label: 'Slotting', value: -slotting, type: 'deduction' },
      { label: 'Freight Out', value: -freight, type: 'deduction' },
      { label: 'Net Revenue', value: netRevenue, type: 'final-green' },
      { label: 'COGS', value: -cogs, type: 'cogs' },
      { label: 'Contribution Margin', value: contributionMargin, type: 'final-green' },
    ];
  }, [channelOutputs, dashboardMix, blended]);

  // Layout constants
  const margin = { top: 30, right: 20, bottom: 100, left: 60 };
  const barWidth = 44;
  const barGap = 14;
  const chartWidth = margin.left + margin.right + steps.length * (barWidth + barGap);
  const chartHeight = 380;
  const plotH = chartHeight - margin.top - margin.bottom;

  // Compute running totals to position bars
  const bars = useMemo(() => {
    let running = 0;
    return steps.map((s) => {
      let top: number, bottom: number;
      if (s.type === 'total' || s.type === 'subtotal' || s.type === 'highlight' || s.type === 'final-green') {
        // Absolute bar from 0 to value
        top = s.value;
        bottom = 0;
        running = s.value;
      } else {
        // Deduction: hangs from running total
        const prevRunning = running;
        running = prevRunning + s.value; // value is negative
        top = prevRunning;
        bottom = running;
      }
      return { ...s, top, bottom, running };
    });
  }, [steps]);

  // Y-axis domain
  const allValues = bars.flatMap((b) => [b.top, b.bottom]);
  const maxVal = Math.max(...allValues, 0.01);
  const minVal = Math.min(...allValues, 0);
  const padding = (maxVal - minVal) * 0.08;
  const yMax = maxVal + padding;
  const yMin = Math.min(minVal - padding, 0);
  const yRange = yMax - yMin || 1;

  const yScale = (v: number) => margin.top + plotH * (1 - (v - yMin) / yRange);

  // Y-axis ticks
  const tickCount = 6;
  const ticks = useMemo(() => {
    const result: number[] = [];
    const step = yRange / tickCount;
    const niceStep = Math.pow(10, Math.floor(Math.log10(step))) * Math.round(step / Math.pow(10, Math.floor(Math.log10(step))));
    const start = Math.ceil(yMin / niceStep) * niceStep;
    for (let v = start; v <= yMax; v += niceStep || 1) {
      result.push(parseFloat(v.toFixed(2)));
    }
    return result;
  }, [yMin, yMax, yRange]);

  const allZero = bars.every((b) => b.top === 0 && b.bottom === 0);

  return (
    <div className="card bg-base-200">
      <div className="card-body p-4">
        <SectionHeader title="GROSS-TO-NET WATERFALL" subtitle="BLENDED PER UNIT" />
        {allZero ? (
          <div className="flex items-center justify-center h-48 text-base-content/50 text-sm">
            Enter channel data to see the Gross-to-Net waterfall
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full"
            style={{ maxHeight: 420 }}
          >
            {/* Y-axis grid lines & labels */}
            {ticks.map((t, i) => (
              <g key={i}>
                <line
                  x1={margin.left}
                  x2={chartWidth - margin.right}
                  y1={yScale(t)}
                  y2={yScale(t)}
                  stroke="#374151"
                  strokeWidth={0.5}
                />
                <text
                  x={margin.left - 6}
                  y={yScale(t)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="#9ca3af"
                  fontSize={9}
                >
                  {fmt(t)}
                </text>
              </g>
            ))}

            {/* Zero line */}
            <line
              x1={margin.left}
              x2={chartWidth - margin.right}
              y1={yScale(0)}
              y2={yScale(0)}
              stroke="#6b7280"
              strokeWidth={1}
            />

            {/* Bars, connectors, labels */}
            {bars.map((b, i) => {
              const x = margin.left + i * (barWidth + barGap) + barGap / 2;
              const yTop = yScale(Math.max(b.top, b.bottom));
              const yBot = yScale(Math.min(b.top, b.bottom));
              const barH = Math.max(yBot - yTop, 1);

              let fill = '#6366f1';
              if (b.type === 'deduction' || b.type === 'cogs') fill = '#ef4444';
              if (b.type === 'final-green') fill = '#22c55e';
              if (b.type === 'highlight') fill = '#8b5cf6';

              // Connector line to next bar
              const nextBar = bars[i + 1];
              let connector = null;
              if (nextBar) {
                const nextX = margin.left + (i + 1) * (barWidth + barGap) + barGap / 2;
                const connY =
                  nextBar.type === 'total' || nextBar.type === 'subtotal' || nextBar.type === 'highlight' || nextBar.type === 'final-green'
                    ? yScale(b.running)
                    : yScale(b.running);
                connector = (
                  <line
                    x1={x + barWidth}
                    x2={nextX}
                    y1={connY}
                    y2={connY}
                    stroke="#6b7280"
                    strokeWidth={0.7}
                    strokeDasharray="3,2"
                  />
                );
              }

              // Value label position
              const absVal = Math.abs(b.value);
              const labelY =
                b.type === 'deduction' || b.type === 'cogs'
                  ? yBot + 12
                  : yTop - 5;

              return (
                <g key={i}>
                  {connector}
                  <rect
                    x={x}
                    y={yTop}
                    width={barWidth}
                    height={barH}
                    rx={2}
                    fill={fill}
                    opacity={0.9}
                  />
                  {/* Value label */}
                  <text
                    x={x + barWidth / 2}
                    y={labelY}
                    textAnchor="middle"
                    fill="#e5e7eb"
                    fontSize={8}
                    fontWeight={600}
                  >
                    {b.type === 'deduction' || b.type === 'cogs'
                      ? `-${fmt(absVal)}`
                      : fmt(b.value)}
                  </text>
                  {/* X-axis label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - margin.bottom + 10}
                    textAnchor="end"
                    fill="#9ca3af"
                    fontSize={8}
                    transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight - margin.bottom + 10})`}
                  >
                    {b.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};
