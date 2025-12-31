"""
Supabase database client wrapper.
Handles all database operations for Invoice Insights Hub.
"""
import os
from typing import Optional, Dict, Any, List
import logging
from supabase import create_client, Client

from config import get_supabase_config

logger = logging.getLogger(__name__)

# Global Supabase client instance
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create Supabase client instance"""
    global _supabase_client
    
    if _supabase_client is None:
        config = get_supabase_config()
        if not config:
            raise ValueError("Supabase configuration not found")
        
        _supabase_client = create_client(
            config["url"],
            config["service_role_key"]  # Use service_role for backend
        )
        logger.info("Supabase client initialized")
    
    return _supabase_client


class DatabaseClient:
    """Wrapper for Supabase database operations"""
    
    def __init__(self):
        self.client = get_supabase_client()
    
    def set_user_context(self, username: str):
        """Set user context for Row-Level Security"""
        # This will be used by RLS policies
        try:
            self.client.rpc('set_config', {
                'setting': 'app.current_user',
                'value': username
            }).execute()
        except Exception as e:
            logger.warning(f"Could not set user context: {e}")
    
    def query(self, table: str, columns: List[str] = None):
        """
        Query a table with optional column selection
        
        Args:
            table: Table name
            columns: List of column names to select (None = all)
        
        Returns:
            Query builder for further filtering
        """
        if columns:
            return self.client.table(table).select(','.join(columns))
        return self.client.table(table).select('*')
    
    def insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a record"""
        response = self.client.table(table).insert(data).execute()
        return response.data

    def upsert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Upsert a record"""
        response = self.client.table(table).upsert(data).execute()
        return response.data
    
    def update(self, table: str, data: Dict[str, Any], match: Dict[str, Any]) -> Dict[str, Any]:
        """Update records matching criteria"""
        response = self.client.table(table).update(data).match(match).execute()
        return response.data
    
    def delete(self, table: str, match: Dict[str, Any]) -> Dict[str, Any]:
        """Delete records matching criteria"""
        response = self.client.table(table).delete().match(match).execute()
        return response.data


# Global database client instance
_db_client: Optional[DatabaseClient] = None


def get_database_client() -> DatabaseClient:
    """Get global database client instance"""
    global _db_client
    if _db_client is None:
        _db_client = DatabaseClient()
    return _db_client
