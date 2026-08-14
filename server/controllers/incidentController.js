// server/controllers/incidentController.js
import Incident from '../models/Incident.js';
import KnowledgeItem from '../models/KnowledgeItem.js';
import { analyzeIncident } from '../services/aiService.js';
import { findRelevantKnowledge } from '../services/knowledgeAgent.js';

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createIncident(req, res) {
  try {
    const { title, description } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
    if (!description?.trim()) return res.status(400).json({ error: 'Description is required' });

    const incident = await Incident.create({ title: title.trim(), description: description.trim() });
    res.status(201).json(incident);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('createIncident error:', err);
    res.status(500).json({ error: 'Failed to create incident' });
  }
}

// ─── GET ALL ──────────────────────────────────────────────────────────────────

export async function getIncidents(req, res) {
  try {
    const { status, priority, category, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (priority) filter.priority = priority.toUpperCase();
    if (category) filter.category = { $regex: category, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-retrievedKnowledge -aiAnalysis'),
      Incident.countDocuments(filter)
    ]);

    res.json({
      incidents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('getIncidents error:', err);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
}

// ─── GET STATS ────────────────────────────────────────────────────────────────

export async function getIncidentStats(req, res) {
  try {
    const [total, open, inProgress, resolved, recentIncidents] = await Promise.all([
      Incident.countDocuments(),
      Incident.countDocuments({ status: 'OPEN' }),
      Incident.countDocuments({ status: 'IN_PROGRESS' }),
      Incident.countDocuments({ status: 'RESOLVED' }),
      Incident.find().sort({ createdAt: -1 }).limit(5).select('title status priority category createdAt')
    ]);

    res.json({ total, open, inProgress, resolved, recentIncidents });
  } catch (err) {
    console.error('getIncidentStats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

// ─── GET ONE ──────────────────────────────────────────────────────────────────

export async function getIncidentById(req, res) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid incident ID' });
    console.error('getIncidentById error:', err);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateIncident(req, res) {
  try {
    const allowedFields = ['status', 'priority', 'category', 'title', 'description'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.status) updates.status = updates.status.toUpperCase();
    if (updates.priority) updates.priority = updates.priority.toUpperCase();

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid incident ID' });
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    console.error('updateIncident error:', err);
    res.status(500).json({ error: 'Failed to update incident' });
  }
}

// ─── AI ANALYSIS ─────────────────────────────────────────────────────────────

export async function analyzeIncidentWithAI(req, res) {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    // 1. Build incident text for embedding
    const incidentText = `${incident.title}\n${incident.description}`;

    // 2. Knowledge Agent: find relevant historical knowledge
    let relevantKnowledge = [];
    let knowledgeError = null;
    try {
      relevantKnowledge = await findRelevantKnowledge(incidentText, 5);
    } catch (err) {
      knowledgeError = err.message;
      console.warn('⚠️  Knowledge retrieval failed:', err.message);
    }

    // 3. AI Analysis: LLM + grounding
    let analysisResult;
    try {
      analysisResult = await analyzeIncident(incident, relevantKnowledge);
    } catch (err) {
      return res.status(502).json({
        error: 'AI analysis failed',
        details: err.message,
        knowledgeWarning: knowledgeError
      });
    }

    // 4. Save analysis to incident
    const retrievedKnowledgeSummary = relevantKnowledge.map(item => ({
      knowledgeItemId: item._id,
      title: item.title,
      relevanceScore: item.relevanceScore,
      category: item.category,
      service: item.service,
      investigation: item.investigation,
      resolution: item.resolution,
      sourceTicketId: item.sourceTicketId
    }));

    // Find MongoDB ObjectIDs for used knowledge items
    const usedSourceIds = analysisResult.usedKnowledgeItemSourceIds || [];
    const usedItems = relevantKnowledge.filter(k =>
      usedSourceIds.includes(k.sourceTicketId)
    );

    const aiAnalysisObj = {
      summary: analysisResult.summary,
      category: analysisResult.category,
      priority: analysisResult.priority,
      possibleCauses: analysisResult.possibleCauses,
      recommendedActions: analysisResult.recommendedActions,
      recommendedResolution: analysisResult.recommendedResolution,
      confidence: analysisResult.confidence,
      usedKnowledgeItemIds: usedItems.map(k => k._id).filter(Boolean),
      analyzedAt: new Date()
    };

    const updateFields = {
      aiAnalysis: aiAnalysisObj,
      retrievedKnowledge: retrievedKnowledgeSummary,
      priority: incident.priority || analysisResult.priority,
      category: incident.category || analysisResult.category
    };
    if (incident.status === 'OPEN') updateFields.status = 'IN_PROGRESS';

    const updatedIncident = await Incident.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    res.json({
      incident: updatedIncident,
      analysis: analysisResult,
      retrievedKnowledge: retrievedKnowledgeSummary,
      knowledgeWarning: knowledgeError || undefined
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid incident ID' });
    console.error('analyzeIncidentWithAI error:', err);
    res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
}

// ─── RESOLVE ──────────────────────────────────────────────────────────────────

export async function resolveIncident(req, res) {
  try {
    const { resolution } = req.body;
    if (!resolution?.trim()) return res.status(400).json({ error: 'Resolution text is required' });

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          resolution: resolution.trim(),
          status: 'RESOLVED',
          resolvedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid incident ID' });
    console.error('resolveIncident error:', err);
    res.status(500).json({ error: 'Failed to resolve incident' });
  }
}
