"""
Fix corrupted 803/8030 data by manually syncing line items
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client

def fix_803_8030_corruption():
    """
    Manually update 803 line items to 8030 to match the header
    """
    db = get_database_client()
    
    print("Checking for 803/8030 corruption...")
    
    # Check what's in the database
    dates = db.query('verification_dates').eq('username', 'Adnak').execute().data
    amounts = db.query('verification_amounts').eq('username', 'Adnak').execute().data
    
    print(f"\nHeaders ({len(dates)}): {[d['receipt_number'] for d in dates]}")
    print(f"Line items ({len(amounts)}): {[(a['receipt_number'], a.get('description', 'NO DESC')[:20]) for a in amounts]}")
    
    # Find line items still at 803
    items_803 = [a for a in amounts if a['receipt_number'] == '803']
    
    if items_803:
        print(f"\nFound {len(items_803)} line items still at receipt 803")
        print("Updating them to 8030...")
        
        for item in items_803:
            row_id = item.get('row_id')
            if row_id:
                db.update('verification_amounts', 
                        {'receipt_number': '8030'}, 
                        {'username': 'Adnak', 'row_id': row_id})
                print(f"  ✓ Updated {item.get('description', 'NO DESC')}")
        
        print(f"\n✅ Fixed {len(items_803)} line items")
    else:
        print("\n✓ No corruption found, data is clean!")

if __name__ == "__main__":
    fix_803_8030_corruption()
