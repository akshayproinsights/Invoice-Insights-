"""
Database helper functions for route endpoints.
Provides clean interface for common Supabase queries.
"""
from typing import List, Dict, Any, Optional
import logging
import pandas as pd
from database import get_database_client

logger = logging.getLogger(__name__)


def convert_numeric_types(row_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert numeric values to proper Python types for Supabase.
    - Integers without decimals: convert to int
    - Floats with decimals: convert to float
    - Remove .0 suffix from string representations
    """
    integer_fields = ['quantity', 'odometer']  # Fields that should be integers
    float_fields = ['rate', 'amount', 'total_bill_amount', 'calculated_amount', 'amount_mismatch']
    
    for key, value in row_dict.items():
        if value is None or pd.isna(value):
            row_dict[key] = None
            continue
            
        # Handle integer fields
        if key in integer_fields:
            try:
                # Convert to float first, then to int
                row_dict[key] = int(float(value))
            except (ValueError, TypeError):
                row_dict[key] = None
        
        # Handle float fields
        elif key in float_fields:
            try:
                row_dict[key] = float(value)
            except (ValueError, TypeError):
                row_dict[key] = None
        
        # Handle string fields that might be floats (e.g., "801.0" -> "801")
        elif isinstance(value, str) and value.endswith('.0'):
            try:
                # Check if it's a numeric string
                float_val = float(value)
                if float_val.is_integer():
                    row_dict[key] = value[:-2]  # Remove .0
            except ValueError:
                pass  # Keep as is if not numeric
    
    return row_dict



def get_all_invoices(username: str, limit: Optional[int] = None, offset: int = 0) -> List[Dict[str, Any]]:
    """
    Get all invoices for a user from Supabase.
    
    Args:
        username: Username for RLS filtering
        limit: Maximum number of records to return
        offset: Number of records to skip
    
    Returns:
        List of invoice dictionaries
    """
    try:
        db = get_database_client()
        query = db.query('invoices').eq('username', username).order('created_at', desc=True)
        
        if limit:
            query = query.limit(limit).offset(offset)
        
        result = query.execute()
        return result.data if result.data else []
    
    except Exception as e:
        logger.error(f"Error getting invoices for {username}: {e}")
        return []


def get_verified_invoices(username: str) -> List[Dict[str, Any]]:
    """
    Get all verified invoices for a user, sorted by upload_date descending.
    
    Args:
        username: Username for RLS filtering
    
    Returns:
        List of verified invoice dictionaries
    """
    try:
        db = get_database_client()
        result = db.query('verified_invoices').eq('username', username).order('upload_date', desc=True).execute()
        return result.data if result.data else []
    
    except Exception as e:
        logger.error(f"Error getting verified invoices for {username}: {e}")
        return []


def get_verification_dates(username: str) -> List[Dict[str, Any]]:
    """
    Get all date verification records for a user.
    
    Args:
        username: Username for RLS filtering
    
    Returns:
        List of verification date dictionaries
    """
    try:
        db = get_database_client()
        result = db.query('verification_dates').eq('username', username).order('created_at', desc=True).execute()
        return result.data if result.data else []
    
    except Exception as e:
        logger.error(f"Error getting verification dates for {username}: {e}")
        return []


def get_verification_amounts(username: str) -> List[Dict[str, Any]]:
    """
    Get all amount verification records for a user.
    
    Args:
        username: Username for RLS filtering
    
    Returns:
        List of verification amount dictionaries
    """
    try:
        db = get_database_client()
        result = db.query('verification_amounts').eq('username', username).order('created_at', desc=True).execute()
        return result.data if result.data else []
    
    except Exception as e:
        logger.error(f"Error getting verification amounts for {username}: {e}")
        return []


def update_verified_invoices(username: str, data: List[Dict[str, Any]]) -> bool:
    """
    Update verified invoices (replace all records).
    
    Args:
        username: Username for RLS filtering
        data: List of invoice dictionaries to save
    
    Returns:
        True if successful, False otherwise
    """
    try:
        db = get_database_client()
        
        # Delete existing verified invoices for this user
        db.delete('verified_invoices', {'username': username})
        
        # Insert new records
        for record in data:
            record['username'] = username  # Ensure username is set
            record = convert_numeric_types(record)
            db.insert('verified_invoices', record)
        
        logger.info(f"Updated {len(data)} verified invoices for {username}")
        return True
    
    except Exception as e:
        logger.error(f"Error updating verified invoices for {username}: {e}")
        return False


def delete_records_by_receipt(username: str, receipt_number: str, table: str = 'verification_dates') -> bool:
    """
    Delete records by receipt number from a specific table.
    
    Args:
        username: Username for RLS filtering
        receipt_number: Receipt number to delete
        table: Table name ('verification_dates' or 'verification_amounts')
    
    Returns:
        True if successful, False otherwise
    """
    try:
        db = get_database_client()
        db.delete(table, {'username': username, 'receipt_number': receipt_number})
        logger.info(f"Deleted records for receipt {receipt_number} from {table}")
        return True
    
    except Exception as e:
        logger.error(f"Error deleting records from {table}: {e}")
        return False


def update_verification_records(username: str, table: str, data: List[Dict[str, Any]]) -> bool:
    """
    Update verification records (replace all for user).
    
    Args:
        username: Username for RLS filtering
        table: Table name ('verification_dates' or 'verification_amounts')
        data: List of record dictionaries
    
    Returns:
        True if successful, False otherwise
    """
    try:
        db = get_database_client()
        
        # Delete existing records for this user
        db.delete(table, {'username': username})
        
        # Insert new records
        for record in data:
            record['username'] = username  # Ensure username is set
            record = convert_numeric_types(record)
            db.insert(table, record)
        
        logger.info(f"Updated {len(data)} records in {table} for {username}")
        return True
    
    except Exception as e:
        logger.error(f"Error updating {table} for {username}: {e}")
        return False
