import React, { useState, useMemo } from 'react';
import { NumericCell } from './NumericCell';
import { computeChannelOutputs } from '../utils/calculations';
import {
  ChannelInputs,
  CogsFreightState,
  BlendedFinancials,
  GlobalOverhead,
  LogisticsState,
  SKULibraryState,
  PipelineDeal,
  DealVerdict,
} from '../types';

interface DealScorerProps {
  channels: Record<string, ChannelInputs>;
  cogsFreight: CogsFreightState;
  blended: BlendedFinancials;
  globalOverhead: GlobalOverhead;
  logistics: LogisticsState;
  skuLibrary: SKULibraryState;
  channelCogsMap: Record<string, CogsFreightState>;
  onAddToPipeline: (deal: PipelineDeal) => void;
}

type ChannelType = 'kehe' | 'club' | 'dsd' | 'online' | 'altfdsvc';

const CHANNEL_LABELS: Record<ChannelType, string> = {
  kehe: "Nat'l Distribution",
  club: 'Club',
  dsd: 'DSD',
  online: 'Online D2B',
  altfdsvc: 'Alt FdSvc',
};

export function DealScorer({
  channels,
  cogsFreight,
  blended,
  globalOverhead,
  logistics,
  skuLibrary,
  channelCogsMap,
  onAddToPipeline,
}: DealScorerProps) {
  // ── Deal input state ──
  const [retailerName, setRetailerName] = useState('');
  const [channelType, setChannelType] = useState<ChannelType>('kehe');

  // Proposed terms
  const [retailerMarginPct, setRetailerMarginPct] = useState(0);
  const [distMarginPct, setDistMarginPct] = useState(0);
  const [productMarginPct, setProductMarginPct] = useState(0);
  const [earlyPayPct, setEarlyPayPct] = useState(0);
  const [brokerCommPct, setBrokerCommPct] = useState(0);
  const [spoilagePct, setSpoilagePct] = useState(0);
  const [otherDeductionsPct, setOtherDeductionsPct] = useState(0);
  const [tradeSpendPct, setTradeSpendPct] = useState(0);
  const [slottingPerSkuPerStore, setSlottingPerSkuPerStore] = useState(0);

  // Deal size
  const [proposedDoors, setProposedDoors] = useState(100);
  const [proposedVelocity, setProposedVelocity] = useState(1);
  const [manualVolume, setManualVolume] = useState(0);

  // Verdict
  const [verdict, setVerdict] = useState<DealVerdict | null>(null);
  const [pipelineAdded, setPipelineAdded] = useState(false);

  // ── Pre-fill from channel defaults ──
  const prefillFromChannel = (ct: ChannelType) => {
    const ch = channels[ct];
    if (!ch) return;
    setRetailerMarginPct(ch.retailerMarginPct);
    setDistMarginPct(ch.distMarginPct);
    setProductMarginPct(ch.productMarginPct);
    setEarlyPayPct(ch.earlyPayPct);
    setBrokerCommPct(ch.brokerCommPct);
    setSpoilagePct(ch.spoilagePct);
    setOtherDeductionsPct(ch.otherDeductionsPct);
    setTradeSpendPct(ch.tradeSpendPct);
    setSlottingPerSkuPerStore(ch.slottingPerSkuPerStore);
  };

  // Auto-fill on channel change
  const handleChannelChange = (ct: ChannelType) => {
    setChannelType(ct);
    prefillFromChannel(ct);
    setVerdict(null);
    setPipelineAdded(false);
  };

  // ── Computed annual volume ──
  const annualUnits = manualVolume > 0 ? manualVolume : proposedDoors * proposedVelocity * 52;

  // ── Build synthetic channel & score ──
  const scoreDeal = () => {
    const ch = channels[channelType];
    if (!ch) return;

    // Build synthetic channel for proposed terms
    const syntheticChannel: ChannelInputs = {
      ...ch,
      retailerMarginPct,
      distMarginPct,
      productMarginPct,
      earlyPayPct,
      brokerCommPct,
      spoilagePct,
      otherDeductionsPct,
      tradeSpendPct,
      slottingPerSkuPerStore,
      estUnitsPerWeekPerStore: proposedVelocity,
    };

    const cogsForChannel = channelCogsMap[channelType] || cogsFreight;
    const currentOutputs = computeChannelOutputs(ch, cogsForChannel, logistics, skuLibrary);
    const proposedOutputs = computeChannelOutputs(syntheticChannel, cogsForChannel, logistics, skuLibrary);

    const currentNetRev = currentOutputs.netRevenue;
    const proposedNetRev = proposedOutputs.netRevenue;
    const currentContrib = currentOutputs.contributionMarginDollar;
    const proposedContrib = proposedOutputs.contributionMarginDollar;

    const netRevDelta = proposedNetRev - currentNetRev;
    const netRevDeltaPct = currentNetRev !== 0 ? netRevDelta / Math.abs(currentNetRev) : 0;
    const contribMarginDelta = proposedContrib - currentContrib;
    const contribMarginDeltaPct = currentContrib !== 0 ? contribMarginDelta / Math.abs(currentContrib) : 0;

    const dealAnnualUnits = annualUnits;
    const dealAnnualNetRev = dealAnnualUnits * proposedNetRev;
    const dealAnnualContrib = dealAnnualUnits * proposedContrib;

    // Overhead absorption
    const totalOverhead =
      globalOverhead.peoplePayroll +
      globalOverhead.salesMarketing +
      globalOverhead.facilitiesInsurance +
      globalOverhead.professionalServices +
      globalOverhead.technologySoftware +
      globalOverhead.travelEntertainment +
      globalOverhead.rdProductDev +
      globalOverhead.generalAdmin +
      globalOverhead.miscellaneous;
    const overheadAbsorption = totalOverhead > 0 ? dealAnnualContrib / totalOverhead : 0;

    // Breakeven doors: total annual slotting ÷ (contrib margin per unit × velocity × 52)
    const contribPerUnitAnnualPerDoor = proposedContrib * proposedVelocity * 52;
    const totalSlottingPerDoor = slottingPerSkuPerStore * (skuLibrary.skus.length || 1);
    const breakevenDoors = contribPerUnitAnnualPerDoor > 0 ? totalSlottingPerDoor / contribPerUnitAnnualPerDoor : Infinity;

    // Breakeven velocity at proposed doors
    const totalSlottingAllDoors = totalSlottingPerDoor * proposedDoors;
    const breakevenVelocity = proposedDoors > 0 && proposedContrib > 0
      ? totalSlottingAllDoors / (proposedContrib * proposedDoors * 52)
      : Infinity;

    // Blended impact: current blended margin vs blended with this deal added
    const blendedMarginWithoutDeal = blended.blendedContribMarginPct;

    // Calculate blended WITH the deal: weighted average of existing + new deal
    const existingUnits = blended.impliedUnits;
    const existingContrib = blended.blendedContribMargin;
    const existingNetRev = blended.blendedNetRev;
    const totalUnitsWithDeal = existingUnits + dealAnnualUnits;
    const weightedNetRev = totalUnitsWithDeal > 0
      ? (existingUnits * existingNetRev + dealAnnualUnits * proposedNetRev) / totalUnitsWithDeal
      : 0;
    const weightedContrib = totalUnitsWithDeal > 0
      ? (existingUnits * existingContrib + dealAnnualUnits * proposedContrib) / totalUnitsWithDeal
      : 0;
    const blendedMarginWithDeal = weightedNetRev !== 0 ? weightedContrib / weightedNetRev : 0;
    const blendedMarginImpactPct = blendedMarginWithDeal - blendedMarginWithoutDeal;

    // Scoring logic
    const reasons: string[] = [];
    let score: 'GO' | 'CAUTION' | 'NO-GO';
    let headline: string;

    const marginRatio = currentContrib !== 0 ? proposedContrib / currentContrib : 0;

    if (proposedContrib <= 0) {
      score = 'NO-GO';
      headline = 'This deal has negative contribution margin — you lose money on every unit.';
      reasons.push(`Proposed contribution margin is $${proposedContrib.toFixed(2)}/unit (negative).`);
      reasons.push('No volume level can make this deal profitable.');
    } else if (marginRatio < 0.5 && dealAnnualUnits < 20000) {
      score = 'NO-GO';
      headline = 'Margin is too dilutive and volume is too low to justify.';
      reasons.push(`Margin is ${(marginRatio * 100).toFixed(0)}% of current channel — below 50% threshold.`);
      reasons.push(`Volume of ${dealAnnualUnits.toLocaleString()} units/year is below 20K minimum for low-margin deals.`);
    } else if (marginRatio >= 0.8 || dealAnnualUnits >= 50000) {
      score = 'GO';
      if (marginRatio >= 0.8) {
        headline = 'This deal preserves strong margin — take it.';
        reasons.push(`Margin is ${(marginRatio * 100).toFixed(0)}% of current channel — within acceptable range.`);
      } else {
        headline = 'Margin is dilutive but volume justifies the deal.';
        reasons.push(`Volume of ${dealAnnualUnits.toLocaleString()} units/year exceeds 50K threshold.`);
      }
      if (proposedContrib > 0) {
        reasons.push(`Contribution margin of $${proposedContrib.toFixed(2)}/unit is positive.`);
      }
      if (overheadAbsorption > 0.1) {
        reasons.push(`This deal covers ${(overheadAbsorption * 100).toFixed(1)}% of company overhead.`);
      }
    } else {
      score = 'CAUTION';
      headline = 'Proceed with caution — margin is dilutive. Negotiate harder or require volume commitments.';
      if (marginRatio < 0.8) {
        reasons.push(`Margin is ${(marginRatio * 100).toFixed(0)}% of current channel — between 50-80% caution zone.`);
      }
      // Check slotting payback
      if (totalSlottingPerDoor > 0 && contribPerUnitAnnualPerDoor > 0) {
        const slottingPaybackWeeks = (totalSlottingPerDoor / (proposedContrib * proposedVelocity)) ;
        if (slottingPaybackWeeks > 26) {
          reasons.push(`Slotting payback is ${Math.round(slottingPaybackWeeks)} weeks — exceeds 26-week threshold.`);
        }
      }
      reasons.push(`Proposed contribution: $${proposedContrib.toFixed(2)}/unit vs current $${currentContrib.toFixed(2)}/unit.`);
    }

    // Add blended impact reason
    const bps = Math.round(blendedMarginImpactPct * 10000);
    if (bps !== 0) {
      reasons.push(`Blended margin impact: ${bps > 0 ? '+' : ''}${bps} basis points.`);
    }

    setVerdict({
      score,
      headline,
      reasons,
      currentNetRevPerUnit: currentNetRev,
      proposedNetRevPerUnit: proposedNetRev,
      netRevDelta,
      netRevDeltaPct,
      currentContribMarginPerUnit: currentContrib,
      proposedContribMarginPerUnit: proposedContrib,
      contribMarginDelta,
      contribMarginDeltaPct,
      annualUnits: dealAnnualUnits,
      annualNetRevenue: dealAnnualNetRev,
      annualContribMargin: dealAnnualContrib,
      overheadAbsorption,
      breakevenDoors: isFinite(breakevenDoors) ? Math.ceil(breakevenDoors) : 0,
      breakevenVelocity: isFinite(breakevenVelocity) ? breakevenVelocity : 0,
      blendedMarginWithDeal,
      blendedMarginWithoutDeal,
      blendedMarginImpactPct,
    });
    setPipelineAdded(false);
  };

  // ── Add to pipeline ──
  const handleAddToPipeline = () => {
    if (!verdict) return;
    const now = new Date().toISOString();
    const deal: PipelineDeal = {
      id: Math.random().toString(36).substring(2, 15),
      retailerName,
      channelType,
      status: 'prospect',
      doors: proposedDoors,
      velocity: proposedVelocity,
      retailerMarginPct,
      distMarginPct,
      productMarginPct,
      earlyPayPct,
      brokerCommPct,
      spoilagePct,
      otherDeductionsPct,
      tradeSpendPct,
      slottingPerSkuPerStore,
      annualUnits: verdict.annualUnits,
      netRevPerUnit: verdict.proposedNetRevPerUnit,
      annualNetRevenue: verdict.annualNetRevenue,
      contribMarginPerUnit: verdict.proposedContribMarginPerUnit,
      notes: `${verdict.score}: ${verdict.headline}`,
      createdAt: now,
      updatedAt: now,
    };
    onAddToPipeline(deal);
    setPipelineAdded(true);
  };

  // ── Current channel outputs (for comparison table) ──
  const currentOutputs = useMemo(() => {
    const ch = channels[channelType];
    if (!ch) return null;
    return computeChannelOutputs(ch, channelCogsMap[channelType] || cogsFreight, logistics, skuLibrary);
  }, [channels, channelType, channelCogsMap, cogsFreight, logistics, skuLibrary]);

  // ── Helpers ──
  const fmtDollar = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const fmtDelta = (v: number, pct: number) => {
    const sign = v >= 0 ? '+' : '';
    const arrow = v > 0 ? '↑' : v < 0 ? '↓' : '—';
    return `${sign}${fmtDollar(v)} (${arrow} ${Math.abs(pct * 100).toFixed(1)}%)`;
  };

  const inputClass = 'input input-sm input-bordered w-full';
  const sectionHeader = 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-6';
  const cardClass = 'bg-white rounded-xl border border-gray-200 p-6 shadow-sm';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 2. Deal Input Card */}
      <div className={cardClass}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Retailer Name */}
          <div>
            <label className="label"><span className="label-text font-medium">Retailer Name</span></label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g., Costco, Kroger, Whole Foods"
              value={retailerName}
              onChange={e => setRetailerName(e.target.value)}
            />
          </div>

          {/* Channel Type */}
          <div>
            <label className="label"><span className="label-text font-medium">Channel Type</span></label>
            <select
              className="select select-sm select-bordered w-full"
              value={channelType}
              onChange={e => handleChannelChange(e.target.value as ChannelType)}
            >
              {(Object.keys(CHANNEL_LABELS) as ChannelType[]).map(ct => (
                <option key={ct} value={ct}>{CHANNEL_LABELS[ct]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <button
            className="btn btn-outline btn-xs gap-1"
            onClick={() => prefillFromChannel(channelType)}
          >
            ↻ Pre-fill from channel defaults
          </button>
        </div>

        {/* PROPOSED TERMS */}
        <h3 className={sectionHeader}>Proposed Terms — Tiered Pricing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label"><span className="label-text text-xs">Retailer Margin %</span></label>
            <NumericCell value={retailerMarginPct} onChange={setRetailerMarginPct} isPercent className={inputClass} />
          </div>
          <div>
            <label className="label"><span className="label-text text-xs">Distributor Margin %</span></label>
            <NumericCell value={distMarginPct} onChange={setDistMarginPct} isPercent className={inputClass} />
          </div>
          <div>
            <label className="label"><span className="label-text text-xs">Product Margin %</span></label>
            <NumericCell value={productMarginPct} onChange={setProductMarginPct} isPercent className={inputClass} />
          </div>
        </div>

        <h3 className={sectionHeader}>Deductions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="label"><span className="label-text text-xs">Early Pay %</span></label>
            <NumericCell value={earlyPayPct} onChange={setEarlyPayPct} isPercent className={inputClass} />
          </div>
          <div>
            <label className="label"><span className="label-text text-xs">Broker Comm %</span></label>
            <NumericCell value={brokerCommPct} onChange={setBrokerCommPct} isPercent className={inputClass} />
          </div>
          <div>
            <label className="label"><span className="label-text text-xs">Spoilage %</span></label>
            <NumericCell value={spoilagePct} onChange={setSpoilagePct} isPercent className={inputClass} />
          </div>
          <div>
            <label className="label"><span className="label-text text-xs">Other Deductions %</span></label>
            <NumericCell value={otherDeductionsPct} onChange={setOtherDeductionsPct} isPercent className={inputClass} />
          </div>
        </div>

        <h3 className={sectionHeader}>Trade Spend</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label"><span className="label-text text-xs">Trade Spend %</span></label>
            <NumericCell value={tradeSpendPct} onChange={setTradeSpendPct} isPercent className={inputClass} />
          </div>
          <div>
            <label className="label"><span className="label-text text-xs">Slotting $/SKU/Store</span></label>
            <NumericCell value={slottingPerSkuPerStore} onChange={setSlottingPerSkuPerStore} className={inputClass} />
          </div>
        </div>

        {/* DEAL SIZE */}
        <h3 className={sectionHeader}>Deal Size</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label"><span className="label-text text-xs">Proposed Doors</span></label>
            <NumericCell value={proposedDoors} onChange={setProposedDoors} className={inputClass} decimals={0} />
          </div>
          <div>
            <label className="label"><span className="label-text text-xs">Velocity (UPSPW)</span></label>
            <NumericCell value={proposedVelocity} onChange={setProposedVelocity} className={inputClass} />
          </div>
          <div>
            <label className="label"><span className="label-text text-xs">Annual Volume (auto)</span></label>
            <div className="input input-sm input-bordered w-full bg-gray-50 flex items-center text-gray-500 font-mono">
              {annualUnits.toLocaleString()} units
            </div>
          </div>
        </div>
        <div className="mt-2">
          <label className="label"><span className="label-text text-xs text-gray-400">OR manual annual volume override (0 = use doors × velocity × 52)</span></label>
          <NumericCell value={manualVolume} onChange={setManualVolume} className={`${inputClass} max-w-xs`} decimals={0} />
        </div>

        {/* SCORE BUTTON */}
        <div className="mt-6">
          <button
            className="btn btn-md gap-2 text-white"
            style={{ backgroundColor: '#7C3AED' }}
            onClick={scoreDeal}
          >
            🎯 SCORE THIS DEAL
          </button>
        </div>
      </div>

      {/* 3. Verdict Card */}
      {verdict && (
        <>
          <div
            className="rounded-xl p-6 shadow-sm"
            style={{
              backgroundColor:
                verdict.score === 'GO' ? '#dcfce7' :
                verdict.score === 'CAUTION' ? '#fef9c3' :
                '#fee2e2',
              borderLeft: `4px solid ${
                verdict.score === 'GO' ? '#16a34a' :
                verdict.score === 'CAUTION' ? '#ca8a04' :
                '#dc2626'
              }`,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">
                {verdict.score === 'GO' ? '✅' : verdict.score === 'CAUTION' ? '⚠️' : '🛑'}
              </span>
              <div>
                <div className="text-xl font-bold" style={{
                  color: verdict.score === 'GO' ? '#16a34a' : verdict.score === 'CAUTION' ? '#ca8a04' : '#dc2626'
                }}>
                  {verdict.score}
                </div>
              </div>
            </div>
            <p className="font-semibold text-gray-800 text-lg mb-3">{verdict.headline}</p>
            <ul className="space-y-1">
              {verdict.reasons.map((r, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="mt-1 text-xs">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Side-by-Side Comparison */}
          <div className={cardClass}>
            <h3 className={sectionHeader} style={{ marginTop: 0 }}>Side-by-Side Comparison</h3>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th>Metric</th>
                    <th className="text-right">Current Channel</th>
                    <th className="text-right">This Deal</th>
                    <th className="text-right">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium">Net Rev/Unit</td>
                    <td className="text-right font-mono">{fmtDollar(verdict.currentNetRevPerUnit)}</td>
                    <td className="text-right font-mono">{fmtDollar(verdict.proposedNetRevPerUnit)}</td>
                    <td className={`text-right font-mono ${verdict.netRevDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtDelta(verdict.netRevDelta, verdict.netRevDeltaPct)}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium">Contrib Margin/Unit</td>
                    <td className="text-right font-mono">{fmtDollar(verdict.currentContribMarginPerUnit)}</td>
                    <td className="text-right font-mono">{fmtDollar(verdict.proposedContribMarginPerUnit)}</td>
                    <td className={`text-right font-mono ${verdict.contribMarginDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtDelta(verdict.contribMarginDelta, verdict.contribMarginDeltaPct)}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium">COGS/Unit</td>
                    <td className="text-right font-mono">{currentOutputs ? fmtDollar(currentOutputs.blendedCogs) : '—'}</td>
                    <td className="text-right font-mono">{currentOutputs ? fmtDollar(currentOutputs.blendedCogs) : '—'}</td>
                    <td className="text-right font-mono text-gray-400">same</td>
                  </tr>
                  <tr>
                    <td className="font-medium">GtN Dilution</td>
                    <td className="text-right font-mono">{currentOutputs ? fmtPct(currentOutputs.totalDeductions / (currentOutputs.priceToDistrib || 1)) : '—'}</td>
                    <td className="text-right font-mono">
                      {(() => {
                        const ch = channels[channelType];
                        if (!ch) return '—';
                        const synth: ChannelInputs = {
                          ...ch, retailerMarginPct, distMarginPct, productMarginPct,
                          earlyPayPct, brokerCommPct, spoilagePct, otherDeductionsPct,
                          tradeSpendPct, slottingPerSkuPerStore, estUnitsPerWeekPerStore: proposedVelocity,
                        };
                        const o = computeChannelOutputs(synth, channelCogsMap[channelType] || cogsFreight, logistics, skuLibrary);
                        return fmtPct(o.totalDeductions / (o.priceToDistrib || 1));
                      })()}
                    </td>
                    <td className="text-right font-mono text-gray-400">
                      {(() => {
                        if (!currentOutputs) return '—';
                        const ch = channels[channelType];
                        if (!ch) return '—';
                        const synth: ChannelInputs = {
                          ...ch, retailerMarginPct, distMarginPct, productMarginPct,
                          earlyPayPct, brokerCommPct, spoilagePct, otherDeductionsPct,
                          tradeSpendPct, slottingPerSkuPerStore, estUnitsPerWeekPerStore: proposedVelocity,
                        };
                        const o = computeChannelOutputs(synth, channelCogsMap[channelType] || cogsFreight, logistics, skuLibrary);
                        const currentGtn = currentOutputs.totalDeductions / (currentOutputs.priceToDistrib || 1);
                        const proposedGtn = o.totalDeductions / (o.priceToDistrib || 1);
                        const delta = proposedGtn - currentGtn;
                        return `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`;
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Volume & Revenue Impact */}
          <div className={cardClass}>
            <h3 className={sectionHeader} style={{ marginTop: 0 }}>Volume & Revenue Impact</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500">Annual Units</div>
                <div className="text-lg font-bold font-mono">{verdict.annualUnits.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Annual Net Revenue</div>
                <div className="text-lg font-bold font-mono">{fmtDollar(verdict.annualNetRevenue)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Annual Contrib Margin</div>
                <div className="text-lg font-bold font-mono">{fmtDollar(verdict.annualContribMargin)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Overhead Absorption</div>
                <div className="text-lg font-bold font-mono">{fmtPct(verdict.overheadAbsorption)}</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3 italic">
              This deal alone covers {(verdict.overheadAbsorption * 100).toFixed(1)}% of your fixed costs.
            </p>
          </div>

          {/* 6. Breakeven Analysis */}
          <div className={cardClass}>
            <h3 className={sectionHeader} style={{ marginTop: 0 }}>Breakeven Analysis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Min Doors at This Velocity</div>
                <div className="text-lg font-bold font-mono">
                  {verdict.breakevenDoors > 0 ? verdict.breakevenDoors.toLocaleString() : 'N/A (no slotting)'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Min Velocity at These Doors</div>
                <div className="text-lg font-bold font-mono">
                  {verdict.breakevenVelocity > 0 ? verdict.breakevenVelocity.toFixed(2) + ' UPSPW' : 'N/A (no slotting)'}
                </div>
              </div>
            </div>
            {verdict.breakevenDoors > 0 && slottingPerSkuPerStore > 0 && verdict.proposedContribMarginPerUnit > 0 && proposedVelocity > 0 && (
              <p className="text-sm text-gray-600 mt-3 italic">
                At {proposedDoors.toLocaleString()} doors and {proposedVelocity} UPSPW, this deal breaks even on slotting in{' '}
                {Math.ceil(
                  slottingPerSkuPerStore * (skuLibrary.skus.length || 1) /
                  (verdict.proposedContribMarginPerUnit * proposedVelocity)
                )} weeks.
              </p>
            )}
          </div>

          {/* 7. Blended Impact */}
          <div className={cardClass}>
            <h3 className={sectionHeader} style={{ marginTop: 0 }}>Blended Company Impact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">Current Blended Margin</div>
                <div className="text-lg font-bold font-mono">{fmtPct(verdict.blendedMarginWithoutDeal)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">With This Deal</div>
                <div className="text-lg font-bold font-mono">{fmtPct(verdict.blendedMarginWithDeal)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Impact</div>
                <div className={`text-lg font-bold font-mono ${verdict.blendedMarginImpactPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {verdict.blendedMarginImpactPct >= 0 ? '+' : ''}{Math.round(verdict.blendedMarginImpactPct * 10000)} bps
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3 italic">
              Taking this deal would {verdict.blendedMarginImpactPct >= 0 ? 'improve' : 'reduce'} your blended margin by{' '}
              {Math.abs(Math.round(verdict.blendedMarginImpactPct * 10000))} basis points.
            </p>
          </div>

          {/* 8. Add to Pipeline */}
          <div className="flex justify-center">
            <button
              className="btn btn-outline btn-md gap-2"
              style={{ borderColor: '#7C3AED', color: '#7C3AED' }}
              onClick={handleAddToPipeline}
              disabled={pipelineAdded}
            >
              {pipelineAdded ? '✓ Added to Pipeline' : '📋 ADD TO PIPELINE'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
