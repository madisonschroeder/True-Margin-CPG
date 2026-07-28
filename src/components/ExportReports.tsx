import React, { useState, useMemo } from 'react';
import {
  BlendedFinancials,
  ChannelInputs,
  GlobalOverhead,
  CogsFreightState,
  LogisticsState,
  SKULibraryState,
  BreakevenInputs,
  DebtEquityInputs,
  CompanyProfile,
} from '../types';
import { fmtCurrency, fmtPct, fmtNumber } from '../utils/formatters';
import { computeBreakeven, computeDebtVsEquity, computeChannelOutputs } from '../utils/calculations';

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

// Channel IDs and labels are now derived dynamically from the channels prop

type ReportType = 'executive' | 'investor' | 'lender' | 'strategy' | 'fullmodel' | null;

interface ExportReportsProps {
  blended: BlendedFinancials;
  channels: Record<string, ChannelInputs>;
  dashboardMix: Record<string, number>;
  globalOverhead: GlobalOverhead;
  targetRev: number;
  upspwByChannel: Record<string, number>;
  channelCogsMap: Record<string, CogsFreightState>;
  logistics: LogisticsState;
  skuLibrary: SKULibraryState;
  breakeven: BreakevenInputs;
  debtEquity: DebtEquityInputs;
  companyProfile: CompanyProfile;
}

/* ──────────────────────── SHARED REPORT ELEMENTS ──────────────────────── */

const ReportHeader: React.FC<{ title: string; subtitle?: string; companyName?: string }> = ({ title, subtitle, companyName }) => (
  <div style={{ borderBottom: '3px solid #111', paddingBottom: 12, marginBottom: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.5, color: '#111' }}>TRUE MARGIN CPG</div>
        {companyName && <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginTop: 2 }}>{companyName}</div>}
        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Prepared by <strong>RIGHT LANE BRANDS</strong></div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: '#666' }}>{subtitle}</div>}
      </div>
    </div>
    <div style={{ fontSize: 10, color: '#888', marginTop: 8 }}>
      Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>
);

const ReportFooter: React.FC<{ companyName?: string }> = ({ companyName }) => (
  <div style={{ borderTop: '1px solid #ccc', paddingTop: 10, marginTop: 40, fontSize: 9, color: '#999', textAlign: 'center' }}>
    CONFIDENTIAL {companyName ? `— Prepared for ${companyName} by` : '— Prepared by'} Right Lane Brands for internal use only
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #333', paddingBottom: 4, marginTop: 28, marginBottom: 12, color: '#111', letterSpacing: 0.8 }}>
    {children}
  </div>
);

const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 };
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 10px', borderBottom: '2px solid #333', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#333' };
const thR: React.CSSProperties = { ...th, textAlign: 'right' };
const td: React.CSSProperties = { padding: '5px 10px', borderBottom: '1px solid #ddd', fontSize: 11, color: '#222' };
const tdR: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const tdBold: React.CSSProperties = { ...td, fontWeight: 700 };
const tdRBold: React.CSSProperties = { ...tdR, fontWeight: 700 };

const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11, color: '#fff', backgroundColor: color }}>
    {label}
  </span>
);

const KVRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <tr><td style={td}>{label}</td><td style={tdR}>{value}</td></tr>
);

/* ──────────────────────── PRINT STYLES ──────────────────────── */

const PrintStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @media print {
      body * { visibility: hidden !important; }
      #print-report-content, #print-report-content * { visibility: visible !important; }
      #print-report-content { position: absolute; left: 0; top: 0; width: 100%; }
      .no-print { display: none !important; }
      @page { margin: 0.75in; size: letter; }
    }
  `}} />
);

/* ──────────────────────── REPORT: EXECUTIVE SUMMARY ──────────────────────── */

const ExecutiveSummary: React.FC<{ b: BlendedFinancials; mix: Record<string, number>; de: ReturnType<typeof computeDebtVsEquity>; companyName?: string }> = ({ b, mix, de, companyName }) => {
  const marginColor = safe(b.blendedContribMarginPct) >= 0.30 ? '#16a34a' : safe(b.blendedContribMarginPct) >= 0.15 ? '#ca8a04' : '#dc2626';
  const marginLabel = safe(b.blendedContribMarginPct) >= 0.30 ? 'STRONG' : safe(b.blendedContribMarginPct) >= 0.15 ? 'MARGINAL' : 'AT RISK';

  return (
    <>
      <ReportHeader title="Executive Summary" subtitle="Blended P&L Overview" companyName={companyName} />

      <SectionTitle>Blended P&L Waterfall (Per Unit)</SectionTitle>
      <table style={tbl}>
        <thead><tr><th style={th}>Line Item</th><th style={thR}>$/Unit</th><th style={thR}>% of Net Rev</th></tr></thead>
        <tbody>
          <KVRow label="Gross Revenue (Brand Invoice)" value={fmtCurrency(safe(b.blendedGrossRevPerUnit))} />
          <tr><td style={td}>Less: GtN Deductions</td><td style={tdR}>{fmtCurrency(safe(b.blendedGrossRevPerUnit - b.blendedNetRev))}</td><td style={tdR}>--</td></tr>
          <tr><td style={tdBold}>Net Revenue</td><td style={tdRBold}>{fmtCurrency(safe(b.blendedNetRev))}</td><td style={tdR}>100.0%</td></tr>
          <tr><td style={td}>Less: COGS</td><td style={tdR}>{fmtCurrency(safe(b.blendedCogs))}</td><td style={tdR}>{fmtPct(safe(b.blendedNetRev) !== 0 ? safe(b.blendedCogs) / safe(b.blendedNetRev) : 0)}</td></tr>
          <tr><td style={tdBold}>Contribution Margin</td><td style={tdRBold}>{fmtCurrency(safe(b.blendedContribMargin))}</td><td style={tdR}>{fmtPct(safe(b.blendedContribMarginPct))}</td></tr>
          <tr><td style={td}>Less: Variable Marketing</td><td style={tdR}>{fmtCurrency(safe(b.marketingPerUnit))}</td><td style={tdR}>--</td></tr>
          <tr><td style={tdBold}>Adjusted Contribution</td><td style={tdRBold}>{fmtCurrency(safe(b.adjustedContribMargin))}</td><td style={tdR}>--</td></tr>
          <tr><td style={td}>Less: Fixed Overhead (annual)</td><td style={tdR}>{fmtCurrency(safe(b.annualOverhead))}</td><td style={tdR}>--</td></tr>
          <tr><td style={{ ...tdBold, borderBottom: '2px solid #333' }}>EBITDA (annual)</td><td style={{ ...tdRBold, borderBottom: '2px solid #333' }}>{fmtCurrency(safe(b.operatingCashFlow))}</td><td style={{ ...tdR, borderBottom: '2px solid #333' }}>--</td></tr>
        </tbody>
      </table>

      <SectionTitle>Channel Mix Breakdown</SectionTitle>
      <table style={tbl}>
        <thead><tr><th style={th}>Channel</th><th style={thR}>Mix %</th><th style={thR}>Net Rev/Unit</th><th style={thR}>CM/Unit</th><th style={thR}>CM %</th></tr></thead>
        <tbody>
          {b.channels.map(ch => (
            <tr key={ch.id}>
              <td style={td}>{(channels[ch.id]?.name || ch.name) || ch.name}</td>
              <td style={tdR}>{fmtPct(safe(ch.mixPct))}</td>
              <td style={tdR}>{fmtCurrency(safe(ch.netRevPerUnit))}</td>
              <td style={tdR}>{fmtCurrency(safe(ch.contributionMarginPerUnit))}</td>
              <td style={tdR}>{fmtPct(safe(ch.contributionMarginPct))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Viability Verdict</SectionTitle>
      <div style={{ marginBottom: 16 }}>
        <Badge label={`${marginLabel} -- Blended CM: ${fmtPct(safe(b.blendedContribMarginPct))}`} color={marginColor} />
      </div>
      <table style={tbl}>
        <tbody>
          <KVRow label="Target Annual Net Revenue" value={fmtCurrency(safe(b.targetAnnualNetRev), 0)} />
          <KVRow label="Implied Annual Units" value={fmtNumber(safe(b.impliedUnits))} />
          <KVRow label="Annual EBITDA" value={fmtCurrency(safe(b.operatingCashFlow), 0)} />
          <KVRow label="Debt Viability" value={b.debtViability} />
        </tbody>
      </table>

      <SectionTitle>Capital Needs Summary</SectionTitle>
      <table style={tbl}>
        <tbody>
          <KVRow label="Total Capital Need" value={fmtCurrency(safe(de.totalCapitalNeed), 0)} />
          <KVRow label="Working Capital (Debt-Appropriate)" value={fmtCurrency(safe(de.debtAppropriate), 0)} />
          <KVRow label="Growth Capital (Equity-Appropriate)" value={fmtCurrency(safe(de.equityAppropriate), 0)} />
          <KVRow label="Recommendation" value={de.recommendation} />
        </tbody>
      </table>

      <SectionTitle>GO-GET Statement</SectionTitle>
      <div style={{ padding: 12, border: '2px solid #333', borderRadius: 4, fontSize: 12, lineHeight: 1.6, color: '#111' }}>
        To achieve {fmtCurrency(safe(b.targetAnnualNetRev), 0)} in annual net revenue, the company must sell{' '}
        <strong>{fmtNumber(safe(b.impliedUnits))}</strong> units across {b.channels.filter(c => safe(c.mixPct) > 0).length} active channels,
        generating {fmtCurrency(safe(b.operatingCashFlow), 0)} in annual EBITDA.
        Working capital float of {fmtCurrency(safe(b.totalCashFloat), 0)} is required to sustain the cash conversion cycle of{' '}
        {fmtNumber(safe(b.blendedCCC), 0)} days.
      </div>

      <ReportFooter companyName={companyName} />
    </>
  );
};

/* ──────────────────────── REPORT: INVESTOR PACKAGE ──────────────────────── */

const InvestorPackage: React.FC<{
  b: BlendedFinancials;
  channels: Record<string, ChannelInputs>;
  mix: Record<string, number>;
  de: ReturnType<typeof computeDebtVsEquity>;
  channelCogsMap: Record<string, CogsFreightState>;
  logistics: LogisticsState;
  skuLibrary: SKULibraryState;
  upspwByChannel: Record<string, number>;
  companyName?: string;
}> = ({ b, channels, mix, de, channelCogsMap, logistics, skuLibrary, upspwByChannel, companyName }) => {
  const channelOutputs = useMemo(() => {
    const out: Record<string, ReturnType<typeof computeChannelOutputs>> = {};
    Object.keys(channels).forEach(id => {
      if (channels[id]) {
        out[id] = computeChannelOutputs(channels[id], channelCogsMap[id] || { nodes: [] }, logistics, skuLibrary);
      }
    });
    return out;
  }, [channels, channelCogsMap, logistics, skuLibrary]);

  return (
    <>
      <ReportHeader title="Investor Package" subtitle="Margin Profile & Growth Analysis" companyName={companyName} />

      <SectionTitle>Margin Profile with Benchmarks</SectionTitle>
      <table style={tbl}>
        <thead><tr><th style={th}>Metric</th><th style={thR}>Current</th><th style={thR}>CPG Benchmark</th></tr></thead>
        <tbody>
          <tr><td style={td}>Gross Margin</td><td style={tdR}>{fmtPct(safe(b.blendedNetRev) !== 0 ? (safe(b.blendedNetRev) - safe(b.blendedCogs)) / safe(b.blendedNetRev) : 0)}</td><td style={tdR}>40-60%</td></tr>
          <tr><td style={td}>Contribution Margin</td><td style={tdR}>{fmtPct(safe(b.blendedContribMarginPct))}</td><td style={tdR}>25-40%</td></tr>
          <tr><td style={td}>EBITDA Margin</td><td style={tdR}>{fmtPct(safe(b.targetAnnualNetRev) !== 0 ? safe(b.operatingCashFlow) / safe(b.targetAnnualNetRev) : 0)}</td><td style={tdR}>8-15%</td></tr>
        </tbody>
      </table>

      <SectionTitle>Channel-by-Channel Economics</SectionTitle>
      <table style={tbl}>
        <thead>
          <tr>
            <th style={th}>Channel</th>
            <th style={thR}>Mix</th>
            <th style={thR}>MSRP</th>
            <th style={thR}>Brand Price</th>
            <th style={thR}>Net Rev</th>
            <th style={thR}>COGS</th>
            <th style={thR}>CM/Unit</th>
            <th style={thR}>CM %</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(channels).filter(id => safe(mix[id]) > 0).map(id => {
            const co = channelOutputs[id];
            if (!co) return null;
            return (
              <tr key={id}>
                <td style={td}>{(channels[id]?.name || id)}</td>
                <td style={tdR}>{fmtPct(safe(mix[id]))}</td>
                <td style={tdR}>{fmtCurrency(safe(co.msrp))}</td>
                <td style={tdR}>{fmtCurrency(safe(co.priceToDistrib))}</td>
                <td style={tdR}>{fmtCurrency(safe(co.netRevenue))}</td>
                <td style={tdR}>{fmtCurrency(safe(co.blendedCogs))}</td>
                <td style={tdR}>{fmtCurrency(safe(co.contributionMarginDollar))}</td>
                <td style={tdR}>{fmtPct(safe(co.contributionMarginPct))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <SectionTitle>Growth Scenarios (Current Mix Projected)</SectionTitle>
      <table style={tbl}>
        <thead><tr><th style={th}>Scenario</th><th style={thR}>Net Rev</th><th style={thR}>Units</th><th style={thR}>EBITDA</th><th style={thR}>WC Need</th></tr></thead>
        <tbody>
          {[0.5, 0.75, 1.0, 1.5, 2.0].map(mult => {
            const rev = safe(b.targetAnnualNetRev) * mult;
            const units = safe(b.blendedNetRev) !== 0 ? rev / safe(b.blendedNetRev) : 0;
            const contrib = units * safe(b.adjustedContribMargin);
            const ebitda = contrib - safe(b.annualOverhead);
            const wc = safe(b.totalCashFloat) * mult;
            return (
              <tr key={mult}>
                <td style={td}>{mult === 1.0 ? 'Current Target' : `${(mult * 100).toFixed(0)}% of Target`}</td>
                <td style={tdR}>{fmtCurrency(rev, 0)}</td>
                <td style={tdR}>{fmtNumber(units)}</td>
                <td style={tdR}>{fmtCurrency(ebitda, 0)}</td>
                <td style={tdR}>{fmtCurrency(wc, 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {safe(de.equityRaiseAmount) > 0 && (
        <>
          <SectionTitle>Dilution Analysis</SectionTitle>
          <table style={tbl}>
            <tbody>
              <KVRow label="Equity Raise Amount" value={fmtCurrency(safe(de.equityRaiseAmount), 0)} />
              <KVRow label="Pre-Money Valuation" value={fmtCurrency(safe(de.postMoneyVal - de.equityRaiseAmount), 0)} />
              <KVRow label="Post-Money Valuation" value={fmtCurrency(safe(de.postMoneyVal), 0)} />
              <KVRow label="Dilution" value={fmtPct(safe(de.equityDilution))} />
              <KVRow label="Founder Ownership Retained" value={fmtPct(safe(de.impliedOwnershipRetained))} />
              <KVRow label="Investor Return at Exit" value={fmtCurrency(safe(de.investorReturnAtExit), 0)} />
              <KVRow label="Founder Value at Exit" value={fmtCurrency(safe(de.founderValueAtExit), 0)} />
            </tbody>
          </table>
        </>
      )}

      <SectionTitle>Market Sizing via Doors</SectionTitle>
      <table style={tbl}>
        <thead><tr><th style={th}>Channel</th><th style={thR}>Units/Store/Wk</th><th style={thR}>Implied Units</th><th style={thR}>Implied Doors</th></tr></thead>
        <tbody>
          {Object.keys(channels).filter(id => safe(mix[id]) > 0).map(id => {
            const ch = b.channels.find(c => c.id === id);
            if (!ch) return null;
            const chUnits = safe(b.impliedUnits) * safe(ch.mixPct);
            const upspw = safe(upspwByChannel[id]) || safe(channels[id]?.estUnitsPerWeekPerStore) || 1;
            const doors = chUnits / (upspw * 52);
            return (
              <tr key={id}>
                <td style={td}>{(channels[id]?.name || id)}</td>
                <td style={tdR}>{fmtNumber(upspw, 1)}</td>
                <td style={tdR}>{fmtNumber(chUnits)}</td>
                <td style={tdR}>{fmtNumber(doors)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <SectionTitle>Use of Proceeds</SectionTitle>
      <table style={tbl}>
        <tbody>
          <KVRow label="Working Capital (Inventory + AR)" value={fmtCurrency(safe(de.workingCapitalNeed), 0)} />
          <KVRow label="Operating Runway" value={fmtCurrency(safe(de.operatingRunwayNeed), 0)} />
          <KVRow label="Additional Capital (CapEx / R&D)" value={fmtCurrency(safe(de.additionalCapital), 0)} />
          <tr><td style={tdBold}>Total</td><td style={tdRBold}>{fmtCurrency(safe(de.totalCapitalNeed), 0)}</td></tr>
        </tbody>
      </table>

      <ReportFooter companyName={companyName} />
    </>
  );
};

/* ──────────────────────── REPORT: LENDER PACKAGE ──────────────────────── */

const LenderPackage: React.FC<{ b: BlendedFinancials; de: ReturnType<typeof computeDebtVsEquity>; companyName?: string }> = ({ b, de, companyName }) => (
  <>
    <ReportHeader title="Lender Package" subtitle="Debt Capacity & Serviceability Analysis" companyName={companyName} />

    <SectionTitle>Revenue Summary</SectionTitle>
    <table style={tbl}>
      <tbody>
        <KVRow label="Target Annual Net Revenue" value={fmtCurrency(safe(b.targetAnnualNetRev), 0)} />
        <KVRow label="Gross Revenue (Brand Invoice)" value={fmtCurrency(safe(b.grossRevenue), 0)} />
        <KVRow label="Implied Annual Units" value={fmtNumber(safe(b.impliedUnits))} />
        <KVRow label="Annual EBITDA" value={fmtCurrency(safe(b.operatingCashFlow), 0)} />
        <KVRow label="Blended Contribution Margin" value={fmtPct(safe(b.blendedContribMarginPct))} />
      </tbody>
    </table>

    <SectionTitle>DSCR Calculation Detail</SectionTitle>
    <table style={tbl}>
      <thead><tr><th style={th}>Facility</th><th style={thR}>Annual Service</th><th style={thR}>DSCR</th><th style={thR}>Status</th></tr></thead>
      <tbody>
        <tr>
          <td style={td}>Line of Credit (Working Capital)</td>
          <td style={tdR}>{fmtCurrency(safe(de.totalAnnualLocCost), 0)}</td>
          <td style={tdR}>{fmtNumber(safe(de.locDscr), 2)}x</td>
          <td style={tdR}>{de.locFeasible ? 'PASS (>= 1.25x)' : 'FAIL (< 1.25x)'}</td>
        </tr>
        {safe(de.termAnnualService) > 0 && (
          <tr>
            <td style={td}>Term Loan (Additional Capital)</td>
            <td style={tdR}>{fmtCurrency(safe(de.termAnnualService), 0)}</td>
            <td style={tdR}>{fmtNumber(safe(de.termDscr), 2)}x</td>
            <td style={tdR}>{de.termFeasible ? 'PASS (>= 1.25x)' : 'FAIL (< 1.25x)'}</td>
          </tr>
        )}
      </tbody>
    </table>

    <SectionTitle>Cash Conversion Cycle Breakdown</SectionTitle>
    <table style={tbl}>
      <tbody>
        <KVRow label="Blended CCC (days)" value={fmtNumber(safe(b.blendedCCC), 0)} />
        <KVRow label="Peak Inventory Cash" value={fmtCurrency(safe(b.peakInventoryCash), 0)} />
        <KVRow label="Accounts Receivable" value={fmtCurrency(safe(b.accountsReceivable), 0)} />
        <KVRow label="Accounts Payable (offset)" value={fmtCurrency(safe(b.accountsPayable), 0)} />
        <KVRow label="Net Working Capital" value={fmtCurrency(safe(b.netWorkingCapital), 0)} />
        <KVRow label="Overhead Burn During CCC" value={fmtCurrency(safe(b.overheadBurnDuringCycle), 0)} />
        <tr><td style={tdBold}>Total Cash Float Required</td><td style={tdRBold}>{fmtCurrency(safe(b.totalCashFloat), 0)}</td></tr>
      </tbody>
    </table>

    <SectionTitle>LOC Sizing & Feasibility</SectionTitle>
    <table style={tbl}>
      <tbody>
        <KVRow label="Recommended LOC Size" value={fmtCurrency(safe(de.debtAppropriate), 0)} />
        <KVRow label="Avg Draw Amount" value={fmtCurrency(safe(de.locDrawAmount), 0)} />
        <KVRow label="Annual Interest Cost" value={fmtCurrency(safe(de.annualLocInterest), 0)} />
        <KVRow label="Commitment Fee" value={fmtCurrency(safe(de.annualCommitmentFee), 0)} />
        <KVRow label="Total Annual LOC Cost" value={fmtCurrency(safe(de.totalAnnualLocCost), 0)} />
        <KVRow label="LOC DSCR" value={`${fmtNumber(safe(de.locDscr), 2)}x`} />
        <KVRow label="Feasibility" value={de.locFeasible ? 'FEASIBLE' : 'NOT FEASIBLE at current cash flow'} />
      </tbody>
    </table>

    <SectionTitle>Collateral Analysis</SectionTitle>
    <table style={tbl}>
      <tbody>
        <KVRow label="Inventory Value (at cost)" value={fmtCurrency(safe(b.peakInventoryCash), 0)} />
        <KVRow label="Accounts Receivable" value={fmtCurrency(safe(b.accountsReceivable), 0)} />
        <KVRow label="Total Eligible Collateral (est.)" value={fmtCurrency(safe(b.peakInventoryCash) + safe(b.accountsReceivable), 0)} />
        <KVRow label="Advance Rate (typical 50-80%)" value={`${fmtCurrency((safe(b.peakInventoryCash) + safe(b.accountsReceivable)) * 0.65, 0)} at 65%`} />
      </tbody>
    </table>

    <SectionTitle>Repayment Capacity</SectionTitle>
    <table style={tbl}>
      <tbody>
        <KVRow label="Annual Operating Cash Flow" value={fmtCurrency(safe(b.operatingCashFlow), 0)} />
        <KVRow label="Max Allowable APR" value={fmtPct(safe(b.maxAllowableApr))} />
        <KVRow label="Self-Funded Growth Rate" value={fmtPct(safe(b.maxSelfFundedGrowth))} />
        <KVRow label="Capital Turns per Year" value={fmtNumber(safe(b.annualCapitalTurns), 1)} />
      </tbody>
    </table>

    <ReportFooter companyName={companyName} />
  </>
);

/* ──────────────────────── REPORT: STRATEGY ROADMAP ──────────────────────── */

const StrategyRoadmap: React.FC<{
  b: BlendedFinancials;
  channels: Record<string, ChannelInputs>;
  mix: Record<string, number>;
  de: ReturnType<typeof computeDebtVsEquity>;
  channelCogsMap: Record<string, CogsFreightState>;
  logistics: LogisticsState;
  skuLibrary: SKULibraryState;
  upspwByChannel: Record<string, number>;
  companyName?: string;
}> = ({ b, channels, mix, de, channelCogsMap, logistics, skuLibrary, upspwByChannel, companyName }) => {
  const ranked = useMemo(() => {
    return Object.keys(channels)
      .filter(id => safe(mix[id]) > 0)
      .map(id => {
        const co = computeChannelOutputs(channels[id], channelCogsMap[id] || { nodes: [] }, logistics, skuLibrary);
        const ch = b.channels.find(c => c.id === id);
        const chUnits = safe(b.impliedUnits) * safe(ch?.mixPct);
        const upspw = safe(upspwByChannel[id]) || safe(channels[id]?.estUnitsPerWeekPerStore) || 1;
        const doors = chUnits / (upspw * 52);
        return { id, co, netMargin: safe(co.contributionMarginDollar), cmPct: safe(co.contributionMarginPct), chUnits, upspw, doors };
      })
      .sort((a, bb) => bb.netMargin - a.netMargin);
  }, [b, channels, mix, channelCogsMap, logistics, skuLibrary, upspwByChannel]);

  return (
    <>
      <ReportHeader title="Strategy Roadmap" subtitle="Channel Optimization & Growth Plan" companyName={companyName} />

      <SectionTitle>Channel Rankings by Net Margin per Unit</SectionTitle>
      <table style={tbl}>
        <thead>
          <tr>
            <th style={th}>Rank</th>
            <th style={th}>Channel</th>
            <th style={thR}>CM/Unit</th>
            <th style={thR}>CM %</th>
            <th style={thR}>Net Rev/Unit</th>
            <th style={thR}>Current Mix</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r, i) => (
            <tr key={r.id}>
              <td style={td}>#{i + 1}</td>
              <td style={td}>{(channels[r.id]?.name || r.id)}</td>
              <td style={tdR}>{fmtCurrency(r.netMargin)}</td>
              <td style={tdR}>{fmtPct(r.cmPct)}</td>
              <td style={tdR}>{fmtCurrency(safe(r.co.netRevenue))}</td>
              <td style={tdR}>{fmtPct(safe(mix[r.id]))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Recommended Channel Mix</SectionTitle>
      <div style={{ fontSize: 11, marginBottom: 12, color: '#444', lineHeight: 1.5 }}>
        Based on margin ranking, prioritize channels with higher contribution margin per unit.
        Consider increasing allocation to top-performing channels while maintaining diversification.
      </div>
      <table style={tbl}>
        <thead><tr><th style={th}>Channel</th><th style={thR}>Current Mix</th><th style={thR}>Margin Rank</th><th style={thR}>Opportunity</th></tr></thead>
        <tbody>
          {ranked.map((r, i) => (
            <tr key={r.id}>
              <td style={td}>{(channels[r.id]?.name || r.id)}</td>
              <td style={tdR}>{fmtPct(safe(mix[r.id]))}</td>
              <td style={tdR}>#{i + 1}</td>
              <td style={tdR}>{i === 0 ? 'MAXIMIZE' : i < 2 ? 'GROW' : 'MAINTAIN / EVALUATE'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Door Targets per Channel</SectionTitle>
      <table style={tbl}>
        <thead><tr><th style={th}>Channel</th><th style={thR}>Implied Units</th><th style={thR}>Units/Store/Wk</th><th style={thR}>Target Doors</th></tr></thead>
        <tbody>
          {ranked.map(r => (
            <tr key={r.id}>
              <td style={td}>{(channels[r.id]?.name || r.id)}</td>
              <td style={tdR}>{fmtNumber(r.chUnits)}</td>
              <td style={tdR}>{fmtNumber(r.upspw, 1)}</td>
              <td style={tdR}>{fmtNumber(r.doors)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Capital Requirements</SectionTitle>
      <table style={tbl}>
        <tbody>
          <KVRow label="Total Cash Float Needed" value={fmtCurrency(safe(b.totalCashFloat), 0)} />
          <KVRow label="Working Capital (LOC-Appropriate)" value={fmtCurrency(safe(de.debtAppropriate), 0)} />
          <KVRow label="Growth Capital (Equity-Appropriate)" value={fmtCurrency(safe(de.equityAppropriate), 0)} />
          <KVRow label="Total Capital Need" value={fmtCurrency(safe(de.totalCapitalNeed), 0)} />
        </tbody>
      </table>

      <SectionTitle>Milestone Markers</SectionTitle>
      <table style={tbl}>
        <thead><tr><th style={th}>Milestone</th><th style={thR}>Target</th><th style={thR}>Status</th></tr></thead>
        <tbody>
          <tr>
            <td style={td}>Breakeven (EBITDA = $0)</td>
            <td style={tdR}>{safe(b.adjustedContribMargin) > 0 ? fmtNumber(safe(b.annualOverhead) / safe(b.adjustedContribMargin)) + ' units' : 'N/A'}</td>
            <td style={tdR}>{safe(b.operatingCashFlow) > 0 ? 'ACHIEVED' : 'PENDING'}</td>
          </tr>
          <tr>
            <td style={td}>Positive Cash Flow</td>
            <td style={tdR}>{fmtCurrency(safe(b.operatingCashFlow), 0)} / yr</td>
            <td style={tdR}>{safe(b.operatingCashFlow) > 0 ? 'ACHIEVED' : 'PENDING'}</td>
          </tr>
          <tr>
            <td style={td}>Self-Funded Growth</td>
            <td style={tdR}>{fmtPct(safe(b.maxSelfFundedGrowth))} annual</td>
            <td style={tdR}>{safe(b.maxSelfFundedGrowth) > 0.10 ? 'ON TRACK' : 'NEEDS ATTENTION'}</td>
          </tr>
          <tr>
            <td style={td}>Debt Serviceability (DSCR &gt;= 1.25x)</td>
            <td style={tdR}>{fmtNumber(safe(de.locDscr), 2)}x</td>
            <td style={tdR}>{de.locFeasible ? 'PASS' : 'FAIL'}</td>
          </tr>
        </tbody>
      </table>

      <ReportFooter companyName={companyName} />
    </>
  );
};

/* ──────────────────────── REPORT: FULL MODEL DETAIL ──────────────────────── */

const FullModelDetail: React.FC<{
  b: BlendedFinancials;
  channels: Record<string, ChannelInputs>;
  mix: Record<string, number>;
  globalOverhead: GlobalOverhead;
  channelCogsMap: Record<string, CogsFreightState>;
  logistics: LogisticsState;
  skuLibrary: SKULibraryState;
  breakeven: BreakevenInputs;
  debtEquity: DebtEquityInputs;
  de: ReturnType<typeof computeDebtVsEquity>;
  be: ReturnType<typeof computeBreakeven>;
  targetRev: number;
  companyName?: string;
}> = ({ b, channels, mix, globalOverhead, channelCogsMap, logistics, skuLibrary, de, be, targetRev, companyName }) => {
  const channelOutputs = useMemo(() => {
    const out: Record<string, ReturnType<typeof computeChannelOutputs>> = {};
    Object.keys(channels).forEach(id => {
      if (channels[id]) {
        out[id] = computeChannelOutputs(channels[id], channelCogsMap[id] || { nodes: [] }, logistics, skuLibrary);
      }
    });
    return out;
  }, [channels, channelCogsMap, logistics, skuLibrary]);

  return (
    <>
      <ReportHeader title="Full Model Detail" subtitle="Complete Input/Output Reference" companyName={companyName} />

      <SectionTitle>SKU Library</SectionTitle>
      <table style={tbl}>
        <thead>
          <tr>
            <th style={th}>SKU</th>
            <th style={thR}>Raw Ingr.</th>
            <th style={thR}>Prim. Pkg</th>
            <th style={thR}>Sec. Pkg</th>
            <th style={thR}>Plant OH</th>
            <th style={thR}>Global OH</th>
            <th style={thR}>Inbound Frt</th>
            <th style={thR}>Units/Case</th>
            <th style={thR}>Cases/Plt</th>
          </tr>
        </thead>
        <tbody>
          {skuLibrary.skus.map(sku => (
            <tr key={sku.id}>
              <td style={td}>{sku.name || sku.id}</td>
              <td style={tdR}>{fmtCurrency(safe(sku.rawIngredients))}</td>
              <td style={tdR}>{fmtCurrency(safe(sku.primaryPackaging))}</td>
              <td style={tdR}>{fmtCurrency(safe(sku.secondaryPackaging))}</td>
              <td style={tdR}>{fmtCurrency(safe(sku.plantOverhead))}</td>
              <td style={tdR}>{fmtCurrency(safe(sku.globalOverhead))}</td>
              <td style={tdR}>{fmtCurrency(safe(sku.inboundFreight))}</td>
              <td style={tdR}>{fmtNumber(safe(sku.unitsPerCase))}</td>
              <td style={tdR}>{fmtNumber(safe(sku.casesPerPallet))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Logistics Nodes</SectionTitle>
      <table style={tbl}>
        <thead><tr><th style={th}>Node</th><th style={thR}>Pick&Pack/Case</th><th style={thR}>LTL Freight/Pallet</th></tr></thead>
        <tbody>
          {logistics.nodes.map((n, i) => (
            <tr key={i}>
              <td style={td}>{n.label}</td>
              <td style={tdR}>{fmtCurrency(safe(n.pickPackFeePerCase))}</td>
              <td style={tdR}>{fmtCurrency(safe(n.ltlFreightPerPallet))}</td>
            </tr>
          ))}
          <KVRow label="Storage $/Pallet/Month" value={fmtCurrency(safe(logistics.storagePerPalletPerMonth))} />
          <KVRow label="Avg Months on Hand" value={fmtNumber(safe(logistics.avgMonthsOnHand), 1)} />
        </tbody>
      </table>

      <SectionTitle>Global Overhead (Annual)</SectionTitle>
      <table style={tbl}>
        <tbody>
          <KVRow label="People & Payroll" value={fmtCurrency(safe(globalOverhead.peoplePayroll), 0)} />
          <KVRow label="Sales & Marketing" value={fmtCurrency(safe(globalOverhead.salesMarketing), 0)} />
          <KVRow label="Facilities & Insurance" value={fmtCurrency(safe(globalOverhead.facilitiesInsurance), 0)} />
          <KVRow label="Professional Services" value={fmtCurrency(safe(globalOverhead.professionalServices), 0)} />
          <KVRow label="Technology & Software" value={fmtCurrency(safe(globalOverhead.technologySoftware), 0)} />
          <KVRow label="Travel & Entertainment" value={fmtCurrency(safe(globalOverhead.travelEntertainment), 0)} />
          <KVRow label="R&D / Product Dev" value={fmtCurrency(safe(globalOverhead.rdProductDev), 0)} />
          <KVRow label="General & Admin" value={fmtCurrency(safe(globalOverhead.generalAdmin), 0)} />
          <KVRow label="Miscellaneous" value={fmtCurrency(safe(globalOverhead.miscellaneous), 0)} />
          <tr><td style={tdBold}>Total Fixed Overhead</td><td style={tdRBold}>{fmtCurrency(safe(b.totalFixedCosts), 0)}</td></tr>
          <KVRow label="Variable Marketing % of Net Rev" value={fmtPct(safe(globalOverhead.marketingPctOfNetRev))} />
          <KVRow label="Annual Interest Rate" value={fmtPct(safe(globalOverhead.annualInterestRate))} />
        </tbody>
      </table>

      <SectionTitle>Dashboard Inputs</SectionTitle>
      <table style={tbl}>
        <tbody>
          <KVRow label="Target Annual Net Revenue" value={fmtCurrency(safe(targetRev), 0)} />
          {Object.keys(channels).map(id => (
            <KVRow key={id} label={`${(channels[id]?.name || id)} Mix`} value={fmtPct(safe(mix[id]))} />
          ))}
        </tbody>
      </table>

      <SectionTitle>Channel-by-Channel Detail</SectionTitle>
      {Object.keys(channels).filter(id => safe(mix[id]) > 0).map(id => {
        const ch = channels[id];
        const co = channelOutputs[id];
        if (!ch || !co) return null;
        return (
          <div key={id} style={{ marginBottom: 20, pageBreakInside: 'avoid' }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: '#111' }}>{(channels[id]?.name || id)} ({id})</div>
            <table style={tbl}>
              <thead><tr><th style={th}>Input / Output</th><th style={thR}>Value</th></tr></thead>
              <tbody>
                <KVRow label="Retailer Margin %" value={fmtPct(safe(ch.retailerMarginPct))} />
                <KVRow label="Distributor Margin %" value={fmtPct(safe(ch.distMarginPct))} />
                <KVRow label="Product Margin %" value={fmtPct(safe(ch.productMarginPct))} />
                <KVRow label="Early Pay %" value={fmtPct(safe(ch.earlyPayPct))} />
                <KVRow label="Broker Commission %" value={fmtPct(safe(ch.brokerCommPct))} />
                <KVRow label="Spoilage %" value={fmtPct(safe(ch.spoilagePct))} />
                <KVRow label="Trade Spend %" value={fmtPct(safe(ch.tradeSpendPct))} />
                <KVRow label="AR Days" value={fmtNumber(safe(ch.arDays))} />
                <KVRow label="AP Days" value={fmtNumber(safe(ch.apDays))} />
                <KVRow label="Inventory Days" value={fmtNumber(safe(ch.blendedInventoryDays))} />
                <tr><td style={{ ...td, borderTop: '2px solid #333' }}></td><td style={{ ...tdR, borderTop: '2px solid #333' }}></td></tr>
                <KVRow label="MSRP" value={fmtCurrency(safe(co.msrp))} />
                <KVRow label="Price to Retailer" value={fmtCurrency(safe(co.priceToRetailer))} />
                <KVRow label="Price to Distributor" value={fmtCurrency(safe(co.priceToDistrib))} />
                <KVRow label="Net Revenue / Unit" value={fmtCurrency(safe(co.netRevenue))} />
                <KVRow label="COGS / Unit" value={fmtCurrency(safe(co.blendedCogs))} />
                <KVRow label="Total Deductions / Unit" value={fmtCurrency(safe(co.totalDeductions))} />
                <KVRow label="Contribution Margin / Unit" value={fmtCurrency(safe(co.contributionMarginDollar))} />
                <KVRow label="Contribution Margin %" value={fmtPct(safe(co.contributionMarginPct))} />
                <KVRow label="Cash Conversion Cycle" value={`${fmtNumber(safe(co.cashConversionCycle))} days`} />
              </tbody>
            </table>
          </div>
        );
      })}

      <SectionTitle>Blended Financials Summary</SectionTitle>
      <table style={tbl}>
        <tbody>
          <KVRow label="Blended Net Rev / Unit" value={fmtCurrency(safe(b.blendedNetRev))} />
          <KVRow label="Blended COGS / Unit" value={fmtCurrency(safe(b.blendedCogs))} />
          <KVRow label="Blended CM / Unit" value={fmtCurrency(safe(b.blendedContribMargin))} />
          <KVRow label="Blended CM %" value={fmtPct(safe(b.blendedContribMarginPct))} />
          <KVRow label="Blended CCC (days)" value={fmtNumber(safe(b.blendedCCC), 0)} />
          <KVRow label="Gross Revenue" value={fmtCurrency(safe(b.grossRevenue), 0)} />
          <KVRow label="Implied Units" value={fmtNumber(safe(b.impliedUnits))} />
          <KVRow label="Annual EBITDA" value={fmtCurrency(safe(b.operatingCashFlow), 0)} />
          <KVRow label="Total Cash Float" value={fmtCurrency(safe(b.totalCashFloat), 0)} />
          <KVRow label="Max Self-Funded Growth" value={fmtPct(safe(b.maxSelfFundedGrowth))} />
        </tbody>
      </table>

      <SectionTitle>Breakeven Analysis</SectionTitle>
      <table style={tbl}>
        <tbody>
          <KVRow label="Breakeven Units" value={typeof be.breakevenUnits === 'string' ? be.breakevenUnits : fmtNumber(be.breakevenUnits)} />
          <KVRow label="Breakeven Revenue" value={typeof be.breakevenRevenue === 'string' ? be.breakevenRevenue : fmtCurrency(be.breakevenRevenue as number, 0)} />
          <KVRow label="Target Units" value={typeof be.targetUnits === 'string' ? be.targetUnits : fmtNumber(be.targetUnits)} />
          <KVRow label="Target Revenue" value={typeof be.targetRevenue === 'string' ? be.targetRevenue : fmtCurrency(be.targetRevenue as number, 0)} />
        </tbody>
      </table>

      <SectionTitle>Debt vs Equity Summary</SectionTitle>
      <table style={tbl}>
        <tbody>
          <KVRow label="Total Capital Need" value={fmtCurrency(safe(de.totalCapitalNeed), 0)} />
          <KVRow label="Debt-Appropriate" value={fmtCurrency(safe(de.debtAppropriate), 0)} />
          <KVRow label="Equity-Appropriate" value={fmtCurrency(safe(de.equityAppropriate), 0)} />
          <KVRow label="LOC DSCR" value={`${fmtNumber(safe(de.locDscr), 2)}x`} />
          <KVRow label="Equity Dilution" value={fmtPct(safe(de.equityDilution))} />
          <KVRow label="Recommendation" value={de.recommendation} />
        </tbody>
      </table>

      <SectionTitle>Assumptions</SectionTitle>
      <div style={{ fontSize: 11, color: '#444', lineHeight: 1.6 }}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>All pricing uses cost-up tiered margin methodology (COGS to brand margin to distributor to retailer to MSRP).</li>
          <li>GtN deductions applied as percentage of brand invoice price (price to distributor).</li>
          <li>Warehousing costs computed at company level from logistics inputs.</li>
          <li>COGS are blended across logistics nodes weighted by channel supply chain mix.</li>
          <li>Working capital assumes steady-state inventory, AR, and AP levels.</li>
          <li>EBITDA is computed as contribution margin less fixed overhead (no depreciation, amortization, or taxes).</li>
          <li>Self-funded growth rate = (CM per unit / COGS per unit) * (365 / CCC days).</li>
          <li>DSCR = Annual Operating Cash Flow / Annual Debt Service. Minimum threshold = 1.25x.</li>
        </ul>
      </div>

      <ReportFooter companyName={companyName} />
    </>
  );
};

/* ──────────────────────── REPORT CARD DEFINITIONS ──────────────────────── */

interface ReportCardDef {
  type: ReportType;
  icon: string;
  title: string;
  desc: string;
}

const REPORT_CARDS: ReportCardDef[] = [
  { type: 'executive', icon: '[S]', title: 'Executive Summary', desc: 'Blended P&L waterfall, channel mix, viability verdict, and capital needs at a glance.' },
  { type: 'investor', icon: '[I]', title: 'Investor Package', desc: 'Margin benchmarks, channel economics, growth scenarios, dilution analysis, and use of proceeds.' },
  { type: 'lender', icon: '[L]', title: 'Lender Package', desc: 'DSCR detail, LOC sizing, cash conversion cycle, collateral analysis, and repayment capacity.' },
  { type: 'strategy', icon: '[R]', title: 'Strategy Roadmap', desc: 'Channel rankings, recommended mix, door targets, capital requirements, and milestones.' },
  { type: 'fullmodel', icon: '[D]', title: 'Full Model Detail', desc: 'All inputs, outputs, assumptions, and channel-by-channel calculations in one document.' },
];

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */

export const ExportReports: React.FC<ExportReportsProps> = (props) => {
  const {
    blended: b, channels, dashboardMix: mix, globalOverhead, targetRev,
    upspwByChannel, channelCogsMap, logistics, skuLibrary, breakeven, debtEquity,
    companyProfile,
  } = props;
  const cn = companyProfile.companyName || undefined;

  const [activeReport, setActiveReport] = useState<ReportType>(null);

  const de = useMemo(() => computeDebtVsEquity(b, debtEquity), [b, debtEquity]);
  const be = useMemo(() => computeBreakeven(b, breakeven), [b, breakeven]);

  const handlePrint = () => { window.print(); };

  if (activeReport === null) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-1">Export Reports</h2>
        <p className="text-sm text-gray-400 mb-6">Generate print-ready reports from your model. Click a report to preview, then print or save as PDF.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_CARDS.map(card => (
            <div key={card.type} className="bg-gray-800 border border-gray-700 rounded-lg p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg font-mono font-bold text-blue-400">{card.icon}</span>
                <span className="text-base font-semibold text-white">{card.title}</span>
              </div>
              <p className="text-sm text-gray-400 mb-4 flex-1">{card.desc}</p>
              <button
                className="btn btn-primary btn-sm w-full"
                onClick={() => setActiveReport(card.type)}
              >
                Generate Report
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentCard = REPORT_CARDS.find(c => c.type === activeReport);

  return (
    <div>
      <PrintStyles />

      {/* Top bar */}
      <div className="no-print flex items-center gap-3 mb-4">
        <button className="btn btn-sm btn-ghost" onClick={() => setActiveReport(null)}>
          &larr; Back to Reports
        </button>
        <span className="flex-1 text-sm text-gray-400">{currentCard?.title}</span>
        <button className="btn btn-sm btn-primary" onClick={handlePrint}>
          Print / Save as PDF
        </button>
      </div>

      {/* Report content */}
      <div
        id="print-report-content"
        className="print-report"
        style={{
          backgroundColor: '#fff',
          color: '#111',
          padding: 32,
          borderRadius: 8,
          maxWidth: 900,
          margin: '0 auto',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {activeReport === 'executive' && <ExecutiveSummary b={b} mix={mix} de={de} companyName={cn} />}
        {activeReport === 'investor' && (
          <InvestorPackage b={b} channels={channels} mix={mix} de={de} channelCogsMap={channelCogsMap} logistics={logistics} skuLibrary={skuLibrary} upspwByChannel={upspwByChannel} companyName={cn} />
        )}
        {activeReport === 'lender' && <LenderPackage b={b} de={de} companyName={cn} />}
        {activeReport === 'strategy' && (
          <StrategyRoadmap b={b} channels={channels} mix={mix} de={de} channelCogsMap={channelCogsMap} logistics={logistics} skuLibrary={skuLibrary} upspwByChannel={upspwByChannel} companyName={cn} />
        )}
        {activeReport === 'fullmodel' && (
          <FullModelDetail
            b={b} channels={channels} mix={mix} globalOverhead={globalOverhead}
            channelCogsMap={channelCogsMap} logistics={logistics} skuLibrary={skuLibrary}
            breakeven={breakeven} debtEquity={debtEquity} de={de} be={be} targetRev={targetRev}
            companyName={cn}
          />
        )}
      </div>
    </div>
  );
};
