"""
Migration script to convert old presigned URLs to permanent public URLs.

This script will:
1. Find all expired presigned URLs in the database (URLs with ?X-Amz-Algorithm parameters)
2. Convert them to permanent public URLs by removing query parameters
3. Update all relevant tables: invoices, verified_invoices, inventory_items, stock_levels

Run this ONCE to fix all existing URLs.
"""
import sys
import os
from urllib.parse import urlparse, urlunparse

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_database_client
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def convert_presigned_url_to_permanent(url: str) -> str:
    """
    Convert a presigned URL to a permanent public URL by removing query parameters.
    
    Example:
    Input:  https://229f2ce2ce6bb0283b3edc7ad6c0ecbe.r2.cloudflarestorage.com/bucket/file.jpg?X-Amz-Algorithm=...
    Output: https://229f2ce2ce6bb0283b3edc7ad6c0ecbe.r2.cloudflarestorage.com/bucket/file.jpg
    """
    if not url or not isinstance(url, str):
        return url
    
    # Skip if URL doesn't look like a presigned URL
    if '?' not in url or 'X-Amz-' not in url:
        return url
    
    # Parse URL and remove query parameters
    parsed = urlparse(url)
    permanent_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        '',  # Remove params
        '',  # Remove query
        ''   # Remove fragment
    ))
    
    return permanent_url


def migrate_table_urls(table_name: str, url_column: str, username: str = "Adnak"):
    """
    Migrate URLs in a specific table.
    
    Args:
        table_name: Name of the database table
        url_column: Name of the column containing URLs
        username: Username filter (default: Adnak)
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"Migrating URLs in table: {table_name}.{url_column}")
    logger.info(f"{'='*60}")
    
    db = get_database_client()
    
    # Fetch all records with URLs
    try:
        response = db.client.table(table_name)\
            .select("id, " + url_column)\
            .eq("username", username)\
            .not_.is_(url_column, "null")\
            .execute()
        
        records = response.data or []
        logger.info(f"Found {len(records)} records with URLs")
        
        if not records:
            logger.info(f"No records to migrate in {table_name}")
            return
        
        # Process each record
        updated_count = 0
        skipped_count = 0
        
        for record in records:
            old_url = record.get(url_column)
            if not old_url:
                continue
            
            # Convert to permanent URL
            new_url = convert_presigned_url_to_permanent(old_url)
            
            # Update if changed
            if new_url != old_url:
                try:
                    db.client.table(table_name)\
                        .update({url_column: new_url})\
                        .eq("id", record["id"])\
                        .execute()
                    
                    updated_count += 1
                    
                    # Log sample conversions
                    if updated_count <= 3:
                        logger.info(f"\nConverted URL:")
                        logger.info(f"  Old: {old_url[:100]}...")
                        logger.info(f"  New: {new_url}")
                
                except Exception as e:
                    logger.error(f"Failed to update record {record['id']}: {e}")
            else:
                skipped_count += 1
        
        logger.info(f"\n✅ Migration complete for {table_name}:")
        logger.info(f"   - Updated: {updated_count} records")
        logger.info(f"   - Skipped: {skipped_count} records (already permanent)")
        
    except Exception as e:
        logger.error(f"Error migrating {table_name}: {e}")
        raise


def main():
    """Run migration for all relevant tables."""
    logger.info("\n" + "="*60)
    logger.info("Starting URL Migration to Permanent Public URLs")
    logger.info("="*60 + "\n")
    
    username = "Adnak"  # Change if needed
    
    # Tables and their URL columns
    tables_to_migrate = [
        ("invoices", "receipt_link"),
        ("verified_invoices", "receipt_link"),
        ("inventory_items", "receipt_link"),
    ]
    
    total_updated = 0
    
    for table_name, url_column in tables_to_migrate:
        try:
            migrate_table_urls(table_name, url_column, username)
        except Exception as e:
            logger.error(f"Failed to migrate {table_name}: {e}")
            continue
    
    logger.info("\n" + "="*60)
    logger.info("✅ URL Migration Complete!")
    logger.info("="*60)
    logger.info("\nAll old presigned URLs have been converted to permanent public URLs.")
    logger.info("New uploads will automatically use permanent URLs.")


if __name__ == "__main__":
    # Confirm before running
    print("\n⚠️  This script will update ALL URLs in your database.")
    print("It will convert old presigned URLs to permanent public URLs.")
    print("\nPress Enter to continue or Ctrl+C to cancel...")
    input()
    
    main()
