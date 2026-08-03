export interface CompanyProfile {
  companyName: string;
  tagline: string;
}

// ── SKU LIBRARY (multi-SKU architecture) ──
export interface SKU {
  id: string;
  name: string;
  rawIngredients: number;
  primaryPackaging: number;
  secondaryPackaging: number;
  plantOverhead: number;
  globalOverhead: number;
  inboundFreight: number;
  unitsPerCase: number;
  casesPerPallet: number;
  volumeMixPct: number; // what % of total company volume is this SKU (0-1, all SKUs should sum to 1)
  tier?: string;  // Product tier (e.g., 'Savory', 'Sweet', 'Premium')
}

// Per-tier margin overrides for channel pricing
export interface TierMargins {
  retailerMarginPct: number;
  distMarginPct: number;
  productMarginPct: number;
}

export interface SKULibraryState {
  skus: SKU[];
  globalOverheadEnabled?: boolean; // DEPRECATED — kept for import compat
  globalOverheadPct?: number; // 0-1 slider: how much Global OH is included in COGS (default 1)
}

// Logistics node — company-level freight rates
export interface LogisticsNode {
  label: string;
  pickPackFeePerCase: number;
  ltlFreightPerPallet: number;
}

export interface LogisticsState {
  nodes: LogisticsNode[];
  // Company-level warehousing (entered once, applies to all channels)
  storagePerPalletPerMonth: number;
  avgMonthsOnHand: number;
}

// Per-SKU computed outputs for a logistics node
export interface SKUNodeOutputs {
  totalMfgCogs: number;
  totalUnitsPerPallet: number;
  threePLCostPerUnit: number;
  freightCostPerUnit: number;
  totalOutboundPerUnit: number;
  trueLandedCogs: number;
}

// Supply Chain Node (LTL A, LTL B, FTL) — kept for backward compat
export interface SupplyChainNode {
  label: string;
  rawIngredients: number;
  primaryPackaging: number;
  secondaryPackaging: number;
  plantOverhead: number;
  globalOverhead: number;
  inboundFreight: number;
  unitsPerCase: number;
  casesPerPallet: number;
  pickPackFeePerCase: number;
  ltlFreightPerPallet: number;
}

export interface CogsFreightState {
  nodes: SupplyChainNode[];
}

// Computed outputs from a supply chain node
export interface NodeOutputs {
  totalMfgCogs: number;
  totalUnitsPerPallet: number;
  threePLCostPerUnit: number;
  freightCostPerUnit: number;
  totalOutboundPerUnit: number;
  trueLandedCogs: number;
}

// ── GLOBAL COMPANY-LEVEL INPUTS (entered once, allocated proportionally) ──
export interface GlobalOverhead {
  // 9-category chart of accounts (all stored as ANNUAL amounts)
  peoplePayroll: number;          // Founder comp, sales team, marketing, ops, finance/admin, benefits & payroll taxes
  salesMarketing: number;         // Digital/social, sampling & demos, trade shows, PR/influencer, brand creative
  facilitiesInsurance: number;    // Rent, utilities, GL/product liability/D&O insurance
  professionalServices: number;   // Legal, accounting/audit, consulting, food safety/regulatory
  technologySoftware: number;     // ERP/inventory, ecommerce, CRM, analytics tools
  travelEntertainment: number;    // Customer visits, trade shows, team travel
  rdProductDev: number;           // New product dev, lab testing, certifications, packaging design
  generalAdmin: number;           // Office supplies, telecom, bank/merchant fees
  miscellaneous: number;          // Catch-all for anything that doesn't fit above

  // Target volume for OH allocation
  targetAnnualVolume: number;     // Expected annual unit volume — company OH is divided by this to get $/unit

  // Keep these unchanged
  marketingPctOfNetRev: number;   // Variable SG&A as % of net revenue
  annualInterestRate: number;     // Cost of capital APR
}

// Channel-specific inputs (no overhead — that's global now)
export interface ChannelInputs {
  id: string;
  name: string;
  dashboardLabel: string;
  // Tiered Pricing
  retailerMarginPct: number;
  distMarginPct: number;
  productMarginPct: number;
  // GtN Dilution
  earlyPayPct: number;
  brokerCommPct: number;
  spoilagePct: number;
  otherDeductionsPct: number;
  tradeSpendPct: number;
  slottingPerSkuPerStore: number;
  estUnitsPerWeekPerStore: number;
  warehousingPerPalletPerMonth: number;
  warehousingMonthsOnHand: number;
  warehousingUnitsPerPallet: number;
  // Channel Mixer
  pctTraditionalGrocery: number;
  // Supply Chain Mixer
  supplyChainMix: number[];  // one entry per logistics node, should sum to 1.0
  blendedInventoryDays: number;
  // Working Capital
  arDays: number;
  apDays: number;
  // Unit conversion
  unitsPerCase: number;
  // Per-channel SKU volume mix (skuId → 0-1 fraction; should sum to 1.0)
  skuVolumeMix?: Record<string, number>;
  // Per-tier margin overrides (tier name → margins)
  tierOverrides?: Record<string, TierMargins>;
}

// Computed channel outputs
export interface ChannelOutputs {
  blendedCogs: number;
  blendedFreight: number;
  blendedGtnMultiplier: number;
  msrp: number;
  retailerMarginDollar: number;
  priceToRetailer: number;
  distMarginDollar: number;
  priceToDistrib: number;
  brandMarginDollar: number;
  earlyPayDollar: number;
  brokerCommDollar: number;
  spoilageDollar: number;
  otherDeductionsDollar: number;
  tradeSpendDollar: number;
  slottingCostPerUnit: number;
  warehousingCostPerUnit: number;
  freightOutDollar: number;
  totalDeductions: number;
  netRevenue: number;
  contributionMarginDollar: number;
  contributionMarginPct: number;
  // Working Capital (channel-level)
  cashConversionCycle: number;
}

// ── EXECUTIVE DASHBOARD ──
export interface DashboardChannel {
  id: string;
  name: string;
  mixPct: number;
  netRevPerUnit: number;
  contributionMarginPerUnit: number;
  contributionMarginPct: number;
  cogsPerUnit: number;
  cccDays: number;
}

export interface BlendedFinancials {
  // Channel summary
  channels: DashboardChannel[];
  blendedNetRev: number;
  blendedContribMargin: number;
  blendedContribMarginPct: number;
  blendedCogs: number;
  blendedCCC: number;

  // Global Overhead applied
  totalFixedCosts: number;
  companyOHPerUnit: number;        // totalFixedCosts / targetAnnualVolume (auto-computed)
  effectiveOHPerUnit: number;      // companyOHPerUnit × slider %
  plantCogs: number;               // blended COGS without company OH
  marketingPerUnit: number;
  adjustedContribMargin: number;

  // Run-Rate Cash Generator / Forecasting
  blendedGrossRevPerUnit: number;  // Brand's top-line price (price to distributor/retailer, NOT MSRP)
  targetAnnualNetRev: number;
  grossRevenue: number;            // impliedUnits × blendedGrossRevPerUnit
  impliedUnits: number;
  blendedCashGenerated: number;
  annualOverhead: number;
  annualMarketing: number;
  operatingCashFlow: number; // EBITDA proxy

  // Working Capital & Cash Needs (blended)
  peakInventoryCash: number;
  accountsReceivable: number;
  accountsPayable: number;
  netWorkingCapital: number;
  overheadBurnDuringCycle: number;
  totalCashFloat: number;

  // Cost of Capital (blended)
  annualInterestCost: number;
  debtBurdenPerUnit: number;
  finalCashMarginPerUnit: number;
  maxAllowableApr: number;
  debtViability: string;

  // Self-Funded Growth
  newUnitsPerSold: number;
  annualCapitalTurns: number;
  maxSelfFundedGrowth: number;

  // Valuation Estimator
  impliedRevenueMultiple: number;
}

// ── BREAKEVEN & TARGET EBITDA ──
export interface BreakevenInputs {
  targetEbitdaDollars: number;
  scenarios: { label: string; targetEbitda: number }[];
}

export interface BreakevenOutputs {
  breakevenUnits: number | string;
  breakevenRevenue: number | string;
  breakevenPallets: number | string;
  breakevenContainers: number | string;
  targetUnits: number | string;
  targetRevenue: number | string;
  targetPallets: number | string;
  targetContainers: number | string;
  adjustedContribPerUnit: number;
  totalFixedCosts: number;
  scenarios: {
    label: string;
    targetEbitda: number;
    requiredUnits: number | string;
    requiredRevenue: number | string;
    requiredPallets: number | string;
  }[];
}

// ── DEBT VS EQUITY DECISION TOOL ──
export interface DebtEquityInputs {
  // Capital Needs (user adjustments)
  runwayMonths: number;           // desired months of operating runway (if EBITDA-negative)
  additionalCapital: number;      // manual capex / R&D / other

  // Debt Path — LOC for Working Capital
  locRate: number;                // annual interest rate on line of credit
  locCommitmentFee: number;       // fee on undrawn portion (annual %)
  locUtilization: number;         // avg draw % (0-1)

  // Debt Path — Term Loan (for additional capital)
  termLoanApr: number;
  termLoanYears: number;

  // Equity Path
  equityPreMoneyVal: number;
  revenueMultiple: number;
  projectedExitYear: number;
  projectedExitRevenue: number;
}

export interface DebtEquityOutputs {
  // Capital Needs Analysis
  workingCapitalNeed: number;     // from blended totalCashFloat (inventory + AR - AP)
  monthlyBurn: number;            // monthly overhead + negative margin burn
  operatingRunwayNeed: number;    // months × monthly burn (only if EBITDA-negative)
  additionalCapital: number;
  totalCapitalNeed: number;
  debtAppropriate: number;        // WC portion → LOC candidate
  equityAppropriate: number;      // runway + additional → equity candidate

  // Debt Path — LOC Analysis
  locDrawAmount: number;
  annualLocInterest: number;
  annualCommitmentFee: number;
  totalAnnualLocCost: number;
  locDscr: number;
  locFeasible: boolean;

  // Debt Path — Term Loan (if additional capital via debt)
  termMonthlyPayment: number;
  termAnnualService: number;
  termTotalInterest: number;
  termDscr: number;
  termFeasible: boolean;

  // Equity Path
  equityRaiseAmount: number;      // equity-appropriate capital
  equityDilution: number;
  postMoneyVal: number;
  impliedOwnershipRetained: number;
  investorReturnAtExit: number;
  founderValueAtExit: number;
  costOfEquity: number;

  // Blended Verdict
  optimalDebtPct: number;
  optimalEquityPct: number;
  blendedAnnualCost: number;
  recommendation: string;
  debtCostAsMultiple: number;
  equityCostAsMultiple: number;
}

// ── 13-WEEK CASH PLAN ──
export interface CashPlanInputs {
  cashOnHand: number;           // Starting cash balance
  startingWeeklyUnits: number;  // Current weekly unit run rate
  weeklyRampPct: number;        // % change per week (e.g., 0.05 = 5% growth/week)
  overheadMode: 'full' | 'plug'; // Full Model vs Simple Plug
  monthlyPlugAmount: number;    // Used when overheadMode === 'plug'
}

// ── PROFORMA STRUCTURAL CAPACITY ──
export interface ChannelRealization {
  [channelId: string]: number; // 0-1, default 1.0 (100%)
}

export interface CircuitBreakerThresholds {
  availableCash: number;        // Total cash/credit the company has access to
  maxMonthlyBurn: number;       // Maximum acceptable monthly cash burn
  minAnnualEbitda: number;      // Minimum acceptable annual EBITDA
  maxDebtCapacity: number;      // Maximum debt the company can take on
  minContribMarginPct: number;  // Minimum acceptable blended contribution margin %
}

export interface CircuitBreakerStatus {
  id: string;
  label: string;
  status: 'green' | 'yellow' | 'red';
  message: string;
  currentValue: number | string;
  threshold: number | string;
}

export interface ProFormaRow {
  realizationPct: number;
  grossRevenue: number;
  netRevenue: number;
  totalCogs: number;
  contributionMargin: number;
  overhead: number;
  ebitda: number;
  workingCapitalNeeded: number;
  totalCashFloat: number;
  circuitBreakers: CircuitBreakerStatus[];
}

// ── DEAL SCORER ──
export interface DealProposal {
  id: string;
  retailerName: string;
  channelType: string;
  // Proposed terms (override channel defaults)
  retailerMarginPct: number;
  distMarginPct: number;
  productMarginPct: number;
  earlyPayPct: number;
  brokerCommPct: number;
  spoilagePct: number;
  otherDeductionsPct: number;
  tradeSpendPct: number;
  slottingPerSkuPerStore: number;
  // Deal specifics
  proposedDoors: number;
  proposedVelocity: number; // units per store per week
  proposedVolumeCommitment: number; // annual units (0 = calculate from doors × velocity)
  // Computed (not user input)
  createdAt: string;
}

export interface DealVerdict {
  score: 'GO' | 'CAUTION' | 'NO-GO';
  headline: string;
  reasons: string[];
  // Comparison metrics
  currentNetRevPerUnit: number;
  proposedNetRevPerUnit: number;
  netRevDelta: number;
  netRevDeltaPct: number;
  currentContribMarginPerUnit: number;
  proposedContribMarginPerUnit: number;
  contribMarginDelta: number;
  contribMarginDeltaPct: number;
  // Volume math
  annualUnits: number;
  annualNetRevenue: number;
  annualContribMargin: number;
  overheadAbsorption: number; // what % of company overhead this deal covers
  // Breakeven
  breakevenDoors: number; // minimum doors where this deal is margin-accretive to blended
  breakevenVelocity: number; // minimum velocity at proposed doors
  // Blended impact
  blendedMarginWithDeal: number;
  blendedMarginWithoutDeal: number;
  blendedMarginImpactPct: number;
}

// ── PIPELINE TRACKER ──
export type DealStatus = 'prospect' | 'negotiating' | 'committed' | 'live' | 'lost';

export interface PipelineDeal {
  id: string;
  retailerName: string;
  channelType: string;
  status: DealStatus;
  doors: number;
  velocity: number; // UPSPW
  // Terms snapshot (from Deal Scorer or manual)
  retailerMarginPct: number;
  distMarginPct: number;
  productMarginPct: number;
  earlyPayPct: number;
  brokerCommPct: number;
  spoilagePct: number;
  otherDeductionsPct: number;
  tradeSpendPct: number;
  slottingPerSkuPerStore: number;
  // Computed
  annualUnits: number;
  netRevPerUnit: number;
  annualNetRevenue: number;
  contribMarginPerUnit: number;
  // Metadata
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── VELOCITY & DISTRIBUTION TRACKER ──
export interface VelocityEntry {
  id: string;
  retailerName: string;
  channelType: string;
  doors: number;
  unitsSold: number;
  periodWeeks: number;
  periodLabel: string;
  enteredAt: string;
}

export interface VelocityBenchmark {
  category: string;
  lowVelocity: number;
  medVelocity: number;
  highVelocity: number;
}

export interface VelocityTrackerState {
  entries: VelocityEntry[];
  categoryBenchmark: VelocityBenchmark;
  totalCategoryDoors: number;
}

export type TabId = 'skus' | 'logistics' | 'overhead' | 'kehe' | 'club' | 'dsd' | 'online' | 'altfdsvc' | 'dashboard' | 'viability' | 'optimizer' | 'debtequity' | 'cashplan' | 'dealscorer' | 'pipeline' | 'velocity' | 'whatif';

export interface AppState {
  activeTab: TabId;
  skuLibrary: SKULibraryState;
  logistics: LogisticsState;
  cogsFreight: CogsFreightState;
  channels: Record<string, ChannelInputs>;
  globalOverhead: GlobalOverhead;
  dashboardMix: Record<string, number>;
  dashboardTargetRev: number;
  breakevenInputs: BreakevenInputs;
  debtEquityInputs: DebtEquityInputs;
  channelRealization: ChannelRealization;
  circuitBreakerThresholds: CircuitBreakerThresholds;
  channelSKUToggles: Record<string, Record<string, boolean>>; // channelId → skuId → enabled
  velocityTracker: VelocityTrackerState;
}
