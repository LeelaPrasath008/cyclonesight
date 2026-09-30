import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Sparkles, 
  ShieldAlert, 
  FileText, 
  Send, 
  Layers 
} from 'lucide-react';

interface DemoWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteDemoStep: (stepIndex: number) => void;
}

export const DemoWalkthroughModal: React.FC<DemoWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onExecuteDemoStep,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Step 1: Load Super Cyclone Amphan Replay',
      badge: 'Scenario Setup',
      desc: 'Initializes the historical May 2020 Bay of Bengal cyclone track heading towards the Sundarbans Delta with 175 km/h sustained winds at T-24h to landfall.',
      icon: <Layers className="w-5 h-5 text-cyan-400" />,
      actionText: 'Load Amphan Scenario & Focus Map',
    },
    {
      title: 'Step 2: Simulate Multi-Hazard Compound Inundation',
      badge: 'Hazard Physics',
      desc: 'Executes bathtub surge inundation (3.8m peak surge + spring tide), SCS Curve Number rainfall ponding (240mm), and Right-Front Quadrant wind asymmetry.',
      icon: <Layers className="w-5 h-5 text-blue-400" />,
      actionText: 'Calculate Hazards & Render Layers',
    },
    {
      title: 'Step 3: Analyze Cascading Infrastructure Failures',
      badge: 'Vulnerability & SPOF',
      desc: 'Identifies that Kakdwip 132kV Substation floods, causing cascading blackout to Kakdwip General Hospital (no backup generator registered) and cuts off NH-117 access road.',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      actionText: 'Inspect Hospital & Substation Cascade Chain',
    },
    {
      title: 'Step 4: Generate Multilingual AI Advisory',
      badge: 'Gemini Multimodal Reasoning',
      desc: 'Invokes Gemini with structured JSON output to draft an operational directive for the District Magistrate in English and authentic Bengali (বাংলা).',
      icon: <FileText className="w-5 h-5 text-purple-400" />,
      actionText: 'Generate Dual-Language Advisory',
    },
    {
      title: 'Step 5: Human Review & Audit-Logged Dispatch',
      badge: 'Early-Warning Automation',
      desc: 'Executes mandatory human authorization and dispatches simulated multi-channel alert (SMS, Telegram, Email) with immutable audit trail entry.',
      icon: <Send className="w-5 h-5 text-emerald-400" />,
      actionText: 'Authorize & Dry-Run Dispatch to EOC',
    },
  ];

  const handleStepAction = (idx: number) => {
    onExecuteDemoStep(idx);
    if (idx < steps.length - 1) {
      setCurrentStep(idx + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400 fill-current" />
            <h3 className="font-bold text-sm text-white">CycloneSight Hackathon Demo Walkthrough</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-1 overflow-x-auto">
          {steps.map((st, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`flex-1 min-w-[70px] py-1.5 px-2 rounded text-center text-[10px] font-mono cursor-pointer transition-colors ${
                currentStep === i
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/50'
                  : currentStep > i
                  ? 'text-emerald-400 font-medium'
                  : 'text-slate-500'
              }`}
            >
              Step {i + 1}
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              {steps[currentStep].icon}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                {steps[currentStep].badge}
              </span>
              <h2 className="text-base font-bold text-white mt-1">{steps[currentStep].title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{steps[currentStep].desc}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
            >
              Previous
            </button>

            <button
              onClick={() => handleStepAction(currentStep)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer ring-1 ring-emerald-400/30"
            >
              <span>{steps[currentStep].actionText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
