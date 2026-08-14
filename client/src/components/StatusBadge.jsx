// client/src/components/StatusBadge.jsx

const statusConfig = {
  OPEN: {
    label: '🔴 Open',
    className: 'bg-red-500/15 text-red-400 border border-red-500/30',
  },
  IN_PROGRESS: {
    label: '🟡 In Progress',
    className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  },
  RESOLVED: {
    label: '🟢 Resolved',
    className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  },
};

export default function StatusBadge({ status, size = 'md' }) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`badge font-medium ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}
