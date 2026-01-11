"""
Clean up ALL orphaned line items (line items with no matching header)
This will remove '8011', '8015' and any other ghost records.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client

def cleanup_all_orphans():
    db = get_database_client()
    username = 'Adnak'
    
    print("Starting orphan cleanup...")
    
    # 1. Get all valid receipt numbers from headers (verification_dates)
    headers = db.query('verification_dates').eq('username', username).execute().data
    valid_receipts = set(h['receipt_number'] for h in headers if h.get('receipt_number'))
    
    print(f"Found {len(valid_receipts)} valid headers: {sorted(list(valid_receipts))}")
    
    # 2. Get all distinct receipt numbers from line items (verification_amounts)
    # We'll fetch all and process in python since distinct() might not be exposed easily in this client wrapper
    line_items = db.query('verification_amounts').eq('username', username).execute().data
    
    orphaned_receipts = set()
    orphaned_count = 0
    
    for item in line_items:
        r_num = item.get('receipt_number')
        if r_num and r_num not in valid_receipts:
            orphaned_receipts.add(r_num)
            orphaned_count += 1
            
    print(f"Found {len(orphaned_receipts)} orphaned receipt numbers: {sorted(list(orphaned_receipts))}")
    print(f"Total {orphaned_count} line items to delete.")
    
    # 3. Delete orphans
    if orphaned_receipts:
        for r_num in orphaned_receipts:
            print(f"Deleting orphans for receipt '{r_num}'...")
            try:
                db.delete('verification_amounts', {'username': username, 'receipt_number': r_num})
                print(f"✓ Cleared '{r_num}'")
            except Exception as e:
                print(f"✗ Failed to clear '{r_num}': {e}")
    else:
        print("No orphans found! System is clean.")

if __name__ == "__main__":
    cleanup_all_orphans()
