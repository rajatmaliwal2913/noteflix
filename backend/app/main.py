from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 👇 IMPORTANT — correct import path
from app.api.pipeline import router as pipeline_router

app = FastAPI(title="Noteflix API")

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
