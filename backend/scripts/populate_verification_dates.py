"""
Clean Rebuild: verification_dates from verification_amounts (v3 - FINAL)

This script completely clears and rebuilds verification_dates with correct data.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client
import pandas as pd

def clean_rebuild_verification_dates():
    """
    Complete clean rebuild of verification_dates from verification_amounts
    """
    db = get_database_client()
    
    print("=" * 60)
    print("CLEAN REBUILD OF VERIFICATION_DATES")
    print("=" * 60)
    
    # Step 1: Fetch amounts data
    print("\n[1/4] Fetching verification_amounts...")
    amounts = db.query('verification_amounts').execute().data
    
    if not amounts:
        print("❌ No records found in verification_amounts")
        return
    
    print(f"✓ Found {len(amounts)} line item records")
    
    # Step 2: Clear verification_dates
    print("\n[2/4] Clearing verification_dates...")
    existing = db.query('verification_dates').execute().data
    print(f"  Found {len(existing)} existing records")
    
    for record in existing:
        db.delete('verification_dates', {'id': record['id']})
    print("✓ Cleared all existing records")
    
    # Step 3: Group by receipt to create headers
    print("\n[3/4] Grouping line items by receipt...")
    df = pd.DataFrame(amounts)
    
    # Show unique receipts
    unique_receipts = sorted(df['receipt_number'].unique())
    print(f"  Unique receipts found: {unique_receipts}")
    
    # Group by receipt_number and username
    grouped = df.groupby(['receipt_number', 'username']).first().reset_index()
    print(f"✓ Created {len(grouped)} header records")
    
    # Step 4: Insert headers
    print("\n[4/4] Inserting header records...")
    for idx, row in grouped.iterrows():
        header = {
            'username': row['username'],
            'receipt_number': row['receipt_number'],
            'receipt_link': row.get('receipt_link'),
           'verification_status': row.get('verification_status', 'Pending'),
            'row_id': row['row_id'],
            'created_at': row['created_at'],
            'upload_date': row.get('created_at'),
            'model_used': row.get('model_used'),
            'model_accuracy': row.get('model_accuracy'),
            'input_tokens': int(row['input_tokens']) if pd.notna(row.get('input_tokens')) else None,
            'output_tokens': int(row['output_tokens']) if pd.notna(row.get('output_tokens')) else None,
            'total_tokens': int(row['total_tokens']) if pd.notna(row.get('total_tokens')) else None,
            'cost_inr': float(row['cost_inr']) if pd.notna(row.get('cost_inr')) else None,
        }
        
        try:
            db.insert('verification_dates', header)
            print(f"  ✓ Inserted receipt {row['receipt_number']}")
        except Exception as e:
            print(f"  ✗ Failed receipt {row['receipt_number']}: {e}")
    
    print("\n" + "=" * 60)
    print("✅ REBUILD COMPLETE")
    print("=" * 60)
    print(f"\nSummary:")
    print(f"  Line items (verification_amounts): {len(amounts)}")
    print(f"  Headers created (verification_dates): {len(grouped)}")
    print(f"  Receipts: {', '.join(unique_receipts)}")

if __name__ == "__main__":
    clean_rebuild_verification_dates()
