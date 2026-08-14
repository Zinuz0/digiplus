// server/routes/adminRoutes.js
// TEMPORARY: One-time knowledge base ingestion trigger
// Remove this file after ingestion is complete.

import express from 'express';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { parse } from 'csv-parse';
import KnowledgeItem from '../models/KnowledgeItem.js';
import { generateEmbedding } from '../services/embeddingService.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../pipeline/data');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'digiplus-ingest-2024';

let ingestStatus = { running: false, done: false, created: 0, updated: 0, errors: 0, log: [] };

function readCSV(filename) {
  return new Promise((resolve, reject) => {
    const records = [];
    createReadStream(path.join(DATA_DIR, filename))
      .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
      .on('data', row => records.push(row))
      .on('error', reject)
      .on('end', () => resolve(records));
  });
}

function buildSearchableContent(ticket, comments, categoryName, service) {
  const parts = [
    `Problem: ${ticket.summary}`,
    `Description: ${ticket.description}`,
    `Category: ${categoryName || 'Unknown'}`,
    `Service: ${service || 'Unknown'}`,
    `Priority: ${ticket.priority}`,
  ];
  if (comments.length > 0) {
    const unique = [...new Set(comments.map(c => c.body.trim()))];
    parts.push(`Investigation Notes: ${unique.join('. ')}`);
  }
  return parts.filter(Boolean).join('\n');
}

async function runIngestion() {
  ingestStatus = { running: true, done: false, created: 0, updated: 0, errors: 0, log: ['Starting...'] };

  try {
    const [tickets, comments, categories, agents, slaBreaches] = await Promise.all([
      readCSV('tickets.csv'),
      readCSV('comments.csv'),
      readCSV('categories.csv'),
      readCSV('agents.csv'),
      readCSV('sla_breaches.csv'),
    ]);

    ingestStatus.log.push(`Loaded: ${tickets.length} tickets, ${comments.length} comments`);

    const categoriesMap = {};
    for (const cat of categories) categoriesMap[cat.id] = { name: cat.name, service: cat.service };

    const agentsMap = {};
    for (const agent of agents) agentsMap[agent.id] = { name: agent.name, team: agent.team };

    const commentsMap = {};
    for (const c of comments) {
      if (!commentsMap[c.ticket_id]) commentsMap[c.ticket_id] = [];
      commentsMap[c.ticket_id].push(c);
    }

    const slaMap = {};
    for (const b of slaBreaches) slaMap[b.ticket_id] = b;

    const BATCH_SIZE = 10;
    const BATCH_DELAY = 2000;

    for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
      const batch = tickets.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (ticket) => {
        const ticketId = parseInt(ticket.ticket_id);
        try {
          const category = categoriesMap[ticket.category_id] || {};
          const agent = agentsMap[ticket.assigned_agent_id] || {};
          const ticketComments = commentsMap[ticketId] || [];
          const slaBreach = slaMap[ticketId] || null;
          const searchableContent = buildSearchableContent(ticket, ticketComments, category.name, category.service);
          const embedding = await generateEmbedding(searchableContent);

          const uniqueComments = [...new Set((ticketComments).map(c => c.body.trim()))];
          const investigation = uniqueComments.length > 0 ? uniqueComments.join(' | ') : null;

          const doc = {
            title: ticket.summary,
            description: ticket.description,
            category: category.name || 'Unknown',
            service: category.service || ticket.affected_service || 'Unknown',
            priority: ticket.priority,
            investigation,
            resolution: (ticket.status === 'resolved' || ticket.status === 'closed')
              ? `Ticket was ${ticket.status}. ${investigation || ''}` : null,
            sourceTicketId: ticketId,
            assignedAgent: agent.name ? { name: agent.name, team: agent.team } : undefined,
            assignedTeam: agent.team || null,
            slaInformation: slaBreach
              ? { breached: true, breachType: slaBreach.breach_type, slaTargetHours: parseFloat(slaBreach.sla_target_hours), actualHours: parseFloat(slaBreach.actual_hours), breachMinutes: parseInt(slaBreach.breach_minutes) }
              : { breached: false },
            metadata: {
              channel: ticket.channel,
              requesterDepartment: ticket.requester_department,
              affectedService: ticket.affected_service,
              escalated: ticket.escalated === 'True',
              outageRelated: ticket.outage_related === 'True',
              originalStatus: ticket.status,
              originalCreatedAt: ticket.created_at ? new Date(ticket.created_at) : null,
              originalResolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : null
            },
            searchableContent,
            embedding
          };

          await KnowledgeItem.findOneAndUpdate({ sourceTicketId: ticketId }, { $set: doc }, { upsert: true, new: true });
          ingestStatus.created++;
        } catch (err) {
          ingestStatus.errors++;
          ingestStatus.log.push(`Error on ticket ${ticketId}: ${err.message.slice(0, 100)}`);
        }
      }));

      ingestStatus.log.push(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1} (${i + batch.length}/${tickets.length})`);
      if (i + BATCH_SIZE < tickets.length) await new Promise(r => setTimeout(r, BATCH_DELAY));
    }

    const total = await KnowledgeItem.countDocuments();
    ingestStatus.log.push(`✅ Done! Total knowledge items in DB: ${total}`);
    ingestStatus.running = false;
    ingestStatus.done = true;

  } catch (err) {
    ingestStatus.log.push(`FATAL: ${err.message}`);
    ingestStatus.running = false;
    ingestStatus.done = true;
  }
}

// POST /api/admin/ingest?token=digiplus-ingest-2024
router.post('/ingest', (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  if (ingestStatus.running) return res.json({ message: 'Already running', status: ingestStatus });
  runIngestion();
  res.json({ message: 'Ingestion started', status: ingestStatus });
});

// GET /api/admin/status?token=digiplus-ingest-2024
router.get('/status', (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  res.json(ingestStatus);
});

export default router;
