import React from 'react';
import { ChannelInputs, CogsFreightState, SKULibraryState, LogisticsState } from '../types';
import { computeChannelOutputs } from '../utils/calculations';
import { fmtCurrency, fmtPct } from '../utils/formatters';
import { InputRow, OutputRow, SectionHeader } from './InputRow';

interface ChannelTabProps {
  channel: ChannelInputs;
  cogsState: CogsFreightState;
  onChange: (channel: ChannelInputs) => void;
  skuLibrary: SKULibraryState;
  skuToggles: Record<string, boolean>;
  onSKUToggleChange: (skuId: string, enabled: boolean) => void;
  logisticsNodeLabels: string[];
  logistics: LogisticsState;
}

export const ChannelTab: React.FC<ChannelTabProps> = ({ channel, cogsState, onChange, skuLibrary, skuToggles, onSKUToggleChange, logisticsNodeLabels, logistics }) => {
  const out = computeChannelOutputs(channel, cogsState, logistics, skuLibrary);

  const update = (field: keyof ChannelInputs, value: number) => {
    onChange({ ...channel, [field]: value });
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Left Column — Pricing & GtN */}
        <div className="space-y-1">
          <SectionHeader title="TIERED PRICING ARCHITECTURE" />
          <OutputRow label="MSRP" value={fmtCurrency(out.msrp)} />
          <InputRow label="Retailer Margin %" value={channel.retailerMarginPct} onChange={(v) => update('retailerMarginPct', v)} type="percent" highlight />
          <OutputRow label="Retailer Margin $" value={fmtCurrency(out.retailerMarginDollar)} />
          <OutputRow label="Price to Retailer" value={fmtCurrency(out.priceToRetailer)} accent />
          <InputRow label="Dist Margin %" value={channel.distMarginPct} onChange={(v) => update('distMarginPct', v)} type="percent" highlight />
          <OutputRow label="Dist Margin $" value={fmtCurrency(out.distMarginDollar)} />
          <OutputRow label="Price to Distrib." value={fmtCurrency(out.priceToDistrib)} accent />
          <OutputRow label="COGS" value={fmtCurrency(out.blendedCogs)} />
          <OutputRow label="Brand Margin $" value={fmtCurrency(out.brandMarginDollar)} />
          <InputRow label="Product Margin %" value={channel.productMarginPct} onChange={(v) => update('productMarginPct', v)} type="percent" highlight />

          <SectionHeader title="DEDUCTIONS" />
          <InputRow label="Early Pay %" value={channel.earlyPayPct} onChange={(v) => update('earlyPayPct', v)} type="percent" highlight />
          <OutputRow label="Early Pay $" value={fmtCurrency(out.earlyPayDollar)} />
          <InputRow label="Broker Comm %" value={channel.brokerCommPct} onChange={(v) => update('brokerCommPct', v)} type="percent" highlight />
          <OutputRow label="Broker Comm $" value={fmtCurrency(out.brokerCommDollar)} />
          <InputRow label="Spoilage %" value={channel.spoilagePct} onChange={(v) => update('spoilagePct', v)} type="percent" highlight />
          <OutputRow label="Spoilage $" value={fmtCurrency(out.spoilageDollar)} />
          <InputRow label="Other Deductions %" value={channel.otherDeductionsPct} onChange={(v) => update('otherDeductionsPct', v)} type="percent" highlight />
          <OutputRow label="Other Deductions $" value={fmtCurrency(out.otherDeductionsDollar)} />
          <SectionHeader title="TRADE SPEND" />
          <InputRow label="Trade Spend %" value={channel.tradeSpendPct} onChange={(v) => update('tradeSpendPct', v)} type="percent" highlight />
          <OutputRow label="Trade Spend $" value={fmtCurrency(out.tradeSpendDollar)} />
          <InputRow label="Slotting: $/SKU/Store" value={channel.slottingPerSkuPerStore} onChange={(v) => update('slottingPerSkuPerStore', v)} type="currency" highlight />
          <InputRow label="Est. Units/Wk/Store (UPSW)" value={channel.estUnitsPerWeekPerStore} onChange={(v) => update('estUnitsPerWeekPerStore', v)} highlight />
          <OutputRow label="Slotting: Cost / Unit" value={fmtCurrency(out.slottingCostPerUnit)} />

          <OutputRow label="Freight Out $" value={fmtCurrency(out.freightOutDollar)} />
          <div className="divider my-1"></div>
          <OutputRow label="TOTAL DEDUCTIONS" value={fmtCurrency(out.totalDeductions)} bold />
          <OutputRow label="NET REVENUE" value={fmtCurrency(out.netRevenue)} accent bold />
          <OutputRow label="CONTRIBUTION MARGIN $" value={fmtCurrency(out.contributionMarginDollar)} accent bold />
          <OutputRow label="CONTRIBUTION MARGIN %" value={<>{fmtPct(out.contributionMarginPct)}{out.contributionMarginPct < 0.25 ? <span className="badge badge-sm badge-error gap-1 ml-2 text-[10px]">⚠️ Below 25%</span> : out.contributionMarginPct < 0.40 ? <span className="badge badge-sm badge-warning gap-1 ml-2 text-[10px]">✅ CPG Avg</span> : <span className="badge badge-sm badge-success gap-1 ml-2 text-[10px]">🌟 Best-in-Class</span>}</>} accent />
        </div>

        {/* Right Column — SKU Availability, Mixers & Working Capital */}
        <div className="space-y-1">
          <SectionHeader title="SKU AVAILABILITY" subtitle="TOGGLE ON/OFF" />
          <div className="space-y-1">
            {skuLibrary.skus.map((sku) => {
              const enabled = skuToggles[sku.id] !== false; // default true
              return (
                <div key={sku.id} className="flex items-center justify-between px-2 py-1.5 bg-base-200 rounded">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="toggle toggle-sm toggle-primary"
                      checked={enabled}
                      onChange={(e) => onSKUToggleChange(sku.id, e.target.checked)}
                    />
                    <span className={`text-sm font-medium ${!enabled ? 'text-base-content/40 line-through' : ''}`}>
                      {sku.name}
                    </span>
                  </div>
                  <span className="text-xs text-base-content/50">
                    {(sku.volumeMixPct * 100).toFixed(0)}% vol
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-center text-base-content/50 mt-1">
            {skuLibrary.skus.filter(s => skuToggles[s.id] !== false).length} of {skuLibrary.skus.length} SKUs active in this channel
          </div>

          <SectionHeader title="SUPPLY CHAIN MIXER" subtitle="INPUTS" />
          {logisticsNodeLabels.map((label, idx) => (
            <InputRow
              key={idx}
              label={`% Vol from ${label}`}
              value={channel.supplyChainMix[idx] || 0}
              onChange={(v) => {
                const newMix = [...(channel.supplyChainMix || [])];
                while (newMix.length <= idx) newMix.push(0);
                newMix[idx] = v;
                onChange({ ...channel, supplyChainMix: newMix });
              }}
              type="percent"
              highlight
            />
          ))}
          <OutputRow label="Blended COGS $" value={fmtCurrency(out.blendedCogs)} accent />
          <OutputRow label="Blended Freight $" value={fmtCurrency(out.blendedFreight)} />
          <InputRow label="Blended Inventory Days" value={channel.blendedInventoryDays} onChange={(v) => update('blendedInventoryDays', v)} highlight />

          <SectionHeader title="WORKING CAPITAL TERMS" subtitle="INPUTS" />
          <OutputRow label="Days in Inventory" value={channel.blendedInventoryDays.toString()} />
          <InputRow label="AR Terms: Days to Get Paid" value={channel.arDays} onChange={(v) => update('arDays', v)} highlight />
          <InputRow label="AP Terms: Days to Pay Supplier" value={channel.apDays} onChange={(v) => update('apDays', v)} highlight />
          <OutputRow label="Cash Conversion Cycle (Days)" value={out.cashConversionCycle.toString()} accent />

          <div className="alert alert-info mt-4 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Corporate overhead, SG&A, targets & cost of capital are managed globally on the <strong>Company Overhead</strong> tab and flow through the <strong>Executive Dashboard</strong> blended view.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
