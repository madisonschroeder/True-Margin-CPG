import React, { useState } from 'react';
import { GlobalOverhead } from '../types';
import { fmtCurrency, fmtPct } from '../utils/formatters';
import { InputRow, OutputRow, SectionHeader } from './InputRow';

interface Props {
  overhead: GlobalOverhead;
  onChange: (o: GlobalOverhead) => void;
}

type OverheadCategory = {
  field: keyof GlobalOverhead;
  label: string;
  subtitle: string;
  color: string;
};

const CATEGORIES: OverheadCategory[] = [
  { field: 'peoplePayroll', label: 'People & Payroll', subtitle: 'Founder comp, sales team, marketing, ops, finance/admin, benefits & payroll taxes', color: 'bg-primary' },
  { field: 'salesMarketing', label: 'Sales & Marketing', subtitle: 'Digital/social, sampling & demos, trade shows, PR/influencer, brand creative', color: 'bg-secondary' },
  { field: 'facilitiesInsurance', label: 'Facilities & Insurance', subtitle: 'Rent, utilities, GL/product liability/D&O insurance', color: 'bg-accent' },
  { field: 'professionalServices', label: 'Professional Services', subtitle: 'Legal, accounting/audit, consulting, food safety/regulatory', color: 'bg-info' },
  { field: 'technologySoftware', label: 'Technology & Software', subtitle: 'ERP/inventory, ecommerce, CRM, analytics tools', color: 'bg-success' },
  { field: 'travelEntertainment', label: 'Travel & Entertainment', subtitle: 'Customer visits, trade shows, team travel', color: 'bg-warning' },
  { field: 'rdProductDev', label: 'R&D / Product Development', subtitle: 'New product dev, lab testing, certifications, packaging design', color: 'bg-error' },
  { field: 'generalAdmin', label: 'General & Administrative', subtitle: 'Office supplies, telecom, bank/merchant fees', color: 'bg-neutral' },
  { field: 'miscellaneous', label: 'Miscellaneous', subtitle: 'Other expenses not captured above', color: 'bg-base-300' },
];

export const CompanyOverhead: React.FC<Props> = ({ overhead, onChange }) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');

  const update = (field: keyof GlobalOverhead, value: number) => {
    onChange({ ...overhead, [field]: value });
  };

  const totalFixed = CATEGORIES.reduce((sum, cat) => sum + (overhead[cat.field] as number), 0);
  const monthlyBurn = totalFixed / 12;
  const dailyBurn = totalFixed / 365;

  // For display: show monthly or annual based on toggle
  const displayValue = (field: keyof GlobalOverhead): number => {
    const annual = overhead[field] as number;
    return viewMode === 'monthly' ? annual / 12 : annual;
  };

  const handleChange = (field: keyof GlobalOverhead, displayVal: number) => {
    const annual = viewMode === 'monthly' ? displayVal * 12 : displayVal;
    update(field, annual);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-1">
      <div className="alert alert-info mb-4 text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>These inputs apply <strong>company-wide</strong> across all channels. They flow into the Executive Dashboard, Breakeven Analysis, and Debt vs. Equity tools as a blended reality.</span>
      </div>

      {/* Monthly / Annual Toggle */}
      <div className="flex justify-center mb-4">
        <div className="btn-group">
          <button
            className={`btn btn-sm ${viewMode === 'monthly' ? 'btn-active btn-primary' : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            Monthly
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'annual' ? 'btn-active btn-primary' : ''}`}
            onClick={() => setViewMode('annual')}
          >
            Annual
          </button>
        </div>
      </div>

      <SectionHeader title="FIXED CORPORATE OVERHEAD" subtitle={viewMode === 'monthly' ? 'MONTHLY INPUTS → STORED AS ANNUAL' : 'ANNUAL'} />

      {CATEGORIES.map((cat) => (
        <div key={cat.field}>
          <div className="px-2 pt-2 pb-0">
            <span className="font-bold text-sm">{cat.label}</span>
            <span className="block text-xs text-base-content/50">{cat.subtitle}</span>
          </div>
          <InputRow
            label={viewMode === 'monthly' ? `${cat.label} (per month)` : `${cat.label} (annual)`}
            value={displayValue(cat.field)}
            onChange={(v) => handleChange(cat.field, v)}
            type="currency"
            highlight
          />
        </div>
      ))}

      <div className="divider my-1"></div>
      <OutputRow label="Total Fixed Overhead (Annual)" value={fmtCurrency(totalFixed)} accent bold />
      <OutputRow label="Total Fixed Overhead (Monthly)" value={fmtCurrency(monthlyBurn)} />
      <OutputRow label="Daily Burn Rate" value={fmtCurrency(dailyBurn)} />

      {/* Horizontal Stacked Bar Chart */}
      {totalFixed > 0 && (
        <div className="mt-4 px-2">
          <h4 className="text-xs font-bold text-base-content/70 mb-2 uppercase">Overhead Breakdown</h4>
          <div className="w-full h-6 rounded-lg overflow-hidden flex">
            {CATEGORIES.map((cat) => {
              const val = overhead[cat.field] as number;
              if (val <= 0) return null;
              const pct = (val / totalFixed) * 100;
              return (
                <div
                  key={cat.field}
                  className={`${cat.color} h-full transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${cat.label}: ${fmtCurrency(val)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {CATEGORIES.map((cat) => {
              const val = overhead[cat.field] as number;
              if (val <= 0) return null;
              const pct = (val / totalFixed) * 100;
              return (
                <div key={cat.field} className="flex items-center gap-1 text-xs">
                  <span className={`inline-block w-3 h-3 rounded-sm ${cat.color}`}></span>
                  <span>{cat.label} ({pct.toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <SectionHeader title="VARIABLE SG&A" subtitle="AS % OF NET REVENUE" />
      <InputRow label="Marketing & Other % of Net Rev" value={overhead.marketingPctOfNetRev} onChange={(v) => update('marketingPctOfNetRev', v)} type="percent" highlight />
      <OutputRow label="Effective Rate" value={fmtPct(overhead.marketingPctOfNetRev)} />

      <SectionHeader title="COST OF CAPITAL" subtitle="COMPANY-WIDE" />
      <InputRow label="Annual Interest Rate (APR %)" value={overhead.annualInterestRate} onChange={(v) => update('annualInterestRate', v)} type="percent" highlight />

      <div className="mt-6 p-4 bg-base-200 rounded-lg">
        <h3 className="font-bold text-sm mb-2 text-base-content/80">💡 HOW THIS WORKS</h3>
        <ul className="text-xs text-base-content/70 space-y-1 list-disc ml-4">
          <li>Fixed overhead is allocated proportionally across channels based on the <strong>channel mix %</strong> set on the Executive Dashboard.</li>
          <li>Use the <strong>Monthly / Annual toggle</strong> to enter values in whichever timeframe is natural — the model always stores annual amounts.</li>
          <li>Variable SG&A (marketing) is applied as a % of blended net revenue per unit.</li>
          <li>The interest rate flows into the cost of capital calculations for the full blended company view.</li>
          <li>All downstream tabs (Breakeven, Dashboard, Debt vs. Equity) use these global values automatically.</li>
        </ul>
      </div>
    </div>
  );
};
