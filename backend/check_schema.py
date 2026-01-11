"""
Quick script to check the actual column names in Supabase tables
"""
from database import get_database_client

db = get_database_client()

tables_to_check = [
    'invoices',
    'verified_invoices',
    'verification_dates',
    'verification_amounts'
]

print("=" * 80)
print("CHECKING TABLE SCHEMAS IN SUPABASE")
print("=" * 80)

for table_name in tables_to_check:
    try:
        # Fetch one record to see the columns
        result = db.client.table(table_name).select('*').limit(1).execute()
        
        if result.data and len(result.data) > 0:
            columns = list(result.data[0].keys())
            print(f"\n📋 {table_name.upper()}")
            print(f"   Columns ({len(columns)}): {', '.join(sorted(columns))}")
            
            # Check for specific columns we care about
            has_row_id = 'row_id' in columns
            has_id = 'id' in columns
            has_receipt_number = 'receipt_number' in columns
            
            print(f"   ✓ Has 'id': {has_id}")
            print(f"   ✓ Has 'row_id': {has_row_id}")
            print(f"   ✓ Has 'receipt_number': {has_receipt_number}")
            
            if has_id:
                # Show what the id looks like
                sample_id = result.data[0].get('id')
                print(f"   📌 Sample 'id' value: {sample_id} (type: {type(sample_id).__name__})")
            
            if has_row_id:
                # Show what the row_id looks like
                sample_row_id = result.data[0].get('row_id')
                print(f"   📌 Sample 'row_id' value: {sample_row_id} (type: {type(sample_row_id).__name__})")
        else:
            print(f"\n⚠️  {table_name.upper()}: No data found (empty table)")
            
    except Exception as e:
        print(f"\n❌ {table_name.upper()}: Error - {e}")

print("\n" + "=" * 80)
