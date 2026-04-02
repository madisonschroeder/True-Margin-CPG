import React, { useMemo } from 'react';
import { BlendedFinancials, ChannelRealization, CircuitBreakerThresholds, CircuitBreakerStatus, ChannelInputs, CogsFreightState, GlobalOverhead, LogisticsState, SKULibraryState } from '../types';
import { computeProForma, evaluateCircuitBreakers } from '../utils/calculations';
import { fmtCurrency, fmtPct, fmtNumber } from '../utils/formatters';
import { InputRow, OutputRow, SectionHeader } from './InputRow';

interface ProFormaTabProps {
  channelInputs: Record<string, ChannelInputs>;
  cogsState: CogsFreightState;
  globalOverhead: GlobalOverhead;
  dashboardMix: Record<string, number>;
  targetRev: number;
  channelRealization: ChannelRealization;
  onRealizationChange: (id: string, val: number) => void;
  thresholds: CircuitBreakerThresholds;
  onThresholdsChange: (t: CircuitBreakerThresholds) => void;
  blended: BlendedFinancials;
  channelCogsMap?: Record<string, CogsFreightState>;
  logistics?: LogisticsState;
  skuLibrary?: SKULibraryState;
}

const channelLabels: Record<string, string> = {
  kehe: "NAT'L DISTRIBUTION",
  club: 'CLUB',
  dsd: 'DSD',
  online: 'ONLINE D2B',
  altfdsvc: 'ALT FDSVC',
};

const StatusDot: React.FC<{ status: 'green' | 'yellow' | 'red' }> = ({ status }) => {
  const colors = {
    green: 'bg-success',
    yellow: 'bg-warning',
    red: 'bg-error',
  };
  return <span className={`inline-block w-3 h-3 rounded-full ${colors[status]}`} />;
};

export const ProFormaTab: React.FC<ProFormaTabProps> = ({
  channelInputs,
  cogsState,
  globalOverhead,
  dashboardMix,
  targetRev,
  channelRealization,
  onRealizationChange,
  thresholds,
  onThresholdsChange,
  blended,
  channelCogsMap,
  logistics,
  skuLibrary,
}) => {
  const proFormaRows = useMemo(
    () =>
      computeProForma(
        channelInputs,
        cogsState,
        globalOverhead,
        dashboardMix,
        targetRev,
        channelRealization,
        thresholds,
        undefined,
        channelCogsMap,
        logistics,
        skuLibrary,
      ),
    [channelInputs, cogsState, globalOverhead, dashboardMix, targetRev, channelRealization, thresholds, channelCogsMap, logistics, skuLibrary]
  );

  const currentBreakers = useMemo(
    () => evaluateCircuitBreakers(blended, thresholds),
    [blended, thresholds]
  );

  const updateThreshold = (field: keyof CircuitBreakerThresholds, value: number) => {
    onThresholdsChange({ ...thresholds, [field]: value });
  };

  // Find the realization level where things start breaking
  const firstRedRow = proFormaRows.find(r => r.circuitBreakers.some(cb => cb.status === 'red'));
  const firstYellowRow = proFormaRows.find(r => r.circuitBreakers.some(cb => cb.status === 'yellow'));

  return (
    <div className="space-y-6">
      {/* Current Circuit Breaker Status */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <SectionHeader title="CAPACITY CIRCUIT BREAKERS" subtitle="CURRENT STATUS" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {currentBreakers.map((cb) => (
              <div
                key={cb.id}
                className={`rounded-lg p-3 border-2 ${
                  cb.status === 'red'
                    ? 'border-error bg-error/10'
                    : cb.status === 'yellow'
                    ? 'border-warning bg-warning/10'
                    : 'border-success bg-success/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <StatusDot status={cb.status} />
                  <span className="font-bold text-sm">{cb.label}</span>
                </div>
                <p className="text-xs text-base-content/70">{cb.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column layout: Thresholds + Channel Realization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Circuit Breaker Thresholds */}
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <SectionHeader title="YOUR THRESHOLDS" subtitle="SET YOUR LIMITS" />
            <InputRow
              label="Available Cash / Credit ($)"
              value={thresholds.availableCash}
              onChange={(v) => updateThreshold('availableCash', v)}
              type="currency"
              highlight
            />
            <InputRow
              label="Max Monthly Burn Rate ($)"
              value={thresholds.maxMonthlyBurn}
              onChange={(v) => updateThreshold('maxMonthlyBurn', v)}
              type="currency"
              highlight
            />
            <InputRow
              label="Min Annual EBITDA ($)"
              value={thresholds.minAnnualEbitda}
              onChange={(v) => updateThreshold('minAnnualEbitda', v)}
              type="currency"
              highlight
            />
            <InputRow
              label="Max Debt Capacity ($)"
              value={thresholds.maxDebtCapacity}
              onChange={(v) => updateThreshold('maxDebtCapacity', v)}
              type="currency"
              highlight
            />
            <InputRow
              label="Min Contribution Margin %"
              value={thresholds.minContribMarginPct}
              onChange={(v) => updateThreshold('minContribMarginPct', v)}
              type="percent"
              highlight
            />
          </div>
        </div>

        {/* Channel Realization Sliders */}
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <SectionHeader title="CHANNEL REALIZATION" subtitle="% OF PLANNED VOLUME REALIZED" />
            <p className="text-xs text-base-content/50 mb-2">
              Slide each channel to model what happens if you only capture a fraction of planned revenue in that channel.
            </p>
            {Object.entries(channelLabels).map(([id, label]) => (
              <div key={id} className="flex items-center gap-3 py-1.5 px-3 rounded bg-base-100/50">
                <span className="text-sm font-medium w-40 shrink-0">{label}</span>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={(channelRealization[id] ?? 1) * 100}
                  onChange={(e) => onRealizationChange(id, parseFloat(e.target.value) / 100)}
                  className={`range range-sm flex-1 ${
                    (channelRealization[id] ?? 1) < 0.5 ? 'range-error' :
                    (channelRealization[id] ?? 1) < 0.75 ? 'range-warning' : 'range-success'
                  }`}
                />
                <span className="font-mono text-sm font-bold w-14 text-right">
                  {((channelRealization[id] ?? 1) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {firstRedRow && (
              <div className="alert alert-error mt-3 text-sm">
                🔴 Structure breaks at {(firstRedRow.realizationPct * 100).toFixed(0)}% realization — circuit breakers tripped.
              </div>
            )}
            {!firstRedRow && firstYellowRow && (
              <div className="alert alert-warning mt-3 text-sm">
                🟡 Caution zone begins at {(firstYellowRow.realizationPct * 100).toFixed(0)}% realization.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ProForma Structural Capacity Table */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <SectionHeader title="STRUCTURAL CAPACITY ANALYSIS" subtitle="CAN YOUR COMPANY HANDLE THIS VOLUME?" />
          <p className="text-xs text-base-content/50 mb-3">
            Each row shows the company's financial reality at a different % of your target revenue ({fmtCurrency(targetRev, 0)}).
            Circuit breakers light up when structural limits are hit.
          </p>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="bg-base-300">
                  <th className="text-xs">REALIZATION</th>
                  <th className="text-xs text-right">GROSS REV</th>
                  <th className="text-xs text-right">NET REV</th>
                  <th className="text-xs text-right">TOTAL COGS</th>
                  <th className="text-xs text-right">CONTRIBUTION</th>
                  <th className="text-xs text-right">OVERHEAD</th>
                  <th className="text-xs text-right">EBITDA</th>
                  <th className="text-xs text-right">WORKING CAP</th>
                  <th className="text-xs text-right">CASH FLOAT</th>
                  <th className="text-xs text-center">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {proFormaRows.map((row) => {
                  const hasRed = row.circuitBreakers.some(cb => cb.status === 'red');
                  const hasYellow = row.circuitBreakers.some(cb => cb.status === 'yellow');
                  const rowBg = hasRed ? 'bg-error/5' : hasYellow ? 'bg-warning/5' : '';
                  return (
                    <tr key={row.realizationPct} className={`hover ${rowBg}`}>
                      <td className="font-bold text-sm">{(row.realizationPct * 100).toFixed(0)}%</td>
                      <td className="text-right font-mono text-sm">{fmtCurrency(row.grossRevenue, 0)}</td>
                      <td className="text-right font-mono text-sm">{fmtCurrency(row.netRevenue, 0)}</td>
                      <td className="text-right font-mono text-sm">{fmtCurrency(row.totalCogs, 0)}</td>
                      <td className="text-right font-mono text-sm">{fmtCurrency(row.contributionMargin, 0)}</td>
                      <td className="text-right font-mono text-sm">{fmtCurrency(row.overhead, 0)}</td>
                      <td className={`text-right font-mono text-sm font-bold ${row.ebitda < 0 ? 'text-error' : 'text-success'}`}>
                        {fmtCurrency(row.ebitda, 0)}
                      </td>
                      <td className="text-right font-mono text-sm">{fmtCurrency(row.workingCapitalNeeded, 0)}</td>
                      <td className="text-right font-mono text-sm">{fmtCurrency(row.totalCashFloat, 0)}</td>
                      <td className="text-center">
                        <div className="flex justify-center gap-1">
                          {row.circuitBreakers.map((cb) => (
                            <div key={cb.id} className="tooltip tooltip-top" data-tip={`${cb.label}: ${cb.message}`}>
                              <StatusDot status={cb.status} />
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Circuit Breaker Detail at current realization */}
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <SectionHeader title="CIRCUIT BREAKER DETAIL" subtitle="CURRENT MODEL STATE" />
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="bg-base-300">
                  <th className="text-xs">BREAKER</th>
                  <th className="text-xs text-center">STATUS</th>
                  <th className="text-xs text-right">CURRENT VALUE</th>
                  <th className="text-xs text-right">YOUR THRESHOLD</th>
                  <th className="text-xs">DIAGNOSIS</th>
                </tr>
              </thead>
              <tbody>
                {currentBreakers.map((cb) => (
                  <tr key={cb.id} className="hover">
                    <td className="font-semibold text-sm">{cb.label}</td>
                    <td className="text-center"><StatusDot status={cb.status} /></td>
                    <td className="text-right font-mono text-sm">
                      {typeof cb.currentValue === 'number' 
                        ? cb.id === 'contrib_margin' ? fmtPct(cb.currentValue as number) : fmtCurrency(cb.currentValue as number, 0)
                        : cb.currentValue}
                    </td>
                    <td className="text-right font-mono text-sm">
                      {typeof cb.threshold === 'number'
                        ? cb.id === 'contrib_margin' ? fmtPct(cb.threshold as number) : fmtCurrency(cb.threshold as number, 0)
                        : cb.threshold}
                    </td>
                    <td className="text-sm text-base-content/70">{cb.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
