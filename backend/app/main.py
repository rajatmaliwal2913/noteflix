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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_cors_headers(request, call_next):
    # Manual CORS header injection for EVERY response (even if middleware is skipped)
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    # Explictly handle ALL options requests to be safe
    from fastapi.responses import Response
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.get("/health")
def health_check():
    return {"status": "healthy", "port": os.getenv("PORT", "unknown")}

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"Incoming request: {request.method} {request.url}")
    print(f"Origin: {request.headers.get('origin')}")
    response = await call_next(request)
    print(f"Response status: {response.status_code}")
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    print(f"CRITICAL ERROR: {str(exc)}")
    print(traceback.format_exc())
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.get("/")
def root():
    return {"message": "Noteflix backend running 🚀"}

app.include_router(pipeline_router)
app.include_router(chat_router)
