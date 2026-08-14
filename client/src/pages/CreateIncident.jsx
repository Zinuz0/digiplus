// client/src/pages/CreateIncident.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, AlertCircle, Info } from 'lucide-react';
import { incidentAPI } from '../services/api';

export default function CreateIncident() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.trim().length < 10) e.title = 'Title should be at least 10 characters';
    if (!form.description.trim()) e.description = 'Description is required';
    else if (form.description.trim().length < 20) e.description = 'Please provide a more detailed description (at least 20 chars)';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setServerError(null);
    try {
      const incident = await incidentAPI.create(form);
      navigate(`/incidents/${incident._id}`, { state: { justCreated: true } });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-white">🆕 New Incident</h1>
        <p className="text-slate-400 text-sm mt-1">Describe the support issue clearly for best AI assistance</p>
      </div>

      {/* Tip */}
      <div className="glass-card p-4 mb-6 border-blue-900/40">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-400">
            <span className="text-slate-300 font-medium">Tip: </span>
            The more specific your description, the better the AI can find relevant historical incidents and suggest accurate resolutions.
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        {/* Server error */}
        {serverError && (
          <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {serverError}
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="title" className="label">
            Incident Title <span className="text-red-400">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="e.g. VPN disconnects every 15 minutes on hotel Wi-Fi"
            className={`input-field ${errors.title ? 'border-red-500 focus:border-red-400 focus:ring-red-500/50' : ''}`}
            maxLength={500}
          />
          {errors.title && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.title}
            </p>
          )}
          <p className="text-slate-600 text-xs mt-1 text-right">{form.title.length}/500</p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="label">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder={`Describe the issue in detail, for example:
- What exactly is happening?
- When did it start?
- Who is affected?
- What have you already tried?
- Any error messages?`}
            rows={8}
            className={`input-field resize-none ${errors.description ? 'border-red-500 focus:border-red-400 focus:ring-red-500/50' : ''}`}
          />
          {errors.description && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.description}
            </p>
          )}
          <p className="text-slate-600 text-xs mt-1 text-right">{form.description.length} chars</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1 justify-center"
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Creating...' : 'Create Incident'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Workflow hint */}
      <div className="mt-6 text-center text-slate-600 text-xs">
        After creating, you can run AI analysis to get relevant historical knowledge and recommendations 🤖
      </div>
    </div>
  );
}
