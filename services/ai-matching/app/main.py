from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import negotiation

app = FastAPI(
    title="Smart Lorry Marketplace - AI Matching Service",
    description="Microservice for routing optimization and recommendations",
    version="0.1.0",
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(negotiation.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ai-matching"}

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Lorry AI Matching service. API docs available at /docs"}
