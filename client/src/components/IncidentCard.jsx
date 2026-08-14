// client/src/components/IncidentCard.jsx
import { Link } from 'react-router-dom';
import { Clock, ChevronRight, Tag } from 'lucide-react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function IncidentCard({ incident }) {
  return (
    <Link
      to={`/incidents/${incident._id}`}
      className="glass-card-hover group block p-4 animate-fade-in"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={incident.status} size="sm" />
            {incident.priority && <PriorityBadge priority={incident.priority} size="sm" />}
            {incident.category && (
              <span className="badge text-xs text-slate-400 bg-slate-700/50 border border-slate-600/50 px-2 py-0.5">
                <Tag className="w-3 h-3 mr-1 inline" />
                {incident.category}
              </span>
            )}
          </div>

          <h3 className="text-slate-100 font-medium text-sm line-clamp-2 group-hover:text-blue-300 transition-colors">
            {incident.title}
          </h3>

          {incident.description && (
            <p className="text-slate-500 text-xs mt-1 line-clamp-1">
              {incident.description}
            </p>
          )}

          <div className="flex items-center gap-1 mt-2 text-slate-500 text-xs">
            <Clock className="w-3 h-3" />
            <span>{timeAgo(incident.createdAt)}</span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}
