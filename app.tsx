import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { TabId, ChannelInputs, CogsFreightState, GlobalOverhead, BreakevenInputs, DebtEquityInputs, ChannelRealization, CircuitBreakerThresholds, SKULibraryState, LogisticsState, CompanyProfile, CashPlanInputs, PipelineDeal, VelocityTrackerState } from './types';
import { defaultChannels, defaultDashboardMix, defaultGlobalOverhead, defaultBreakevenInputs, defaultDebtEquityInputs, defaultChannelRealization, defaultCircuitBreakerThresholds, defaultSKULibrary, defaultLogistics, defaultChannelSKUToggles, defaultCashPlanInputs, defaultVelocityTracker } from './utils/defaults';
import { computeBlendedFinancials, computeChannelOutputs, buildCogsFreightFromSKUAndLogistics } from './utils/calculations';
import { RLB_LOGO } from './components/logo';
import { SKULibrary } from './components/SKULibrary';
import { LogisticsBuilder } from './components/LogisticsBuilder';
import { ChannelTab } from './components/ChannelTab';
import { CompanyOverhead } from './components/CompanyOverhead';
import { DebtEquityTab } from './components/DebtEquityTab';
import { CashPlanTab } from './components/CashPlanTab';
import { Dashboard } from './components/Dashboard';
import { ExportButton } from './components/ExportButton';
import { WaterfallChart } from './components/WaterfallChart';
import { SavedScenario } from './components/ScenarioManager';
import { ViabilityCheck } from './components/ViabilityCheck';
import { StrategyOptimizer } from './components/StrategyOptimizer';
import { ExportReports } from './components/ExportReports';
import { DealScorer } from './components/DealScorer';
import { PipelineActuals } from './components/PipelineActuals';
import { VelocityTracker } from './components/VelocityTracker';
import { WhatIfLab } from './components/WhatIfLab';
import ChatPanel from './components/ChatPanel';
import { Truck, Store, ShoppingCart, Globe, Utensils, LayoutDashboard, Building2, Scale, Activity, Package, ShieldCheck, Crosshair, FileText, Download, Upload, TrendingUp, MessageCircle, Target, GitBranch } from 'lucide-react';
import { StageIndicator, CategorySelector, ChannelBenchmarkBar } from './components/BenchmarkBrain';

// ── Session types and helpers ──────────────────────────────────────────────────

interface SessionData {
  companyProfile: CompanyProfile;
  skuLibrary: SKULibraryState;
  logistics: LogisticsState;
  channels: Record<string, ChannelInputs>;
  globalOverhead: GlobalOverhead;
  dashboardMix: Record<string, number>;
  targetRev: number;
  breakevenInputs: BreakevenInputs;
  debtEquityInputs: DebtEquityInputs;
  channelRealization: ChannelRealization;
  circuitBreakerThresholds: CircuitBreakerThresholds;
  channelSKUToggles: Record<string, Record<string, boolean>>;
  upspwByChannel: Record<string, number>;
  cashPlanInputs: CashPlanInputs;
  velocityTracker: VelocityTrackerState;
  savedScenarios: any[];
  productCategory?: string;
}

interface SessionMeta {
  id: string;
  name: string;
  lastModified: string;
}

interface Session extends SessionMeta {
  data: SessionData;
}

const SESSIONS_KEY = 'truemargin_sessions';
const ACTIVE_KEY = 'truemargin_active_session';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: Session[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function setActiveSessionId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

function makeDefaultSessionData(): SessionData {
  return {
    companyProfile: { companyName: '', tagline: '' },
    skuLibrary: defaultSKULibrary,
    logistics: defaultLogistics,
    channels: defaultChannels,
    globalOverhead: defaultGlobalOverhead,
    dashboardMix: defaultDashboardMix,
    targetRev: 1000000,
    breakevenInputs: defaultBreakevenInputs,
    debtEquityInputs: defaultDebtEquityInputs,
    channelRealization: defaultChannelRealization,
    circuitBreakerThresholds: defaultCircuitBreakerThresholds,
    channelSKUToggles: defaultChannelSKUToggles,
    upspwByChannel: { kehe: 1, club: 1, dsd: 1, online: 1, altfdsvc: 1 },
    cashPlanInputs: defaultCashPlanInputs,
    velocityTracker: defaultVelocityTracker,
    savedScenarios: [],
  };
}

// ── Tab definitions ────────────────────────────────────────────────────────────

interface TabDef {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  group?: 'build' | 'channels' | 'reality' | 'plan' | 'tools' | 'company' | 'analytics';
}

const tabs: TabDef[] = [
  // Phase 1: Build Your Product
  { id: 'skus', label: '① SKU LIBRARY', shortLabel: '① SKUs', icon: <Package size={16} />, group: 'build' },
  { id: 'logistics', label: '② LOGISTICS BUILDER', shortLabel: '② Logistics', icon: <Truck size={16} />, group: 'build' },
  { id: 'overhead', label: '③ COMPANY OVERHEAD', shortLabel: '③ Overhead', icon: <Building2 size={16} />, group: 'build' },
  // Phase 2: Set Your Channels
  { id: 'kehe', label: "④ NAT'L DISTRIBUTION", shortLabel: "④ Nat'l Dist", icon: <Store size={16} />, group: 'channels' },
  { id: 'club', label: '④ CLUB', shortLabel: '④ Club', icon: <ShoppingCart size={16} />, group: 'channels' },
  { id: 'dsd', label: '④ DSD', shortLabel: '④ DSD', icon: <Truck size={16} />, group: 'channels' },
  { id: 'online', label: '④ ONLINE D2B', shortLabel: '④ Online', icon: <Globe size={16} />, group: 'channels' },
  { id: 'altfdsvc', label: '④ ALT FDSVC', shortLabel: '④ Alt FdSvc', icon: <Utensils size={16} />, group: 'channels' },
  // Phase 3: See Your Reality
  { id: 'dashboard', label: '⑤ EXECUTIVE DASHBOARD', shortLabel: '⑤ Dashboard', icon: <LayoutDashboard size={16} />, group: 'reality' },
  { id: 'viability', label: '⑥ VIABILITY CHECK', shortLabel: '⑥ Viability', icon: <ShieldCheck size={16} />, group: 'reality' },
  { id: 'optimizer', label: '⑦ STRATEGY OPTIMIZER', shortLabel: '⑦ Optimizer', icon: <Crosshair size={16} />, group: 'reality' },
  // Phase 4: Fund & Stress Test
  { id: 'debtequity', label: '⑧ DEBT vs EQUITY', shortLabel: '⑧ Debt/Equity', icon: <Scale size={16} />, group: 'plan' },
  { id: 'cashplan', label: '⑨ 13-WEEK CASH PLAN', shortLabel: '⑨ Cash Plan', icon: <TrendingUp size={16} />, group: 'plan' },
  { id: 'dealscorer', label: '⑩ DEAL SCORER', shortLabel: '⑩ Deals', icon: <Target size={16} />, group: 'tools' },
  { id: 'pipeline', label: '⑪ PIPELINE & ACTUALS', shortLabel: '⑪ Pipeline', icon: <GitBranch size={16} />, group: 'tools' },
  { id: 'velocity', label: '⑫ VELOCITY TRACKER', shortLabel: '⑫ Velocity', icon: <TrendingUp size={16} />, group: 'tools' },
  { id: 'whatif', label: '⑬ WHAT-IF LAB', shortLabel: '⑬ What-If', icon: <Activity size={16} />, group: 'tools' },
];

// ── App Component ──────────────────────────────────────────────────────────────

const App: React.FC = () => {
  // ── Session state ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<Session[]>(() => {
    const existing = loadSessions();
    if (existing.length > 0) return existing;
    const defaultSession: Session = {
      id: generateId(),
      name: 'New Model',
      lastModified: new Date().toISOString(),
      data: makeDefaultSessionData(),
    };
    saveSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
    return [defaultSession];
  });

  const [activeSessionId, setActiveSessionIdState] = useState<string>(() => {
    const stored = getActiveSessionId();
    const existing = loadSessions();
    if (stored && existing.find(s => s.id === stored)) return stored;
    return existing[0]?.id || '';
  });

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const initData = activeSession?.data;

  // ── App state (initialized from active session) ────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('skus');
  const [showExportModal, setShowExportModal] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(initData?.companyProfile ?? { companyName: '', tagline: '' });
  const [skuLibrary, setSKULibrary] = useState<SKULibraryState>(initData?.skuLibrary ?? defaultSKULibrary);
  const [logistics, setLogistics] = useState<LogisticsState>(initData?.logistics ?? defaultLogistics);

  const cogsFreight = useMemo(
    () => buildCogsFreightFromSKUAndLogistics(skuLibrary, logistics),
    [skuLibrary, logistics]
  );
  const [channels, setChannels] = useState<Record<string, ChannelInputs>>(initData?.channels ?? defaultChannels);
  const [globalOverhead, setGlobalOverhead] = useState<GlobalOverhead>(initData?.globalOverhead ?? defaultGlobalOverhead);
  const [dashboardMix, setDashboardMix] = useState<Record<string, number>>(initData?.dashboardMix ?? defaultDashboardMix);
  const [targetRev, setTargetRev] = useState<number>(initData?.targetRev ?? 1000000);
  const [breakevenInputs, setBreakevenInputs] = useState<BreakevenInputs>(initData?.breakevenInputs ?? defaultBreakevenInputs);
  const [debtEquityInputs, setDebtEquityInputs] = useState<DebtEquityInputs>(initData?.debtEquityInputs ?? defaultDebtEquityInputs);
  const [channelRealization, setChannelRealization] = useState<ChannelRealization>(initData?.channelRealization ?? defaultChannelRealization);
  const [circuitBreakerThresholds, setCircuitBreakerThresholds] = useState<CircuitBreakerThresholds>(initData?.circuitBreakerThresholds ?? defaultCircuitBreakerThresholds);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(initData?.savedScenarios ?? []);
  const [channelSKUToggles, setChannelSKUToggles] = useState<Record<string, Record<string, boolean>>>(initData?.channelSKUToggles ?? defaultChannelSKUToggles);
  const [cashPlanInputs, setCashPlanInputs] = useState<CashPlanInputs>(initData?.cashPlanInputs ?? defaultCashPlanInputs);
  const [upspwByChannel, setUpspwByChannel] = useState<Record<string, number>>(
    initData?.upspwByChannel ?? { kehe: 1, club: 1, dsd: 1, online: 1, altfdsvc: 1 }
  );
  const [velocityTracker, setVelocityTracker] = useState<VelocityTrackerState>(initData?.velocityTracker ?? defaultVelocityTracker);
  const [pipelineDeals, setPipelineDeals] = useState<PipelineDeal[]>([]);
  const [productCategory, setProductCategory] = useState<string>(initData?.productCategory ?? '');

  const handleAddToPipeline = (deal: PipelineDeal) => {
    setPipelineDeals(prev => [...prev, deal]);
  };

  // ── Session UI state ───────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Guard to prevent auto-save from firing during session switch
  const switchingRef = useRef(false);

  // ── AI Chat ─────────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const chatAccessCode = (() => {
    try { return localStorage.getItem('tm_access_code') || 'BETA'; } catch { return 'BETA'; }
  })();
  const chatApiBase = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? '' :
    window.location.hostname.includes('mirepoixpartners') ? '' :
    window.location.hostname.includes('true-margin-beta') ? 'https://app.mirepoixpartners.com' : '';

  const handleChatStateUpdate = (updates: any) => {
    if (!updates || typeof updates !== 'object') return;
    if (updates.skuLibrary) setSKULibrary(updates.skuLibrary);
    if (updates.logistics) handleLogisticsChange(updates.logistics);
    if (updates.channels) {
      setChannels(prev => {
        const next = { ...prev };
        for (const [chId, chUpdates] of Object.entries(updates.channels as Record<string, any>)) {
          if (next[chId]) next[chId] = { ...next[chId], ...chUpdates };
        }
        return next;
      });
    }
    if (updates.globalOverhead) setGlobalOverhead(prev => ({ ...prev, ...updates.globalOverhead }));
    if (updates.dashboardMix) setDashboardMix(updates.dashboardMix);
    if (updates.targetRev !== undefined) setTargetRev(updates.targetRev);
    if (updates.breakevenInputs) setBreakevenInputs(prev => ({ ...prev, ...updates.breakevenInputs }));
    if (updates.debtEquityInputs) setDebtEquityInputs(prev => ({ ...prev, ...updates.debtEquityInputs }));
    if (updates.channelRealization) setChannelRealization(prev => ({ ...prev, ...updates.channelRealization }));
    if (updates.circuitBreakerThresholds) setCircuitBreakerThresholds(prev => ({ ...prev, ...updates.circuitBreakerThresholds }));
    if (updates.channelSKUToggles) setChannelSKUToggles(prev => ({ ...prev, ...updates.channelSKUToggles }));
    if (updates.upspwByChannel) setUpspwByChannel(prev => ({ ...prev, ...updates.upspwByChannel }));
    if (updates.cashPlanInputs) setCashPlanInputs(prev => ({ ...prev, ...updates.cashPlanInputs }));
    if (updates.companyProfile) setCompanyProfile(prev => ({ ...prev, ...updates.companyProfile }));
  };

  const chatCurrentState = useMemo(() => ({
    skuLibrary, logistics, channels, globalOverhead, dashboardMix,
    targetRev: targetRev, breakevenInputs, debtEquityInputs,
    channelRealization, circuitBreakerThresholds, channelSKUToggles,
    upspwByChannel, cashPlanInputs, companyProfile,
  }), [skuLibrary, logistics, channels, globalOverhead, dashboardMix,
    targetRev, breakevenInputs, debtEquityInputs, channelRealization,
    circuitBreakerThresholds, channelSKUToggles, upspwByChannel, cashPlanInputs, companyProfile]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSessionDropdownOpen(false);
        setEditingSessionId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Auto-save effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSessionId || switchingRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');

    saveTimerRef.current = setTimeout(() => {
      const sessionData: SessionData = {
        companyProfile, skuLibrary, logistics, channels, globalOverhead,
        dashboardMix, targetRev, breakevenInputs, debtEquityInputs,
        channelRealization, circuitBreakerThresholds, channelSKUToggles,
        upspwByChannel, cashPlanInputs, velocityTracker, savedScenarios,
        productCategory,
      };

      setSessions(prev => {
        const updated = prev.map(s =>
          s.id === activeSessionId
            ? { ...s, lastModified: new Date().toISOString(), data: sessionData }
            : s
        );
        saveSessions(updated);
        return updated;
      });

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  }, [companyProfile, skuLibrary, logistics, channels, globalOverhead,
      dashboardMix, targetRev, breakevenInputs, debtEquityInputs,
      channelRealization, circuitBreakerThresholds, channelSKUToggles,
      upspwByChannel, cashPlanInputs, velocityTracker, savedScenarios, productCategory, activeSessionId]);

  // ── Session actions ────────────────────────────────────────────────────────
  const handleNewSession = () => {
    const newSession: Session = {
      id: generateId(),
      name: 'New Model',
      lastModified: new Date().toISOString(),
      data: makeDefaultSessionData(),
    };
    const updated = [...sessions, newSession];
    setSessions(updated);
    saveSessions(updated);
    switchToSession(newSession.id, updated);
  };

  const switchToSession = (id: string, sessionsList?: Session[]) => {
    const list = sessionsList || sessions;
    const target = list.find(s => s.id === id);
    if (!target) return;

    switchingRef.current = true;

    // Save current state to current session before switching
    const currentData: SessionData = {
      companyProfile, skuLibrary, logistics, channels, globalOverhead,
      dashboardMix, targetRev, breakevenInputs, debtEquityInputs,
      channelRealization, circuitBreakerThresholds, channelSKUToggles,
      upspwByChannel, cashPlanInputs, velocityTracker, savedScenarios,
    };
    const savedList = list.map(s =>
      s.id === activeSessionId
        ? { ...s, lastModified: new Date().toISOString(), data: currentData }
        : s
    );

    // Load new session data
    const d = target.data;
    setCompanyProfile(d.companyProfile ?? { companyName: '', tagline: '' });
    setSKULibrary(d.skuLibrary ?? defaultSKULibrary);
    handleLogisticsChange(d.logistics ?? defaultLogistics);
    setChannels(d.channels ?? defaultChannels);
    setGlobalOverhead(d.globalOverhead ?? defaultGlobalOverhead);
    setDashboardMix(d.dashboardMix ?? defaultDashboardMix);
    setTargetRev(d.targetRev ?? 1000000);
    setBreakevenInputs(d.breakevenInputs ?? defaultBreakevenInputs);
    setDebtEquityInputs(d.debtEquityInputs ?? defaultDebtEquityInputs);
    setChannelRealization(d.channelRealization ?? defaultChannelRealization);
    setCircuitBreakerThresholds(d.circuitBreakerThresholds ?? defaultCircuitBreakerThresholds);
    setChannelSKUToggles(d.channelSKUToggles ?? defaultChannelSKUToggles);
    setUpspwByChannel(d.upspwByChannel ?? { kehe: 1, club: 1, dsd: 1, online: 1, altfdsvc: 1 });
    setCashPlanInputs(d.cashPlanInputs ?? defaultCashPlanInputs);
    setVelocityTracker(d.velocityTracker ?? defaultVelocityTracker);
    setSavedScenarios(d.savedScenarios ?? []);
    setProductCategory(d.productCategory ?? '');

    setActiveSessionIdState(id);
    setActiveSessionId(id);
    setSessions(savedList);
    saveSessions(savedList);

    // Allow auto-save to resume on next render cycle
    setTimeout(() => { switchingRef.current = false; }, 0);
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    if (!confirm('Delete this session? This cannot be undone.')) return;
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    if (id === activeSessionId) {
      switchToSession(updated[0].id, updated);
    }
  };

  const handleRenameSession = (id: string, newName: string) => {
    const trimmed = newName.trim() || 'Untitled';
    const updated = sessions.map(s => s.id === id ? { ...s, name: trimmed } : s);
    setSessions(updated);
    saveSessions(updated);
  };

  // ── Existing helpers (unchanged) ───────────────────────────────────────────

  const updateUpspw = (id: string, val: number) => {
    setUpspwByChannel((prev) => ({ ...prev, [id]: val }));
  };

  const updateSKUToggle = (channelId: string, skuId: string, enabled: boolean) => {
    setChannelSKUToggles(prev => ({
      ...prev,
      [channelId]: { ...prev[channelId], [skuId]: enabled }
    }));
  };

  // Per-channel COGS computation based on SKU toggles
  const channelCogsMap = useMemo(() => {
    const map: Record<string, CogsFreightState> = {};
    const channelIds = ['kehe', 'club', 'dsd', 'online', 'altfdsvc'];
    for (const chId of channelIds) {
      const toggles = channelSKUToggles[chId] || {};
      const enabledIds = skuLibrary.skus
        .filter(s => toggles[s.id] !== false)
        .map(s => s.id);
      map[chId] = buildCogsFreightFromSKUAndLogistics(skuLibrary, logistics, enabledIds);
    }
    return map;
  }, [skuLibrary, logistics, channelSKUToggles]);

  const handleLogisticsChange = (newLogistics: LogisticsState) => {
    setLogistics(newLogistics);
    const nodeCount = newLogistics.nodes.length;
    setChannels(prev => {
      const updated = { ...prev };
      for (const id of Object.keys(updated)) {
        const ch = { ...updated[id] };
        const mix = [...(ch.supplyChainMix || [])];
        while (mix.length < nodeCount) mix.push(0);
        if (mix.length > nodeCount) mix.length = nodeCount;
        if (mix.every(v => v === 0) && nodeCount > 0) mix[0] = 1;
        ch.supplyChainMix = mix;
        updated[id] = ch;
      }
      return updated;
    });
  };

  const updateChannel = (id: string, ch: ChannelInputs) => {
    setChannels((prev) => ({ ...prev, [id]: ch }));
  };

  const updateMix = (id: string, val: number) => {
    setDashboardMix((prev) => ({ ...prev, [id]: val }));
  };

  const updateRealization = (id: string, val: number) => {
    setChannelRealization((prev) => ({ ...prev, [id]: val }));
  };

  // Compute blended financials once — shared by Dashboard, Breakeven, Debt/Equity
  const blended = useMemo(
    () => computeBlendedFinancials(channels, cogsFreight, globalOverhead, dashboardMix, targetRev, channelCogsMap, logistics, skuLibrary),
    [channels, cogsFreight, globalOverhead, dashboardMix, targetRev, channelCogsMap, logistics, skuLibrary]
  );

  // Compute channel outputs for waterfall chart
  const channelOutputsList = useMemo(() => {
    const channelIds = ['kehe', 'club', 'dsd', 'online', 'altfdsvc'];
    const labels: Record<string, string> = {
      kehe: "NAT'L DISTRIBUTION", club: 'CLUB', dsd: 'DSD', online: 'ONLINE D2B', altfdsvc: 'ALT FDSVC',
    };
    return channelIds.map(id => ({
      id,
      name: labels[id],
      outputs: computeChannelOutputs(channels[id], channelCogsMap[id], logistics, skuLibrary),
    }));
  }, [channels, channelCogsMap, logistics, skuLibrary]);

  const handleExportModel = () => {
    const modelData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      companyProfile,
      skuLibrary,
      logistics,
      channels,
      globalOverhead,
      dashboardMix,
      targetRev,
      breakevenInputs,
      debtEquityInputs,
      channelRealization,
      circuitBreakerThresholds,
      channelSKUToggles,
      upspwByChannel,
      cashPlanInputs,
      velocityTracker,
      productCategory,
    };
    const blob = new Blob([JSON.stringify(modelData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truemargin-${companyProfile.companyName || 'model'}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportModel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.companyProfile) setCompanyProfile(data.companyProfile);
          if (data.skuLibrary) setSKULibrary(data.skuLibrary);
          if (data.logistics) handleLogisticsChange(data.logistics);
          if (data.channels) setChannels(data.channels);
          if (data.globalOverhead) setGlobalOverhead(data.globalOverhead);
          if (data.dashboardMix) setDashboardMix(data.dashboardMix);
          if (data.targetRev !== undefined) setTargetRev(data.targetRev);
          if (data.breakevenInputs) setBreakevenInputs(data.breakevenInputs);
          if (data.debtEquityInputs) setDebtEquityInputs(data.debtEquityInputs);
          if (data.channelRealization) setChannelRealization(data.channelRealization);
          if (data.circuitBreakerThresholds) setCircuitBreakerThresholds(data.circuitBreakerThresholds);
          if (data.channelSKUToggles) setChannelSKUToggles(data.channelSKUToggles);
          if (data.upspwByChannel) setUpspwByChannel(data.upspwByChannel);
          if (data.cashPlanInputs) setCashPlanInputs(data.cashPlanInputs);
          if (data.velocityTracker) setVelocityTracker(data.velocityTracker);
          if (data.productCategory) setProductCategory(data.productCategory);
        } catch (err) {
          alert('Invalid model file. Please select a valid TrueMargin JSON export.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleLoadScenario = (scenario: SavedScenario) => {
    setChannels(JSON.parse(JSON.stringify(scenario.channels)));
    setGlobalOverhead(JSON.parse(JSON.stringify(scenario.globalOverhead)));
    setDashboardMix(JSON.parse(JSON.stringify(scenario.dashboardMix)));
    setTargetRev(scenario.targetRev);
    setBreakevenInputs(JSON.parse(JSON.stringify(scenario.breakevenInputs)));
    setDebtEquityInputs(JSON.parse(JSON.stringify(scenario.debtEquityInputs)));
    setChannelRealization(JSON.parse(JSON.stringify(scenario.channelRealization)));
    setCircuitBreakerThresholds(JSON.parse(JSON.stringify(scenario.circuitBreakerThresholds)));
    if (scenario.skuLibrary) setSKULibrary(JSON.parse(JSON.stringify(scenario.skuLibrary)));
    if (scenario.logistics) setLogistics(JSON.parse(JSON.stringify(scenario.logistics)));
    if (scenario.channelSKUToggles) setChannelSKUToggles(JSON.parse(JSON.stringify(scenario.channelSKUToggles)));
    if (scenario.companyProfile) setCompanyProfile(scenario.companyProfile);
  };

  const tabBanners: Partial<Record<TabId, { emoji: string; title: string; subtitle: string }>> = {
    skus: {
      emoji: '📦',
      title: 'Define your products and what they cost to make.',
      subtitle: 'Add each SKU with its bill of materials — raw ingredients, packaging, labor, and inbound freight. These costs flow into every downstream calculation.',
    },
    logistics: {
      emoji: '🚚',
      title: 'Set up your supply chain infrastructure.',
      subtitle: 'Define freight nodes (3PL hubs, direct ship, etc.) and warehousing costs. These are company-level costs that apply across all channels.',
    },
    overhead: {
      emoji: '🏢',
      title: 'Enter your fixed operating costs — input once, allocated everywhere.',
      subtitle: 'Your 9-category chart of accounts. These costs get proportionally allocated across channels in the Executive Dashboard.',
    },
    kehe: {
      emoji: '🏬',
      title: "Model your national distribution economics.",
      subtitle: 'Set pricing tiers, gross-to-net deductions, and supply chain mix for this channel. Toggle which SKUs are sold here.',
    },
    club: {
      emoji: '🛒',
      title: 'Model your club channel economics.',
      subtitle: 'Club stores have unique pricing dynamics — higher volume per door, lower margins, bigger case packs.',
    },
    dsd: {
      emoji: '🚛',
      title: 'Model your direct store delivery economics.',
      subtitle: 'DSD typically offers better margins with higher logistics costs. Set your pricing and freight mix here.',
    },
    online: {
      emoji: '🌐',
      title: 'Model your online direct-to-buyer economics.',
      subtitle: 'E-commerce and marketplace channels. Different margin structures, no slotting fees, but unique fulfillment costs.',
    },
    altfdsvc: {
      emoji: '🍽️',
      title: 'Model your alternative / foodservice channel economics.',
      subtitle: 'Foodservice, institutional, and specialty channels. Often different pack sizes and pricing structures.',
    },
    dashboard: {
      emoji: '📊',
      title: 'Your blended company reality — the single source of truth.',
      subtitle: 'Set your channel mix and revenue target to see the full picture: blended margins, working capital, doors needed, and EBITDA.',
    },
    viability: {
      emoji: '🔍',
      title: 'Is this business structurally viable? Here\'s your answer.',
      subtitle: 'Auto-calculated from all your inputs — zero guessing. Verdicts, benchmarks, breakeven targets, and your GO-GET action plan.',
    },
    optimizer: {
      emoji: '🎯',
      title: 'What\'s your winning path forward?',
      subtitle: 'Set a financial target and see three optimized scenarios ranked by efficiency. The tool prescribes your best channel mix.',
    },
    debtequity: {
      emoji: '⚖️',
      title: 'How should you fund this business?',
      subtitle: 'Auto-calculated capital needs with debt vs. equity analysis. LOC sizing, DSCR, dilution math — all derived from your model.',
    },
    cashplan: {
      emoji: '📊',
      title: 'Project your 13-week cash runway from the model.',
      subtitle: 'Set your starting cash and unit ramp — see exactly when cash runs out or stays positive. Toggle between full overhead or a simple monthly plug.',
    },
    whatif: {
      emoji: '🧪',
      title: 'Your scenario scratchpad for testing assumptions and modeling risk.',
      subtitle: 'Stress test, sensitivity analysis, and saved scenarios — all in one place.',
    },
    dealscorer: {
      emoji: '🎯',
      title: 'Deal Scorer',
      subtitle: 'Evaluate any proposed deal against your structural economics. Instant GO / CAUTION / NO-GO.',
    },
    pipeline: {
      emoji: '📊',
      title: 'Pipeline & Actuals',
      subtitle: 'Track real deals against your architectural targets. The Actual vs Architecture engine.',
    },
    velocity: {
      emoji: '📈',
      title: 'Are you actually selling? Track real velocity vs. your model.',
      subtitle: 'Enter actual sales data by retailer. See UPSPW, door tiers, ACV tracking, and how your real performance compares to architecture.',
    },

  };

  const renderContent = () => {
    switch (activeTab) {
      case 'skus':
        return <SKULibrary state={skuLibrary} onChange={setSKULibrary} />;
      case 'logistics':
        return <LogisticsBuilder state={logistics} skuLibrary={skuLibrary} onChange={handleLogisticsChange} />;
      case 'kehe':
      case 'club':
      case 'dsd':
      case 'online':
      case 'altfdsvc': {
        const chInputs = channels[activeTab];
        const totalGtN = (chInputs.earlyPayPct || 0) + (chInputs.brokerCommPct || 0) + (chInputs.spoilagePct || 0) + (chInputs.otherDeductionsPct || 0) + (chInputs.tradeSpendPct || 0);
        const chOut = computeChannelOutputs(chInputs, channelCogsMap[activeTab], logistics, skuLibrary);
        const chCmPct = chOut.netRevenue > 0 ? (chOut.netRevenue - chOut.blendedCogs) / chOut.netRevenue : 0;
        return (
          <>
            <ChannelTab
              channel={chInputs}
              cogsState={channelCogsMap[activeTab]}
              onChange={(ch) => updateChannel(activeTab, ch)}
              skuLibrary={skuLibrary}
              skuToggles={channelSKUToggles[activeTab] || {}}
              onSKUToggleChange={(skuId, enabled) => updateSKUToggle(activeTab, skuId, enabled)}
              logisticsNodeLabels={logistics.nodes.map(n => n.label)}
              logistics={logistics}
            />
            {productCategory && (
              <ChannelBenchmarkBar
                channelId={activeTab}
                tradeSpendPct={chInputs.tradeSpendPct || 0}
                gtnDilutionPct={totalGtN}
                contribMarginPct={chCmPct}
                categoryId={productCategory}
              />
            )}
          </>
        );
      }
      case 'overhead':
        return <CompanyOverhead overhead={globalOverhead} onChange={setGlobalOverhead} />;
      case 'viability':
        return (
          <ViabilityCheck
            blended={blended}
            channels={channels}
            dashboardMix={dashboardMix}
            globalOverhead={globalOverhead}
            targetRev={targetRev}
            upspwByChannel={upspwByChannel}
            channelCogsMap={channelCogsMap}
            logistics={logistics}
            skuLibrary={skuLibrary}
            breakeven={breakevenInputs}
            onBreakevenChange={setBreakevenInputs}
          />
        );
      case 'optimizer':
        return (
          <StrategyOptimizer
            blended={blended}
            channels={channels}
            dashboardMix={dashboardMix}
            globalOverhead={globalOverhead}
            channelCogsMap={channelCogsMap}
            logistics={logistics}
            skuLibrary={skuLibrary}
            upspwByChannel={upspwByChannel}
          />
        );
      case 'debtequity':
        return <DebtEquityTab blended={blended} inputs={debtEquityInputs} onChange={setDebtEquityInputs} channelInputs={channels} dashboardMix={dashboardMix} />;
      case 'cashplan':
        return <CashPlanTab inputs={cashPlanInputs} onChange={setCashPlanInputs} blended={blended} />;
      case 'whatif':
        return (
          <WhatIfLab
            channelInputs={channels}
            cogsState={cogsFreight}
            globalOverhead={globalOverhead}
            dashboardMix={dashboardMix}
            targetRev={targetRev}
            channelRealization={channelRealization}
            onRealizationChange={updateRealization}
            thresholds={circuitBreakerThresholds}
            onThresholdsChange={setCircuitBreakerThresholds}
            blended={blended}
            channelCogsMap={channelCogsMap}
            logistics={logistics}
            skuLibrary={skuLibrary}
            channels={channels}
            breakevenInputs={breakevenInputs}
            debtEquityInputs={debtEquityInputs}
            circuitBreakerThresholds={circuitBreakerThresholds}
            channelSKUToggles={channelSKUToggles}
            companyProfile={companyProfile}
            onLoadScenario={handleLoadScenario}
            scenarios={savedScenarios}
            onScenariosChange={setSavedScenarios}
          />
        );
      case 'dealscorer':
        return (
          <DealScorer
            channels={channels}
            cogsFreight={cogsFreight}
            blended={blended}
            globalOverhead={globalOverhead}
            logistics={logistics}
            skuLibrary={skuLibrary}
            channelCogsMap={channelCogsMap}
            onAddToPipeline={handleAddToPipeline}
          />
        );
      case 'pipeline':
        return (
          <PipelineActuals
            deals={pipelineDeals}
            onUpdateDeals={setPipelineDeals}
            blended={blended}
            channels={channels}
            dashboardMix={dashboardMix}
            cogsFreight={cogsFreight}
            globalOverhead={globalOverhead}
            logistics={logistics}
            skuLibrary={skuLibrary}
            channelCogsMap={channelCogsMap}
          />
        );
      case 'velocity':
        return (
          <VelocityTracker
            state={velocityTracker}
            onChange={setVelocityTracker}
            dashboardMix={dashboardMix}
            channels={channels}
            blended={blended}
          />
        );

      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* CPG Brain — Category & Stage Intelligence */}
            <div className="space-y-3">
              <CategorySelector selectedCategory={productCategory} onChange={setProductCategory} />
              <StageIndicator annualNetRevenue={blended.targetAnnualNetRev} />
            </div>
            <Dashboard
              blended={blended}
              dashboardMix={dashboardMix}
              targetRev={targetRev}
              onMixChange={updateMix}
              onTargetRevChange={setTargetRev}
              upspwByChannel={upspwByChannel}
              onUpspwChange={updateUpspw}
            />
            <WaterfallChart
              blended={blended}
              channelOutputs={channelOutputsList}
              dashboardMix={dashboardMix}
            />
          </div>
        );
      default:
        return null;
    }
  };

  let lastGroup = '';

  return (
    <div className="flex flex-col h-screen bg-base-100">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300" style={{ background: '#2a2a3d' }}>
        <img src={RLB_LOGO} alt="RLB Logo" className="h-8 w-auto" />
        <div>
          <h1 className="text-sm font-bold text-primary tracking-wider">TRUE MARGIN CPG</h1>
        </div>

        <div className="w-px h-6 bg-base-content/15 mx-1"></div>

        {/* Session dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setSessionDropdownOpen(!sessionDropdownOpen)}
            className="btn btn-ghost btn-sm gap-1 font-medium"
          >
            <span className="max-w-[150px] truncate">{activeSession?.name || 'New Model'}</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {sessionDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-base-100 border border-base-300 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-base-300 text-xs text-base-content/50 font-medium uppercase tracking-wider px-3">Sessions</div>
              <div className="max-h-60 overflow-y-auto">
                {sessions.map(s => (
                  <div key={s.id} className={`flex items-center gap-2 px-3 py-2 hover:bg-base-200 cursor-pointer group ${s.id === activeSessionId ? 'bg-primary/10 border-l-2 border-primary' : ''}`}>
                    {editingSessionId === s.id ? (
                      <input
                        autoFocus
                        className="input input-xs input-bordered flex-1"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => { handleRenameSession(s.id, editingName); setEditingSessionId(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') { handleRenameSession(s.id, editingName); setEditingSessionId(null); } if (e.key === 'Escape') setEditingSessionId(null); }}
                      />
                    ) : (
                      <>
                        <div className="flex-1 min-w-0" onClick={() => { switchToSession(s.id); setSessionDropdownOpen(false); }}>
                          <div className="font-medium text-sm truncate">{s.name}</div>
                          <div className="text-xs text-base-content/40">
                            {s.data?.companyProfile?.companyName && <span>{s.data.companyProfile.companyName} · </span>}
                            {new Date(s.lastModified).toLocaleDateString()} {new Date(s.lastModified).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                          </div>
                        </div>
                        <button
                          className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); setEditingSessionId(s.id); setEditingName(s.name); }}
                          title="Rename"
                        >✏️</button>
                        {sessions.length > 1 && (
                          <button
                            className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 text-error"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                            title="Delete"
                          >🗑️</button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-base-300 p-2">
                <button
                  onClick={() => { handleNewSession(); setSessionDropdownOpen(false); }}
                  className="btn btn-ghost btn-sm btn-block justify-start gap-2 text-primary"
                >
                  <span className="text-lg leading-none">+</span> New Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Company name & tagline inputs */}
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-base-200/50 rounded-lg px-4 py-2 flex items-center gap-3">
            <input
              type="text"
              placeholder="Your Company Name"
              className="input input-ghost input-sm font-semibold text-base-content bg-transparent border-0 hover:bg-base-300/50 focus:bg-base-300/50 px-2 h-7 min-h-0"
              value={companyProfile.companyName}
              onChange={(e) => setCompanyProfile(prev => ({ ...prev, companyName: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Optional tagline"
              className="input input-ghost input-xs text-base-content/60 bg-transparent border-0 hover:bg-base-300/50 focus:bg-base-300/50 px-2 h-6 min-h-0 text-xs"
              value={companyProfile.tagline}
              onChange={(e) => setCompanyProfile(prev => ({ ...prev, tagline: e.target.value }))}
            />
          </div>

          <div className="w-px h-6 bg-base-content/15 mx-1"></div>

          {/* New Session + Export/Import */}
          <div className="flex items-center gap-2">
            <button onClick={() => handleNewSession()} className="btn btn-outline btn-xs gap-1 text-primary">
              <span className="text-sm leading-none">+</span> New
            </button>
            <button onClick={handleExportModel} className="btn btn-outline btn-xs gap-1">
              <Download size={12} /> Export
            </button>
            <button onClick={handleImportModel} className="btn btn-outline btn-xs gap-1">
              <Upload size={12} /> Import
            </button>
          </div>

          <div className="w-px h-6 bg-base-content/15 mx-1"></div>

          {/* Save status indicator */}
          <div className="text-xs text-base-content/40 min-w-[60px] text-right">
            {saveStatus === 'saving' && <span className="animate-pulse">Saving...</span>}
            {saveStatus === 'saved' && <span className="text-success">Saved ✓</span>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="btn btn-sm btn-primary gap-1"
          >
            <FileText size={14} />
            Export Reports
          </button>
          <ExportButton title={`True Margin CPG — ${tabs.find(t => t.id === activeTab)?.label || 'Report'}`} />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex overflow-x-auto bg-base-200 border-b border-base-300 px-2 gap-0.5 scrollbar-thin items-end">
        {tabs.map((tab) => {
          const showSep = tab.group && tab.group !== lastGroup && lastGroup !== '';
          lastGroup = tab.group || '';
          return (
            <React.Fragment key={tab.id}>
              {showSep && <div className="w-px h-6 bg-base-content/10 mx-1 mb-2"></div>}
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-base-100 text-primary border-t-2 border-primary'
                    : 'text-base-content/60 hover:text-base-content hover:bg-base-300/50'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tabBanners[activeTab] && (
          <div className="flex items-start gap-3 mb-4 px-4 py-3 rounded-lg bg-primary/5 border border-primary/10">
            <span className="text-xl mt-0.5">{tabBanners[activeTab]!.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-base-content">{tabBanners[activeTab]!.title}</p>
              <p className="text-xs text-base-content/60 mt-0.5">{tabBanners[activeTab]!.subtitle}</p>
            </div>
          </div>
        )}
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 bg-base-200 border-t border-base-300 text-center">
        <span className="text-xs text-base-content/40">© 2026 Right Lane Brands, Inc. All Rights Reserved.</span>
      </div>

      {/* Export Reports Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowExportModal(false)}>
          <div className="bg-base-100 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">📊 Export Reports</h2>
              <button onClick={() => setShowExportModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <ExportReports
              blended={blended}
              channels={channels}
              dashboardMix={dashboardMix}
              globalOverhead={globalOverhead}
              targetRev={targetRev}
              upspwByChannel={upspwByChannel}
              channelCogsMap={channelCogsMap}
              logistics={logistics}
              skuLibrary={skuLibrary}
              breakeven={breakevenInputs}
              debtEquity={debtEquityInputs}
              companyProfile={companyProfile}
            />
          </div>
        </div>
      )}

      {/* AI Chat Floating Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px',
            borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(79,70,229,0.6)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,70,229,0.4)'; }}
          title="AI Advisor"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* AI Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        accessCode={chatAccessCode}
        currentState={chatCurrentState}
        onStateUpdate={handleChatStateUpdate}
        apiBase={chatApiBase}
      />
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
