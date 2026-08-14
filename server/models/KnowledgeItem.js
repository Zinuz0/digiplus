// server/models/KnowledgeItem.js
import mongoose from 'mongoose';

const slaInformationSchema = new mongoose.Schema({
  breached: { type: Boolean, default: false },
  breachType: String,
  slaTargetHours: Number,
  actualHours: Number,
  breachMinutes: Number
}, { _id: false });

const assignedAgentSchema = new mongoose.Schema({
  name: String,
  team: String
}, { _id: false });

const metadataSchema = new mongoose.Schema({
  channel: String,
  requesterDepartment: String,
  affectedService: String,
  escalated: Boolean,
  outageRelated: Boolean,
  originalStatus: String,
  originalCreatedAt: Date,
  originalResolvedAt: Date
}, { _id: false });

const knowledgeItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: String,
  service: String,
  priority: String,
  investigation: String,
  resolution: String,
  sourceTicketId: {
    type: Number,
    required: true,
    unique: true
  },
  assignedAgent: assignedAgentSchema,
  assignedTeam: String,
  slaInformation: slaInformationSchema,
  metadata: metadataSchema,
  searchableContent: String,
  embedding: {
    type: [Number],
    select: false  // Don't return by default to keep responses lean
  }
}, {
  timestamps: true
});

// Indexes
knowledgeItemSchema.index({ category: 1 });
knowledgeItemSchema.index({ service: 1 });
knowledgeItemSchema.index({ priority: 1 });

export default mongoose.model('KnowledgeItem', knowledgeItemSchema);
