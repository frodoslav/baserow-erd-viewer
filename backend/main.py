from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import os
from dotenv import load_dotenv

from services.baserow.client import BaserowClient

load_dotenv()

app = FastAPI(title="Baserow ERD API", description="API for Baserow ERD Viewer")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_baserow_client():
    """Dependency to get the Baserow client."""
    try:
        return BaserowClient()
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.get("/")
def read_root():
    """Root endpoint."""
    return {"message": "Welcome to Baserow ERD API"}

@app.get("/api/tables")
def get_all_tables(client: BaserowClient = Depends(get_baserow_client)):
    """Get all tables."""
    try:
        return client.get_all_tables()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fields/{table_id}")
def get_fields(table_id: int, client: BaserowClient = Depends(get_baserow_client)):
    """Get all fields for a specific table."""
    try:
        return client.get_fields(table_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/erd")
async def get_erd_data(client: BaserowClient = Depends(get_baserow_client)):
    """Get all data needed for creating an ERD."""
    try:
        data = client.get_erd_data()
        if not data or not data.get("tables"):
            return {
                "tables": [],
                "relationships": [],
                "message": "No tables found in your Baserow databases"
            }
        return data
    except Exception as e:
        print(f"Error getting ERD data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching ERD data: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
