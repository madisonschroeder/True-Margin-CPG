import React from 'react';
import { CogsFreightState, SupplyChainNode } from '../types';
import { computeNodeOutputs } from '../utils/calculations';
import { fmtCurrency } from '../utils/formatters';
import { InputRow, OutputRow, SectionHeader } from './InputRow';

interface CogsBuilderProps {
  state: CogsFreightState;
  onChange: (state: CogsFreightState) => void;
}

export const CogsBuilder: React.FC<CogsBuilderProps> = ({ state, onChange }) => {
  const updateNode = (idx: number, field: keyof SupplyChainNode, value: number | string) => {
    const newNodes = [...state.nodes] as [SupplyChainNode, SupplyChainNode, SupplyChainNode];
    newNodes[idx] = { ...newNodes[idx], [field]: value };
    onChange({ nodes: newNodes });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {state.nodes.map((node, idx) => {
          const out = computeNodeOutputs(node);
          return (
            <div key={idx} className="card bg-base-200">
              <div className="card-body p-4">
                <h3 className="font-bold text-base text-primary">{node.label}</h3>

                <SectionHeader title="BILL OF MATERIALS" subtitle="INPUTS" />
                <InputRow
                  label="Raw Ingredients ($/unit)"
                  value={node.rawIngredients}
                  onChange={(v) => updateNode(idx, 'rawIngredients', v)}
                  type="currency"
                  highlight
                />
                <InputRow
                  label="Primary Packaging"
                  value={node.primaryPackaging}
                  onChange={(v) => updateNode(idx, 'primaryPackaging', v)}
                  type="currency"
                  highlight
                />
                <InputRow
                  label="Secondary Packaging"
                  value={node.secondaryPackaging}
                  onChange={(v) => updateNode(idx, 'secondaryPackaging', v)}
                  type="currency"
                  highlight
                />
                <InputRow
                  label="Plant Overhead ($/unit)"
                  value={node.plantOverhead}
                  onChange={(v) => updateNode(idx, 'plantOverhead', v)}
                  type="currency"
                  highlight
                />
                <InputRow
                  label="Global Overhead ($/unit)"
                  value={node.globalOverhead}
                  onChange={(v) => updateNode(idx, 'globalOverhead', v)}
                  type="currency"
                  highlight
                />
                <InputRow
                  label="Inbound Freight to 3PL"
                  value={node.inboundFreight}
                  onChange={(v) => updateNode(idx, 'inboundFreight', v)}
                  type="currency"
                  highlight
                />
                <OutputRow label="TOTAL MFG COGS" value={fmtCurrency(out.totalMfgCogs)} accent bold />

                <SectionHeader title="PALLET MATH & SPECS" subtitle="INPUTS" />
                <InputRow
                  label="Units per Case"
                  value={node.unitsPerCase}
                  onChange={(v) => updateNode(idx, 'unitsPerCase', v)}
                  highlight
                />
                <InputRow
                  label="Cases per Pallet"
                  value={node.casesPerPallet}
                  onChange={(v) => updateNode(idx, 'casesPerPallet', v)}
                  highlight
                />
                <OutputRow label="Total Units / Pallet" value={out.totalUnitsPerPallet.toLocaleString()} />

                <SectionHeader title="OUTBOUND FREIGHT & 3PL" subtitle="INPUTS" />
                <InputRow
                  label="3PL Pick & Pack ($/case)"
                  value={node.pickPackFeePerCase}
                  onChange={(v) => updateNode(idx, 'pickPackFeePerCase', v)}
                  type="currency"
                  highlight
                />
                <InputRow
                  label="Est. LTL Freight ($/pallet)"
                  value={node.ltlFreightPerPallet}
                  onChange={(v) => updateNode(idx, 'ltlFreightPerPallet', v)}
                  type="currency"
                  highlight
                />
                <OutputRow label="3PL Cost / Unit" value={fmtCurrency(out.threePLCostPerUnit)} />
                <OutputRow label="Freight Cost / Unit" value={fmtCurrency(out.freightCostPerUnit)} />
                <OutputRow label="Total Outbound / Unit" value={fmtCurrency(out.totalOutboundPerUnit)} />

                <SectionHeader title="THE BOTTOM LINE" subtitle="OUTPUTS" />
                <OutputRow label="TRUE LANDED COGS" value={fmtCurrency(out.trueLandedCogs)} accent bold />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
