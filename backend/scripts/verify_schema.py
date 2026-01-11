"""
Verify backend can see header_id column
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client

def verify_column_visibility():
    db = get_database_client()
    username = 'Adnak'
    
    print("Checking verification_amounts schema visibility...")
    # Fetch one record
    result = db.query('verification_amounts').eq('username', username).limit(1).execute()
    
    if result.data:
        record = result.data[0]
        if 'header_id' in record:
            print(f"✅ Success! 'header_id' is visible. Value: {record['header_id']}")
        else:
            print(f"❌ Error: 'header_id' column is missing from backend response. Keys: {list(record.keys())}")
    else:
        print("No records found to check.")

if __name__ == "__main__":
    verify_column_visibility()
