import {
  SupplyChainNode,
  NodeOutputs,
  ChannelInputs,
  ChannelOutputs,
  CogsFreightState,
  GlobalOverhead,
  DashboardChannel,
  BlendedFinancials,
  BreakevenInputs,
  BreakevenOutputs,
  DebtEquityInputs,
  DebtEquityOutputs,
  ChannelRealization,
  CircuitBreakerThresholds,
  CircuitBreakerStatus,
  ProFormaRow,
  SKULibraryState,
  LogisticsState,
} from '../types';

// ── SKU + LOGISTICS → COGS FREIGHT BRIDGE ──
export function buildCogsFreightFromSKUAndLogistics(
  skuLibrary: SKULibraryState,
  logistics: LogisticsState,
  enabledSkuIds?: string[],  // if provided, only include these SKUs
  skuVolumeMix?: Record<string, number>,  // per-channel volume mix overrides
  overrideGlobalOH?: number,  // company OH per unit (replaces per-SKU globalOverhead)
): CogsFreightState {
  // Filter SKUs if enabledSkuIds provided
  const activeSKUs = enabledSkuIds
    ? skuLibrary.skus.filter(s => enabledSkuIds.includes(s.id))
    : skuLibrary.skus;

  // If no active SKUs after filter, fall back to all SKUs
  const skusToUse = activeSKUs.length > 0 ? activeSKUs : skuLibrary.skus;

  const hasCustomMix = skuVolumeMix && Object.keys(skuVolumeMix).length > 0;
  // Global OH slider: 0-1 (default 1 = fully included)
  const goPct = resolveGlobalOverheadPct(skuLibrary);

  const nodes = logistics.nodes.map((logNode) => {
    let totalMixPct = 0;
    let wRawIngredients = 0;
    let wPrimaryPackaging = 0;
    let wSecondaryPackaging = 0;
    let wPlantOverhead = 0;
    let wGlobalOverhead = 0;
    let wInboundFreight = 0;
    let wUnitsPerCase = 0;
    let wCasesPerPallet = 0;

    for (const sku of skusToUse) {
      const w = hasCustomMix ? (skuVolumeMix![sku.id] ?? 0) : sku.volumeMixPct;
      totalMixPct += w;
      wRawIngredients += w * sku.rawIngredients;
      wPrimaryPackaging += w * sku.primaryPackaging;
      wSecondaryPackaging += w * sku.secondaryPackaging;
      wPlantOverhead += w * (sku.plantOverhead || 0);
      // Use company OH override if provided, otherwise fall back to per-SKU legacy value
      const skuGOH = overrideGlobalOH !== undefined ? overrideGlobalOH : (sku.globalOverhead || 0);
      wGlobalOverhead += w * skuGOH * goPct;
      wInboundFreight += w * sku.inboundFreight;
      wUnitsPerCase += w * sku.unitsPerCase;
      wCasesPerPallet += w * sku.casesPerPallet;
    }

    const norm = totalMixPct > 0 ? totalMixPct : 1;

    return {
      label: logNode.label,
      rawIngredients: wRawIngredients / norm,
      primaryPackaging: wPrimaryPackaging / norm,
      secondaryPackaging: wSecondaryPackaging / norm,
      plantOverhead: wPlantOverhead / norm,
      globalOverhead: wGlobalOverhead / norm,
      inboundFreight: wInboundFreight / norm,
      unitsPerCase: Math.round(wUnitsPerCase / norm) || 12,
      casesPerPallet: Math.round(wCasesPerPallet / norm) || 42,
      pickPackFeePerCase: logNode.pickPackFeePerCase,
      ltlFreightPerPallet: logNode.ltlFreightPerPallet,
    } as SupplyChainNode;
  });

  return { nodes };
}

// Resolve globalOverheadPct from legacy boolean or new slider value
export function resolveGlobalOverheadPct(skuLibrary: SKULibraryState): number {
  if (skuLibrary.globalOverheadPct !== undefined) return skuLibrary.globalOverheadPct;
  // Legacy: globalOverheadEnabled boolean
  if (skuLibrary.globalOverheadEnabled === false) return 0;
  return 1;
}

// ── SUPPLY CHAIN NODE ──
export function computeNodeOutputs(node: SupplyChainNode): NodeOutputs {
  const totalMfgCogs =
    node.rawIngredients +
    node.primaryPackaging +
    node.secondaryPackaging +
    (node.plantOverhead || 0) +
    (node.globalOverhead || 0) +
    node.inboundFreight;

  const totalUnitsPerPallet = node.unitsPerCase * node.casesPerPallet;
  const threePLCostPerUnit = node.unitsPerCase > 0 ? node.pickPackFeePerCase / node.unitsPerCase : 0;
  const freightCostPerUnit = totalUnitsPerPallet > 0 ? node.ltlFreightPerPallet / totalUnitsPerPallet : 0;
  const totalOutboundPerUnit = threePLCostPerUnit + freightCostPerUnit;
  const trueLandedCogs = totalMfgCogs + totalOutboundPerUnit;

  return { totalMfgCogs, totalUnitsPerPallet, threePLCostPerUnit, freightCostPerUnit, totalOutboundPerUnit, trueLandedCogs };
}

// ── CHANNEL-LEVEL P&L (no overhead — that's global) ──
export function computeChannelOutputs(
  channel: ChannelInputs,
  cogsState: CogsFreightState,
  logistics?: LogisticsState,
  skuLibrary?: SKULibraryState,
): ChannelOutputs {
  const nodeOutputs = cogsState.nodes.map(computeNodeOutputs);

  let blendedCogs = 0;
  let blendedFreight = 0;
  for (let i = 0; i < nodeOutputs.length; i++) {
    const mix = channel.supplyChainMix[i] || 0;
    blendedCogs += mix * nodeOutputs[i].totalMfgCogs;
    blendedFreight += mix * nodeOutputs[i].totalOutboundPerUnit;
  }

  // When Global OH slider is < 100%, COGS is reduced but pricing should stay stable.
  // Compute the excluded Global OH so we can price from full COGS but margin from reduced COGS.
  let excludedGlobalOHPerUnit = 0;
  if (skuLibrary) {
    const goPct = resolveGlobalOverheadPct(skuLibrary);
    if (goPct < 1) {
      const chMix = channel.skuVolumeMix && Object.keys(channel.skuVolumeMix).length > 0 ? channel.skuVolumeMix : null;
      let totalMix = 0;
      let weightedGOH = 0;
      for (const sku of skuLibrary.skus) {
        const w = chMix ? (chMix[sku.id] ?? 0) : sku.volumeMixPct;
        weightedGOH += w * (sku.globalOverhead || 0);
        totalMix += w;
      }
      excludedGlobalOHPerUnit = totalMix > 0 ? (weightedGOH / totalMix) * (1 - goPct) : 0;
    }
  }
  const pricingCogs = blendedCogs + excludedGlobalOHPerUnit; // full COGS for pricing (always includes Global OH)

  // Channel mixer removed from individual tabs — GtN multiplier controlled at dashboard level
  const blendedGtnMultiplier = 1;

  // Tiered Pricing — use pricingCogs so price stays stable when Global OH is toggled off
  const cogs = blendedCogs;
  const priceToDistrib = channel.productMarginPct < 1 ? pricingCogs / (1 - channel.productMarginPct) : 0;
  const brandMarginDollar = priceToDistrib - cogs;
  const priceToRetailer = channel.distMarginPct < 1 ? priceToDistrib / (1 - channel.distMarginPct) : 0;
  const distMarginDollar = priceToRetailer - priceToDistrib;
  const msrp = channel.retailerMarginPct < 1 ? priceToRetailer / (1 - channel.retailerMarginPct) : 0;
  const retailerMarginDollar = msrp - priceToRetailer;

  // GtN Dilution
  const earlyPayDollar = priceToDistrib * channel.earlyPayPct;
  const brokerCommDollar = priceToDistrib * channel.brokerCommPct * blendedGtnMultiplier;
  const spoilageDollar = priceToDistrib * channel.spoilagePct;
  const otherDeductionsDollar = priceToDistrib * (channel.otherDeductionsPct || 0);
  const tradeSpendDollar = priceToDistrib * channel.tradeSpendPct * blendedGtnMultiplier;
  const slottingCostPerUnit =
    channel.estUnitsPerWeekPerStore > 0
      ? (channel.slottingPerSkuPerStore / (channel.estUnitsPerWeekPerStore * 52)) * blendedGtnMultiplier
      : 0;
  // Warehousing: company-level from logistics state (or fallback to channel-level for backward compat)
  let warehousingCostPerUnit = 0;
  if (logistics && skuLibrary) {
    // Compute weighted avg units per pallet from SKU library (using per-channel mix if available)
    const chMix = channel.skuVolumeMix && Object.keys(channel.skuVolumeMix).length > 0 ? channel.skuVolumeMix : null;
    let totalMix = 0;
    let weightedUPP = 0;
    for (const sku of skuLibrary.skus) {
      const w = chMix ? (chMix[sku.id] ?? 0) : sku.volumeMixPct;
      const upp = sku.unitsPerCase * sku.casesPerPallet;
      weightedUPP += w * upp;
      totalMix += w;
    }
    const avgUnitsPerPallet = totalMix > 0 ? weightedUPP / totalMix : 504;
    warehousingCostPerUnit = avgUnitsPerPallet > 0
      ? (logistics.storagePerPalletPerMonth * logistics.avgMonthsOnHand) / avgUnitsPerPallet
      : 0;
  } else {
    warehousingCostPerUnit = channel.warehousingUnitsPerPallet > 0
      ? (channel.warehousingPerPalletPerMonth * channel.warehousingMonthsOnHand) / channel.warehousingUnitsPerPallet
      : 0;
  }
  const freightOutDollar = blendedFreight;

  const totalDeductions =
    earlyPayDollar + brokerCommDollar + spoilageDollar + otherDeductionsDollar + tradeSpendDollar + slottingCostPerUnit + freightOutDollar;
  const netRevenue = priceToDistrib - totalDeductions;
  const contributionMarginDollar = netRevenue - cogs;
  const contributionMarginPct = netRevenue !== 0 ? contributionMarginDollar / netRevenue : 0;

  // Working Capital (channel-level)
  const cashConversionCycle = channel.blendedInventoryDays + channel.arDays - channel.apDays;

  return {
    blendedCogs, blendedFreight, blendedGtnMultiplier,
    msrp, retailerMarginDollar, priceToRetailer, distMarginDollar, priceToDistrib, brandMarginDollar,
    earlyPayDollar, brokerCommDollar, spoilageDollar, otherDeductionsDollar, tradeSpendDollar, slottingCostPerUnit,
    warehousingCostPerUnit, freightOutDollar,
    totalDeductions, netRevenue, contributionMarginDollar, contributionMarginPct,
    cashConversionCycle,
  };
}

// ── BLENDED COMPANY-LEVEL FINANCIALS (Executive Dashboard) ──
export function computeBlendedFinancials(
  channelInputs: Record<string, ChannelInputs>,
  cogsState: CogsFreightState,
  globalOverhead: GlobalOverhead,
  dashboardMix: Record<string, number>,
  targetAnnualNetRev: number,
  channelCogsMap?: Record<string, CogsFreightState>,  // optional per-channel COGS
  logistics?: LogisticsState,
  skuLibrary?: SKULibraryState,
): BlendedFinancials {
  const channelIds = Object.keys(channelInputs);

  // Compute each channel (use per-channel COGS if provided)
  const channelResults = channelIds.map((id) => ({
    id,
    inputs: channelInputs[id],
    outputs: computeChannelOutputs(channelInputs[id], channelCogsMap?.[id] || cogsState, logistics, skuLibrary),
    mix: dashboardMix[id] || 0,
  }));

  const channels: DashboardChannel[] = channelResults.map((cr) => ({
    id: cr.id,
    name: cr.inputs.dashboardLabel,
    mixPct: cr.mix,
    netRevPerUnit: cr.outputs.netRevenue,
    contributionMarginPerUnit: cr.outputs.contributionMarginDollar,
    contributionMarginPct: cr.outputs.contributionMarginPct,
    cogsPerUnit: cr.outputs.blendedCogs,
    cccDays: cr.outputs.cashConversionCycle,
  }));

  // Blended per-unit metrics
  // Brand's top-line price = priceToDistrib (what the brand invoices the buyer, before GtN deductions)
  const blendedGrossRevPerUnit = channelResults.reduce((s, cr) => s + cr.mix * cr.outputs.priceToDistrib, 0);
  const blendedNetRev = channels.reduce((s, c) => s + c.mixPct * c.netRevPerUnit, 0);
  const blendedContribMargin = channels.reduce((s, c) => s + c.mixPct * c.contributionMarginPerUnit, 0);
  const blendedContribMarginPct = blendedNetRev !== 0 ? blendedContribMargin / blendedNetRev : 0;
  const blendedCogs = channels.reduce((s, c) => s + c.mixPct * c.cogsPerUnit, 0);
  const blendedCCC = channels.reduce((s, c) => s + c.mixPct * c.cccDays, 0);

  // Blended AR/AP (weighted by mix)
  const blendedAR = channelResults.reduce((s, cr) => s + cr.mix * cr.inputs.arDays, 0);
  const blendedAP = channelResults.reduce((s, cr) => s + cr.mix * cr.inputs.apDays, 0);
  const blendedInventoryDays = channelResults.reduce((s, cr) => s + cr.mix * cr.inputs.blendedInventoryDays, 0);

  // Global overhead — sum the 9-category chart of accounts
  const totalFixedCosts =
    globalOverhead.peoplePayroll +
    globalOverhead.salesMarketing +
    globalOverhead.facilitiesInsurance +
    globalOverhead.professionalServices +
    globalOverhead.technologySoftware +
    globalOverhead.travelEntertainment +
    globalOverhead.rdProductDev +
    globalOverhead.generalAdmin +
    globalOverhead.miscellaneous;

  // Company OH per unit — auto-derived from Company Overhead tab ÷ target annual volume
  const companyOHPerUnit = globalOverhead.targetAnnualVolume > 0
    ? totalFixedCosts / globalOverhead.targetAnnualVolume
    : 0;
  const goPct = skuLibrary ? resolveGlobalOverheadPct(skuLibrary) : 1;
  const effectiveOHPerUnit = companyOHPerUnit * goPct;

  // Plant COGS = blended COGS minus the company OH that was baked in via buildCogsFreight
  const plantCogs = blendedCogs - effectiveOHPerUnit;

  const marketingPerUnit = blendedNetRev * globalOverhead.marketingPctOfNetRev;
  // Adjusted contribution uses the DISPLAYED COGS (includes OH at slider %)
  const adjustedContribMargin = blendedContribMargin - marketingPerUnit;

  // Run-Rate — use PLANT-ONLY economics for EBITDA to avoid slider distortion
  // EBITDA = (Net Rev - Plant COGS - Marketing) × units - Total Company OH
  // This formula is invariant to the slider position
  const impliedUnits = blendedNetRev !== 0 ? targetAnnualNetRev / blendedNetRev : 0;
  const grossRevenue = impliedUnits * blendedGrossRevPerUnit;
  const plantContribPerUnit = blendedNetRev - plantCogs - marketingPerUnit;
  const blendedCashGenerated = impliedUnits * plantContribPerUnit;
  const annualOverhead = totalFixedCosts;
  const annualMarketing = impliedUnits * marketingPerUnit;
  const operatingCashFlow = blendedCashGenerated - totalFixedCosts;

  // Working Capital (company-level, blended) — use fully loaded COGS for cash needs
  const peakInventoryCash = (impliedUnits * blendedCogs * blendedInventoryDays) / 365;
  const accountsReceivable = (targetAnnualNetRev * blendedAR) / 365;
  const accountsPayable = (impliedUnits * blendedCogs * blendedAP) / 365;
  const netWorkingCapital = peakInventoryCash + accountsReceivable - accountsPayable;
  const overheadBurnDuringCycle = (totalFixedCosts / 365) * blendedCCC;
  const totalCashFloat = netWorkingCapital + overheadBurnDuringCycle;

  // Cost of Capital (company-level)
  const annualInterestCost = totalCashFloat * globalOverhead.annualInterestRate;
  const debtBurdenPerUnit = impliedUnits > 0 ? annualInterestCost / impliedUnits : 0;
  const finalCashMarginPerUnit = plantContribPerUnit - (totalFixedCosts / (impliedUnits || 1)) - debtBurdenPerUnit;
  const maxAllowableApr =
    totalCashFloat > 0 && impliedUnits > 0
      ? operatingCashFlow / totalCashFloat
      : 0;
  const debtViability = finalCashMarginPerUnit <= 0 ? 'ABORT: DEBT IS TOO EXPENSIVE' : operatingCashFlow <= 0 ? 'WARNING: NEGATIVE OPERATING CASH FLOW' : 'VIABLE FINANCING';

  // Self-Funded Growth
  const newUnitsPerSold = blendedCogs !== 0 ? adjustedContribMargin / blendedCogs : 0;
  const annualCapitalTurns = blendedCCC !== 0 ? 365 / blendedCCC : 0;
  const maxSelfFundedGrowth = newUnitsPerSold * annualCapitalTurns;

  // Valuation Estimator
  const impliedRevenueMultiple = operatingCashFlow > 0 ? totalCashFloat / operatingCashFlow : 0;

  return {
    channels,
    blendedGrossRevPerUnit, blendedNetRev, blendedContribMargin, blendedContribMarginPct, blendedCogs, blendedCCC,
    totalFixedCosts, companyOHPerUnit, effectiveOHPerUnit, plantCogs, marketingPerUnit, adjustedContribMargin,
    targetAnnualNetRev, grossRevenue, impliedUnits, blendedCashGenerated, annualOverhead, annualMarketing, operatingCashFlow,
    peakInventoryCash, accountsReceivable, accountsPayable, netWorkingCapital, overheadBurnDuringCycle, totalCashFloat,
    annualInterestCost, debtBurdenPerUnit, finalCashMarginPerUnit, maxAllowableApr, debtViability,
    newUnitsPerSold, annualCapitalTurns, maxSelfFundedGrowth,
    impliedRevenueMultiple,
  };
}

// ── BREAKEVEN & TARGET EBITDA ──
export function computeBreakeven(
  blended: BlendedFinancials,
  inputs: BreakevenInputs
): BreakevenOutputs {
  const fixedCosts = blended.totalFixedCosts;
  const contribPerUnit = blended.adjustedContribMargin;
  const netRevPerUnit = blended.blendedNetRev;

  const calcUnits = (targetEbitda: number): number | string => {
    if (contribPerUnit <= 0) return 'NEGATIVE MARGIN - DO NOT SELL';
    return (fixedCosts + targetEbitda) / contribPerUnit;
  };

  const calcRev = (units: number | string): number | string => {
    if (typeof units === 'string') return 'N/A';
    return units * netRevPerUnit;
  };

  const calcPallets = (units: number | string): number | string => {
    if (typeof units === 'string') return 'N/A';
    return units / 504;
  };

  // Breakeven (EBITDA = 0)
  const breakevenUnits = calcUnits(0);
  const breakevenRevenue = calcRev(breakevenUnits);
  const breakevenPallets = calcPallets(breakevenUnits);
  const breakevenContainers = typeof breakevenPallets === 'number' ? breakevenPallets / 20 : 'N/A';

  // Target
  const targetUnits = calcUnits(inputs.targetEbitdaDollars);
  const targetRevenue = calcRev(targetUnits);
  const targetPallets = calcPallets(targetUnits);
  const targetContainers = typeof targetPallets === 'number' ? targetPallets / 20 : 'N/A';

  // Scenarios
  const scenarios = inputs.scenarios.map((s) => {
    const u = calcUnits(s.targetEbitda);
    return {
      label: s.label,
      targetEbitda: s.targetEbitda,
      requiredUnits: u,
      requiredRevenue: calcRev(u),
      requiredPallets: calcPallets(u),
    };
  });

  return {
    breakevenUnits, breakevenRevenue, breakevenPallets, breakevenContainers,
    targetUnits, targetRevenue, targetPallets, targetContainers,
    adjustedContribPerUnit: contribPerUnit,
    totalFixedCosts: fixedCosts,
    scenarios,
  };
}

// ── DEBT VS EQUITY DECISION TOOL ──
export function computeDebtVsEquity(
  blended: BlendedFinancials,
  inputs: DebtEquityInputs
): DebtEquityOutputs {
  const {
    runwayMonths, additionalCapital,
    locRate, locCommitmentFee, locUtilization,
    termLoanApr, termLoanYears,
    equityPreMoneyVal, projectedExitYear, projectedExitRevenue, revenueMultiple,
  } = inputs;

  // ─── 1. CAPITAL NEEDS ANALYSIS ─────────────────────────────
  // Working capital need = total cash float from blended model (inventory + AR - AP + overhead during CCC)
  const workingCapitalNeed = Math.max(blended.totalCashFloat, 0);

  // Operating runway need: only if EBITDA-negative, how much cash to survive runway period
  const monthlyOverhead = blended.annualOverhead / 12;
  const monthlyEbitda = blended.operatingCashFlow / 12;
  const monthlyBurn = monthlyEbitda < 0 ? Math.abs(monthlyEbitda) : 0;
  const operatingRunwayNeed = monthlyBurn > 0 ? monthlyBurn * runwayMonths : 0;

  // Split into debt-appropriate vs equity-appropriate
  const debtAppropriate = workingCapitalNeed;  // asset-backed, revolving, self-liquidating
  const equityAppropriate = operatingRunwayNeed + additionalCapital; // no collateral, funds growth
  const totalCapitalNeed = debtAppropriate + equityAppropriate;

  // ─── 2. DEBT PATH — LOC FOR WORKING CAPITAL ────────────────
  const locDrawAmount = debtAppropriate * locUtilization;
  const undrawnAmount = debtAppropriate - locDrawAmount;
  const annualLocInterest = locDrawAmount * locRate;
  const annualCommitmentFee = undrawnAmount * locCommitmentFee;
  const totalAnnualLocCost = annualLocInterest + annualCommitmentFee;
  const locDscr = totalAnnualLocCost > 0 ? blended.operatingCashFlow / totalAnnualLocCost : 99;
  const locFeasible = locDscr >= 1.25;

  // ─── 3. DEBT PATH — TERM LOAN (for additional capital if routed to debt) ──
  const termPrincipal = additionalCapital; // only additional capital could go term-loan route
  const termMonthlyRate = termLoanApr / 12;
  const termNumPayments = termLoanYears * 12;
  const termMonthlyPayment = termPrincipal > 0
    ? (termMonthlyRate > 0
      ? (termPrincipal * termMonthlyRate * Math.pow(1 + termMonthlyRate, termNumPayments)) / (Math.pow(1 + termMonthlyRate, termNumPayments) - 1)
      : termPrincipal / termNumPayments)
    : 0;
  const termAnnualService = termMonthlyPayment * 12;
  const termTotalInterest = termPrincipal > 0 ? (termMonthlyPayment * termNumPayments) - termPrincipal : 0;
  const termDscr = termAnnualService > 0 ? blended.operatingCashFlow / termAnnualService : 99;
  const termFeasible = termDscr >= 1.25;

  // ─── 4. EQUITY PATH ────────────────────────────────────────
  const equityRaiseAmount = equityAppropriate;
  const postMoneyVal = equityPreMoneyVal + equityRaiseAmount;
  const equityDilution = equityRaiseAmount > 0 ? equityRaiseAmount / postMoneyVal : 0;
  const impliedOwnershipRetained = 1 - equityDilution;
  const projectedExitVal = projectedExitRevenue * revenueMultiple;
  const investorReturnAtExit = projectedExitVal * equityDilution;
  const founderValueAtExit = projectedExitVal * impliedOwnershipRetained;
  const costOfEquity = equityRaiseAmount > 0 ? investorReturnAtExit - equityRaiseAmount : 0;

  // ─── 5. BLENDED VERDICT ────────────────────────────────────
  const optimalDebtPct = totalCapitalNeed > 0 ? debtAppropriate / totalCapitalNeed : 0;
  const optimalEquityPct = totalCapitalNeed > 0 ? equityAppropriate / totalCapitalNeed : 0;
  const blendedAnnualCost = totalAnnualLocCost + (costOfEquity > 0 ? costOfEquity / Math.max(projectedExitYear, 1) : 0);

  const debtCostAsMultiple = debtAppropriate > 0 ? totalAnnualLocCost / debtAppropriate : 0;
  const equityCostAsMultiple = equityRaiseAmount > 0 ? costOfEquity / equityRaiseAmount : 0;

  let recommendation: string;
  if (totalCapitalNeed <= 0) {
    recommendation = 'NO CAPITAL NEEDED: Your blended model is self-funding at this run rate.';
  } else if (equityAppropriate <= 0 && locFeasible) {
    recommendation = 'ALL DEBT: Working capital need is fully serviceable via LOC — no equity dilution needed.';
  } else if (debtAppropriate <= 0 && equityAppropriate > 0) {
    recommendation = 'ALL EQUITY: No working capital gap, but operating runway requires growth capital.';
  } else if (!locFeasible && equityAppropriate > 0) {
    recommendation = 'EQUITY-HEAVY: LOC not serviceable at current cash flow — consider equity for full raise.';
  } else if (locFeasible && equityAppropriate > 0) {
    recommendation = `BLENDED: LOC for working capital (${Math.round(optimalDebtPct * 100)}%) + equity for growth runway (${Math.round(optimalEquityPct * 100)}%).`;
  } else {
    recommendation = 'REVIEW: Evaluate capital structure with your finance team.';
  }

  return {
    workingCapitalNeed, monthlyBurn, operatingRunwayNeed, additionalCapital, totalCapitalNeed,
    debtAppropriate, equityAppropriate,
    locDrawAmount, annualLocInterest, annualCommitmentFee, totalAnnualLocCost, locDscr, locFeasible,
    termMonthlyPayment, termAnnualService, termTotalInterest, termDscr, termFeasible,
    equityRaiseAmount, equityDilution, postMoneyVal, impliedOwnershipRetained,
    investorReturnAtExit, founderValueAtExit, costOfEquity,
    optimalDebtPct, optimalEquityPct, blendedAnnualCost,
    recommendation, debtCostAsMultiple, equityCostAsMultiple,
  };
}

// ── CIRCUIT BREAKER EVALUATION ──
export function evaluateCircuitBreakers(
  blended: BlendedFinancials,
  thresholds: CircuitBreakerThresholds
): CircuitBreakerStatus[] {
  const breakers: CircuitBreakerStatus[] = [];
  
  // 1. Cash availability vs need
  const cashGap = blended.totalCashFloat - thresholds.availableCash;
  breakers.push({
    id: 'cash_gap',
    label: 'Cash Gap',
    status: cashGap > 0 ? 'red' : cashGap > -thresholds.availableCash * 0.2 ? 'yellow' : 'green',
    message: cashGap > 0 
      ? `Cash need exceeds available by $${Math.abs(cashGap).toLocaleString()}`
      : cashGap > -thresholds.availableCash * 0.2
        ? `Cash cushion thin — only $${Math.abs(cashGap).toLocaleString()} headroom`
        : `Cash cushion healthy — $${Math.abs(cashGap).toLocaleString()} headroom`,
    currentValue: blended.totalCashFloat,
    threshold: thresholds.availableCash,
  });

  // 2. Monthly burn rate
  const monthlyBurn = blended.operatingCashFlow < 0 ? Math.abs(blended.operatingCashFlow) / 12 : 0;
  breakers.push({
    id: 'burn_rate',
    label: 'Monthly Burn',
    status: monthlyBurn > thresholds.maxMonthlyBurn ? 'red' 
      : monthlyBurn > thresholds.maxMonthlyBurn * 0.75 ? 'yellow' : 'green',
    message: monthlyBurn > thresholds.maxMonthlyBurn
      ? `Burning $${monthlyBurn.toLocaleString()}/mo — exceeds limit`
      : blended.operatingCashFlow > 0 
        ? 'Cash flow positive — no burn'
        : `Burn rate $${monthlyBurn.toLocaleString()}/mo within limits`,
    currentValue: monthlyBurn,
    threshold: thresholds.maxMonthlyBurn,
  });

  // 3. EBITDA floor
  breakers.push({
    id: 'ebitda_floor',
    label: 'EBITDA Floor',
    status: blended.operatingCashFlow < thresholds.minAnnualEbitda ? 'red'
      : blended.operatingCashFlow < thresholds.minAnnualEbitda * 1.25 ? 'yellow' : 'green',
    message: blended.operatingCashFlow < thresholds.minAnnualEbitda
      ? `EBITDA $${blended.operatingCashFlow.toLocaleString()} below minimum`
      : `EBITDA $${blended.operatingCashFlow.toLocaleString()} meets target`,
    currentValue: blended.operatingCashFlow,
    threshold: thresholds.minAnnualEbitda,
  });

  // 4. Debt capacity
  breakers.push({
    id: 'debt_capacity',
    label: 'Debt Capacity',
    status: blended.totalCashFloat > thresholds.maxDebtCapacity ? 'red'
      : blended.totalCashFloat > thresholds.maxDebtCapacity * 0.8 ? 'yellow' : 'green',
    message: blended.totalCashFloat > thresholds.maxDebtCapacity
      ? `Cash float $${blended.totalCashFloat.toLocaleString()} exceeds debt ceiling`
      : `Cash float within debt capacity`,
    currentValue: blended.totalCashFloat,
    threshold: thresholds.maxDebtCapacity,
  });

  // 5. Contribution margin health
  breakers.push({
    id: 'contrib_margin',
    label: 'Margin Health',
    status: blended.blendedContribMarginPct < thresholds.minContribMarginPct ? 'red'
      : blended.blendedContribMarginPct < thresholds.minContribMarginPct * 1.5 ? 'yellow' : 'green',
    message: blended.blendedContribMarginPct < thresholds.minContribMarginPct
      ? `Blended margin ${(blended.blendedContribMarginPct * 100).toFixed(1)}% below floor`
      : `Blended margin ${(blended.blendedContribMarginPct * 100).toFixed(1)}% healthy`,
    currentValue: blended.blendedContribMarginPct,
    threshold: thresholds.minContribMarginPct,
  });

  return breakers;
}

// ── PROFORMA STRUCTURAL CAPACITY ──
// Runs the blended model at different realization levels to find structural limits
export function computeProForma(
  channelInputs: Record<string, ChannelInputs>,
  cogsState: CogsFreightState,
  globalOverhead: GlobalOverhead,
  dashboardMix: Record<string, number>,
  targetAnnualNetRev: number,
  channelRealization: ChannelRealization,
  thresholds: CircuitBreakerThresholds,
  realizationLevels: number[] = [0.25, 0.50, 0.75, 1.0, 1.25, 1.50],
  channelCogsMap?: Record<string, CogsFreightState>,
  logistics?: LogisticsState,
  skuLibrary?: SKULibraryState,
): ProFormaRow[] {
  return realizationLevels.map((pct) => {
    // Scale target revenue by the realization percentage
    // Also apply per-channel realization by adjusting the mix weights
    const adjustedMix: Record<string, number> = {};
    let totalAdjustedMix = 0;
    for (const id of Object.keys(dashboardMix)) {
      const channelReal = channelRealization[id] ?? 1.0;
      adjustedMix[id] = dashboardMix[id] * channelReal;
      totalAdjustedMix += adjustedMix[id];
    }
    // Normalize so mix still sums to 1 (preserves relative channel weights after realization)
    if (totalAdjustedMix > 0) {
      for (const id of Object.keys(adjustedMix)) {
        adjustedMix[id] = adjustedMix[id] / totalAdjustedMix;
      }
    }

    // Scale the target revenue by overall realization AND total channel realization impact
    const effectiveTargetRev = targetAnnualNetRev * pct * totalAdjustedMix;

    const blended = computeBlendedFinancials(
      channelInputs,
      cogsState,
      globalOverhead,
      adjustedMix,
      effectiveTargetRev,
      channelCogsMap,
      logistics,
      skuLibrary,
    );

    const circuitBreakers = evaluateCircuitBreakers(blended, thresholds);

    return {
      realizationPct: pct,
      grossRevenue: blended.grossRevenue,
      netRevenue: blended.targetAnnualNetRev,
      totalCogs: blended.impliedUnits * blended.blendedCogs,
      contributionMargin: blended.blendedCashGenerated,
      overhead: blended.annualOverhead,
      ebitda: blended.operatingCashFlow,
      workingCapitalNeeded: blended.netWorkingCapital,
      totalCashFloat: blended.totalCashFloat,
      circuitBreakers,
    };
  });
}
