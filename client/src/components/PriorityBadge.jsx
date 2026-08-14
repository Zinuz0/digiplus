// client/src/components/PriorityBadge.jsx

const priorityConfig = {
  P1: { label: 'P1 Critical', className: 'bg-red-600/20 text-red-300 border border-red-600/40' },
  P2: { label: 'P2 High', className: 'bg-orange-500/20 text-orange-300 border border-orange-500/40' },
  P3: { label: 'P3 Medium', className: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' },
  P4: { label: 'P4 Low', className: 'bg-slate-500/20 text-slate-400 border border-slate-500/40' },
};

export default function PriorityBadge({ priority, size = 'md' }) {
  if (!priority) return null;

  const config = priorityConfig[priority] || {
    label: priority,
    className: 'bg-slate-500/20 text-slate-400 border border-slate-500/40',
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`badge font-medium ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}
