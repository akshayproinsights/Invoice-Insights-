"""
Migration script to populate industry_type for existing records.
This updates all records where industry_type is NULL by looking up the user's config.
"""
import logging
from database import get_database_client
from config_loader import get_user_config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def migrate_industry_type():
    """
    Update all records with NULL industry_type by looking up the user's industry
    from their configuration.
    """
    try:
        db = get_database_client()
        
        # Get all tables that have industry_type column
        tables_to_update = [
            'invoices',
            'verified_invoices',
            'verification_dates',
            'verification_amounts'
        ]
        
        total_updated = 0
        
        for table_name in tables_to_update:
            logger.info(f"\n=== Processing table: {table_name} ===")
            
            try:
                # Get all records with NULL industry_type
                result = db.query(table_name, ['row_id', 'username', 'industry_type']) \
                           .is_('industry_type', 'null') \
                           .execute()
                
                if not result.data:
                    logger.info(f"No NULL industry_type records found in {table_name}")
                    continue
                
                logger.info(f"Found {len(result.data)} records with NULL industry_type")
                
                # Group by username to minimize config lookups
                records_by_username = {}
                for record in result.data:
                    username = record.get('username')
                    if username:
                        if username not in records_by_username:
                            records_by_username[username] = []
                        records_by_username[username].append(record)
                
                # Update records for each username
                for username, records in records_by_username.items():
                    logger.info(f"  Processing {len(records)} records for user: {username}")
                    
                    # Get user's industry from config
                    user_config = get_user_config(username)
                    if not user_config:
                        logger.warning(f"  No config found for user: {username}, skipping...")
                        continue
                    
                    industry = user_config.get('industry', '')
                    if not industry:
                        logger.warning(f"  No industry in config for user: {username}, skipping...")
                        continue
                    
                    logger.info(f"  Setting industry_type to: {industry}")
                    
                    # Update all records for this username
                    try:
                        update_result = db.client.table(table_name) \
                                        .update({'industry_type': industry}) \
                                        .eq('username', username) \
                                        .is_('industry_type', 'null') \
                                        .execute()
                        
                        updated_count = len(update_result.data) if update_result.data else 0
                        total_updated += updated_count
                        logger.info(f"  ✓ Updated {updated_count} records for {username}")
                        
                    except Exception as e:
                        logger.error(f"  Error updating records for {username}: {e}")
                        continue
                
            except Exception as e:
                logger.error(f"Error processing table {table_name}: {e}")
                continue
        
        logger.info(f"\n=== Migration Complete ===")
        logger.info(f"Total records updated: {total_updated}")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise


if __name__ == "__main__":
    logger.info("Starting industry_type migration...")
    migrate_industry_type()
    logger.info("Migration finished!")
