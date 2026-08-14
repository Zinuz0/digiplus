// server/prompts/incidentAnalysisPrompt.js

/**
 * Build the LLM prompt for incident analysis.
 * @param {Object} incident - { title, description }
 * @param {Array} relevantKnowledge - array of KnowledgeItem-like objects
 * @returns {string} The complete prompt string
 */
export function buildIncidentAnalysisPrompt(incident, relevantKnowledge) {
  const knowledgeSection = relevantKnowledge.length > 0
    ? relevantKnowledge.map((item, i) => `
--- Historical Ticket #${item.sourceTicketId} ---
Category: ${item.category || 'Unknown'} / Service: ${item.service || 'Unknown'}
Priority: ${item.priority || 'Unknown'}
Problem: ${item.title}
Description: ${item.description}
Investigation: ${item.investigation || 'No investigation notes available'}
Resolution: ${item.resolution || 'No resolution recorded'}
Assigned Team: ${item.assignedTeam || 'Unknown'}
SLA Breached: ${item.slaInformation?.breached ? `Yes (${item.slaInformation.breachMinutes} mins over)` : 'No'}
Relevance Score: ${(item.relevanceScore * 100).toFixed(1)}%
`.trim()).join('\n\n')
    : 'No relevant historical knowledge found.';

  return `You are an expert IT support analyst. Analyze the following new support incident and provide structured assistance.

=== NEW INCIDENT ===
Title: ${incident.title}
Description: ${incident.description}

=== RELEVANT HISTORICAL KNOWLEDGE (${relevantKnowledge.length} items) ===
${knowledgeSection}

=== INSTRUCTIONS ===
Based on the new incident and the historical knowledge provided:
1. Summarize what the issue likely is
2. Categorize it appropriately
3. Suggest a priority level (P1=critical/outage, P2=high impact, P3=medium, P4=low)
4. List the most likely root causes (be specific, grounded in the historical knowledge)
5. Recommend concrete investigation and resolution actions
6. Provide a recommended resolution
7. Rate your confidence (HIGH/MEDIUM/LOW) based on how well the historical knowledge matches
8. Note which historical ticket IDs were most relevant to your analysis

IMPORTANT:
- Only present as confirmed fact what is directly supported by the historical knowledge
- Clearly distinguish between knowledge-grounded recommendations and general best practices
- If the historical knowledge does not match well, state LOW confidence and acknowledge uncertainty
- Be specific and actionable, not generic

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Brief description of the issue and likely cause",
  "category": "Category name (e.g., Network & VPN, Access Management, etc.)",
  "priority": "P1|P2|P3|P4",
  "possibleCauses": [
    "Specific cause 1 (cite historical ticket if applicable)",
    "Specific cause 2"
  ],
  "recommendedActions": [
    "Specific action step 1",
    "Specific action step 2",
    "Specific action step 3"
  ],
  "recommendedResolution": "Concise recommended resolution based on historical patterns",
  "confidence": "HIGH|MEDIUM|LOW",
  "usedKnowledgeItemSourceIds": [123, 456],
  "knowledgeGrounding": "Brief note on how historical knowledge informed this analysis"
}`;
}
