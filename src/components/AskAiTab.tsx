import React, { useState } from 'react';
import { HazardSummary, InfrastructureAsset } from '../../shared/types.js';
import { 
  Bot, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  Loader2, 
  MessageSquare, 
  ShieldCheck 
} from 'lucide-react';

interface AskAiTabProps {
  summary?: HazardSummary;
  assets: InfrastructureAsset[];
  scenarioData: any;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export const AskAiTab: React.FC<AskAiTabProps> = ({ summary, assets, scenarioData }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: `Hello. I am the CycloneSight Grounded Decision-Support Analyst. I have ingested the current ${summary?.scenarioName || 'active simulation'} model outputs (${summary?.overallPopulationAtRisk.toLocaleString()} population at risk, ${summary?.totalCriticalAssets} critical assets). Ask me about power failure cascades, cut-off access roads, evacuation priorities, or hospital vulnerabilities.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const suggestedQuestions = [
    'Which hospitals will lose power first?',
    'What arterial roads will be cut off by storm surge?',
    'What is the recommended evacuation order for vulnerable sectors?',
    'Which electric substations act as single points of failure?',
  ];

  const handleSend = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isAsking) return;

    const userMsg: Message = {
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsAsking(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          scenarioData: {
            summary,
            criticalAssets: assets.filter((a) => a.risk?.band === 'Critical' || a.risk?.band === 'High'),
            cascadeSummary: scenarioData?.cascadeGraph,
          },
          conversationHistory: messages.slice(-4),
        }),
      });

      const data = await res.json();
      const modelMsg: Message = {
        role: 'model',
        text: data.answer || 'Unable to compute an analytical response.',
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      console.error('Ask failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'Encountered an issue communicating with the analytical server. Please retry.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 text-xs space-y-3 overflow-hidden">
      {/* Grounding Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="font-bold text-slate-100 text-xs">Grounded Cyclone Decision-Support AI</span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Strictly verified against simulation numbers • No extrapolation
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
          <ShieldCheck className="w-3 h-3" />
          <span>Grounded</span>
        </div>
      </div>

      {/* Suggested Starter Chips */}
      <div className="flex flex-wrap gap-1.5">
        {suggestedQuestions.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq)}
            className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-white px-2 py-1 rounded-full cursor-pointer transition-colors text-left"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-2.5 text-xs leading-relaxed space-y-1 ${
                  isUser
                    ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div
                  className={`text-[9px] font-mono ${
                    isUser ? 'text-cyan-200' : 'text-slate-500'
                  } text-right`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isAsking && (
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono p-2 bg-slate-900/50 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Cross-referencing scenario hazard grids and asset dependencies...</span>
          </div>
        )}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex items-center gap-2 pt-1 border-t border-slate-800"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask e.g. Which hospitals will be inaccessible by road?"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={isAsking || !input.trim()}
          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
