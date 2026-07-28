import React from 'react';
import { LogisticsState, LogisticsNode, SKULibraryState } from '../types';
import { InputRow, SectionHeader } from './InputRow';
import { fmtCurrency } from '../utils/formatters';

interface LogisticsBuilderProps {
  state: LogisticsState;
  skuLibrary: SKULibraryState;
  onChange: (state: LogisticsState) => void;
}

export const LogisticsBuilder: React.FC<LogisticsBuilderProps> = ({ state, skuLibrary, onChange }) => {
  const updateNode = (idx: number, key: 'pickPackFeePerCase' | 'ltlFreightPerPallet', value: number) => {
    const newNodes = [...state.nodes];
    newNodes[idx] = { ...newNodes[idx], [key]: value };
    onChange({ ...state, nodes: newNodes });
  };

  const updateNodeLabel = (idx: number, label: string) => {
    const newNodes = [...state.nodes];
    newNodes[idx] = { ...newNodes[idx], label };
    onChange({ ...state, nodes: newNodes });
  };

  const addNode = () => {
    const newNode: LogisticsNode = {
      label: `Node ${state.nodes.length + 1}`,
      pickPackFeePerCase: 0,
      ltlFreightPerPallet: 0,
    };
    onChange({ ...state, nodes: [...state.nodes, newNode] });
  };

  const removeNode = (idx: number) => {
    const newNodes = state.nodes.filter((_, i) => i !== idx);
    onChange({ ...state, nodes: newNodes });
  };

  // Compute avg units per pallet from SKU library (simple average — per-channel mix used in channel calcs)
  const weightedUnitsPerPallet = (() => {
    if (skuLibrary.skus.length === 0) return 504;
    const total = skuLibrary.skus.reduce((s, sku) => s + sku.unitsPerCase * sku.casesPerPallet, 0);
    return Math.round(total / skuLibrary.skus.length) || 504;
  })();

  const warehousingCostPerUnit = weightedUnitsPerPallet > 0
    ? (state.storagePerPalletPerMonth * state.avgMonthsOnHand) / weightedUnitsPerPallet
    : 0;

  return (
    <div className="space-y-4">
      {/* Freight Nodes */}
      <div className={`grid grid-cols-1 ${state.nodes.length === 2 ? 'lg:grid-cols-2' : state.nodes.length >= 3 ? 'lg:grid-cols-3' : ''} gap-4`}>
        {state.nodes.map((node, idx) => (
          <div key={idx} className="card bg-base-200">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  className="input input-sm input-bordered font-bold text-primary text-lg flex-1 bg-transparent"
                  value={node.label}
                  onChange={(e) => updateNodeLabel(idx, e.target.value)}
                />
                {state.nodes.length > 1 && (
                  <button
                    className="btn btn-ghost btn-xs btn-circle text-error"
                    onClick={() => removeNode(idx)}
                    title="Remove node"
                  >
                    ✕
                  </button>
                )}
              </div>

              <SectionHeader title="3PL & FREIGHT RATES" subtitle="INPUTS" />
              <InputRow
                label="3PL Pick & Pack ($/case)"
                value={node.pickPackFeePerCase}
                onChange={(v) => updateNode(idx, 'pickPackFeePerCase', v)}
                type="currency"
                highlight
              />
              <InputRow
                label="Est. Freight ($/pallet)"
                value={node.ltlFreightPerPallet}
                onChange={(v) => updateNode(idx, 'ltlFreightPerPallet', v)}
                type="currency"
                highlight
              />

              <SectionHeader title="PER-SKU UNIT ECONOMICS" subtitle="OUTPUTS" />
              {skuLibrary.skus.map((sku) => {
                const unitsPerPallet = sku.unitsPerCase * sku.casesPerPallet;
                const threePLCost = sku.unitsPerCase > 0 ? node.pickPackFeePerCase / sku.unitsPerCase : 0;
                const freightCost = unitsPerPallet > 0 ? node.ltlFreightPerPallet / unitsPerPallet : 0;
                const totalOutbound = threePLCost + freightCost;

                return (
                  <div key={sku.id} className="mt-2 px-3 py-2 bg-base-300/50 rounded">
                    <p className="text-sm font-semibold text-base-content/90 mb-1">{sku.name}</p>
                    <div className="flex justify-between text-xs text-base-content/70">
                      <span>3PL Cost/Unit</span>
                      <span className="font-mono">{fmtCurrency(threePLCost)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-base-content/70">
                      <span>Freight Cost/Unit</span>
                      <span className="font-mono">{fmtCurrency(freightCost)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-primary">
                      <span>Total Outbound/Unit</span>
                      <span className="font-mono">{fmtCurrency(totalOutbound)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-outline btn-sm btn-primary" onClick={addNode}>
        + Add Node
      </button>

      {/* Company-Level Warehousing */}
      <div className="card bg-base-200 mt-4">
        <div className="card-body p-4">
          <SectionHeader title="WAREHOUSING / STORAGE" subtitle="COMPANY-LEVEL INPUTS" />
          <InputRow
            label="Storage Cost ($/pallet/month)"
            value={state.storagePerPalletPerMonth}
            onChange={(v) => onChange({ ...state, storagePerPalletPerMonth: v })}
            type="currency"
            highlight
          />
          <InputRow
            label="Avg Months of Inventory on Hand"
            value={state.avgMonthsOnHand}
            onChange={(v) => onChange({ ...state, avgMonthsOnHand: v })}
            type="number"
            highlight
          />

          <SectionHeader title="WAREHOUSING UNIT ECONOMICS" subtitle="OUTPUTS" />
          <div className="flex justify-between text-sm px-3 py-1 text-base-content/70">
            <span>Wtd Avg Units/Pallet (from SKU Library)</span>
            <span className="font-mono">{weightedUnitsPerPallet.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm px-3 py-1 font-semibold text-primary">
            <span>Warehousing Cost/Unit</span>
            <span className="font-mono">{fmtCurrency(warehousingCostPerUnit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
