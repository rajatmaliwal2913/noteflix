from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.pipeline import router as pipeline_router
from app.api.chat import router as chat_router
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Noteflix API")

# Ensure static directories exist
os.makedirs("static/visuals", exist_ok=True)

# Add CORS middleware FIRST ( outermost )
# To be outermost in FastAPI, it should be added LAST or use the special middleware property.
# However, add_middleware adds it to the TOP of the stack.
# Simplified, combined middleware for absolute reliability
@app.middleware("http")
async def combined_middleware(request, call_next):
    # 1. Log request
    print(f"DEBUG: {request.method} {request.url} from {request.headers.get('origin')}")
    
    # 2. Handle preflight manually just in case
    if request.method == "OPTIONS":
        from fastapi.responses import Response
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "86400",
            }
        )

    # 3. Call the actual app
    try:
        response = await call_next(request)
    except Exception as e:
        import traceback
        print(f"CRITICAL APP ERROR: {e}")
        print(traceback.format_exc())
        from fastapi.responses import JSONResponse
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "message": str(e)},
        )

    # 4. Inject CORS headers into EVERYTHING
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "port": os.getenv("PORT", "8080"),
        "version": "1.0.1",
        "env": os.getenv("RAILWAY_ENVIRONMENT", "unknown")
    }

# Mount static files (ensure directory exists)
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root():
    return {"message": "Noteflix backend running 🚀"}

app.include_router(pipeline_router)
app.include_router(chat_router)
