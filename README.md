# 🎛️ DigiPlus AI-Powered Service Desk

A full-stack AI-powered support desk application built with the MERN stack. Support engineers can create and manage technical incidents, receive AI-assisted analysis grounded in a knowledge base of historical support tickets, and record resolutions.

---

## 🎯 Problem Statement

Support engineers receive technical issues in natural language. Without organizational context, each engineer must re-diagnose problems that others have already solved. This system addresses that by:

1. Maintaining a searchable knowledge base built from historical support tickets
2. Semantically retrieving the most relevant historical incidents for each new issue
3. Feeding that context to an LLM to produce grounded, evidence-backed recommendations
4. Storing engineer resolutions so they can become future knowledge

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                  │
│  Dashboard → Create Incident → Incident Detail   │
└─────────────────┬───────────────────────────────┘
                  │ REST API (Axios)
                  ▼
┌─────────────────────────────────────────────────┐
│                Express.js Backend               │
│  ┌─────────────┐    ┌──────────────────────┐   │
│  │  Incidents   │    │  Knowledge Items     │   │
│  │   Routes     │    │  Routes              │   │
│  └──────┬──────┘    └──────────────────────┘   │
│         │                                       │
│  ┌──────▼──────────────────────────────────┐   │
│  │           AI Analysis Workflow           │   │
│  │                                          │   │
│  │  Incident → Embedding Service            │   │
│  │       → Knowledge Agent (cosine sim)     │   │
│  │       → Top-5 Knowledge Items            │   │
│  │       → LLM (Gemini 1.5 Flash)          │   │
│  │       → Structured JSON Analysis         │   │
│  └─────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────┘
                   │ Mongoose
                   ▼
┌─────────────────────────────────────────────────┐
│               MongoDB (Local)                    │
│  ┌─────────────┐    ┌──────────────────────┐   │
│  │  incidents   │    │   knowledgeitems     │   │
│  │             │    │  (w/ 768-dim vectors) │   │
│  └─────────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v3 |
| Router | React Router v6 |
| HTTP Client | Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB (local) via Mongoose |
| LLM | Google Gemini 1.5 Flash |
| Embeddings | Google text-embedding-004 (768 dimensions) |
| Vector Search | In-memory cosine similarity |

---

## 📊 Dataset

**Source:** [mindweave/help-desk-tickets](https://huggingface.co/datasets/mindweave/help-desk-tickets)

| File | Records | Description |
|---|---|---|
| `tickets.csv` | 1,001 | Core support tickets with priority, status, category |
| `comments.csv` | 2,001 | Agent comments and investigation notes per ticket |
| `categories.csv` | 8 | Category definitions (id → name + service type) |
| `agents.csv` | 10 | Support agents with team assignments |
| `sla_breaches.csv` | 1,250 | SLA breach records for tickets that exceeded targets |

### Dataset Relationships

```
tickets.csv
  ├── category_id → categories.csv (id)
  ├── assigned_agent_id → agents.csv (id)
  ├── ticket_id ← comments.csv (ticket_id)   [1:many]
  └── ticket_id ← sla_breaches.csv (ticket_id) [1:0..1]
```

---

## 🗄️ Knowledge Base Ingestion

The ingestion script (`server/scripts/ingestKnowledgeBase.js`) processes all 5 CSV files and creates enriched knowledge documents:

### Ingestion Pipeline

```
CSV Files
   │
   ├── Build lookup maps (categories, agents, SLA by ticket_id)
   ├── Group comments by ticket_id
   │
   └── For each ticket:
       ├── Attach category name + service type
       ├── Attach assigned agent name + team
       ├── Attach SLA breach data (if applicable)
       ├── Deduplicate and join comments → investigation field
       ├── Build searchableContent string
       ├── Generate embedding via Google text-embedding-004
       └── Upsert into MongoDB (idempotent, keyed by sourceTicketId)
```

### Searchable Content Format

Each embedding is generated from combined text:

```
Problem: [ticket.summary]
Description: [ticket.description]
Category: [category.name]
Service: [category.service]
Priority: [P1/P2/P3/P4]
Department: [requester_department]
Affected Service: [affected_service]
Investigation Notes: [deduped comments joined]
```

---

## 🤖 Knowledge Agent

**File:** `server/services/knowledgeAgent.js`

The knowledge agent performs semantic similarity search:

```
New Incident (title + description)
        ↓
generateEmbedding() → 768-dim vector
        ↓
KnowledgeItem.find({ embedding exists }) → all embeddings
        ↓
cosineSimilarity(incidentVector, itemVector) for each
        ↓
Filter: score >= 0.3
Sort: descending by score
Slice: top 5
        ↓
Return: KnowledgeItems with relevanceScore
```

This approach is:
- **Deterministic** — same input always produces the same ranking
- **Explainable** — relevance scores are visible in the UI
- **Simple** — no vector database required

---

## 🔮 LLM Workflow

```
Incident { title, description }
     +
Top-5 Knowledge Items (with relevance scores)
     ↓
buildIncidentAnalysisPrompt()
     ↓
Gemini 1.5 Flash (temperature: 0.3)
     ↓
Structured JSON response:
{
  summary, category, priority,
  possibleCauses[], recommendedActions[],
  recommendedResolution, confidence,
  usedKnowledgeItemSourceIds[],
  knowledgeGrounding
}
     ↓
validateAnalysisResponse() → schema enforcement
     ↓
Save to incident.aiAnalysis
```

The LLM is instructed to:
- Distinguish knowledge-grounded facts from inference
- Report LOW confidence if historical knowledge doesn't match well
- Never present unsupported information as confirmed fact

---

## 📦 Database Schema

### Incident

```javascript
{
  title: String,              // Required
  description: String,        // Required
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
  priority: 'P1' | 'P2' | 'P3' | 'P4',
  category: String,
  aiAnalysis: {
    summary, category, priority,
    possibleCauses[], recommendedActions[],
    recommendedResolution, confidence,
    usedKnowledgeItemIds[], analyzedAt
  },
  retrievedKnowledge: [{ knowledgeItemId, title, relevanceScore, ... }],
  resolution: String,
  resolvedAt: Date,
  createdAt, updatedAt
}
```

### KnowledgeItem

```javascript
{
  title: String,
  description: String,
  category: String,           // From categories.csv
  service: String,            // From categories.csv
  priority: String,
  investigation: String,      // Deduplicated comments
  resolution: String,
  sourceTicketId: Number,     // Original ticket_id (unique)
  assignedAgent: { name, team },
  assignedTeam: String,
  slaInformation: { breached, breachType, slaTargetHours, actualHours, breachMinutes },
  metadata: { channel, requesterDepartment, affectedService, escalated, outageRelated, ... },
  searchableContent: String,  // Used to generate embedding
  embedding: [Number],        // 768-dim, excluded from API responses
  createdAt, updatedAt
}
```

---

## 🌐 API Endpoints

### Incidents

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/incidents` | Create a new incident |
| `GET` | `/api/incidents` | List incidents (filter: status, priority, category) |
| `GET` | `/api/incidents/stats` | Dashboard stats |
| `GET` | `/api/incidents/:id` | Get incident by ID |
| `PATCH` | `/api/incidents/:id` | Update incident (status, priority, etc.) |
| `POST` | `/api/incidents/:id/analyze` | Run full AI analysis workflow |
| `POST` | `/api/incidents/:id/resolve` | Save resolution + mark RESOLVED |

### Knowledge

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/knowledge` | List knowledge items (paginated, searchable) |
| `GET` | `/api/knowledge/stats` | Count + category breakdown |
| `GET` | `/api/knowledge/:id` | Get knowledge item by ID |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server + MongoDB status |

---

## ⚙️ Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB running locally (default: `mongodb://localhost:27017`)
- Google Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### 1. Clone and install

```bash
# From the project root
npm install
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb://localhost:27017/service-desk
LLM_API_KEY=your_google_gemini_api_key
EMBEDDING_API_KEY=your_google_gemini_api_key
PORT=5000
```

### 3. Run the knowledge base ingestion

```bash
npm run ingest
```

This reads the 5 CSV files, generates embeddings (~1,001 API calls in batches), and populates MongoDB. Takes ~5–10 minutes on first run.

### 4. Start the application

```bash
npm run dev
```

Opens:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

---

## 🔧 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `LLM_API_KEY` | Yes | Google Gemini API key for LLM analysis |
| `EMBEDDING_API_KEY` | Yes | Google Gemini API key for embeddings (can be same as LLM_API_KEY) |
| `PORT` | No | Server port (default: 5000) |
| `CLIENT_URL` | No | Frontend URL for CORS (default: http://localhost:5173) |

---

## 📁 Project Structure

```
digiplus/
├── client/                      # React frontend (Vite)
│   └── src/
│       ├── components/          # Reusable UI components
│       │   ├── Navbar.jsx
│       │   ├── IncidentCard.jsx
│       │   ├── StatusBadge.jsx
│       │   ├── PriorityBadge.jsx
│       │   ├── AIAnalysisPanel.jsx
│       │   ├── KnowledgeItemCard.jsx
│       │   └── FilterBar.jsx
│       ├── pages/               # Route pages
│       │   ├── Dashboard.jsx
│       │   ├── CreateIncident.jsx
│       │   ├── IncidentDetail.jsx
│       │   └── KnowledgeBase.jsx
│       └── services/
│           └── api.js           # Axios API client
│
├── server/                      # Express backend
│   ├── models/
│   │   ├── Incident.js
│   │   └── KnowledgeItem.js
│   ├── routes/
│   │   ├── incidentRoutes.js
│   │   └── knowledgeRoutes.js
│   ├── controllers/
│   │   ├── incidentController.js
│   │   └── knowledgeController.js
│   ├── services/
│   │   ├── aiService.js         # Gemini LLM integration
│   │   ├── embeddingService.js  # Google text-embedding-004
│   │   └── knowledgeAgent.js   # Cosine similarity search
│   ├── prompts/
│   │   └── incidentAnalysisPrompt.js
│   ├── scripts/
│   │   └── ingestKnowledgeBase.js
│   └── server.js
│
├── tickets.csv                  # Dataset files
├── comments.csv
├── categories.csv
├── agents.csv
├── sla_breaches.csv
├── .env.example
└── package.json
```

---

## 💡 Assumptions

1. **Local MongoDB** — Uses MongoDB Compass (local). For Atlas with native vector search, change `knowledgeAgent.js` to use `$vectorSearch` aggregation.
2. **Google Gemini** — Free tier is sufficient for development. Rate limits are handled with batch delays.
3. **Embedding storage** — Embeddings are stored in MongoDB documents. For production at scale, a dedicated vector store (Pinecone, Weaviate) would be preferable.
4. **In-memory cosine search** — Works well for ~1,000 knowledge items. For 100K+ items, an index is needed.
5. **Single engineer** — No authentication/multi-tenancy. This is an MVP for a single engineer workflow.

## ⚠️ Known Limitations

1. **Embedding cost** — Initial ingestion requires ~1,001 Gemini API calls. Subsequent runs are idempotent (upsert).
2. **In-memory vector search** — At ~1,000 items, loading all embeddings per query is fast (<1s). At larger scales, this would need optimisation.
3. **LLM hallucination** — Despite grounding and low temperature, the LLM may occasionally generate incorrect recommendations. The confidence field and knowledge grounding note help engineers evaluate reliability.
4. **Comments are investigation notes only** — The dataset's comments don't include final resolution text explicitly; resolution is inferred from ticket status.
5. **No auth** — All engineers share one view. Multi-tenancy would require authentication middleware.
