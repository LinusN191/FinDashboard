from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, investments, finance

app = FastAPI(
    title="FinDashboard API",
    description="API for Investment Analytics & Personal Finance Tracking",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(investments.router, prefix="/api/investments", tags=["Investments"])
app.include_router(finance.router, prefix="/api/finance", tags=["Finance"])

@app.get("/", tags=["Root"])
async def root():
    """Health check endpoint"""
    return {"message": "Welcome to FinDashboard API", "status": "online"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
