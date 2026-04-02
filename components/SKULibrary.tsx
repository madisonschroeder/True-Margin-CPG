import React from 'react';
import { SKULibraryState, SKU } from '../types';
import { InputRow, OutputRow, SectionHeader } from './InputRow';
import { fmtCurrency, fmtPct } from '../utils/formatters';
import { Plus, Trash2 } from 'lucide-react';

interface SKULibraryProps {
  state: SKULibraryState;
  onChange: (state: SKULibraryState) => void;
}

export const SKULibrary: React.FC<SKULibraryProps> = ({ state, onChange }) => {
  const updateSKU = (idx: number, key: keyof SKU, value: string | number) => {
    const updated = { ...state, skus: state.skus.map((s, i) => i === idx ? { ...s, [key]: value } : s) };
    onChange(updated);
  };

  const addSKU = () => {
    const newSku: SKU = {
      id: `sku-${Date.now()}`,
      name: 'New SKU',
      rawIngredients: 0,
      primaryPackaging: 0,
      secondaryPackaging: 0,
      tollProcessing: 0,
      inboundFreight: 0,
      unitsPerCase: 12,
      casesPerPallet: 42,
      volumeMixPct: 0,
    };
    onChange({ ...state, skus: [...state.skus, newSku] });
  };

  const removeSKU = (idx: number) => {
    onChange({ ...state, skus: state.skus.filter((_, i) => i !== idx) });
  };

  // Compute portfolio summary
  const totalMix = state.skus.reduce((s, sku) => s + sku.volumeMixPct, 0);
  const norm = totalMix > 0 ? totalMix : 1;

  const weightedAvgCogs = state.skus.reduce((s, sku) => {
    const mfgCogs = sku.rawIngredients + sku.primaryPackaging + sku.secondaryPackaging + sku.tollProcessing + sku.inboundFreight;
    return s + (sku.volumeMixPct / norm) * mfgCogs;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <div className="alert alert-info">
        <div>
          <p className="font-bold">Portfolio Summary</p>
          <p>Volume-Weighted Avg COGS: {fmtCurrency(weightedAvgCogs)}</p>
          <p>{state.skus.length} SKU(s) • Mix total: {(totalMix * 100).toFixed(0)}%</p>
          {Math.abs(totalMix - 1) > 0.01 && <p className="text-warning">⚠️ Volume mix should sum to 100%</p>}
        </div>
      </div>

      {/* SKU Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {state.skus.map((sku, idx) => {
          const mfgCogs = sku.rawIngredients + sku.primaryPackaging + sku.secondaryPackaging + sku.tollProcessing + sku.inboundFreight;

          return (
            <div key={sku.id} className="card bg-base-200">
              <div className="card-body p-4">
                {/* Header with name and remove */}
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full font-bold text-primary"
                    value={sku.name}
                    onChange={(e) => updateSKU(idx, 'name', e.target.value)}
                  />
                  {state.skus.length > 1 && (
                    <button className="btn btn-ghost btn-xs text-error" onClick={() => removeSKU(idx)}>
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>

                {/* BOM Inputs */}
                <SectionHeader title="BILL OF MATERIALS" subtitle="INPUTS" />
                <InputRow label="Raw Ingredients ($/unit)" value={sku.rawIngredients} onChange={(v) => updateSKU(idx, 'rawIngredients', v)} type="currency" highlight />
                <InputRow label="Primary Packaging ($/unit)" value={sku.primaryPackaging} onChange={(v) => updateSKU(idx, 'primaryPackaging', v)} type="currency" highlight />
                <InputRow label="Secondary Packaging ($/unit)" value={sku.secondaryPackaging} onChange={(v) => updateSKU(idx, 'secondaryPackaging', v)} type="currency" highlight />
                <InputRow label="Toll Processing ($/unit)" value={sku.tollProcessing} onChange={(v) => updateSKU(idx, 'tollProcessing', v)} type="currency" highlight />
                <InputRow label="Inbound Freight ($/unit)" value={sku.inboundFreight} onChange={(v) => updateSKU(idx, 'inboundFreight', v)} type="currency" highlight />

                {/* Pallet Math */}
                <SectionHeader title="PALLET MATH" subtitle="INPUTS" />
                <InputRow label="Units per Case" value={sku.unitsPerCase} onChange={(v) => updateSKU(idx, 'unitsPerCase', v)} highlight />
                <InputRow label="Cases per Pallet" value={sku.casesPerPallet} onChange={(v) => updateSKU(idx, 'casesPerPallet', v)} highlight />

                {/* Volume Mix */}
                <SectionHeader title="VOLUME MIX" subtitle="INPUT" />
                <InputRow label="Volume Mix %" value={sku.volumeMixPct} onChange={(v) => updateSKU(idx, 'volumeMixPct', v)} type="percent" highlight />

                {/* Computed Outputs */}
                <SectionHeader title="COMPUTED" subtitle="OUTPUTS" />
                <OutputRow label="Total MFG COGS / Unit" value={fmtCurrency(mfgCogs)} accent bold />
                <OutputRow label="Units per Pallet" value={(sku.unitsPerCase * sku.casesPerPallet).toLocaleString()} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add SKU Button */}
      <div className="flex justify-center">
        <button className="btn btn-primary btn-sm gap-2" onClick={addSKU}>
          <Plus size={16} /> Add SKU
        </button>
      </div>
    </div>
  );
};
