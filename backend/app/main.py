from fastapi import FastAPI
from app.api.pipeline import router as pipeline_router
from app.api.chat import router as chat_router

app = FastAPI(title="NoteFlix API")

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(pipeline_router)
app.include_router(chat_router)
