// server/models/Incident.js
import mongoose from 'mongoose';

const aiAnalysisSchema = new mongoose.Schema({
  summary: String,
  category: String,
  priority: String,
  possibleCauses: [String],
  recommendedActions: [String],
  recommendedResolution: String,
  confidence: String,
  usedKnowledgeItemIds: [mongoose.Schema.Types.ObjectId],
  analyzedAt: { type: Date, default: Date.now }
}, { _id: false });

const retrievedKnowledgeSchema = new mongoose.Schema({
  knowledgeItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeItem' },
  title: String,
  relevanceScore: Number,
  category: String,
  service: String,
  investigation: String,
  resolution: String,
  sourceTicketId: Number
}, { _id: false });

const incidentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [500, 'Title cannot exceed 500 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
    default: 'OPEN'
  },
  priority: {
    type: String,
    enum: ['P1', 'P2', 'P3', 'P4', null],
    default: null
  },
  category: {
    type: String,
    default: null
  },
  aiAnalysis: {
    type: aiAnalysisSchema,
    default: null
  },
  retrievedKnowledge: [retrievedKnowledgeSchema],
  resolution: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for filtering
incidentSchema.index({ status: 1 });
incidentSchema.index({ priority: 1 });
incidentSchema.index({ category: 1 });
incidentSchema.index({ createdAt: -1 });

export default mongoose.model('Incident', incidentSchema);
