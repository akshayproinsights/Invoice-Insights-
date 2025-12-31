"""
Simple migration script to populate industry_type for existing records.
Updates records for a specific username.
"""
import logging
from database import get_database_client
from config_loader import get_user_config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def migrate_industry_type_for_user(username: str):
    """
    Update all records for a specific user with their industry_type.
    
    Args:
        username: The username to update records for (e.g., 'Adnak')
    """
    try:
        logger.info(f"Migrating industry_type for user: {username}")
        
        # Get user's industry from config
        user_config = get_user_config(username)
        if not user_config:
            logger.error(f"No config found for user: {username}")
            return
        
        industry = user_config.get('industry', '')
        if not industry:
            logger.error(f"No industry found in config for user: {username}")
            return
        
        logger.info(f"Setting industry_type to: {industry}")
        
        db = get_database_client()
        
        # Tables to update
        tables_to_update = [
            'invoices',
            'verified_invoices', 
            'verification_dates',
            'verification_amounts'
        ]
        
        total_updated = 0
        
        for table_name in tables_to_update:
            logger.info(f"\n========================================")
            logger.info(f"Updating table: {table_name}")
            logger.info(f"========================================")
            
            try:
                # First, check how many NULL records exist
                check_result = db.client.table(table_name) \
                                .select('row_id', count='exact') \
                                .eq('username', username) \
                                .is_('industry_type', 'null') \
                                .execute()
                
                null_count = check_result.count if hasattr(check_result, 'count') else 0
                logger.info(f"Found {null_count} records with NULL industry_type for {username}")
                
                if null_count == 0:
                    logger.info("No records to update - skipping")
                    continue
                
                # Update all records for this username where industry_type is NULL
                logger.info(f"Updating to industry_type = '{industry}'...")
                update_result = db.client.table(table_name) \
                                .update({'industry_type': industry}) \
                                .eq('username', username) \
                                .is_('industry_type', 'null') \
                                .execute()
                
                updated_count = len(update_result.data) if update_result.data else 0
                total_updated += updated_count
                logger.info(f"✓ Successfully updated {updated_count} records")
                
            except Exception as e:
                logger.error(f"✗ Error updating {table_name}: {e}")
                # Try to get more details
                if hasattr(e, 'message'):
                    logger.error(f"  Error details: {e.message}")
                import traceback
                logger.error(traceback.format_exc())
                continue
        
        logger.info(f"\n=== Migration Complete ===")
        logger.info(f"Total records updated for {username}: {total_updated}")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise


if __name__ == "__main__":
    # Update for 'Adnak' user
    # You can change this to match the username in your database
    username = "Adnak"
    
    logger.info("Starting industry_type migration...")
    migrate_industry_type_for_user(username)
    logger.info("Migration finished!")
