from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
import uvicorn
from datetime import datetime
from Backend.database import engine, Base
from Backend.routers import students, attendance, activities, syllabus, alerts,risk
import os
#from Backend.routers import risk

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Offline Rural Learning Analytics API",
    description="API for offline learning system for rural students",
    version="1.0.0"
)
app.include_router(risk.router, prefix="/api")
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set up paths
FRONTEND_DIR = "frontend"
TEMPLATES_DIR = os.path.join(FRONTEND_DIR, "templates")

# Serve static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

# Include API routers with /api prefix
app.include_router(students.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(activities.router, prefix="/api")
app.include_router(syllabus.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")

# Helper function to serve HTML pages
def serve_html_page(filename: str):
    file_path = os.path.join(FRONTEND_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="text/html")
    return JSONResponse({"error": "Page not found"}, status_code=404)

# Serve main dashboard
@app.get("/")
async def serve_dashboard():
    return serve_html_page("index.html")

# Serve other HTML pages
@app.get("/analytics")
async def serve_analytics():
    return serve_html_page("analytics.html")

@app.get("/atteandence")
async def serve_attendance():
    return serve_html_page("atteandence.html")

@app.get("/learning")
async def serve_learning():
    return serve_html_page("learning.html")

@app.get("/offline")
async def serve_offline():
    return serve_html_page("offline.html")

@app.get("/students")
async def serve_students():
    return serve_html_page("students.html")

@app.get("/syllabus")
async def serve_syllabus():
    return serve_html_page("syllabus.html")
@app.get("/risk")
async def serve_risk():
    return serve_html_page("risk.html")

# Health check endpoint
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# API root endpoint
@app.get("/api/")
def api_root():
    return {
        "message": "Offline Rural Learning Analytics API",
        "version": "1.0.0",
        "endpoints": {
            "students": "/api/students",
            "attendance": "/api/attendance",
            "activities": "/api/activities",
            "syllabus": "/api/syllabus",
            "alerts": "/api/alerts",
            "health": "/api/health"
        }
    }

# Favicon handler
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = os.path.join(FRONTEND_DIR, "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type="image/x-icon")
    from fastapi.responses import Response
    return Response(status_code=204)

# Catch-all for SPA routing (if using client-side routing)
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Check if it's an API request
    if full_path.startswith("api/"):
        return JSONResponse({"error": "API endpoint not found"}, status_code=404)
    
    # Try to serve the HTML file
    if full_path.endswith(".html"):
        return serve_html_page(full_path)
    
    # Try to serve static files
    static_path = os.path.join(FRONTEND_DIR, full_path)
    if os.path.exists(static_path):
        return FileResponse(static_path)
    
    # Default to index.html for SPA routing
    return serve_html_page("index.html")

if __name__ == "__main__":
    uvicorn.run(
        "Backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )