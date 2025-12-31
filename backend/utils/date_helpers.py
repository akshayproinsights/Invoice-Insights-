"""
Date formatting utility functions.
Ported from invoice_processor_r2_streamlit.py
"""
from datetime import datetime, timezone, timedelta
import pandas as pd
from typing import Optional

# Define IST timezone offset (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))


def normalize_date(date_str: str) -> str:
    """
    Normalizes input to strict DD-MM-YYYY format.
    Accepts: dd-mm-yyyy, dd/mm/yyyy, dd-MMM-yyyy (e.g., 10-Dec-2025)
    Returns: dd-mm-yyyy format always
    """
    if not date_str or not isinstance(date_str, str):
        return ""
    
    date_str = date_str.strip()
    if not date_str:
        return ""
    
    # Try multiple date formats
    formats_to_try = [
        "%d-%m-%Y",      # 10-12-2025
        "%d/%m/%Y",      # 10/12/2025
        "%d-%b-%Y",      # 10-Dec-2025
        "%d-%B-%Y",      # 10-December-2025
        "%Y-%m-%d",      # 2025-12-10
        "%m/%d/%Y",      # 12/10/2025
    ]
    
    for fmt in formats_to_try:
        try:
            dt = datetime.strptime(date_str, fmt)
            # Return in DD-MM-YYYY format
            return dt.strftime("%d-%m-%Y")
        except ValueError:
            continue
    
    # If none worked, return original
    return date_str


def format_to_mmm(date_str: str) -> str:
    """Convert date to dd-MMM-yyyy format (e.g., 10-Dec-2025)"""
    normalized = normalize_date(date_str)
    if not normalized:
        return ""
    
    try:
        dt = datetime.strptime(normalized, "%d-%m-%Y")
        return dt.strftime("%d-%b-%Y")
    except ValueError:
        return date_str


def format_to_db(date_str: str, use_fallback: bool = True) -> str:
    """
    Convert date to YYYY-MM-DD format for database storage (PostgreSQL DATE type).
    Accepts any format that normalize_date can handle.
    
    Args:
        date_str: Date string to format
        use_fallback: If True and date parsing fails, return current date as fallback
    
    Returns: yyyy-mm-dd format for database
    """
    normalized = normalize_date(date_str)
    if not normalized:
        if use_fallback:
            # Return current date as fallback when date extraction fails
            return get_ist_now().strftime("%Y-%m-%d")
        return ""
    
    try:
        dt = datetime.strptime(normalized, "%d-%m-%Y")
        return dt.strftime("%Y-%m-%d")  # YYYY-MM-DD for PostgreSQL
    except ValueError:
        if use_fallback:
            return get_ist_now().strftime("%Y-%m-%d")
        return date_str


def format_to_us(date_str: str) -> str:
    """Convert date to MM/DD/YYYY format"""
    normalized = normalize_date(date_str)
    if not normalized:
        return ""
    
    try:
        dt = datetime.strptime(normalized, "%d-%m-%Y")
        return dt.strftime("%m/%d/%Y")
    except ValueError:
        return date_str


def safe_format_date_series(series: pd.Series, output_format: str = "%Y-%m-%d") -> pd.Series:
    """
    Safely format a pandas Series of dates to specified format.
    Handles dd-mm-yyyy and dd-MMM-yyyy input formats.
    Default output: yyyy-mm-dd (e.g., "2025-12-10") for PostgreSQL DATE compatibility
    """
    def parse_and_format(val):
        if pd.isna(val) or val == "":
            return ""
        
        val_str = str(val).strip()
        if not val_str:
            return ""
        
        # Try to normalize first
        normalized = normalize_date(val_str)
        if not normalized:
            return val_str
        
        try:
            dt = datetime.strptime(normalized, "%d-%m-%Y")
            return dt.strftime(output_format)
        except ValueError:
            return val_str
    
    return series.apply(parse_and_format)


def get_ist_now() -> datetime:
    """Get current time in IST"""
    return datetime.now(IST)


def get_ist_now_str() -> str:
    """Get current time in IST as formatted string"""
    return get_ist_now().strftime("%d-%b-%Y %H:%M:%S")
