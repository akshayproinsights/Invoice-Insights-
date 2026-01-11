"""
Debug script to check current state of verification records
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client

def debug_current_state():
    db = get_database_client()
    username = 'Adnak'
    
    print("=== HEADERS (verification_dates) ===")
    headers = db.query('verification_dates').eq('username', username).execute().data
    for h in headers:
        print(f"Receipt: {h.get('receipt_number'):6} | ID: {h.get('id')} | row_id: {h.get('row_id')}")
    
    print(f"\n=== LINE ITEMS (verification_amounts) ===")
    items = db.query('verification_amounts').eq('username', username).execute().data
    
    # Group by header_id
    by_header = {}
    for item in items:
        hid = item.get('header_id') or 'NULL'
        if hid not in by_header:
            by_header[hid] = []
        by_header[hid].append(item)
    
    for hid, items_list in by_header.items():
        print(f"\nheader_id: {hid}")
        for item in items_list:
            print(f"  Receipt: {item.get('receipt_number'):6} | Desc: {item.get('description'):30} | row_id: {item.get('row_id')}")
    
    # Check for NULL header_ids
    null_count = sum(1 for item in items if not item.get('header_id'))
    print(f"\n⚠️  {null_count} line items have NULL header_id (need to be linked)")

if __name__ == "__main__":
    debug_current_state()
