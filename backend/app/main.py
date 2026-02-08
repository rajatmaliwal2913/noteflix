from fastapi import FastAPI

app = FastAPI(title="NoteFlix API")

@app.get("/")
def root():
    return {"message": "NoteFlix API running"}
