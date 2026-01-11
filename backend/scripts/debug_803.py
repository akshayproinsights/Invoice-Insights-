"""
Debug line items for 803/8030
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client

def debug_803():
    db = get_database_client()
    username = 'Adnak'
    
    print("Checking headers...")
    headers = db.query('verification_dates').eq('username', username).execute().data
    for h in headers:
        print(f"Header: {h.get('receipt_number')} (row_id: {h.get('row_id')})")
        
    print("\nChecking line items...")
    items = db.query('verification_amounts').eq('username', username).execute().data
    
    found_803 = 0
    found_8030 = 0
    
    for item in items:
        r_num = item.get('receipt_number')
        print(f"Line Item: Receipt='{r_num}', Desc='{item.get('description')}', RowId='{item.get('row_id')}'")
        
        if r_num == '803':
            found_803 += 1
        if r_num == '8030':
            found_8030 += 1
            
    print(f"\nSummary:")
    print(f"803 line items: {found_803}")
    print(f"8030 line items: {found_8030}")

if __name__ == "__main__":
    debug_803()
