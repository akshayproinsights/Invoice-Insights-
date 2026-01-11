"""
Debug deletion issue for receipt numbers '8' and '80'
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client

def debug_delete():
    db = get_database_client()
    username = 'Adnak'
    
    print("Checking for receipts '8' and '80'...")
    
    # Check verification_dates
    dates_8 = db.query('verification_dates').eq('username', username).eq('receipt_number', '8').execute().data
    dates_80 = db.query('verification_dates').eq('username', username).eq('receipt_number', '80').execute().data
    
    print(f"Found {len(dates_8)} records for '8' in verification_dates")
    print(f"Found {len(dates_80)} records for '80' in verification_dates")
    
    # Check verification_amounts
    amounts_8 = db.query('verification_amounts').eq('username', username).eq('receipt_number', '8').execute().data
    amounts_80 = db.query('verification_amounts').eq('username', username).eq('receipt_number', '80').execute().data
    
    print(f"Found {len(amounts_8)} records for '8' in verification_amounts")
    print(f"Found {len(amounts_80)} records for '80' in verification_amounts")

    if dates_8:
        print("\nAttempting to delete '8' via backend logic...")
        try:
            db.delete('verification_dates', {'username': username, 'receipt_number': '8'})
            print("✓ Deleted '8' from verification_dates")
        except Exception as e:
            print(f"✗ Failed to delete '8': {e}")
            
    if dates_80:
        print("\nAttempting to delete '80' via backend logic...")
        try:
            db.delete('verification_dates', {'username': username, 'receipt_number': '80'})
            print("✓ Deleted '80' from verification_dates")
        except Exception as e:
            print(f"✗ Failed to delete '80': {e}")
            
    print("\nCheck finished.")

if __name__ == "__main__":
    debug_delete()
