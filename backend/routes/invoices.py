"""Invoice management routes"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import pandas as pd
from datetime import datetime

from auth import get_current_user
from database_helpers import (
    get_all_invoices,
    get_verified_invoices,
    get_verification_dates,
    get_verification_amounts
)

router = APIRouter()
logger = logging.getLogger(__name__)


class Invoice(BaseModel):
    """Invoice model"""
    data: Dict[str, Any]


@router.get("/")
async def get_invoices(
    current_user: Dict[str, Any] = Depends(get_current_user),
    limit: Optional[int] = None,
    offset: Optional[int] = 0
):
    """
    Get all invoices from Supabase invoices table
    """
    username = current_user.get("username")
    
    if not username:
        raise HTTPException(status_code=400, detail="No username in token")
    
    try:
        invoices = get_all_invoices(username, limit, offset)
        
        return {
            "invoices": invoices,
            "total": len(invoices)
        }
    
    except Exception as e:
        logger.error(f"Error reading invoices: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read invoices: {str(e)}")


@router.get("/stats")
async def get_invoice_stats(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get invoice statistics for dashboard
    
    Returns:
        - total_invoices: Verified + Review (unique receipt IDs)
        - verified: Count of verified invoices (unique receipt IDs)
        - pending_review: Count of pending review records (unique receipt IDs with Pending/Duplicate status)
        - this_month: Count of verified invoices from current month
    """
    username = current_user.get("username")
    
    if not username:
        raise HTTPException(status_code=400, detail="No username in token")
    
    try:
        # Initialize stats
        stats = {
            "total_invoices": 0,
            "verified": 0,
            "pending_review": 0,
            "this_month": 0
        }
        
        # Read verified invoices from Supabase
        verified_data = get_verified_invoices(username)
        verified_receipts = set()
        
        if verified_data:
            # Convert to DataFrame for easier processing
            df_verified = pd.DataFrame(verified_data)
            
            if not df_verified.empty and 'receipt_number' in df_verified.columns:
                # Get unique receipt numbers
                verified_receipts = set(df_verified['receipt_number'].dropna().astype(str).unique())
                stats["verified"] = len(verified_receipts)
                
                # Calculate "This Month" - invoices from current month/year
                if 'date' in df_verified.columns:
                    current_month = datetime.now().month
                    current_year = datetime.now().year
                    
                    def is_current_month(date_str):
                        if pd.isna(date_str) or not date_str:
                            return False
                        try:
                            # Try multiple date formats
                            for fmt in ["%d-%b-%Y", "%d-%m-%Y", "%d/%m/%Y"]:
                                try:
                                    dt = datetime.strptime(str(date_str).strip(), fmt)
                                    return dt.month == current_month and dt.year == current_year
                                except:
                                    continue
                            return False
                        except:
                            return False
                    
                    current_month_mask = df_verified['date'].apply(is_current_month)
                    df_current_month = df_verified[current_month_mask]
                    if not df_current_month.empty:
                        stats["this_month"] = len(df_current_month['receipt_number'].dropna().astype(str).unique())
        
        # Read review records to get pending count
        pending_receipts = set()
        
        # Check verification_dates table
        try:
            dates_data = get_verification_dates(username)
            if dates_data:
                df_dates = pd.DataFrame(dates_data)
                if not df_dates.empty and 'receipt_number' in df_dates.columns:
                    # Filter for Pending or Duplicate Receipt Number statuses
                    status_col = 'verification_status'  # Supabase uses snake_case
                    
                    if status_col in df_dates.columns:
                        pending_mask = df_dates[status_col].astype(str).str.contains(
                            'Pending|Duplicate Receipt Number', 
                            case=False, 
                            na=False
                        )
                        pending_dates = set(df_dates[pending_mask]['receipt_number'].dropna().astype(str).unique())
                        pending_receipts.update(pending_dates)
        except Exception as e:
            logger.warning(f"Could not read verification dates: {e}")
        
        # Check verification_amounts table
        try:
            amounts_data = get_verification_amounts(username)
            if amounts_data:
                df_amounts = pd.DataFrame(amounts_data)
                if not df_amounts.empty and 'receipt_number' in df_amounts.columns:
                    # Filter for Pending or Duplicate Receipt Number statuses
                    status_col = 'verification_status'  # Supabase uses snake_case
                    
                    if status_col in df_amounts.columns:
                        pending_mask = df_amounts[status_col].astype(str).str.contains(
                            'Pending|Duplicate Receipt Number', 
                            case=False, 
                            na=False
                        )
                        pending_amounts = set(df_amounts[pending_mask]['receipt_number'].dropna().astype(str).unique())
                        pending_receipts.update(pending_amounts)
        except Exception as e:
            logger.warning(f"Could not read verification amounts: {e}")
        
        stats["pending_review"] = len(pending_receipts)
        
        # Total = Verified + Pending Review (unique receipt numbers)
        all_receipts = verified_receipts.union(pending_receipts)
        stats["total_invoices"] = len(all_receipts)
        
        logger.info(f"Stats calculated for {username}: {stats}")
        return stats
    
    except Exception as e:
        logger.error(f"Error calculating stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate stats: {str(e)}")


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a single invoice by ID  (placeholder for now)
    """
    return {
        "invoice_id": invoice_id,
        "message": "Single invoice retrieval not yet implemented"
    }
