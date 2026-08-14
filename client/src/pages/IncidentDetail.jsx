// client/src/pages/IncidentDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Brain, CheckCircle2, Clock, AlertCircle,
  Edit3, Save, X, Database, FileText, Tag, Calendar
} from 'lucide-react';
import { incidentAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import AIAnalysisPanel from '../components/AIAnalysisPanel';
import KnowledgeItemCard from '../components/KnowledgeItemCard';

function Section({ emoji, title, children, accent }) {
  const accentMap = {
    blue: 'border-blue-500/30 bg-blue-950/10',
    violet: 'border-violet-500/30 bg-violet-950/10',
    emerald: 'border-emerald-500/30 bg-emerald-950/10',
    amber: 'border-amber-500/30 bg-amber-950/10',
    default: 'border-slate-700/50',
  };
  return (
    <div className={`glass-card border ${accentMap[accent] || accentMap.default}`}>
      <div className="px-5 py-4 border-b border-slate-700/50">
        <h2 className="section-title text-base">
          <span>{emoji}</span>
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Resolution form
  const [resolutionText, setResolutionText] = useState('');
  const [resolvingIncident, setResolvingIncident] = useState(false);
  const [resolveError, setResolveError] = useState(null);

  // Status editing
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadIncident();
  }, [id]);

  useEffect(() => {
    if (incident) {
      setResolutionText(incident.resolution || '');
      setNewStatus(incident.status);
    }
  }, [incident]);

  async function loadIncident() {
    setLoading(true);
    setError(null);
    try {
      const data = await incidentAPI.getById(id);
      setIncident(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await incidentAPI.analyze(id);
      setIncident(result.incident);
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleResolve() {
    if (!resolutionText.trim()) {
      setResolveError('Please describe how the incident was resolved.');
      return;
    }
    setResolvingIncident(true);
    setResolveError(null);
    try {
      const updated = await incidentAPI.resolve(id, { resolution: resolutionText });
      setIncident(updated);
    } catch (err) {
      setResolveError(err.message);
    } finally {
      setResolvingIncident(false);
    }
  }

  async function handleStatusUpdate() {
    if (newStatus === incident.status) { setEditingStatus(false); return; }
    setUpdatingStatus(true);
    try {
      const updated = await incidentAPI.update(id, { status: newStatus });
      setIncident(updated);
      setEditingStatus(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '—';

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-24 mb-6" />
          <div className="glass-card p-6 space-y-4">
            <div className="h-6 bg-slate-700 rounded w-3/4" />
            <div className="h-4 bg-slate-700/60 rounded w-1/2" />
            <div className="h-20 bg-slate-700/40 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">Failed to load incident</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={loadIncident} className="btn-secondary">Retry</button>
            <button onClick={() => navigate('/')} className="btn-secondary">Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) return null;

  const isResolved = incident.status === 'RESOLVED';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-5 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </button>

      {/* Just-created banner */}
      {location.state?.justCreated && (
        <div className="glass-card p-4 mb-5 border-blue-900/40 bg-blue-950/20 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-blue-300 font-medium text-sm">Incident created successfully! ✨</p>
            <p className="text-slate-400 text-xs mt-0.5">Click "Analyze with AI" below to get grounded recommendations.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left column (3/5) — Incident info + AI + Resolution */}
        <div className="lg:col-span-3 space-y-5">

          {/* ─── Incident Information ─── */}
          <Section emoji="🎫" title="Incident Information" accent="blue">
            <div className="space-y-4">
              {/* Status row */}
              <div className="flex items-center gap-3 flex-wrap">
                {editingStatus ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value)}
                      className="input-field py-1 text-sm w-auto"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={updatingStatus}
                      className="btn-success text-xs py-1"
                    >
                      <Save className="w-3 h-3" />
                      {updatingStatus ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingStatus(false); setNewStatus(incident.status); }} className="btn-secondary text-xs py-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <StatusBadge status={incident.status} />
                    {!isResolved && (
                      <button
                        onClick={() => setEditingStatus(true)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        title="Change status"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
                {incident.priority && <PriorityBadge priority={incident.priority} />}
                {incident.category && (
                  <span className="badge text-xs bg-slate-700/50 text-slate-400 border border-slate-600/50 px-2.5 py-1">
                    <Tag className="w-3 h-3 mr-1 inline" />
                    {incident.category}
                  </span>
                )}
              </div>

              {/* Title */}
              <div>
                <h1 className="text-xl font-bold text-white leading-snug">{incident.title}</h1>
              </div>

              {/* Description */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Description
                </p>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{incident.description}</p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <span>Created: {formatDate(incident.createdAt)}</span>
                </div>
                {incident.resolvedAt && (
                  <div className="flex items-center gap-1.5 text-emerald-500">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Resolved: {formatDate(incident.resolvedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ─── AI Analysis ─── */}
          <Section emoji="🤖" title="AI Analysis" accent="violet">
            {!incident.aiAnalysis && !analyzing && !analysisError && (
              <button
                onClick={handleAnalyze}
                className="btn-primary w-full justify-center py-3 text-sm mb-4"
                id="analyze-btn"
              >
                <Brain className="w-4 h-4" />
                Analyze with AI
              </button>
            )}

            {incident.aiAnalysis && !analyzing && (
              <button
                onClick={handleAnalyze}
                className="btn-secondary w-full justify-center py-2 text-xs mb-4"
              >
                <Brain className="w-3.5 h-3.5" />
                Re-analyze
              </button>
            )}

            <AIAnalysisPanel
              analysis={incident.aiAnalysis}
              isLoading={analyzing}
              error={analysisError}
            />
          </Section>

          {/* ─── Resolution ─── */}
          <Section emoji="📝" title="Resolution" accent={isResolved ? 'emerald' : 'amber'}>
            {isResolved ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Incident Resolved</span>
                </div>
                <div className="bg-emerald-950/30 border border-emerald-900/30 rounded-lg p-4">
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {incident.resolution}
                  </p>
                </div>
                <p className="text-xs text-emerald-600">Resolved at {formatDate(incident.resolvedAt)}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2 text-slate-400 text-sm">
                  <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Document your investigation and resolution steps. This will be stored as organizational knowledge.</span>
                </div>

                <div>
                  <label htmlFor="resolution" className="label">Resolution Notes</label>
                  <textarea
                    id="resolution"
                    value={resolutionText}
                    onChange={e => setResolutionText(e.target.value)}
                    placeholder="Describe what you investigated, what you found, and how you resolved the issue..."
                    rows={6}
                    className="input-field resize-none"
                  />
                </div>

                {resolveError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {resolveError}
                  </div>
                )}

                <button
                  onClick={handleResolve}
                  disabled={resolvingIncident || !resolutionText.trim()}
                  className="btn-success w-full justify-center py-2.5"
                  id="resolve-btn"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {resolvingIncident ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              </div>
            )}
          </Section>
        </div>

        {/* Right column (2/5) — Historical Knowledge */}
        <div className="lg:col-span-2 space-y-5">
          <Section emoji="📚" title="Historical Knowledge" accent="violet">
            {incident.retrievedKnowledge?.length > 0 ? (
              <div className="space-y-3">
                <p className="text-slate-500 text-xs">
                  {incident.retrievedKnowledge.length} relevant historical incidents retrieved
                </p>
                {incident.retrievedKnowledge.map((item, i) => (
                  <KnowledgeItemCard key={item.sourceTicketId || i} item={item} rank={i + 1} />
                ))}
              </div>
            ) : incident.aiAnalysis ? (
              <div className="text-center py-4">
                <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No close matches found in knowledge base</p>
                <p className="text-slate-600 text-xs mt-1">This may be a novel issue without historical precedent</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Run AI analysis to retrieve relevant historical incidents</p>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
