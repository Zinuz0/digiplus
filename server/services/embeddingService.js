// server/services/embeddingService.js
import dotenv from 'dotenv';
dotenv.config();

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8000';

/**
 * Generate an embedding vector for a piece of text.
 * Uses the local Python embedding service (all-MiniLM-L6-v2, 384 dimensions).
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} The embedding vector
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text must be a non-empty string');
  }

  // Truncate to avoid exceeding token limits if necessary
  const truncatedText = text.slice(0, 8000);

  const response = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: truncatedText })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding service error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.embedding;
}

/**
 * Generate embeddings for multiple texts with exponential backoff retry
 * @param {string[]} texts
 * @param {Object} options
 * @param {number} options.batchSize
 * @param {number} options.delayMs - delay between batches in ms
 * @returns {Promise<number[][]>}
 */
export async function generateEmbeddingBatch(texts, { batchSize = 20, delayMs = 1000 } = {}) {
  const results = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (text, idx) => {
        let retries = 3;
        while (retries > 0) {
          try {
            return await generateEmbedding(text);
          } catch (err) {
            retries--;
            if (retries === 0) {
              console.error(`  ❌ Embedding failed for item ${i + idx + 1}: ${err.message}`);
              return null;
            }
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      })
    );
    results.push(...batchResults);

    if (i + batchSize < texts.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return results;
}

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} similarity score between -1 and 1
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dot / magnitude;
}
