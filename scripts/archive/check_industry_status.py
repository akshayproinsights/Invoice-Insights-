"""
Check current state of industry_type in all tables.
"""
import logging
from database import get_database_client

logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)

logger = logging.getLogger(__name__)


def check_industry_type_status():
    """Check industry_type column status in all tables"""
    try:
        db = get_database_client()
        
        tables = ['invoices', 'verified_invoices', 'verification_dates', 'verification_amounts']
        
        print("\n" + "="*80)
        print("INDUSTRY_TYPE STATUS CHECK")
        print("="*80 + "\n")
        
        for table_name in tables:
            try:
                print(f"\n{'='*80}")
                print(f"Table: {table_name}")
                print(f"{'='*80}")
                
                # Get all records for Adnak (or first 10)
                result = db.client.table(table_name) \
                            .select('row_id, username, industry_type') \
                            .eq('username', 'Adnak') \
                            .limit(10) \
                            .execute()
                
                if not result.data:
                    print("  No records found")
                    continue
                
                print(f"  Found {len(result.data)} records (showing first 10):")
                print(f"  {'Row ID':<40} {'Username':<15} {'Industry Type':<15}")
                print(f"  {'-'*70}")
                
                null_count = 0
                filled_count = 0
                
                for record in result.data:
                    row_id = record.get('row_id', 'N/A')[:38]
                    username = record.get('username', 'N/A')
                    industry = record.get('industry_type', 'NULL')
                    
                    if industry is None or industry == '' or industry == 'NULL':
                        null_count += 1
                        industry_display = '<NULL>'
                    else:
                        filled_count += 1
                        industry_display = industry
                    
                    print(f"  {row_id:<40} {username:<15} {industry_display:<15}")
                
                print(f"\n  Summary: {filled_count} filled, {null_count} NULL\n")
                
            except Exception as e:
                print(f"  Error checking {table_name}: {e}\n")
                continue
        
        print("\n" + "="*80)
        print("CHECK COMPLETE")
        print("="*80 + "\n")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        logger.error(traceback.format_exc())


if __name__ == "__main__":
    check_industry_type_status()
