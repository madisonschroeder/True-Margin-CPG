import React from 'react';
import { ChannelInputs, CogsFreightState, SKULibraryState, LogisticsState, TierMargins } from '../types';
import { computeChannelOutputs, resolveGlobalOverheadPct, buildCogsFreightFromSKUAndLogistics } from '../utils/calculations';
import { fmtCurrency, fmtPct } from '../utils/formatters';
import { InputRow, OutputRow, SectionHeader } from './InputRow';

interface ChannelTabProps {
  channel: ChannelInputs;
  cogsState: CogsFreightState;
  onChange: (channel: ChannelInputs) => void;
  skuLibrary: SKULibraryState;
  logisticsNodeLabels: string[];
  logistics: LogisticsState;
  companyOHPerUnit?: number;
}

export const ChannelTab: React.FC<ChannelTabProps> = ({ channel, cogsState, onChange, skuLibrary, logisticsNodeLabels, logistics, companyOHPerUnit = 0 }) => {
  const out = computeChannelOutputs(channel, cogsState, logistics, skuLibrary);
  const goPct = skuLibrary?.globalOverheadPct ?? 1;
  const effectiveOH = companyOHPerUnit * goPct;
  const plantCogs = out.blendedCogs - effectiveOH;

  const update = (field: keyof ChannelInputs, value: number) => {
    onChange({ ...channel, [field]: value });
  };

  const updateName = (value: string) => {
    onChange({ ...channel, name: value });
  };

  const updateDashboardLabel = (value: string) => {
    onChange({ ...channel, dashboardLabel: value });
  };

  // Volume mix helpers
  const mix = channel.skuVolumeMix || {};
  const totalMix = skuLibrary.skus.reduce((s, sku) => s + (mix[sku.id] ?? 0), 0);

  const updateVolumeMix = (skuId: string, pct: number) => {
    const updated = { ...mix, [skuId]: pct };
    onChange({ ...channel, skuVolumeMix: updated });
  };

  const equalizeAll = () => {
    const n = skuLibrary.skus.length;
    const equal = n > 0 ? 1 / n : 0;
    const newMix: Record<string, number> = {};
    skuLibrary.skus.forEach(sku => { newMix[sku.id] = parseFloat(equal.toFixed(4)); });
    onChange({ ...channel, skuVolumeMix: newMix });
  };

  // Tier support
  const availableTiers = React.useMemo(() => {
    const tiers = [...new Set(skuLibrary.skus.map(s => s.tier).filter(Boolean))] as string[];
    return tiers;
  }, [skuLibrary.skus]);
  const hasTiers = availableTiers.length > 0;

  const [activeTier, setActiveTier] = React.useState<string | null>(null); // null = blended

  // Compute tier-specific outputs when a tier is selected
  const tierOut = React.useMemo(() => {
    if (!activeTier || !hasTiers) return null;

    const tierSkus = skuLibrary.skus.filter(s => s.tier === activeTier);
    if (tierSkus.length === 0) return null;

    const tierSkuIds = tierSkus.map(s => s.id);

    // Build tier-specific volume mix (renormalized to sum to 1 within the tier)
    const tierMix: Record<string, number> = {};
    let tierMixTotal = 0;
    for (const sku of tierSkus) {
      const w = mix[sku.id] ?? 0;
      tierMix[sku.id] = w;
      tierMixTotal += w;
    }
    // Normalize
    if (tierMixTotal > 0) {
      for (const id of Object.keys(tierMix)) {
        tierMix[id] = tierMix[id] / tierMixTotal;
      }
    } else {
      // Equal split if no mix set
      const equal = 1 / tierSkus.length;
      for (const sku of tierSkus) {
        tierMix[sku.id] = equal;
      }
    }

    // Build COGS state for just this tier's SKUs
    const tierCogsState = buildCogsFreightFromSKUAndLogistics(
      skuLibrary,
      logistics,
      tierSkuIds,
      tierMix,
      companyOHPerUnit,
    );

    // Get tier margin overrides (or fall back to channel defaults)
    const tierMargins = channel.tierOverrides?.[activeTier];
    const tierChannel: typeof channel = tierMargins ? {
      ...channel,
      retailerMarginPct: tierMargins.retailerMarginPct,
      distMarginPct: tierMargins.distMarginPct,
      productMarginPct: tierMargins.productMarginPct,
      skuVolumeMix: tierMix,
    } : {
      ...channel,
      skuVolumeMix: tierMix,
    };

    return computeChannelOutputs(tierChannel, tierCogsState, logistics, skuLibrary);
  }, [activeTier, hasTiers, skuLibrary, logistics, channel, mix, companyOHPerUnit]);

  // Which outputs to display — tier-specific or channel-level blended
  const displayOut = tierOut || out;
  const displayPlantCogs = displayOut.blendedCogs - effectiveOH;

  // Helper to update tier margin overrides
  const updateTierMargin = (tier: string, field: keyof TierMargins, value: number) => {
    const current = channel.tierOverrides || {};
    const currentTier = current[tier] || {
      retailerMarginPct: channel.retailerMarginPct,
      distMarginPct: channel.distMarginPct,
      productMarginPct: channel.productMarginPct,
    };
    onChange({
      ...channel,
      tierOverrides: {
        ...current,
        [tier]: { ...currentTier, [field]: value },
      },
    });
  };

  return (
    <div className="space-y-1">
      {/* Editable Channel Name */}
      <div className="flex items-center gap-4 mb-2 px-2 py-2 bg-base-200 rounded-lg">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-base-content/50 uppercase whitespace-nowrap">Channel Name:</span>
          <input
            type="text"
            value={channel.name}
            onChange={(e) => updateName(e.target.value)}
            className="input input-sm input-bordered flex-1 font-semibold text-sm uppercase"
            placeholder="e.g. NAT'L DISTRIBUTION"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-base-content/50 uppercase whitespace-nowrap">Dashboard Label:</span>
          <input
            type="text"
            value={channel.dashboardLabel}
            onChange={(e) => updateDashboardLabel(e.target.value)}
            className="input input-sm input-bordered flex-1 font-semibold text-sm"
            placeholder="e.g. KeHE"
          />
        </div>
      </div>

      {/* Tier Selector */}
      {hasTiers && (
        <div className="flex items-center gap-1 px-2 py-2 bg-base-200 rounded-lg mb-2 flex-wrap">
          <span className="text-xs font-semibold text-base-content/50 uppercase mr-2">View Tier:</span>
          <button
            className={`btn btn-xs ${activeTier === null ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTier(null)}
          >
            All (Blended)
          </button>
          {availableTiers.map(tier => (
            <button
              key={tier}
              className={`btn btn-xs ${activeTier === tier ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTier(tier)}
            >
              {tier}
              <span className="badge badge-xs ml-1">{skuLibrary.skus.filter(s => s.tier === tier).length}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Left Column — Pricing & GtN */}
        <div className="space-y-1">
          {activeTier && (
            <div className="alert alert-info py-2 mb-2">
              <span className="text-sm">Viewing <strong>{activeTier}</strong> tier — {skuLibrary.skus.filter(s => s.tier === activeTier).length} SKU(s). Margins are tier-specific; deductions & working capital remain channel-level.</span>
            </div>
          )}
          <SectionHeader title="TIERED PRICING ARCHITECTURE" />
          <OutputRow label="MSRP" value={fmtCurrency(displayOut.msrp)} />
          <InputRow
            label="Retailer Margin %"
            value={activeTier && channel.tierOverrides?.[activeTier] ? channel.tierOverrides[activeTier].retailerMarginPct : channel.retailerMarginPct}
            onChange={(v) => activeTier ? updateTierMargin(activeTier, 'retailerMarginPct', v) : update('retailerMarginPct', v)}
            type="percent"
            highlight
          />
          <OutputRow label="Retailer Margin $" value={fmtCurrency(displayOut.retailerMarginDollar)} />
          <OutputRow label="Price to Retailer" value={fmtCurrency(displayOut.priceToRetailer)} accent />
          <InputRow
            label="Dist Margin %"
            value={activeTier && channel.tierOverrides?.[activeTier] ? channel.tierOverrides[activeTier].distMarginPct : channel.distMarginPct}
            onChange={(v) => activeTier ? updateTierMargin(activeTier, 'distMarginPct', v) : update('distMarginPct', v)}
            type="percent"
            highlight
          />
          <OutputRow label="Dist Margin $" value={fmtCurrency(displayOut.distMarginDollar)} />
          <OutputRow label="Price to Distrib." value={fmtCurrency(displayOut.priceToDistrib)} accent />
          {effectiveOH > 0 ? (
            <>
              <OutputRow label="Plant COGS" value={fmtCurrency(displayPlantCogs)} />
              <OutputRow label={`+ Company OH (${(goPct * 100).toFixed(0)}%)`} value={fmtCurrency(effectiveOH)} />
              <OutputRow label="Loaded COGS" value={fmtCurrency(displayOut.blendedCogs)} bold />
            </>
          ) : (
            <OutputRow label="COGS" value={fmtCurrency(displayOut.blendedCogs)} />
          )}
          <OutputRow label="Brand Margin $" value={fmtCurrency(displayOut.brandMarginDollar)} />
          <InputRow
            label="Product Margin %"
            value={activeTier && channel.tierOverrides?.[activeTier] ? channel.tierOverrides[activeTier].productMarginPct : channel.productMarginPct}
            onChange={(v) => activeTier ? updateTierMargin(activeTier, 'productMarginPct', v) : update('productMarginPct', v)}
            type="percent"
            highlight
          />

          <SectionHeader title="DEDUCTIONS" />
          <InputRow label="Early Pay %" value={channel.earlyPayPct} onChange={(v) => update('earlyPayPct', v)} type="percent" highlight />
          <OutputRow label="Early Pay $" value={fmtCurrency(displayOut.earlyPayDollar)} />
          <InputRow label="Broker Comm %" value={channel.brokerCommPct} onChange={(v) => update('brokerCommPct', v)} type="percent" highlight />
          <OutputRow label="Broker Comm $" value={fmtCurrency(displayOut.brokerCommDollar)} />
          <InputRow label="Spoilage %" value={channel.spoilagePct} onChange={(v) => update('spoilagePct', v)} type="percent" highlight />
          <OutputRow label="Spoilage $" value={fmtCurrency(displayOut.spoilageDollar)} />
          <InputRow label="Other Deductions %" value={channel.otherDeductionsPct} onChange={(v) => update('otherDeductionsPct', v)} type="percent" highlight />
          <OutputRow label="Other Deductions $" value={fmtCurrency(displayOut.otherDeductionsDollar)} />
          <SectionHeader title="TRADE SPEND" />
          <InputRow label="Trade Spend %" value={channel.tradeSpendPct} onChange={(v) => update('tradeSpendPct', v)} type="percent" highlight />
          <OutputRow label="Trade Spend $" value={fmtCurrency(displayOut.tradeSpendDollar)} />
          <InputRow label="Slotting: $/SKU/Store" value={channel.slottingPerSkuPerStore} onChange={(v) => update('slottingPerSkuPerStore', v)} type="currency" highlight />
          <InputRow label="Est. Units/Wk/Store (UPSW)" value={channel.estUnitsPerWeekPerStore} onChange={(v) => update('estUnitsPerWeekPerStore', v)} highlight />
          <OutputRow label="Slotting: Cost / Unit" value={fmtCurrency(displayOut.slottingCostPerUnit)} />

          <OutputRow label="Freight Out $" value={fmtCurrency(displayOut.freightOutDollar)} />
          <div className="divider my-1"></div>
          <OutputRow label="TOTAL DEDUCTIONS" value={fmtCurrency(displayOut.totalDeductions)} bold />
          <OutputRow label="NET REVENUE" value={fmtCurrency(displayOut.netRevenue)} accent bold />
          <OutputRow label="CONTRIBUTION MARGIN $" value={fmtCurrency(displayOut.contributionMarginDollar)} accent bold />
          <OutputRow label="CONTRIBUTION MARGIN %" value={<>{fmtPct(displayOut.contributionMarginPct)}{displayOut.contributionMarginPct < 0.25 ? <span className="badge badge-sm badge-error gap-1 ml-2 text-[10px]">⚠️ Below 25%</span> : displayOut.contributionMarginPct < 0.40 ? <span className="badge badge-sm badge-warning gap-1 ml-2 text-[10px]">✅ CPG Avg</span> : <span className="badge badge-sm badge-success gap-1 ml-2 text-[10px]">🌟 Best-in-Class</span>}</>} accent />
        </div>

        {/* Right Column — SKU Volume Mix, Mixers & Working Capital */}
        <div className="space-y-1">
          <SectionHeader title="SKU VOLUME MIX" subtitle="INPUTS" />
          <div className="space-y-1">
            {skuLibrary.skus.map((sku) => {
              const pct = mix[sku.id] ?? 0;
              return (
                <div key={sku.id} className="flex items-center gap-2 px-2 py-1.5 bg-base-200 rounded">
                  <span className={`text-sm font-medium flex-1 truncate ${pct === 0 ? 'text-base-content/40' : ''}`}>
                    {sku.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      className="input input-bordered input-xs w-20 text-right font-mono"
                      value={pct === 0 ? '' : (pct * 100).toFixed(1).replace(/\.0$/, '')}
                      placeholder="0"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        const val = parseFloat(raw);
                        updateVolumeMix(sku.id, isNaN(val) ? 0 : val / 100);
                      }}
                      onBlur={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        const val = parseFloat(raw);
                        if (isNaN(val)) updateVolumeMix(sku.id, 0);
                      }}
                    />
                    <span className="text-xs text-base-content/50">%</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Mix total + actions */}
          <div className="flex items-center justify-between px-2 mt-1">
            <div className="text-xs">
              <span className={`font-bold ${Math.abs(totalMix - 1) > 0.01 ? 'text-warning' : 'text-success'}`}>
                Total: {(totalMix * 100).toFixed(1)}%
              </span>
              {Math.abs(totalMix - 1) > 0.01 && <span className="text-warning ml-1">⚠️ should be 100%</span>}
            </div>
            <button className="btn btn-ghost btn-xs text-primary" onClick={equalizeAll}>
              = Equalize
            </button>
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
          {effectiveOH > 0 ? (
            <>
              <OutputRow label="Plant COGS $" value={fmtCurrency(displayPlantCogs)} />
              <OutputRow label="+ Company OH $" value={fmtCurrency(effectiveOH)} />
              <OutputRow label="Loaded COGS $" value={fmtCurrency(displayOut.blendedCogs)} accent />
            </>
          ) : (
            <OutputRow label="Blended COGS $" value={fmtCurrency(displayOut.blendedCogs)} accent />
          )}
          <OutputRow label="Blended Freight $" value={fmtCurrency(displayOut.blendedFreight)} />
          <InputRow label="Blended Inventory Days" value={channel.blendedInventoryDays} onChange={(v) => update('blendedInventoryDays', v)} highlight />

          <SectionHeader title="WORKING CAPITAL TERMS" subtitle="INPUTS" />
          <OutputRow label="Days in Inventory" value={channel.blendedInventoryDays.toString()} />
          <InputRow label="AR Terms: Days to Get Paid" value={channel.arDays} onChange={(v) => update('arDays', v)} highlight />
          <InputRow label="AP Terms: Days to Pay Supplier" value={channel.apDays} onChange={(v) => update('apDays', v)} highlight />
          <OutputRow label="Cash Conversion Cycle (Days)" value={displayOut.cashConversionCycle.toString()} accent />

          <div className="alert alert-info mt-4 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Company overhead auto-flows from the <strong>Company Overhead</strong> tab into per-unit COGS. Change overhead there and it updates here automatically.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
