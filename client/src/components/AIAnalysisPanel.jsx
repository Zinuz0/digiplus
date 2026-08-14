// client/src/components/AIAnalysisPanel.jsx
import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';

const confidenceConfig = {
  HIGH: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle, label: 'High Confidence' },
  MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: Info, label: 'Medium Confidence' },
  LOW: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: AlertTriangle, label: 'Low Confidence' },
};

function Section({ emoji, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-800/70 transition-colors"
      >
        <span className="font-medium text-slate-200 text-sm">
          {emoji} {title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

export default function AIAnalysisPanel({ analysis, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-violet-600/30 rounded-lg" />
          <div className="h-5 bg-slate-700 rounded w-48" />
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-700/60 rounded" style={{ width: `${70 + i * 7}%` }} />
          ))}
        </div>
        <p className="text-slate-400 text-sm mt-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400 animate-pulse" />
          Analyzing incident and retrieving relevant knowledge...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 border-red-900/40">
        <div className="flex items-center gap-3 text-red-400 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">AI Analysis Failed</span>
        </div>
        <p className="text-slate-400 text-sm">{error}</p>
        <p className="text-slate-500 text-xs mt-2">You can still view and manage this incident manually.</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="glass-card p-6 text-center">
        <Brain className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No AI analysis yet.</p>
        <p className="text-slate-500 text-xs mt-1">Click "Analyze with AI" to generate analysis.</p>
      </div>
    );
  }

  const conf = confidenceConfig[analysis.confidence] || confidenceConfig.LOW;
  const ConfIcon = conf.icon;

  return (
    <div className="space-y-3 animate-slide-up">
      {/* Header + confidence */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${conf.bg}`}>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-400" />
          <span className="font-semibold text-slate-100">AI Analysis</span>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-medium ${conf.color}`}>
          <ConfIcon className="w-4 h-4" />
          {conf.label}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
        <p className="text-slate-300 text-sm leading-relaxed">{analysis.summary}</p>
        {analysis.knowledgeGrounding && (
          <p className="text-slate-500 text-xs mt-2 italic border-t border-slate-700/50 pt-2">
            📚 {analysis.knowledgeGrounding}
          </p>
        )}
      </div>

      {/* Possible Causes */}
      {analysis.possibleCauses?.length > 0 && (
        <Section emoji="🔍" title="Possible Causes">
          <ul className="space-y-2">
            {analysis.possibleCauses.map((cause, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {cause}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Recommended Actions */}
      {analysis.recommendedActions?.length > 0 && (
        <Section emoji="🛠️" title="Recommended Actions">
          <ol className="space-y-2">
            {analysis.recommendedActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Recommended Resolution */}
      {analysis.recommendedResolution && (
        <Section emoji="✅" title="Recommended Resolution">
          <p className="text-sm text-slate-300 leading-relaxed">{analysis.recommendedResolution}</p>
        </Section>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {analysis.analyzedAt && (
          <span>Analyzed {new Date(analysis.analyzedAt).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
