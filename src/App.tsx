import React, { useState, useEffect, useCallback } from 'react';
import { CycloneScenario, InfrastructureAsset, DispatchRecord } from '../shared/types.js';
import { HISTORICAL_SCENARIOS } from '../server/scenarios.js';
import { SimulationResult } from '../server/simulation-engine.js';
import { TopBar } from './components/TopBar.js';
import { ScenarioPanel } from './components/ScenarioPanel.js';
import { MapView } from './components/MapView.js';
import { RiskRankingTab } from './components/RiskRankingTab.js';
import { CascadeGraphTab } from './components/CascadeGraphTab.js';
import { AdvisoryTab } from './components/AdvisoryTab.js';
import { InsuranceTab } from './components/InsuranceTab.js';
import { AskAiTab } from './components/AskAiTab.js';
import { AuditLogTab } from './components/AuditLogTab.js';
import { SitRepModal } from './components/SitRepModal.js';
import { ModelAssumptionsModal } from './components/ModelAssumptionsModal.js';
import { ImageryAnalysisModal } from './components/ImageryAnalysisModal.js';
import { DemoWalkthroughModal } from './components/DemoWalkthroughModal.js';
import { 
  ShieldAlert, 
  GitFork, 
  Bell, 
  DollarSign, 
  Bot, 
  ClipboardList, 
  Loader2 
} from 'lucide-react';

export default function App() {
  const [scenarios, setScenarios] = useState<CycloneScenario[]>(HISTORICAL_SCENARIOS);
  const [activeScenario, setActiveScenario] = useState<CycloneScenario>(HISTORICAL_SCENARIOS[0]);
  const [landfallShiftKm, setLandfallShiftKm] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Map & Asset selection
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const [isSelectingLandfallOnMap, setIsSelectingLandfallOnMap] = useState<boolean>(false);

  // Active right tab
  type TabKey = 'ranking' | 'cascade' | 'advisory' | 'insurance' | 'ask' | 'audit';
  const [activeTab, setActiveTab] = useState<TabKey>('ranking');

  // Dispatches history
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);

  // Weather Syncing state
  const [isWeatherSyncing, setIsWeatherSyncing] = useState<boolean>(false);

  // Modals state
  const [isSitRepOpen, setIsSitRepOpen] = useState<boolean>(false);
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState<boolean>(false);
  const [isDemoOpen, setIsDemoOpen] = useState<boolean>(false);

  // Multimodal Imagery Analysis
  const [isAnalyzingImagery, setIsAnalyzingImagery] = useState<boolean>(false);
  const [imageryResult, setImageryResult] = useState<any>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | undefined>();

  // Fetch scenarios from API on mount
  useEffect(() => {
    fetch('/api/scenarios')
      .then((r) => r.json())
      .then((data) => {
        if (data.scenarios && data.scenarios.length > 0) {
          setScenarios(data.scenarios);
          setActiveScenario(data.scenarios[0]);
        }
      })
      .catch((err) => console.log('Using preloaded scenarios:', err));

    // Fetch initial dispatch logs
    fetch('/api/dispatches')
      .then((r) => r.json())
      .then((data) => {
        if (data.dispatches) setDispatches(data.dispatches);
      })
      .catch(() => {});
  }, []);

  // Run simulation function
  const executeSimulation = useCallback(
    async (scenarioToRun: CycloneScenario, shiftKm: number) => {
      setIsCalculating(true);
      try {
        const res = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: scenarioToRun,
            landfallShiftKm: shiftKm,
          }),
        });
        const data = await res.json();
        setSimulationResult(data);
      } catch (err) {
        console.error('Simulation execution failed:', err);
      } finally {
        setIsCalculating(false);
      }
    },
    []
  );

  // Trigger simulation on scenario or shift change
  useEffect(() => {
    executeSimulation(activeScenario, landfallShiftKm);
  }, [activeScenario, landfallShiftKm, executeSimulation]);

  // Scenario parameter update
  const handleParameterChange = (key: keyof CycloneScenario['parameters'], value: any) => {
    setActiveScenario((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }));
  };

  const handleTideChange = (tide: number) => {
    setActiveScenario((prev) => ({
      ...prev,
      landfall: {
        ...prev.landfall,
        tideLevelM: tide,
      },
    }));
  };

  const handleResetScenario = () => {
    const original = HISTORICAL_SCENARIOS.find((s) => s.id === activeScenario.id) || HISTORICAL_SCENARIOS[0];
    setActiveScenario(JSON.parse(JSON.stringify(original)));
    setLandfallShiftKm(0);
  };

  // Map landfall click
  const handleMapClickLandfall = (lat: number, lng: number) => {
    setActiveScenario((prev) => ({
      ...prev,
      landfall: {
        ...prev.landfall,
        lat: Math.round(lat * 100) / 100,
        lng: Math.round(lng * 100) / 100,
      },
    }));
    setIsSelectingLandfallOnMap(false);
  };

  // Asset selection
  const handleSelectAsset = (asset: InfrastructureAsset) => {
    setSelectedAssetId(asset.id);
  };

  // Open-Meteo live weather sync
  const handleSyncLiveWeather = async () => {
    setIsWeatherSyncing(true);
    try {
      const res = await fetch('/api/live-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: activeScenario.landfall.lat,
          lng: activeScenario.landfall.lng,
        }),
      });
      const data = await res.json();
      if (data.current?.windSpeedKmh) {
        // Update scenario parameters with live observation
        setActiveScenario((prev) => ({
          ...prev,
          parameters: {
            ...prev.parameters,
            maxSustainedWindKmh: Math.max(100, Math.round(data.current.windSpeedKmh * 1.5)),
            centralPressureHpa: Math.round(data.current.pressureHpa || 980),
          },
        }));
      }
    } catch (err) {
      console.error('Weather sync error:', err);
    } finally {
      setIsWeatherSyncing(false);
    }
  };

  // Multimodal Imagery Analysis handler
  const handleAnalyzeMapScreenshot = async (base64: string) => {
    if (!simulationResult) return;
    setIsAnalyzingImagery(true);
    setScreenshotBase64(base64);

    try {
      const res = await fetch('/api/analyze-imagery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          hazardSummary: simulationResult.summary,
        }),
      });
      const data = await res.json();
      setImageryResult(data);
    } catch (err) {
      console.error('Imagery analysis failed:', err);
    } finally {
      setIsAnalyzingImagery(false);
    }
  };

  // Scripted Demo Step Executor
  const handleExecuteDemoStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      // Step 1: Amphan load
      const amphan = HISTORICAL_SCENARIOS.find((s) => s.id === 'amphan-2020') || HISTORICAL_SCENARIOS[0];
      setActiveScenario(JSON.parse(JSON.stringify(amphan)));
      setLandfallShiftKm(0);
      setActiveTab('ranking');
    } else if (stepIndex === 1) {
      // Step 2: Hazard physics
      setActiveScenario((prev) => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          maxSustainedWindKmh: 185,
          centralPressureHpa: 935,
          rainfall24hMm: 260,
        },
      }));
      setActiveTab('ranking');
    } else if (stepIndex === 2) {
      // Step 3: Cascade graph
      setActiveTab('cascade');
      const hosp = simulationResult?.assets.find((a) => a.id.includes('hosp-sundar-01'));
      if (hosp) setSelectedAssetId(hosp.id);
    } else if (stepIndex === 3) {
      // Step 4: Multilingual Advisory
      setActiveTab('advisory');
    } else if (stepIndex === 4) {
      // Step 5: Dispatch & Audit
      setActiveTab('audit');
      setIsDemoOpen(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      key: 'ranking',
      label: 'Risk Ranking',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      badge: simulationResult?.summary.totalCriticalAssets,
    },
    {
      key: 'cascade',
      label: 'Cascade Graph',
      icon: <GitFork className="w-3.5 h-3.5" />,
      badge: simulationResult?.cascadeGraph.spofAssetIds.length ? `${simulationResult.cascadeGraph.spofAssetIds.length} SPOF` : undefined,
    },
    {
      key: 'advisory',
      label: 'Advisories',
      icon: <Bell className="w-3.5 h-3.5" />,
    },
    {
      key: 'insurance',
      label: 'Parametric Insurance',
      icon: <DollarSign className="w-3.5 h-3.5" />,
    },
    {
      key: 'ask',
      label: 'Ask AI Analyst',
      icon: <Bot className="w-3.5 h-3.5" />,
    },
    {
      key: 'audit',
      label: 'Dispatch Audit',
      icon: <ClipboardList className="w-3.5 h-3.5" />,
      badge: dispatches.length,
    },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <TopBar
        scenario={activeScenario}
        summary={simulationResult?.summary}
        onRunDemo={() => setIsDemoOpen(true)}
        onSyncWeather={handleSyncLiveWeather}
        onOpenSitRep={() => setIsSitRepOpen(true)}
        onOpenAssumptions={() => setIsAssumptionsOpen(true)}
        isWeatherSyncing={isWeatherSyncing}
      />

      {/* Main Workspace: Left Controls | Center Map | Right Multi-Tab */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Scenario & What-If Panel */}
        <ScenarioPanel
          scenarios={scenarios}
          activeScenario={activeScenario}
          onSelectScenario={(sc) => {
            setActiveScenario(sc);
            setLandfallShiftKm(0);
          }}
          landfallShiftKm={landfallShiftKm}
          onLandfallShiftChange={setLandfallShiftKm}
          onParameterChange={handleParameterChange}
          onTideChange={handleTideChange}
          onResetScenario={handleResetScenario}
          isSelectingLandfallOnMap={isSelectingLandfallOnMap}
          onToggleMapLandfallSelection={() => setIsSelectingLandfallOnMap((prev) => !prev)}
          isCalculating={isCalculating}
        />

        {/* Center Interactive Map View */}
        <MapView
          scenario={activeScenario}
          summary={simulationResult?.summary}
          gridCells={simulationResult?.gridCells || []}
          assets={simulationResult?.assets || []}
          isSelectingLandfallOnMap={isSelectingLandfallOnMap}
          onMapClickLandfall={handleMapClickLandfall}
          onSelectAsset={handleSelectAsset}
          selectedAssetId={selectedAssetId}
          onAnalyzeMapScreenshot={handleAnalyzeMapScreenshot}
          isAnalyzingImagery={isAnalyzingImagery}
        />

        {/* Right Tabbed Intelligence Panel */}
        <div className="w-full md:w-96 lg:w-[420px] bg-slate-950 border-l border-slate-800 flex flex-col h-full z-10">
          {/* Tabs Navigation Header */}
          <div className="flex border-b border-slate-800 bg-slate-900/60 px-1 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab Body */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'ranking' && (
              <RiskRankingTab
                assets={simulationResult?.assets || []}
                onSelectAsset={handleSelectAsset}
                selectedAssetId={selectedAssetId}
              />
            )}

            {activeTab === 'cascade' && (
              <CascadeGraphTab
                cascadeGraph={simulationResult?.cascadeGraph}
                assets={simulationResult?.assets || []}
                onSelectAsset={handleSelectAsset}
                selectedAssetId={selectedAssetId}
              />
            )}

            {activeTab === 'advisory' && (
              <AdvisoryTab
                summary={simulationResult?.summary}
                onDispatchSuccess={(record) => {
                  setDispatches((prev) => [record, ...prev]);
                }}
              />
            )}

            {activeTab === 'insurance' && (
              <InsuranceTab
                triggers={simulationResult?.insuranceTriggers || []}
                summary={simulationResult?.summary}
              />
            )}

            {activeTab === 'ask' && (
              <AskAiTab
                summary={simulationResult?.summary}
                assets={simulationResult?.assets || []}
                scenarioData={simulationResult}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogTab dispatches={dispatches} />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <SitRepModal
        isOpen={isSitRepOpen}
        onClose={() => setIsSitRepOpen(false)}
        scenario={activeScenario}
        summary={simulationResult?.summary}
        assets={simulationResult?.assets || []}
      />

      <ModelAssumptionsModal
        isOpen={isAssumptionsOpen}
        onClose={() => setIsAssumptionsOpen(false)}
      />

      <ImageryAnalysisModal
        isOpen={Boolean(imageryResult)}
        onClose={() => setImageryResult(null)}
        result={imageryResult}
        screenshotBase64={screenshotBase64}
      />

      <DemoWalkthroughModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onExecuteDemoStep={handleExecuteDemoStep}
      />
    </div>
  );
}
