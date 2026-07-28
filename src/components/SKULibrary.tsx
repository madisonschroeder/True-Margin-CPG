import React from 'react';
import { SKULibraryState, SKU } from '../types';
import { InputRow, OutputRow, SectionHeader } from './InputRow';
import { fmtCurrency, fmtPct } from '../utils/formatters';
import { Plus, Trash2 } from 'lucide-react';
import { resolveGlobalOverheadPct } from '../utils/calculations';

interface SKULibraryProps {
  state: SKULibraryState;
  onChange: (state: SKULibraryState) => void;
  companyOHPerUnit?: number;  // auto-computed from Company Overhead tab
}

export const SKULibrary: React.FC<SKULibraryProps> = ({ state, onChange, companyOHPerUnit = 0 }) => {
  const goPct = resolveGlobalOverheadPct(state);

  const setGlobalOverheadPct = (pct: number) => {
    onChange({ ...state, globalOverheadPct: pct, globalOverheadEnabled: undefined });
  };

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
      plantOverhead: 0,
      globalOverhead: 0,
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

  const effectiveOH = companyOHPerUnit * goPct;

  // Simple average COGS (volume mix is now per-channel)
  const avgCogs = state.skus.length > 0
    ? state.skus.reduce((s, sku) => {
        const plantCogs = sku.rawIngredients + sku.primaryPackaging + sku.secondaryPackaging + (sku.plantOverhead || 0) + sku.inboundFreight;
        return s + plantCogs + effectiveOH;
      }, 0) / state.skus.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Company OH Allocation + Slider */}
      <div className="px-2 py-3 bg-base-200 rounded-lg space-y-3">
        {companyOHPerUnit > 0 ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm">Company OH / Unit</span>
              <span className="text-xs text-base-content/50 ml-2">(from Company Overhead tab)</span>
            </div>
            <span className="font-bold text-primary text-lg">{fmtCurrency(companyOHPerUnit)}</span>
          </div>
        ) : (
          <div className="alert alert-warning text-sm py-2">
            ⚠️ Set <strong>Target Annual Volume</strong> on the Company Overhead tab to auto-compute per-unit overhead allocation.
          </div>
        )}

        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm text-base-content/70">OH Inclusion in COGS</span>
            <span className={`text-sm font-bold ${goPct >= 1 ? 'text-success' : goPct > 0 ? 'text-warning' : 'text-base-content/50'}`}>
              {(goPct * 100).toFixed(0)}%
            </span>
            {goPct < 1 && companyOHPerUnit > 0 && (
              <span className="text-xs text-base-content/40">({fmtCurrency(effectiveOH)}/unit loaded)</span>
            )}
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(goPct * 100)}
            onChange={(e) => setGlobalOverheadPct(parseInt(e.target.value) / 100)}
            className="range range-primary range-sm w-full"
          />
          <div className="flex justify-between text-[10px] text-base-content/40 mt-1">
            <span>0% — Plant Only</span>
            <span>50%</span>
            <span>100% — Fully Loaded</span>
          </div>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="alert alert-info">
        <div>
          <p className="font-bold">Portfolio Summary — {state.skus.length} SKU(s)</p>
          <div className="grid grid-cols-3 gap-2 mt-1 text-sm">
            <div>
              <span className="text-xs text-base-content/50">Avg Plant COGS</span>
              <p className="font-mono font-bold">{fmtCurrency(avgCogs - effectiveOH)}</p>
            </div>
            <div>
              <span className="text-xs text-base-content/50">+ Company OH</span>
              <p className="font-mono font-bold">{fmtCurrency(effectiveOH)}</p>
            </div>
            <div>
              <span className="text-xs text-base-content/50">= Loaded COGS</span>
              <p className="font-mono font-bold text-primary">{fmtCurrency(avgCogs)}</p>
            </div>
          </div>
          <p className="text-xs text-base-content/60 mt-1">Volume mix is configured per channel in each Channel tab</p>
        </div>
      </div>

      {/* SKU Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {state.skus.map((sku, idx) => {
          const plantCogs = sku.rawIngredients + sku.primaryPackaging + sku.secondaryPackaging + (sku.plantOverhead || 0) + sku.inboundFreight;
          const fullyLoadedCogs = plantCogs + effectiveOH;

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
                <SectionHeader title="BILL OF MATERIALS" subtitle="PLANT COSTS" />
                <InputRow label="Raw Ingredients ($/unit)" value={sku.rawIngredients} onChange={(v) => updateSKU(idx, 'rawIngredients', v)} type="currency" highlight />
                <InputRow label="Primary Packaging ($/unit)" value={sku.primaryPackaging} onChange={(v) => updateSKU(idx, 'primaryPackaging', v)} type="currency" highlight />
                <InputRow label="Secondary Packaging ($/unit)" value={sku.secondaryPackaging} onChange={(v) => updateSKU(idx, 'secondaryPackaging', v)} type="currency" highlight />
                <InputRow label="Plant Overhead ($/unit)" value={sku.plantOverhead} onChange={(v) => updateSKU(idx, 'plantOverhead', v)} type="currency" highlight />
                <InputRow label="Inbound Freight ($/unit)" value={sku.inboundFreight} onChange={(v) => updateSKU(idx, 'inboundFreight', v)} type="currency" highlight />

                {/* Pallet Math */}
                <SectionHeader title="PALLET MATH" subtitle="INPUTS" />
                <InputRow label="Units per Case" value={sku.unitsPerCase} onChange={(v) => updateSKU(idx, 'unitsPerCase', v)} highlight />
                <InputRow label="Cases per Pallet" value={sku.casesPerPallet} onChange={(v) => updateSKU(idx, 'casesPerPallet', v)} highlight />

                {/* Computed Outputs — Stacked COGS */}
                <SectionHeader title="UNIT ECONOMICS" subtitle="STACKED VIEW" />
                <OutputRow label="Plant COGS / Unit" value={fmtCurrency(plantCogs)} />
                {effectiveOH > 0 && (
                  <OutputRow label={`+ Company OH (${(goPct * 100).toFixed(0)}%)`} value={fmtCurrency(effectiveOH)} />
                )}
                <OutputRow label="Fully Loaded COGS / Unit" value={fmtCurrency(fullyLoadedCogs)} accent bold />
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
