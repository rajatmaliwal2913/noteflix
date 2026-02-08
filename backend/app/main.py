from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.pipeline import router as pipeline_router
from app.api.chat import router as chat_router

app = FastAPI(title="NoteFlix API")

# 🔥 ADD THIS BLOCK (CORS FIX)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(pipeline_router)
app.include_router(chat_router)
