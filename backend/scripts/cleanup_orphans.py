"""
Force clean up orphaned line items '8' and '80'
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client

def cleanup_orphans():
    db = get_database_client()
    username = 'Adnak'
    
    orphans = ['8', '80']
    
    print("Checking for orphaned line items...")
    
    for receipt in orphans:
        # Check verification_amounts
        amounts = db.query('verification_amounts').eq('username', username).eq('receipt_number', receipt).execute().data
        
        if amounts:
            print(f"Found {len(amounts)} records for '{receipt}' in verification_amounts")
            print(f"Records: {amounts}")
            
            # Delete them
            try:
                # Direct delete from verification_amounts
                db.delete('verification_amounts', {'username': username, 'receipt_number': receipt})
                print(f"✓ Deleted orphaned line items for receipt '{receipt}'")
            except Exception as e:
                print(f"✗ Failed to delete '{receipt}': {e}")
        else:
            print(f"No records found for '{receipt}' in verification_amounts")

    print("\nCleanup finished.")

if __name__ == "__main__":
    cleanup_orphans()
