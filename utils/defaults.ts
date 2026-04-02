import { CogsFreightState, ChannelInputs, SupplyChainNode, GlobalOverhead, BreakevenInputs, DebtEquityInputs, ChannelRealization, CircuitBreakerThresholds, SKULibraryState, LogisticsState, CashPlanInputs, VelocityTrackerState } from '../types';

function makeNode(label: string): SupplyChainNode {
  return {
    label,
    rawIngredients: 0,
    primaryPackaging: 0,
    secondaryPackaging: 0,
    tollProcessing: 0,
    inboundFreight: 0,
    unitsPerCase: 0,
    casesPerPallet: 0,
    pickPackFeePerCase: 0,
    ltlFreightPerPallet: 0,
  };
}

export const defaultCogsFreight: CogsFreightState = {
  nodes: [makeNode('LTL A'), makeNode('LTL B'), makeNode('FTL')],
};

export const defaultSKULibrary: SKULibraryState = {
  skus: [{
    id: 'sku-1',
    name: 'SKU 1',
    rawIngredients: 0,
    primaryPackaging: 0,
    secondaryPackaging: 0,
    tollProcessing: 0,
    inboundFreight: 0,
    unitsPerCase: 12,
    casesPerPallet: 42,
    volumeMixPct: 1.0,
  }],
};

export const defaultLogistics: LogisticsState = {
  nodes: [
    { label: 'LTL A', pickPackFeePerCase: 0, ltlFreightPerPallet: 0 },
    { label: 'LTL B', pickPackFeePerCase: 0, ltlFreightPerPallet: 0 },
    { label: 'FTL', pickPackFeePerCase: 0, ltlFreightPerPallet: 0 },
  ],
  storagePerPalletPerMonth: 25,
  avgMonthsOnHand: 1,
};

export const defaultGlobalOverhead: GlobalOverhead = {
  peoplePayroll: 180000,        // ~$15k/mo - founder + 1-2 part-time
  salesMarketing: 60000,        // ~$5k/mo
  facilitiesInsurance: 36000,   // ~$3k/mo
  professionalServices: 24000,  // ~$2k/mo
  technologySoftware: 12000,    // ~$1k/mo
  travelEntertainment: 18000,   // ~$1.5k/mo
  rdProductDev: 12000,          // ~$1k/mo
  generalAdmin: 6000,           // ~$500/mo
  miscellaneous: 6000,          // ~$500/mo
  marketingPctOfNetRev: 0.10,
  annualInterestRate: 0.15,
};

function makeChannel(
  id: string,
  name: string,
  dashboardLabel: string,
  overrides: Partial<ChannelInputs> = {}
): ChannelInputs {
  return {
    id,
    name,
    dashboardLabel,
    retailerMarginPct: 0.55,
    distMarginPct: 0.12,
    productMarginPct: 0.25,
    earlyPayPct: 0.02,
    brokerCommPct: 0,
    spoilagePct: 0.01,
    otherDeductionsPct: 0,
    tradeSpendPct: 0.15,
    slottingPerSkuPerStore: 0,
    estUnitsPerWeekPerStore: 3,
    warehousingPerPalletPerMonth: 25,
    warehousingMonthsOnHand: 1,
    warehousingUnitsPerPallet: 504,
    pctTraditionalGrocery: 1,
    supplyChainMix: [1, 0, 0],
    blendedInventoryDays: 90,
    arDays: 30,
    apDays: 30,
    unitsPerCase: 12,
    ...overrides,
  };
}

export const defaultChannels: Record<string, ChannelInputs> = {
  kehe: makeChannel('kehe', "NAT'L DISTRIBUTION", 'KeHE', {
    retailerMarginPct: 0.55,
    distMarginPct: 0.12,
    productMarginPct: 0.25,
    earlyPayPct: 0.02,
    brokerCommPct: 0,
    spoilagePct: 0.01,
    otherDeductionsPct: 0,
    tradeSpendPct: 0.15,
  }),
  club: makeChannel('club', 'CLUB', 'COSTCO', {
    retailerMarginPct: 0.14,
    distMarginPct: 0,
    productMarginPct: 0.53,
    earlyPayPct: 0.01,
    brokerCommPct: 0,
    spoilagePct: 0.01,
    otherDeductionsPct: 0,
    tradeSpendPct: 0,
    estUnitsPerWeekPerStore: 36,
    warehousingMonthsOnHand: 0.5,
  }),
  dsd: makeChannel('dsd', 'DSD', 'DSD', {
    retailerMarginPct: 0.40,
    distMarginPct: 0.25,
    productMarginPct: 0.30,
    earlyPayPct: 0.02,
    brokerCommPct: 0.05,
    spoilagePct: 0.02,
    tradeSpendPct: 0.10,
  }),
  online: makeChannel('online', 'ONLINE D2B', 'ONLINE D2B', {
    retailerMarginPct: 0.15,
    distMarginPct: 0,
    productMarginPct: 0.60,
    earlyPayPct: 0,
    brokerCommPct: 0,
    spoilagePct: 0.01,
    otherDeductionsPct: 0,
    tradeSpendPct: 0.05,
    estUnitsPerWeekPerStore: 10,
  }),
  altfdsvc: makeChannel('altfdsvc', 'ALT FDSVC', 'ALT FDSVC', {
    retailerMarginPct: 0.30,
    distMarginPct: 0.10,
    productMarginPct: 0.35,
    earlyPayPct: 0.01,
    brokerCommPct: 0.03,
    spoilagePct: 0.01,
    otherDeductionsPct: 0,
    tradeSpendPct: 0.05,
  }),
};

export const defaultDashboardMix: Record<string, number> = {
  kehe: 0.30,
  club: 0.20,
  dsd: 0.20,
  online: 0.10,
  altfdsvc: 0.20,
};

export const defaultBreakevenInputs: BreakevenInputs = {
  targetEbitdaDollars: 250000,
  scenarios: [
    { label: 'Survival', targetEbitda: 0 },
    { label: 'Modest Growth', targetEbitda: 100000 },
    { label: 'Aggressive', targetEbitda: 250000 },
    { label: 'Scale-Up', targetEbitda: 500000 },
  ],
};

export const defaultDebtEquityInputs: DebtEquityInputs = {
  // Capital Needs
  runwayMonths: 18,
  additionalCapital: 0,

  // LOC for Working Capital
  locRate: 0.10,
  locCommitmentFee: 0.005,
  locUtilization: 0.80,

  // Term Loan (for additional capital)
  termLoanApr: 0.12,
  termLoanYears: 3,

  // Equity Path
  equityPreMoneyVal: 3000000,
  revenueMultiple: 3,
  projectedExitYear: 5,
  projectedExitRevenue: 10000000,
};

export const defaultCashPlanInputs: CashPlanInputs = {
  cashOnHand: 100000,
  startingWeeklyUnits: 500,
  weeklyRampPct: 0.03,
  overheadMode: 'full',
  monthlyPlugAmount: 30000,
};

export const defaultChannelSKUToggles: Record<string, Record<string, boolean>> = {
  kehe: {},   // empty = all enabled (we'll use a helper)
  club: {},
  dsd: {},
  online: {},
  altfdsvc: {},
};

export const defaultVelocityTracker: VelocityTrackerState = {
  entries: [],
  categoryBenchmark: {
    category: 'Natural / Organic',
    lowVelocity: 1.5,
    medVelocity: 3.0,
    highVelocity: 3.0,
  },
  totalCategoryDoors: 40000,
};

export const defaultChannelRealization: ChannelRealization = {
  kehe: 1.0,
  club: 1.0,
  dsd: 1.0,
  online: 1.0,
  altfdsvc: 1.0,
};

export const defaultCircuitBreakerThresholds: CircuitBreakerThresholds = {
  availableCash: 500000,
  maxMonthlyBurn: 30000,
  minAnnualEbitda: 0,
  maxDebtCapacity: 750000,
  minContribMarginPct: 0.15,
};
