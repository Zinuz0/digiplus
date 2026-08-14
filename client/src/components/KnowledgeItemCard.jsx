// client/src/components/KnowledgeItemCard.jsx
import { ExternalLink, Gauge, Tag, Users } from 'lucide-react';

function RelevanceBar({ score }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function KnowledgeItemCard({ item, rank }) {
  return (
    <div className="glass-card p-4 animate-fade-in border-l-2 border-l-violet-500/40">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 text-xs font-bold flex items-center justify-center border border-violet-600/30">
            {rank}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-mono">
                #{item.sourceTicketId}
              </span>
              {item.category && (
                <span className="badge text-xs bg-violet-500/10 text-violet-400 border border-violet-500/30 px-2 py-0.5">
                  <Tag className="w-3 h-3 mr-1 inline" />
                  {item.category}
                </span>
              )}
              {item.service && (
                <span className="badge text-xs bg-slate-700/60 text-slate-400 border border-slate-600/50 px-2 py-0.5">
                  {item.service}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-slate-200 font-medium text-sm mb-2 line-clamp-2">
        {item.title}
      </h4>

      {/* Relevance bar */}
      {item.relevanceScore !== undefined && (
        <div className="mb-3">
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
            <Gauge className="w-3 h-3" />
            Relevance
          </div>
          <RelevanceBar score={item.relevanceScore} />
        </div>
      )}

      {/* Investigation & Resolution */}
      <div className="space-y-2 text-xs">
        {item.investigation && (
          <div className="bg-slate-900/50 rounded-lg p-2.5">
            <div className="text-slate-500 font-medium mb-1">🔍 Investigation</div>
            <p className="text-slate-400 line-clamp-3">{item.investigation}</p>
          </div>
        )}
        {item.resolution && (
          <div className="bg-emerald-950/30 border border-emerald-900/30 rounded-lg p-2.5">
            <div className="text-emerald-600 font-medium mb-1">✅ Resolution</div>
            <p className="text-slate-400 line-clamp-3">{item.resolution}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {(item.assignedTeam || item.slaInformation?.breached) && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
          {item.assignedTeam && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {item.assignedTeam}
            </span>
          )}
          {item.slaInformation?.breached && (
            <span className="text-amber-500">⚠️ SLA Breached</span>
          )}
        </div>
      )}
    </div>
  );
}
