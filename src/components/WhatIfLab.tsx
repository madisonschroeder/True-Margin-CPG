import React, { useState } from 'react';
import { ProFormaTab } from './ProFormaTab';
import { TornadoChart } from './TornadoChart';
import { ScenarioManager, SavedScenario } from './ScenarioManager';
import {
  ChannelInputs, CogsFreightState, GlobalOverhead, BreakevenInputs,
  DebtEquityInputs, ChannelRealization, CircuitBreakerThresholds,
  BlendedFinancials, SKULibraryState, LogisticsState, CompanyProfile,
} from '../types';

type SubTab = 'stress' | 'sensitivity' | 'scenarios';

interface WhatIfLabProps {
  // Stress Test (ProFormaTab) props
  channelInputs: Record<string, ChannelInputs>;
  cogsState: CogsFreightState;
  globalOverhead: GlobalOverhead;
  dashboardMix: Record<string, number>;
  targetRev: number;
  channelRealization: ChannelRealization;
  onRealizationChange: (ch: string, val: number) => void;
  thresholds: CircuitBreakerThresholds;
  onThresholdsChange: (t: CircuitBreakerThresholds) => void;
  blended: BlendedFinancials;
  channelCogsMap: Record<string, CogsFreightState>;
  logistics: LogisticsState;
  skuLibrary: SKULibraryState;
  channelNames?: Record<string, string>;
  // Scenario Manager props
  channels: Record<string, ChannelInputs>;
  breakevenInputs: BreakevenInputs;
  debtEquityInputs: DebtEquityInputs;
  circuitBreakerThresholds: CircuitBreakerThresholds;
  channelSKUToggles: Record<string, Record<string, boolean>>;
  companyProfile: CompanyProfile;
  onLoadScenario: (scenario: any) => void;
  scenarios: SavedScenario[];
  onScenariosChange: (s: SavedScenario[]) => void;
}

export function WhatIfLab(props: WhatIfLabProps) {
  const [subTab, setSubTab] = useState<SubTab>('stress');

  const subTabs: { id: SubTab; label: string; icon: string; desc: string }[] = [
    { id: 'stress', label: 'Stress Test', icon: '⚡', desc: 'Circuit breakers & revenue realization sliders' },
    { id: 'sensitivity', label: 'Sensitivity Analysis', icon: '🌪️', desc: 'Tornado chart — which variables swing EBITDA most?' },
    { id: 'scenarios', label: 'Saved Scenarios', icon: '📋', desc: 'Compare snapshots of different model configurations' },
  ];

  return (
    <div className="space-y-4">
      {/* Intro banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
        <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
          🧪 What-If Lab
        </h2>
        <p className="text-sm text-amber-700 mt-1">
          Your scratchpad for stress testing, sensitivity analysis, and scenario comparison.
          Break things here so they don't break in reality.
        </p>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-2 flex-wrap">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              subTab === t.id
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-base-200 text-base-content hover:bg-base-300'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Description of active sub-tab */}
      <p className="text-xs text-base-content/50 italic px-1">
        {subTabs.find(t => t.id === subTab)?.desc}
      </p>

      {/* Sub-tab content */}
      {subTab === 'stress' && (
        <ProFormaTab
          channelInputs={props.channelInputs}
          cogsState={props.cogsState}
          globalOverhead={props.globalOverhead}
          dashboardMix={props.dashboardMix}
          targetRev={props.targetRev}
          channelRealization={props.channelRealization}
          onRealizationChange={props.onRealizationChange}
          thresholds={props.thresholds}
          onThresholdsChange={props.onThresholdsChange}
          blended={props.blended}
          channelCogsMap={props.channelCogsMap}
          logistics={props.logistics}
          skuLibrary={props.skuLibrary}
          channelNames={props.channelNames}
        />
      )}

      {subTab === 'sensitivity' && (
        <TornadoChart
          channelInputs={props.channelInputs}
          cogsState={props.cogsState}
          globalOverhead={props.globalOverhead}
          dashboardMix={props.dashboardMix}
          targetRev={props.targetRev}
          logistics={props.logistics}
          skuLibrary={props.skuLibrary}
        />
      )}

      {subTab === 'scenarios' && (
        <ScenarioManager
          channels={props.channels}
          cogsFreight={props.cogsState}
          globalOverhead={props.globalOverhead}
          dashboardMix={props.dashboardMix}
          targetRev={props.targetRev}
          breakevenInputs={props.breakevenInputs}
          debtEquityInputs={props.debtEquityInputs}
          channelRealization={props.channelRealization}
          circuitBreakerThresholds={props.circuitBreakerThresholds}
          skuLibrary={props.skuLibrary}
          logistics={props.logistics}
          channelSKUToggles={props.channelSKUToggles}
          companyProfile={props.companyProfile}
          onLoadScenario={props.onLoadScenario}
          scenarios={props.scenarios}
          onScenariosChange={props.onScenariosChange}
        />
      )}
    </div>
  );
}
