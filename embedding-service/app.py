from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastembed import TextEmbedding
import uvicorn
import logging

app = FastAPI(title="Embedding Service")
logger = logging.getLogger("uvicorn.error")

# Load model globally so it's loaded only once at startup
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
logger.info(f"Loading model {MODEL_NAME} via fastembed...")
try:
    model = TextEmbedding(model_name=MODEL_NAME)
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    model = None

class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]

@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model is not loaded.")
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    try:
        # Generate embedding (fastembed expects a list of texts and returns a generator of numpy arrays)
        embeddings = list(model.embed([request.text]))
        embedding = embeddings[0].tolist()
        return EmbedResponse(embedding=embedding)
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise HTTPException(status_code=500, detail="Internal server error generating embedding.")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_name": MODEL_NAME
    }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
