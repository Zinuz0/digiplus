// client/src/pages/KnowledgeBase.jsx
import { useState, useEffect } from 'react';
import { BookOpen, Search, AlertCircle, Tag, Users, TrendingUp } from 'lucide-react';
import { knowledgeAPI } from '../services/api';

function StatPill({ label, value }) {
  return (
    <div className="glass-card px-4 py-3 text-center">
      <div className="text-2xl font-bold text-violet-400">{value?.toLocaleString() ?? '—'}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function KBRow({ item }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-card-hover p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-xs font-mono text-slate-500">#{item.sourceTicketId}</span>
            {item.category && (
              <span className="badge text-xs bg-violet-500/10 text-violet-400 border border-violet-500/30 px-2 py-0.5">
                <Tag className="w-3 h-3 mr-1 inline" />{item.category}
              </span>
            )}
            {item.priority && (
              <span className="badge text-xs bg-slate-700/50 text-slate-400 border border-slate-600/50 px-2 py-0.5">
                {item.priority}
              </span>
            )}
            {item.slaInformation?.breached && (
              <span className="text-xs text-amber-500">⚠️ SLA Breached</span>
            )}
          </div>
          <h3 className="text-slate-200 text-sm font-medium line-clamp-1">{item.title}</h3>
        </div>
        <span className="text-slate-600 text-lg">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-slate-700/50 pt-4 animate-fade-in">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">📝 Description</p>
            <p className="text-slate-400 text-xs">{item.description}</p>
          </div>
          {item.investigation && (
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">🔍 Investigation</p>
              <p className="text-slate-400 text-xs">{item.investigation}</p>
            </div>
          )}
          {item.resolution && (
            <div>
              <p className="text-xs text-emerald-600 font-medium mb-1">✅ Resolution</p>
              <p className="text-slate-400 text-xs">{item.resolution}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            {item.assignedAgent?.name && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {item.assignedAgent.name} ({item.assignedAgent.team})
              </div>
            )}
            {item.metadata?.requesterDepartment && (
              <div>Dept: {item.metadata.requesterDepartment}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeBase() {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    knowledgeAPI.getStats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    loadItems();
  }, [search, category, page]);

  async function loadItems() {
    setLoading(true);
    try {
      const data = await knowledgeAPI.getAll({ search, category, page, limit: 20 });
      setItems(data.items);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const categories = stats?.byCategory || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-violet-400" />
          Knowledge Base
        </h1>
        <p className="text-slate-400 text-sm mt-1">Historical support tickets indexed for AI-powered retrieval</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatPill label="Total Tickets" value={stats.total} />
          <StatPill label="With Embeddings" value={stats.withEmbeddings} />
          <StatPill label="Categories" value={categories.length} />
        </div>
      )}

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-slate-300">By Category</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat._id}
                onClick={() => { setCategory(category === cat._id ? '' : cat._id); setPage(1); }}
                className={`badge text-xs px-3 py-1 transition-all cursor-pointer ${
                  category === cat._id
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:border-slate-500'
                }`}
              >
                {cat._id} <span className="ml-1 opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search knowledge base..."
            className="input-field pl-9"
          />
        </div>
        <button type="submit" className="btn-secondary">Search</button>
        {(search || category) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setCategory(''); setPage(1); }}
            className="btn-secondary"
          >
            Clear
          </button>
        )}
      </form>

      {/* Results */}
      {error ? (
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-slate-400">{error}</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-3 bg-slate-700 rounded w-32 mb-2" />
              <div className="h-4 bg-slate-700/60 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No knowledge items found</p>
          {!stats?.total && (
            <p className="text-slate-500 text-sm mt-1">Run <code className="bg-slate-800 px-1 rounded">npm run ingest</code> to populate the knowledge base</p>
          )}
        </div>
      ) : (
        <>
          <div className="text-xs text-slate-500 mb-3">
            Showing {items.length} of {pagination.total?.toLocaleString()} results
          </div>
          <div className="space-y-2">
            {items.map(item => <KBRow key={item._id} item={item} />)}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm px-3"
              >
                ← Prev
              </button>
              <span className="text-slate-400 text-sm">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="btn-secondary text-sm px-3"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
