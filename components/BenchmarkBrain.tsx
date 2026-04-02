import React, { useState } from 'react';
import {
  detectStage,
  CATEGORIES,
  STAGES,
  evalContribMargin,
  evalTradeSpend,
  evalGtNDilution,
  evalOverhead,
  BenchmarkResult,
  CompanyStage,
} from '../utils/cpgBrain';

// ── Benchmark Badge (inline, used everywhere) ──────────────────────

interface BenchmarkBadgeProps {
  result: BenchmarkResult;
  compact?: boolean;
}

export const BenchmarkBadge: React.FC<BenchmarkBadgeProps> = ({ result, compact }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (compact) {
    return (
      <span
        className={`badge badge-sm ${result.badgeClass} gap-1 ml-2 text-[10px] cursor-help relative inline-flex`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {result.emoji} {result.label.length > 30 ? result.label.split(' — ')[0] : result.label}
        {showTooltip && result.context !== result.label && (
          <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-base-300 text-base-content text-xs rounded-lg shadow-xl whitespace-nowrap border border-base-content/10">
            {result.context}
          </div>
        )}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
      result.level === 'danger' ? 'bg-error/10' :
      result.level === 'caution' ? 'bg-warning/10' :
      'bg-success/10'
    }`}>
      <span className="text-sm">{result.emoji}</span>
      <span className="text-xs">{result.context}</span>
    </div>
  );
};

// ── Stage Indicator (expandable journey card) ──────────────────────

interface StageIndicatorProps {
  annualNetRevenue: number;
}

export const StageIndicator: React.FC<StageIndicatorProps> = ({ annualNetRevenue }) => {
  const stage = detectStage(annualNetRevenue);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card bg-gradient-to-r from-base-200 to-base-300 border border-base-content/5">
      <div className="card-body p-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <span className="text-lg">🧠</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{stage.emoji}</span>
                <span className={`font-bold ${stage.color}`}>{stage.label}</span>
                <span className="badge badge-sm badge-ghost">{stage.revenueRange}</span>
              </div>
              <p className="text-xs text-base-content/60 mt-0.5">{stage.description}</p>
            </div>
          </div>
          <span className="text-base-content/40 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-base-content/10 pt-3">
            <div>
              <div className="text-xs font-semibold text-base-content/60 uppercase mb-1">Focus Areas for Your Stage</div>
              <div className="flex flex-wrap gap-2">
                {stage.focusAreas.map((area, i) => (
                  <span key={i} className="badge badge-outline badge-sm">{area}</span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-base-content/60 uppercase mb-1">Typical Overhead (% of Revenue)</div>
              <span className="text-sm">{(stage.overheadPctOfRev[0] * 100).toFixed(0)}% – {(stage.overheadPctOfRev[1] * 100).toFixed(0)}%</span>
            </div>

            <div className="bg-primary/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">⚡</span>
                <span className="text-xs font-bold text-primary uppercase">The GO-GET for Your Stage</span>
              </div>
              <p className="text-sm">{stage.goGet}</p>
            </div>

            <div>
              <div className="text-xs font-semibold text-base-content/60 uppercase mb-2">Your Journey</div>
              <div className="flex items-center gap-1 flex-wrap">
                {STAGES.map((s, i) => (
                  <React.Fragment key={s.id}>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
                      s.id === stage.id ? 'bg-primary text-primary-content font-bold' : 'bg-base-100 text-base-content/40'
                    }`}>
                      {s.emoji} {s.id === stage.id ? s.label : s.label.split(' ')[0]}
                    </div>
                    {i < STAGES.length - 1 && <span className="text-base-content/20">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Category Selector ──────────────────────────────────────────────

interface CategorySelectorProps {
  selectedCategory: string;
  onChange: (categoryId: string) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({ selectedCategory, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">🧠</span>
      <span className="text-xs font-semibold text-base-content/60">Product Category:</span>
      <select
        className="select select-xs select-bordered"
        value={selectedCategory}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Select for smarter benchmarks —</option>
        {CATEGORIES.map(cat => (
          <option key={cat.id} value={cat.id}>{cat.label}</option>
        ))}
      </select>
      {selectedCategory && (
        <span className="text-xs text-base-content/40">
          {CATEGORIES.find(c => c.id === selectedCategory)?.notes?.split('.')[0]}
        </span>
      )}
    </div>
  );
};

// ── Channel Benchmark Bar (shown at top of each channel tab) ───────

interface ChannelBenchmarkBarProps {
  channelId: string;
  tradeSpendPct: number;
  gtnDilutionPct: number;
  contribMarginPct: number;
  categoryId?: string;
}

export const ChannelBenchmarkBar: React.FC<ChannelBenchmarkBarProps> = ({
  channelId, tradeSpendPct, gtnDilutionPct, contribMarginPct, categoryId
}) => {
  const trade = evalTradeSpend(tradeSpendPct, categoryId);
  const gtn = evalGtNDilution(gtnDilutionPct, channelId, categoryId);
  const cm = evalContribMargin(contribMarginPct, categoryId);

  return (
    <div className="flex flex-wrap gap-3 p-3 bg-base-200/50 rounded-lg border border-base-content/5 mt-3">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-base-content/50 font-semibold">MARGIN:</span>
        <BenchmarkBadge result={cm} compact />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-base-content/50 font-semibold">TRADE:</span>
        <BenchmarkBadge result={trade} compact />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-base-content/50 font-semibold">GtN:</span>
        <BenchmarkBadge result={gtn} compact />
      </div>
      {categoryId && (
        <span className="text-[10px] text-base-content/30 ml-auto">
          vs {CATEGORIES.find(c => c.id === categoryId)?.label} benchmarks
        </span>
      )}
    </div>
  );
};

// ── Overhead Benchmark (for Dashboard) ─────────────────────────────

interface OverheadBenchmarkProps {
  overheadPct: number;
  annualNetRevenue: number;
}

export const OverheadBenchmark: React.FC<OverheadBenchmarkProps> = ({ overheadPct, annualNetRevenue }) => {
  const stage = detectStage(annualNetRevenue);
  const result = evalOverhead(overheadPct, stage.id);
  return <BenchmarkBadge result={result} />;
};
