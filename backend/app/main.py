from fastapi import FastAPI
from app.api.transcript import router as transcript_router

app = FastAPI(title="NoteFlix API")

app.include_router(transcript_router)
