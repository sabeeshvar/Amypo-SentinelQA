import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.api.routes import router as api_router, v1_router
from app.services.ingestion import ingestion_service
from app.services.vector_store import vector_store_service
from app.services.database_engine import database_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure sample documents are indexed and database is initialized
    print(f"[{settings.PROJECT_NAME}] Initializing offline knowledge base...")
    try:
        if vector_store_service.get_document_count() == 0:
            print(f"[{settings.PROJECT_NAME}] Ingesting sample docs from {settings.SAMPLE_DOCS_PATH}...")
            ingestion_service.ingest_directory(settings.SAMPLE_DOCS_PATH)
            if os.path.exists(settings.BACKEND_DOCS_PATH) and settings.BACKEND_DOCS_PATH != settings.SAMPLE_DOCS_PATH:
                ingestion_service.ingest_directory(settings.BACKEND_DOCS_PATH)
            print(f"[{settings.PROJECT_NAME}] Total chunks indexed: {vector_store_service.get_document_count()}")
    except Exception as e:
        print(f"[{settings.PROJECT_NAME}] Startup ingestion notice: {e}")
    yield
    # Shutdown
    print(f"[{settings.PROJECT_NAME}] Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Mandatory v1 API routes under both /api/v1 and /v1
app.include_router(v1_router, prefix="/api")
app.include_router(v1_router)

# Mount Dashboard and utility API routes under /api
app.include_router(api_router, prefix="/api")

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Root route serving single-page unified dashboard
@app.get("/", response_class=FileResponse)
def root():
    static_index = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.exists(static_index):
        return FileResponse(static_index)
    return FileResponse("backend/app/static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
