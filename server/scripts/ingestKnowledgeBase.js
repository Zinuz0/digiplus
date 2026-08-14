// server/scripts/ingestKnowledgeBase.js
// Run with: npm run ingest
// Reads all 5 CSV files, enriches ticket data, generates embeddings, and stores knowledge items.

import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { parse } from 'csv-parse';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load env from server directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import KnowledgeItem from '../models/KnowledgeItem.js';
import { generateEmbedding } from '../services/embeddingService.js';

const DATA_DIR = path.join(__dirname, '../../pipeline/data');

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function readCSV(filename) {
  return new Promise((resolve, reject) => {
    const records = [];
    const filePath = path.join(DATA_DIR, filename);
    createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
      .on('data', row => records.push(row))
      .on('error', reject)
      .on('end', () => resolve(records));
  });
}

// ─── Helper: Map status from dataset to readable form ────────────────────────

function normalizeStatus(status) {
  const map = { resolved: 'RESOLVED', closed: 'CLOSED', pending: 'PENDING', in_progress: 'IN_PROGRESS' };
  return map[status?.toLowerCase()] || status;
}

// ─── Build searchable content for embedding ───────────────────────────────────

function buildSearchableContent(ticket, comments, categoryName, service) {
  const parts = [
    `Problem: ${ticket.summary}`,
    `Description: ${ticket.description}`,
    `Category: ${categoryName || 'Unknown'}`,
    `Service: ${service || 'Unknown'}`,
    `Priority: ${ticket.priority}`,
    `Department: ${ticket.requester_department}`,
    `Affected Service: ${ticket.affected_service}`,
  ];

  if (comments.length > 0) {
    // Deduplicate comments and join
    const uniqueComments = [...new Set(comments.map(c => c.body.trim()))];
    parts.push(`Investigation Notes: ${uniqueComments.join('. ')}`);
  }

  return parts.filter(Boolean).join('\n');
}

// ─── Build investigation summary from comments ───────────────────────────────

function buildInvestigation(comments) {
  if (!comments || comments.length === 0) return null;
  const uniqueBodies = [...new Set(comments.map(c => c.body.trim()))];
  return uniqueBodies.join(' | ');
}

// ─── Main ingestion function ──────────────────────────────────────────────────

async function ingest() {
  console.log('\n🚀 Starting Knowledge Base Ingestion\n');
  console.log('─'.repeat(50));

  // 1. Connect to MongoDB
  console.log(`📡 Connecting to MongoDB...`);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/service-desk');
  console.log(`✅ Connected to MongoDB\n`);

  // 2. Read all CSV files
  console.log('📂 Reading CSV files...');
  const [tickets, comments, categories, agents, slaBreaches] = await Promise.all([
    readCSV('tickets.csv'),
    readCSV('comments.csv'),
    readCSV('categories.csv'),
    readCSV('agents.csv'),
    readCSV('sla_breaches.csv'),
  ]);
  console.log(`  ✅ tickets.csv     : ${tickets.length} rows`);
  console.log(`  ✅ comments.csv    : ${comments.length} rows`);
  console.log(`  ✅ categories.csv  : ${categories.length} rows`);
  console.log(`  ✅ agents.csv      : ${agents.length} rows`);
  console.log(`  ✅ sla_breaches.csv: ${slaBreaches.length} rows\n`);

  // 3. Build lookup maps
  console.log('🗺️  Building lookup maps...');

  const categoriesMap = {};
  for (const cat of categories) {
    categoriesMap[cat.id] = { name: cat.name, service: cat.service };
  }

  const agentsMap = {};
  for (const agent of agents) {
    agentsMap[agent.id] = { name: agent.name, team: agent.team };
  }

  // Group comments by ticket_id
  const commentsMap = {};
  for (const comment of comments) {
    const tid = comment.ticket_id;
    if (!commentsMap[tid]) commentsMap[tid] = [];
    commentsMap[tid].push(comment);
  }

  // Group SLA breaches by ticket_id
  const slaMap = {};
  for (const breach of slaBreaches) {
    slaMap[breach.ticket_id] = breach;
  }

  console.log('  ✅ Lookup maps ready\n');

  // 4. Process each ticket
  console.log('🔄 Processing tickets and generating embeddings...');
  console.log('   (This may take several minutes due to API rate limits)\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const BATCH_SIZE = 15;
  const BATCH_DELAY = 2000; // 2s between batches

  for (let batchStart = 0; batchStart < tickets.length; batchStart += BATCH_SIZE) {
    const batch = tickets.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(tickets.length / BATCH_SIZE);

    process.stdout.write(`  Batch ${batchNum}/${totalBatches} (tickets ${batchStart + 1}-${Math.min(batchStart + BATCH_SIZE, tickets.length)})... `);

    await Promise.all(batch.map(async (ticket) => {
      const ticketId = parseInt(ticket.ticket_id);

      try {
        // Enrich ticket data
        const category = categoriesMap[ticket.category_id] || {};
        const agent = agentsMap[ticket.assigned_agent_id] || {};
        const ticketComments = commentsMap[ticketId] || [];
        const slaBreach = slaMap[ticketId] || null;

        // Build searchable content
        const searchableContent = buildSearchableContent(
          ticket,
          ticketComments,
          category.name,
          category.service
        );

        // Generate embedding
        const embedding = await generateEmbedding(searchableContent);

        // Build the knowledge item document
        const knowledgeDoc = {
          title: ticket.summary,
          description: ticket.description,
          category: category.name || 'Unknown',
          service: category.service || ticket.affected_service || 'Unknown',
          priority: ticket.priority,
          investigation: buildInvestigation(ticketComments),
          resolution: ticket.status === 'resolved' || ticket.status === 'closed'
            ? `Ticket was ${ticket.status}. ${buildInvestigation(ticketComments) || ''}`
            : null,
          sourceTicketId: ticketId,
          assignedAgent: agent.name ? { name: agent.name, team: agent.team } : undefined,
          assignedTeam: agent.team || null,
          slaInformation: slaBreach ? {
            breached: true,
            breachType: slaBreach.breach_type,
            slaTargetHours: parseFloat(slaBreach.sla_target_hours),
            actualHours: parseFloat(slaBreach.actual_hours),
            breachMinutes: parseInt(slaBreach.breach_minutes)
          } : { breached: false },
          metadata: {
            channel: ticket.channel,
            requesterDepartment: ticket.requester_department,
            affectedService: ticket.affected_service,
            escalated: ticket.escalated === 'True',
            outageRelated: ticket.outage_related === 'True',
            originalStatus: normalizeStatus(ticket.status),
            originalCreatedAt: ticket.created_at ? new Date(ticket.created_at) : null,
            originalResolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : null
          },
          searchableContent,
          embedding
        };

        // Upsert by sourceTicketId (idempotent)
        const result = await KnowledgeItem.findOneAndUpdate(
          { sourceTicketId: ticketId },
          { $set: knowledgeDoc },
          { upsert: true, new: true, runValidators: true }
        );

        if (result.__v === undefined || result.isNew) {
          created++;
        } else {
          updated++;
        }
      } catch (err) {
        errors++;
        console.error(`\n  ❌ Error on ticket ${ticketId}: ${err.message}`);
      }
    }));

    process.stdout.write(`✅\n`);

    // Rate limit delay between batches (except last)
    if (batchStart + BATCH_SIZE < tickets.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }

  // 5. Summary
  console.log('\n' + '─'.repeat(50));
  console.log('📊 Ingestion Complete!\n');

  const total = await KnowledgeItem.countDocuments();
  const withEmbeddings = await KnowledgeItem.countDocuments({ embedding: { $exists: true, $ne: [] } });

  console.log(`  Total knowledge items in DB : ${total}`);
  console.log(`  Items with embeddings       : ${withEmbeddings}`);
  console.log(`  Created this run            : ${created}`);
  console.log(`  Updated this run            : ${updated}`);
  console.log(`  Errors                      : ${errors}`);
  console.log('\n✅ Knowledge base is ready for semantic search!\n');

  await mongoose.disconnect();
  process.exit(0);
}

ingest().catch(err => {
  console.error('\n❌ Fatal ingestion error:', err);
  mongoose.disconnect();
  process.exit(1);
});
