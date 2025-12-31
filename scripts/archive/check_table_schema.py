"""
Test script to check if industry_type column exists in Supabase tables.
"""
import logging
from database import get_database_client

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)

logger = logging.getLogger(__name__)


def check_tables():
    """Check if tables have industry_type column"""
    try:
        db = get_database_client()
        
        # Try to query the invoices table
        logger.info("Checking 'invoices' table...")
        result = db.client.table('invoices').select('*').limit(1).execute()
        
        if result.data and len(result.data) > 0:
            sample_record = result.data[0]
            logger.info(f"Sample record columns: {list(sample_record.keys())}")
            
            if 'industry_type' in sample_record:
                logger.info("✓ industry_type column EXISTS")
                logger.info(f"  Value: {sample_record['industry_type']}")
            else:
                logger.error("✗ industry_type column DOES NOT EXIST")
                logger.error("  Available columns:")
                for col in sorted(sample_record.keys()):
                    logger.error(f"    - {col}")
        else:
            logger.warning("No records found in invoices table")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        logger.error(traceback.format_exc())


if __name__ == "__main__":
    check_tables()
