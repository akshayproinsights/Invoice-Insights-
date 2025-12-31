"""
User configuration API endpoint.
Returns user-specific configuration for frontend (columns, prompts, dashboard URL, etc.)
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import logging

from auth import get_current_user
from config_loader import get_user_config

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/config")
async def get_user_configuration(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get user-specific configuration for frontend.
    
    Returns configuration including:
    - username
    - industry
    - r2_bucket
    - dashboard_url
    - columns (for all stages: upload, verify_dates, verify_amounts, verified)
    - gemini prompts (optional, for debugging)
    
    Headers:
        Authorization: Bearer <JWT token>
    
    Returns:
        200: User configuration object
        400: No username in token
        404: User configuration not found
        500: Server error
    """
    username = current_user.get("username")
    
    if not username:
        raise HTTPException(status_code=400, detail="No username in token")
    
    try:
        # Load user configuration
        config = get_user_config(username)
        
        if not config:
            logger.error(f"Configuration not found for user: {username}")
            raise HTTPException(
                status_code=404, 
                detail=f"Configuration not found for user: {username}"
            )
        
        # Extract relevant fields for frontend
        response = {
            "username": username,
            "industry": config.get("industry"),
            "r2_bucket": config.get("r2_bucket"),
            "dashboard_url": config.get("dashboard_url"),
            "columns": config.get("columns", {}),
            # Optional: Include gemini config for debugging (can be removed in production)
            "gemini_config_loaded": "gemini" in config
        }
        
        logger.info(f"Configuration loaded for user: {username}, industry: {config.get('industry')}")
        
        return response
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error loading configuration for {username}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to load user configuration: {str(e)}"
        )


@router.get("/config/columns")
async def get_user_columns(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get only column configuration for the user.
    Useful for lightweight requests when only column info is needed.
    
    Returns:
        Column definitions for all stages
    """
    username = current_user.get("username")
    
    if not username:
        raise HTTPException(status_code=400, detail="No username in token")
    
    try:
        config = get_user_config(username)
        
        if not config:
            raise HTTPException(
                status_code=404, 
                detail=f"Configuration not found for user: {username}"
            )
        
        return {
            "columns": config.get("columns", {})
        }
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error loading columns for {username}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to load columns: {str(e)}"
        )
