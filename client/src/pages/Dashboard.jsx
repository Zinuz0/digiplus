// client/src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, AlertCircle, Clock, CheckCircle2, Activity, BookOpen, RefreshCw } from 'lucide-react';
import { incidentAPI, knowledgeAPI } from '../services/api';
import IncidentCard from '../components/IncidentCard';
import FilterBar from '../components/FilterBar';

function StatCard({ icon: Icon, label, value, color, bgColor, linkTo }) {
  const content = (
    <div className={`glass-card p-5 hover:scale-[1.02] transition-all duration-200 cursor-pointer group border ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? '—'}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor} opacity-80 group-hover:opacity-100 transition-opacity`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [knowledgeStats, setKnowledgeStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const retryTimerRef = useState(null);
  const elapsedTimerRef = useState(null);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const [statsResult, kbStatsResult, incidentsResult] = await Promise.allSettled([
        incidentAPI.getStats(),
        knowledgeAPI.getStats(),
        incidentAPI.getAll({ ...filters, limit: 30 }),
      ]);

      const anySuccess = [statsResult, kbStatsResult, incidentsResult].some(r => r.status === 'fulfilled');

      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (kbStatsResult.status === 'fulfilled') setKnowledgeStats(kbStatsResult.value);
      if (incidentsResult.status === 'fulfilled') {
        setIncidents(incidentsResult.value.incidents);
        setPagination(incidentsResult.value.pagination);
      }

      if (anySuccess) {
        // At least some data loaded — show the dashboard
        setWakingUp(false);
        setError(null);
        if (elapsedTimerRef[0]) clearInterval(elapsedTimerRef[0]);
      } else {
        // Nothing loaded yet — server is starting up, retry in 5s
        setWakingUp(true);
        setError(null);
        if (!elapsedTimerRef[0]) {
          elapsedTimerRef[0] = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
        }
        retryTimerRef[0] = setTimeout(() => loadData(), 5000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
    return () => {
      if (retryTimerRef[0]) clearTimeout(retryTimerRef[0]);
      if (elapsedTimerRef[0]) clearInterval(elapsedTimerRef[0]);
    };
  }, [loadData]);


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-3 bg-slate-700 rounded w-20 mb-3" />
              <div className="h-8 bg-slate-700 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (wakingUp) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="glass-card p-8 text-center">
          <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-200 font-medium text-lg">Server is waking up...</p>
          <p className="text-slate-400 text-sm mt-2">
            Free tier spins down after inactivity. This takes ~30 seconds.
          </p>
          <p className="text-slate-500 text-xs mt-1">{elapsedSeconds}s elapsed — will load automatically</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Failed to load dashboard</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
          <button onClick={() => loadData()} className="btn-secondary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">🎛️ Service Desk Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor and manage all support incidents</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn-secondary text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/incidents/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Incident
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Activity}
          label="Total Incidents"
          value={stats?.total}
          color="text-blue-400"
          bgColor="border-blue-900/30 bg-blue-950/20"
        />
        <StatCard
          icon={AlertCircle}
          label="Open"
          value={stats?.open}
          color="text-red-400"
          bgColor="border-red-900/30 bg-red-950/20"
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={stats?.inProgress}
          color="text-amber-400"
          bgColor="border-amber-900/30 bg-amber-950/20"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={stats?.resolved}
          color="text-emerald-400"
          bgColor="border-emerald-900/30 bg-emerald-950/20"
        />
      </div>

      {/* Knowledge Base banner */}
      {knowledgeStats && (
        <Link to="/knowledge" className="block glass-card p-4 mb-6 hover:border-violet-600/40 transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-600/30">
                <BookOpen className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-slate-200 font-medium text-sm">Knowledge Base</p>
                <p className="text-slate-500 text-xs">
                  {knowledgeStats.total?.toLocaleString()} historical tickets indexed •{' '}
                  {knowledgeStats.withEmbeddings?.toLocaleString()} with AI embeddings
                </p>
              </div>
            </div>
            <span className="text-violet-400 text-sm group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </Link>
      )}

      {/* Main content: filters + incidents list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            📋 Incidents
            {pagination.total !== undefined && (
              <span className="ml-2 text-slate-500 text-sm font-normal">({pagination.total} total)</span>
            )}
          </h2>
        </div>

        <FilterBar filters={filters} onChange={setFilters} />

        {incidents.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No incidents found</p>
            <p className="text-slate-500 text-sm mt-1">
              {Object.values(filters).some(v => v)
                ? 'Try adjusting your filters'
                : 'Create your first incident to get started'}
            </p>
            {!Object.values(filters).some(v => v) && (
              <Link to="/incidents/new" className="btn-primary mt-4 inline-flex">
                <Plus className="w-4 h-4" />
                Create Incident
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {incidents.map(incident => (
              <IncidentCard key={incident._id} incident={incident} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
