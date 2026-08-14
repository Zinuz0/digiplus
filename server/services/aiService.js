// server/services/aiService.js
import { GoogleGenAI } from '@google/genai';
import { buildIncidentAnalysisPrompt } from '../prompts/incidentAnalysisPrompt.js';

const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ Neither LLM_API_KEY nor GEMINI_API_KEY is set!');
}

const ai = new GoogleGenAI({ apiKey });

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
  const prompt = buildIncidentAnalysisPrompt(incident, relevantKnowledge);

  let rawText;
  try {
    console.log('🤖 Calling Gemini API (gemini-3.5-flash)...');
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { temperature: 0.3 }
    });
    rawText = response.text;
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
