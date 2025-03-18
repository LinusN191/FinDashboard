from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import firebase_admin
from firebase_admin import auth, credentials
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter()
security = HTTPBearer()

# Initialize Firebase Admin SDK (will be implemented in config)
# cred = credentials.Certificate("path/to/serviceAccountKey.json")
# firebase_admin.initialize_app(cred)

# Pydantic models
class UserCreate(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    token: str
    user_id: str
    display_name: Optional[str] = None

# Firebase token verification dependency
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    """Register a new user with Firebase Authentication"""
    try:
        # This would normally be handled by Firebase client SDK on frontend
        # For demo/testing purposes only
        firebase_user = auth.create_user(
            email=user.email,
            password=user.password,
            display_name=user.display_name
        )
        # In production, token creation would happen on the frontend
        custom_token = auth.create_custom_token(firebase_user.uid)
        
        return {
            "token": custom_token.decode("utf-8"),
            "user_id": firebase_user.uid,
            "display_name": firebase_user.display_name
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating user: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login_user(user: UserLogin):
    """Login endpoint for testing purposes"""
    # Note: In production, authentication should be handled by Firebase client SDK
    # This endpoint is for development/testing only
    try:
        # This is a mock implementation since Firebase Admin SDK doesn't support email/password auth
        # In a real app, this would be handled by the Firebase client SDK on the frontend
        return {
            "token": "mock_token",
            "user_id": "mock_user_id",
            "display_name": "Test User"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

@router.get("/me")
async def get_current_user(user_data = Depends(verify_token)):
    """Get the current user's profile data"""
    try:
        user_id = user_data.get("uid")
        user = auth.get_user(user_id)
        return {
            "user_id": user.uid,
            "email": user.email,
            "display_name": user.display_name,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found: {str(e)}"
        )
