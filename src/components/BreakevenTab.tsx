import React from 'react';
import { BlendedFinancials, BreakevenInputs } from '../types';
import { computeBreakeven } from '../utils/calculations';
import { fmtCurrency, fmtNumber } from '../utils/formatters';
import { InputRow, OutputRow, SectionHeader } from './InputRow';
import { NumericCell } from './NumericCell';

interface Props {
  blended: BlendedFinancials;
  inputs: BreakevenInputs;
  onChange: (inputs: BreakevenInputs) => void;
}

export const BreakevenTab: React.FC<Props> = ({ blended, inputs, onChange }) => {
  const out = computeBreakeven(blended, inputs);

  const updateScenario = (index: number, field: 'label' | 'targetEbitda', value: string | number) => {
    const updated = [...inputs.scenarios];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...inputs, scenarios: updated });
  };

  const addScenario = () => {
    onChange({
      ...inputs,
      scenarios: [...inputs.scenarios, { label: `Scenario ${inputs.scenarios.length + 1}`, targetEbitda: 0 }],
    });
  };

  const removeScenario = (index: number) => {
    onChange({ ...inputs, scenarios: inputs.scenarios.filter((_, i) => i !== index) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="alert alert-info text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>All calculations use the <strong>blended channel mix</strong> from the Executive Dashboard. Adjust channel weights there to see how breakeven changes across different go-to-market strategies.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Key Inputs & Breakeven */}
        <div className="space-y-1">
          <SectionHeader title="BLENDED UNIT ECONOMICS" subtitle="FROM DASHBOARD" />
          <OutputRow label="Blended Net Rev / Unit" value={fmtCurrency(blended.blendedNetRev)} />
          <OutputRow label="Blended Contribution Margin / Unit" value={fmtCurrency(blended.blendedContribMargin)} />
          <OutputRow label="Marketing $ / Unit" value={fmtCurrency(blended.marketingPerUnit)} />
          <OutputRow label="Adjusted Contribution / Unit" value={fmtCurrency(out.adjustedContribPerUnit)} accent bold />
          <OutputRow label="Total Fixed Overhead (Annual)" value={fmtCurrency(out.totalFixedCosts)} />

          <SectionHeader title="BREAKEVEN ANALYSIS" subtitle="EBITDA = $0" />
          <OutputRow label="Breakeven Units (Annual)" value={fmtNumber(out.breakevenUnits)} accent bold />
          <OutputRow label="Breakeven Revenue" value={fmtCurrency(typeof out.breakevenRevenue === 'number' ? out.breakevenRevenue : 0)} />
          <OutputRow label="Breakeven Pallets" value={fmtNumber(out.breakevenPallets, 1)} />
          <OutputRow label="Breakeven 40ft Containers" value={fmtNumber(out.breakevenContainers, 1)} />

          <SectionHeader title="YOUR TARGET EBITDA" subtitle="INPUT" />
          <InputRow
            label="Target Annual EBITDA $"
            value={inputs.targetEbitdaDollars}
            onChange={(v) => onChange({ ...inputs, targetEbitdaDollars: v })}
            type="currency"
            highlight
          />
          <OutputRow label="Required Units (Annual)" value={fmtNumber(out.targetUnits)} accent bold />
          <OutputRow label="Required Net Revenue" value={fmtCurrency(typeof out.targetRevenue === 'number' ? out.targetRevenue : 0)} />
          <OutputRow label="Required Pallets" value={fmtNumber(out.targetPallets, 1)} />
          <OutputRow label="Required 40ft Containers" value={fmtNumber(out.targetContainers, 1)} />
        </div>

        {/* Right: Scenario Modeler */}
        <div className="space-y-1">
          <SectionHeader title="SCENARIO MODELER" subtitle="WHAT-IF ANALYSIS" />
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
                {out.scenarios.map((s, i) => (
                  <tr key={i} className="hover">
                    <td>
                      <input
                        type="text"
                        value={inputs.scenarios[i].label}
                        onChange={(e) => updateScenario(i, 'label', e.target.value)}
                        className="input input-bordered input-xs w-28 font-mono"
                      />
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-base-content/50">$</span>
                        <NumericCell
                          value={inputs.scenarios[i].targetEbitda}
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
  );
};
