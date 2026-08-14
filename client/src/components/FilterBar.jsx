// client/src/components/FilterBar.jsx
import { Filter, X } from 'lucide-react';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];

export default function FilterBar({ filters, onChange }) {
  const hasActiveFilters = Object.values(filters).some(v => v);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value === filters[key] ? '' : value });
  };

  const clearAll = () => {
    onChange({ status: '', priority: '', category: '' });
  };

  return (
    <div className="glass-card p-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-slate-400 text-sm">
        <Filter className="w-4 h-4" />
        <span>Filter:</span>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => handleChange('status', s)}
            className={`badge text-xs px-2.5 py-1 transition-all cursor-pointer ${
              filters.status === s
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:border-slate-500/50'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-slate-700" />

      {/* Priority filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {PRIORITIES.map(p => (
          <button
            key={p}
            onClick={() => handleChange('priority', p)}
            className={`badge text-xs px-2.5 py-1 transition-all cursor-pointer ${
              filters.priority === p
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:border-slate-500/50'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors ml-auto"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
