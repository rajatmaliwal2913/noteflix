from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.pipeline import router as pipeline_router
from app.api.chat import router as chat_router
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Noteflix API")

# Ensure static directories exist
os.makedirs("static/visuals", exist_ok=True)

# Standard CORS is actually robust if added LAST (outermost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

@app.middleware("http")
async def simple_log_middleware(request, call_next):
    print(f"REQUEST: {request.method} {request.url.path}")
    try:
        return await call_next(request)
    except Exception as e:
        import traceback
        print(f"INTERNAL ERROR: {e}")
        traceback.print_exc()
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"detail": "Something went wrong on the server", "message": str(e)}
        )

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "port": os.getenv("PORT", "8080"),
        "env": os.getenv("RAILWAY_ENVIRONMENT", "production")
    }

# Mount static files
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root():
    return {"message": "Noteflix backend running 🚀"}

app.include_router(pipeline_router)
app.include_router(chat_router)
