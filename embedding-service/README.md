# Local Embedding Service

This service provides an HTTP API to generate embeddings using the `sentence-transformers/all-MiniLM-L6-v2` model.

## Setup

1. Make sure you have Python 3.9+ installed.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Service

```bash
python app.py
```
The service will start on `http://localhost:8000`.

## Endpoints

- `POST /embed`: Expects `{ "text": "..." }`, returns `{ "embedding": [...] }`.
- `GET /health`: Returns health status and model load status.
