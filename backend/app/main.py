from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.pipeline import router as pipeline_router
from app.api.chat import router as chat_router
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Noteflix API")

os.makedirs("static/visuals", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://noteflixai.vercel.app",
        "https://www.noteflixai.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",  # Allow all for now to unblock, but we can restrict more later if needed
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Noteflix backend running 🚀"}

app.include_router(pipeline_router)
app.include_router(chat_router)
