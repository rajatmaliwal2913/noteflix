from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 👇 IMPORTANT — correct import path
from app.api.pipeline import router as pipeline_router
from app.api.chat import router as chat_router
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Noteflix API")

# Ensure static/visuals exists
os.makedirs("static/visuals", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health route
@app.get("/")
def root():
    return {"message": "Noteflix backend running 🚀"}

# 👇 THIS registers the pipeline endpoints
app.include_router(pipeline_router)
app.include_router(chat_router)
