// server/services/aiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildIncidentAnalysisPrompt } from '../prompts/incidentAnalysisPrompt.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ Neither LLM_API_KEY nor GEMINI_API_KEY is set!');
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Validate the LLM's JSON response matches expected schema
 */
function validateAnalysisResponse(data) {
  const required = ['summary', 'category', 'priority', 'possibleCauses', 'recommendedActions', 'recommendedResolution', 'confidence'];
  const missing = required.filter(k => !(k in data));
  if (missing.length > 0) {
    throw new Error(`AI response missing required fields: ${missing.join(', ')}`);
  }

  if (!['P1', 'P2', 'P3', 'P4'].includes(data.priority)) {
    data.priority = 'P3';
  }

  if (!['HIGH', 'MEDIUM', 'LOW'].includes(data.confidence)) {
    data.confidence = 'LOW';
  }

  if (!Array.isArray(data.possibleCauses)) data.possibleCauses = [data.possibleCauses].filter(Boolean);
  if (!Array.isArray(data.recommendedActions)) data.recommendedActions = [data.recommendedActions].filter(Boolean);
  if (!Array.isArray(data.usedKnowledgeItemSourceIds)) data.usedKnowledgeItemSourceIds = [];

  return data;
}

/**
 * Extract JSON from a text that might have markdown code fences
 */
function extractJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not extract JSON from LLM response');
  }
}

/**
 * Analyze a support incident using historical knowledge as context.
 * @param {Object} incident - { title, description }
 * @param {Array} relevantKnowledge - top-K knowledge items from the knowledge agent
 * @returns {Promise<Object>} Structured AI analysis
 */
export async function analyzeIncident(incident, relevantKnowledge) {
  // gemini-3.1-flash-lite is fast and confirmed working
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.3,
    }
  });

  const prompt = buildIncidentAnalysisPrompt(incident, relevantKnowledge);

  let rawText;
  try {
    console.log('🤖 Calling Gemini API...');
    const result = await model.generateContent(prompt);
    rawText = result.response.text();
    console.log('✅ Gemini responded successfully');
  } catch (err) {
    console.error('❌ Gemini API error:', err.message);
    throw new Error(`LLM API call failed: ${err.message}`);
  }

  let parsed;
  try {
    parsed = extractJSON(rawText);
  } catch (err) {
    throw new Error(`Failed to parse LLM response as JSON: ${err.message}. Raw response: ${rawText.slice(0, 500)}`);
  }

  const validated = validateAnalysisResponse(parsed);
  return validated;
}
