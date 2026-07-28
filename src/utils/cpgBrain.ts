// ═══════════════════════════════════════════════════════════════════
// CPG BENCHMARK BRAIN — Intelligence Layer for True Margin CPG
// ═══════════════════════════════════════════════════════════════════

// ── COMPANY STAGES ──────────────────────────────────────────────────

export type CompanyStage = 'pre-revenue' | 'market-entry' | 'growth' | 'scale' | 'exit-ready';

export interface StageProfile {
  id: CompanyStage;
  label: string;
  revenueRange: string;
  emoji: string;
  color: string;
  description: string;
  focusAreas: string[];
  criticalTabs: string[];
  goGet: string;
  overheadPctOfRev: [number, number];
  typicalDoors: [number, number];
}

export const STAGES: StageProfile[] = [
  {
    id: 'pre-revenue',
    label: 'Pre-Revenue / R&D',
    revenueRange: '$0 – $250K',
    emoji: '🌱',
    color: 'text-info',
    description: 'Developing product and preparing for market entry.',
    focusAreas: ['Nail COGS', 'Find first 50 doors', 'Validate pricing architecture'],
    criticalTabs: ['skus', 'logistics', 'overhead'],
    goGet: "Your #1 job is getting COGS locked and landing your first channel. Don't spread across channels yet — prove velocity in ONE.",
    overheadPctOfRev: [0.80, 1.50],
    typicalDoors: [0, 100],
  },
  {
    id: 'market-entry',
    label: 'Market Entry',
    revenueRange: '$250K – $1M',
    emoji: '🚀',
    color: 'text-primary',
    description: 'In market, proving velocity and product-market fit.',
    focusAreas: ['Prove velocity in beachhead channel', 'Control trade spend', 'Build repeat purchase data'],
    criticalTabs: ['dealscorer', 'velocity', 'kehe'],
    goGet: 'Velocity is everything right now. Prove 2.0+ UPSPW in your lead channel before expanding. Every new door must earn its keep.',
    overheadPctOfRev: [0.45, 0.75],
    typicalDoors: [50, 500],
  },
  {
    id: 'growth',
    label: 'Growth',
    revenueRange: '$1M – $5M',
    emoji: '📈',
    color: 'text-success',
    description: 'Multi-channel expansion with trade spend discipline.',
    focusAreas: ['Channel diversification', 'Trade spend discipline', 'Working capital management'],
    criticalTabs: ['pipeline', 'dashboard', 'debtequity'],
    goGet: "You're growing — don't let trade spend eat your margin. Every channel you add should be accretive to blended contribution margin.",
    overheadPctOfRev: [0.30, 0.50],
    typicalDoors: [300, 3000],
  },
  {
    id: 'scale',
    label: 'Scale',
    revenueRange: '$5M – $30M',
    emoji: '⚡',
    color: 'text-warning',
    description: 'Scaling operations, optimizing capital structure.',
    focusAreas: ['Capital structure optimization', 'Overhead leverage', 'Concentration risk management'],
    criticalTabs: ['optimizer', 'debtequity', 'cashplan'],
    goGet: "You're at scale. Focus on overhead leverage — your fixed costs should be shrinking as % of revenue. PE firms are watching your margin trajectory.",
    overheadPctOfRev: [0.18, 0.35],
    typicalDoors: [2000, 15000],
  },
  {
    id: 'exit-ready',
    label: 'Exit Ready',
    revenueRange: '$30M+',
    emoji: '🏆',
    color: 'text-accent',
    description: 'PE-grade operations, proving the architecture works.',
    focusAreas: ['Margin quality proof', 'Velocity consistency', 'Clean financials', 'Diversification proof'],
    criticalTabs: ['viability', 'velocity', 'pipeline'],
    goGet: "You're in PE territory. Every metric must tell a story of structural health — margin quality, velocity proof, diversified revenue, and operating leverage.",
    overheadPctOfRev: [0.12, 0.25],
    typicalDoors: [10000, 50000],
  },
];

export function detectStage(annualNetRevenue: number): StageProfile {
  if (annualNetRevenue < 250_000) return STAGES[0];
  if (annualNetRevenue < 1_000_000) return STAGES[1];
  if (annualNetRevenue < 5_000_000) return STAGES[2];
  if (annualNetRevenue < 30_000_000) return STAGES[3];
  return STAGES[4];
}

// ── CATEGORY BENCHMARKS ─────────────────────────────────────────────

export interface CategoryBenchmark {
  id: string;
  label: string;
  velocityRange: { low: number; mid: number; high: number };
  contribMarginRange: { weak: number; ok: number; strong: number };
  typicalTradeSpend: { low: number; mid: number; high: number };
  typicalGtNDilution: Record<string, [number, number]>;
  workingCapitalDays: { low: number; mid: number; high: number };
  notes: string;
}

export const CATEGORIES: CategoryBenchmark[] = [
  {
    id: 'beverage',
    label: 'Beverages (RTD)',
    velocityRange: { low: 1.0, mid: 2.0, high: 4.0 },
    contribMarginRange: { weak: 0.20, ok: 0.32, strong: 0.45 },
    typicalTradeSpend: { low: 0.12, mid: 0.18, high: 0.28 },
    typicalGtNDilution: { kehe: [0.35, 0.50], club: [0.40, 0.55], dsd: [0.25, 0.40], online: [0.20, 0.35], altfdsvc: [0.20, 0.35] },
    workingCapitalDays: { low: 35, mid: 55, high: 80 },
    notes: 'Beverage is volume-driven with thin margins. Velocity > 2.0 UPSPW needed for shelf survival. Club is high-volume but margin-compressive.',
  },
  {
    id: 'snacks',
    label: 'Snacks & Bars',
    velocityRange: { low: 0.8, mid: 1.8, high: 3.5 },
    contribMarginRange: { weak: 0.22, ok: 0.35, strong: 0.50 },
    typicalTradeSpend: { low: 0.10, mid: 0.16, high: 0.25 },
    typicalGtNDilution: { kehe: [0.30, 0.45], club: [0.35, 0.50], dsd: [0.20, 0.35], online: [0.18, 0.30], altfdsvc: [0.18, 0.30] },
    workingCapitalDays: { low: 30, mid: 50, high: 75 },
    notes: 'Competitive but higher-margin than beverage. Innovation premium matters. DSD can be highly profitable if route density supports it.',
  },
  {
    id: 'frozen',
    label: 'Frozen Foods',
    velocityRange: { low: 0.6, mid: 1.5, high: 3.0 },
    contribMarginRange: { weak: 0.18, ok: 0.30, strong: 0.42 },
    typicalTradeSpend: { low: 0.14, mid: 0.20, high: 0.30 },
    typicalGtNDilution: { kehe: [0.35, 0.52], club: [0.40, 0.55], dsd: [0.28, 0.42], online: [0.25, 0.40], altfdsvc: [0.22, 0.35] },
    workingCapitalDays: { low: 40, mid: 65, high: 95 },
    notes: 'Higher logistics costs (cold chain). Slotting fees significant. Lower velocity benchmarks than ambient. Cold storage adds ~$0.15-0.30/unit.',
  },
  {
    id: 'refrigerated',
    label: 'Refrigerated',
    velocityRange: { low: 0.7, mid: 1.6, high: 3.2 },
    contribMarginRange: { weak: 0.20, ok: 0.33, strong: 0.45 },
    typicalTradeSpend: { low: 0.12, mid: 0.18, high: 0.27 },
    typicalGtNDilution: { kehe: [0.32, 0.48], club: [0.38, 0.52], dsd: [0.22, 0.38], online: [0.22, 0.35], altfdsvc: [0.20, 0.32] },
    workingCapitalDays: { low: 25, mid: 45, high: 65 },
    notes: 'Shorter shelf life = faster turns but higher spoilage risk. Working capital turns faster. DSD is common for refrigerated.',
  },
  {
    id: 'shelf-stable',
    label: 'Shelf-Stable (Sauces, Condiments, Pantry)',
    velocityRange: { low: 0.5, mid: 1.2, high: 2.5 },
    contribMarginRange: { weak: 0.25, ok: 0.38, strong: 0.55 },
    typicalTradeSpend: { low: 0.10, mid: 0.15, high: 0.22 },
    typicalGtNDilution: { kehe: [0.30, 0.45], club: [0.35, 0.48], dsd: [0.20, 0.32], online: [0.15, 0.28], altfdsvc: [0.15, 0.28] },
    workingCapitalDays: { low: 45, mid: 70, high: 100 },
    notes: 'Longest shelf life = lowest spoilage but slowest turns. Higher margins compensate for lower velocity. Good for DTC/online.',
  },
  {
    id: 'supplements',
    label: 'Supplements & Wellness',
    velocityRange: { low: 0.4, mid: 1.0, high: 2.2 },
    contribMarginRange: { weak: 0.35, ok: 0.50, strong: 0.70 },
    typicalTradeSpend: { low: 0.08, mid: 0.14, high: 0.22 },
    typicalGtNDilution: { kehe: [0.28, 0.42], club: [0.32, 0.45], dsd: [0.18, 0.30], online: [0.12, 0.25], altfdsvc: [0.15, 0.28] },
    workingCapitalDays: { low: 50, mid: 80, high: 120 },
    notes: 'Highest margins in CPG but lowest velocity. Online/DTC often best channel. Regulatory costs = hidden overhead. Long inventory cycles.',
  },
  {
    id: 'meat-protein',
    label: 'Meat & Protein (Jerky, etc.)',
    velocityRange: { low: 0.6, mid: 1.4, high: 2.8 },
    contribMarginRange: { weak: 0.18, ok: 0.30, strong: 0.42 },
    typicalTradeSpend: { low: 0.12, mid: 0.18, high: 0.26 },
    typicalGtNDilution: { kehe: [0.32, 0.48], club: [0.38, 0.52], dsd: [0.22, 0.36], online: [0.18, 0.30], altfdsvc: [0.20, 0.32] },
    workingCapitalDays: { low: 35, mid: 55, high: 80 },
    notes: 'COGS-intensive (raw protein is expensive). Margin improvement comes from production scale. Club volume can be transformative if COGS are tight.',
  },
  {
    id: 'baby-kids',
    label: 'Baby & Kids Food',
    velocityRange: { low: 0.8, mid: 1.8, high: 3.5 },
    contribMarginRange: { weak: 0.22, ok: 0.35, strong: 0.48 },
    typicalTradeSpend: { low: 0.10, mid: 0.16, high: 0.24 },
    typicalGtNDilution: { kehe: [0.30, 0.45], club: [0.35, 0.50], dsd: [0.20, 0.35], online: [0.15, 0.28], altfdsvc: [0.18, 0.30] },
    workingCapitalDays: { low: 30, mid: 50, high: 75 },
    notes: 'Loyal repeat buyers = predictable velocity. Premium pricing accepted. Online subscription works well. Regulatory compliance costs are real.',
  },
];

// ── RETAILER INTELLIGENCE ───────────────────────────────────────────

export interface RetailerIntel {
  name: string;
  channel: string;
  typicalRetailerMargin: [number, number];
  typicalVelocityExpectation: number;
  slottingRange: [number, number];
  paymentTerms: string;
  gotchas: string[];
  tips: string[];
  resetTiming: string;
  difficultyRating: 1 | 2 | 3 | 4 | 5;
}

export const RETAILERS: RetailerIntel[] = [
  {
    name: 'Whole Foods (National)',
    channel: 'kehe',
    typicalRetailerMargin: [0.40, 0.50],
    typicalVelocityExpectation: 1.5,
    slottingRange: [0, 50],
    paymentTerms: 'Net 30 via UNFI',
    gotchas: [
      'Regional vs national are different buyers — start regional',
      'Local Forager program has lower velocity threshold but limited shelf life',
      'UNFI margin stack adds 15-20% on top of WFM margin',
      'Quarterly reviews — velocity below 1.5 UPSPW risks discontinuation',
    ],
    tips: [
      'Start with Local Forager program in 1-2 regions',
      'Demo programs drive 2-3x velocity during promo',
      'Clean label and certifications (Non-GMO, Organic) are table stakes',
      'Build relationship with regional coordinator before pitching national',
    ],
    resetTiming: 'Category reviews quarterly; major resets in Q1 and Q3',
    difficultyRating: 3,
  },
  {
    name: 'Costco',
    channel: 'club',
    typicalRetailerMargin: [0.13, 0.15],
    typicalVelocityExpectation: 2.5,
    slottingRange: [0, 0],
    paymentTerms: 'Net 14-21 (fast pay)',
    gotchas: [
      'Demo program costs $150-200/store/weekend — budget accordingly',
      'Volume commitment is massive — ensure supply chain can handle it',
      'They want 15-20% below your best wholesale price',
      'One bad quarter on velocity and you\'re out — no second chances',
      'Pallet quantities required — not cases',
    ],
    tips: [
      'Roadshow/regional test before national commitment',
      'Budget $50K-100K for demo programs',
      'Have 90 days of safety stock before going live',
      'Low margin (13-15%) but enormous volume',
      'Cash flow positive faster than any other channel (fast payment terms)',
    ],
    resetTiming: 'Continuous review — no set resets, buyer discretion',
    difficultyRating: 5,
  },
  {
    name: 'Sprouts',
    channel: 'kehe',
    typicalRetailerMargin: [0.40, 0.48],
    typicalVelocityExpectation: 1.2,
    slottingRange: [0, 25],
    paymentTerms: 'Net 30 via UNFI/KeHE',
    gotchas: [
      'Limited shelf space — they curate tightly',
      'Health/natural positioning is mandatory',
      'Category captains have heavy influence',
    ],
    tips: [
      'Great proving ground for natural/organic brands',
      'Lower velocity threshold than WFM — good for building velocity story',
      'Demo programs are effective and cheaper than Costco',
      'Regional rollout strategy works well',
    ],
    resetTiming: 'Twice annually — Q1 and Q3 category reviews',
    difficultyRating: 2,
  },
  {
    name: 'Kroger',
    channel: 'kehe',
    typicalRetailerMargin: [0.35, 0.42],
    typicalVelocityExpectation: 1.8,
    slottingRange: [50, 300],
    paymentTerms: 'Net 30-45',
    gotchas: [
      'Significant slotting fees — budget $50K+ for a meaningful set',
      'RFP-driven buying process — highly structured',
      'Private label competition is fierce',
      'Velocity expectations higher than specialty retailers',
    ],
    tips: [
      'Start with natural/organic set (Simple Truth adjacency)',
      'Data storytelling is critical — bring IRI/SPINS data',
      '84.51° data platform can help optimize placement',
      'Regional divisions have some autonomy — target 1-2 first',
    ],
    resetTiming: 'Annual category reviews, varies by division',
    difficultyRating: 4,
  },
  {
    name: 'Target',
    channel: 'kehe',
    typicalRetailerMargin: [0.38, 0.45],
    typicalVelocityExpectation: 2.0,
    slottingRange: [0, 200],
    paymentTerms: 'Net 30',
    gotchas: [
      'Velocity expectations are high — they want proven winners',
      'Online marketplace (Target+) can be an easier entry point',
      'End-cap and secondary placement fees add up',
      'POG resets are rigid and competitive',
    ],
    tips: [
      'Start with Target+ online to prove demand',
      'Target Forward (emerging brands program) is a great entry point',
      'Millennial/Gen-Z positioning resonates with their demo',
      'In-store pickup drives both online and physical velocity',
    ],
    resetTiming: 'POG resets twice annually — Spring and Fall',
    difficultyRating: 4,
  },
  {
    name: 'Amazon (Marketplace)',
    channel: 'online',
    typicalRetailerMargin: [0.15, 0.20],
    typicalVelocityExpectation: 0,
    slottingRange: [0, 0],
    paymentTerms: 'Net 14 (2-week disbursements)',
    gotchas: [
      'Advertising costs typically 25-35% of revenue — massive hidden GtN',
      'Subscribe & Save discount (5-15%) eats margin',
      'FBA fees vary by size/weight — model carefully',
      'Price parity clauses limit pricing flexibility elsewhere',
      'Counterfeit/unauthorized reseller risk',
    ],
    tips: [
      'Budget 25-30% of Amazon revenue for advertising minimum',
      'Subscribe & Save builds predictable revenue but compresses margin',
      'Use Amazon as proof-of-demand for retail buyer conversations',
      'Brand Registry is mandatory to protect your listing',
      'Vine reviews program for new ASINs',
    ],
    resetTiming: 'Always on — algorithmic placement',
    difficultyRating: 2,
  },
  {
    name: 'Natural Independents',
    channel: 'dsd',
    typicalRetailerMargin: [0.35, 0.50],
    typicalVelocityExpectation: 0.8,
    slottingRange: [0, 15],
    paymentTerms: 'Net 15-30 (varies widely)',
    gotchas: [
      'Each store is its own buyer — slow to scale',
      'Payment collection can be inconsistent',
      'Route density is critical for DSD profitability',
      'Spoilage/returns less formalized than chain retail',
    ],
    tips: [
      'Best channel for building velocity story with minimal capital',
      'Store-level relationships drive reorders',
      'Great for demos and sampling — lower barrier than chains',
      'Build 30-50 store base before approaching distributors',
    ],
    resetTiming: 'Rolling — owner/buyer discretion',
    difficultyRating: 1,
  },
];

// ── BENCHMARK EVALUATION HELPERS ────────────────────────────────────

export type BenchmarkLevel = 'danger' | 'caution' | 'good' | 'great';

export interface BenchmarkResult {
  level: BenchmarkLevel;
  emoji: string;
  label: string;
  context: string;
  badgeClass: string;
}

function evaluateBenchmark(
  value: number,
  thresholds: { danger: number; caution: number; good: number },
  labels: { danger: string; caution: string; good: string; great: string },
  higherIsBetter = true,
): BenchmarkResult {
  const compare = higherIsBetter
    ? (v: number, t: number) => v >= t
    : (v: number, t: number) => v <= t;

  if (compare(value, thresholds.good)) {
    return { level: 'great', emoji: '🌟', label: labels.great, context: labels.great, badgeClass: 'badge-success' };
  }
  if (compare(value, thresholds.caution)) {
    return { level: 'good', emoji: '✅', label: labels.good, context: labels.good, badgeClass: 'badge-success' };
  }
  if (compare(value, thresholds.danger)) {
    return { level: 'caution', emoji: '⚠️', label: labels.caution, context: labels.caution, badgeClass: 'badge-warning' };
  }
  return { level: 'danger', emoji: '🔴', label: labels.danger, context: labels.danger, badgeClass: 'badge-error' };
}

export function evalContribMargin(cmPct: number, categoryId?: string): BenchmarkResult {
  const cat = categoryId ? CATEGORIES.find(c => c.id === categoryId) : undefined;
  const thresholds = cat
    ? { danger: cat.contribMarginRange.weak, caution: cat.contribMarginRange.ok, good: cat.contribMarginRange.strong }
    : { danger: 0.20, caution: 0.30, good: 0.40 };
  const catLabel = cat ? ` for ${cat.label}` : '';
  return evaluateBenchmark(cmPct, thresholds, {
    danger: `Below investment threshold${catLabel}`,
    caution: `Below category median${catLabel}`,
    good: `Above median${catLabel} — investable`,
    great: `Top quartile${catLabel} — PE-attractive`,
  });
}

export function evalVelocity(upspw: number, categoryId?: string): BenchmarkResult {
  const cat = categoryId ? CATEGORIES.find(c => c.id === categoryId) : undefined;
  const thresholds = cat
    ? { danger: cat.velocityRange.low * 0.5, caution: cat.velocityRange.low, good: cat.velocityRange.mid }
    : { danger: 0.5, caution: 1.0, good: 2.0 };
  const catLabel = cat ? ` for ${cat.label}` : '';
  return evaluateBenchmark(upspw, thresholds, {
    danger: `Critically low velocity${catLabel} — shelf risk`,
    caution: `Below category floor${catLabel}`,
    good: `Healthy velocity${catLabel}`,
    great: `Strong velocity${catLabel} — retailer favorite`,
  });
}

export function evalTradeSpend(tradePct: number, categoryId?: string): BenchmarkResult {
  const cat = categoryId ? CATEGORIES.find(c => c.id === categoryId) : undefined;
  const thresholds = cat
    ? { danger: cat.typicalTradeSpend.high * 1.2, caution: cat.typicalTradeSpend.high, good: cat.typicalTradeSpend.mid }
    : { danger: 0.30, caution: 0.25, good: 0.18 };
  const catLabel = cat ? ` for ${cat.label}` : '';
  return evaluateBenchmark(tradePct, thresholds, {
    danger: `Trade spend dangerously high${catLabel} — margin killer`,
    caution: `Trade spend above typical${catLabel}`,
    good: `Trade spend in normal range${catLabel}`,
    great: `Trade spend well-controlled${catLabel}`,
  }, false);
}

export function evalGtNDilution(dilutionPct: number, channelId: string, categoryId?: string): BenchmarkResult {
  const cat = categoryId ? CATEGORIES.find(c => c.id === categoryId) : undefined;
  const channelRange = cat?.typicalGtNDilution[channelId];
  const midpoint = channelRange ? (channelRange[0] + channelRange[1]) / 2 : 0.38;
  const high = channelRange ? channelRange[1] : 0.50;
  return evaluateBenchmark(dilutionPct, {
    danger: high * 1.15,
    caution: high,
    good: midpoint,
  }, {
    danger: 'GtN dilution extreme — check deductions',
    caution: 'GtN dilution above typical for this channel',
    good: 'GtN dilution within normal range',
    great: 'GtN dilution tight — well-structured deal',
  }, false);
}

export function evalOverhead(overheadPct: number, stage: CompanyStage): BenchmarkResult {
  const stageProfile = STAGES.find(s => s.id === stage) || STAGES[2];
  const [low, high] = stageProfile.overheadPctOfRev;
  return evaluateBenchmark(overheadPct, {
    danger: high * 1.3,
    caution: high,
    good: low,
  }, {
    danger: `Overhead unsustainable for ${stageProfile.label} stage — restructure or grow revenue`,
    caution: `Overhead high for ${stageProfile.label} stage — watch closely`,
    good: `Overhead typical for ${stageProfile.label} stage`,
    great: `Overhead lean for ${stageProfile.label} stage — great operating leverage`,
  }, false);
}

export function evalWorkingCapital(days: number, categoryId?: string): BenchmarkResult {
  const cat = categoryId ? CATEGORIES.find(c => c.id === categoryId) : undefined;
  const thresholds = cat
    ? { danger: cat.workingCapitalDays.high * 1.2, caution: cat.workingCapitalDays.high, good: cat.workingCapitalDays.mid }
    : { danger: 100, caution: 80, good: 55 };
  return evaluateBenchmark(days, thresholds, {
    danger: "Cash conversion dangerously slow — you'll need significant runway",
    caution: 'Cash cycle above typical — plan for extra working capital',
    good: 'Cash conversion in normal range',
    great: 'Cash conversion efficient — strong working capital position',
  }, false);
}

export function getRetailerIntel(retailerName: string): RetailerIntel | undefined {
  const lower = retailerName.toLowerCase();
  return RETAILERS.find(r =>
    r.name.toLowerCase().includes(lower) ||
    lower.includes(r.name.split(' ')[0].toLowerCase())
  );
}
