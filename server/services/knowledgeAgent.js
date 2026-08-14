// server/services/knowledgeAgent.js
import KnowledgeItem from '../models/KnowledgeItem.js';
import { generateEmbedding, cosineSimilarity } from './embeddingService.js';

/**
 * Find the most relevant historical knowledge items for a given incident.
 * Primary: MongoDB Atlas $vectorSearch
 * Fallback: In-memory cosine similarity (if vector index not yet created)
 *
 * @param {string} incidentText - Combined title + description of the incident
 * @param {number} topK - Number of results to return (default: 5)
 * @param {number} minScore - Minimum similarity threshold (default: 0.3)
 * @returns {Promise<Array>} Top-K knowledge items with relevance scores
 */
export async function findRelevantKnowledge(incidentText, topK = 5, minScore = 0.3) {
  // Step 1: Generate embedding for the new incident
  let incidentEmbedding;
  try {
    incidentEmbedding = await generateEmbedding(incidentText);
  } catch (err) {
    throw new Error(`Failed to generate incident embedding: ${err.message}`);
  }

  // Step 2: Try MongoDB $vectorSearch first (Atlas only)
  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: incidentEmbedding,
          numCandidates: Math.max(topK * 10, 100),
          limit: topK
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          category: 1,
          service: 1,
          priority: 1,
          investigation: 1,
          resolution: 1,
          sourceTicketId: 1,
          assignedAgent: 1,
          assignedTeam: 1,
          slaInformation: 1,
          metadata: 1,
          relevanceScore: { $meta: 'vectorSearchScore' }
        }
      },
      {
        $match: {
          relevanceScore: { $gte: minScore }
        }
      }
    ];

    const results = await KnowledgeItem.aggregate(pipeline);
    console.log(`✅ Atlas vector search returned ${results.length} results`);

    if (results.length === 0) {
      const count = await KnowledgeItem.countDocuments();
      if (count === 0) {
        console.warn('⚠️  Knowledge base is empty. Run npm run ingest first.');
      }
    }
    return results;
  } catch (err) {
    // If error is because vector index doesn't exist, fall back to in-memory search
    const isIndexError = err.message && (
      err.message.includes('index') ||
      err.message.includes('$vectorSearch') ||
      err.message.includes('PlanExecutor') ||
      err.message.includes('not found') ||
      err.code === 40324 ||
      err.codeName === 'Location40324'
    );

    if (isIndexError) {
      console.warn('⚠️  Atlas vector index not found. Falling back to in-memory cosine similarity search.');
      return await inMemorySearch(incidentEmbedding, topK, minScore);
    }

    console.error('Vector search failed:', err.message);
    throw err;
  }
}

/**
 * Fallback: in-memory cosine similarity search.
 * Loads all knowledge items from the DB and ranks them by similarity.
 */
async function inMemorySearch(incidentEmbedding, topK, minScore) {
  const allItems = await KnowledgeItem.find(
    { embedding: { $exists: true, $ne: [] } },
    {
      _id: 1,
      title: 1,
      description: 1,
      category: 1,
      service: 1,
      priority: 1,
      investigation: 1,
      resolution: 1,
      sourceTicketId: 1,
      assignedAgent: 1,
      assignedTeam: 1,
      slaInformation: 1,
      metadata: 1,
      embedding: 1
    }
  ).limit(2000).lean();

  if (allItems.length === 0) {
    console.warn('⚠️  Knowledge base is empty. Run npm run ingest first.');
    return [];
  }

  // Score each item
  const scored = allItems
    .map(item => ({
      ...item,
      embedding: undefined,
      relevanceScore: cosineSimilarity(incidentEmbedding, item.embedding)
    }))
    .filter(item => item.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, topK);

  console.log(`✅ In-memory search scored ${allItems.length} items, returning top ${scored.length}`);
  return scored;
}
