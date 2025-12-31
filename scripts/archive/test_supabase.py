"""Test Supabase connection"""
from database import get_database_client

def test_connection():
    print("Testing Supabase connection...")
    
    try:
        db = get_database_client()
        print("[OK] Client created successfully")
        
        # Try to query invoices table (should be empty)
        result = db.query('invoices').limit(1).execute()
        print(f"[OK] Query successful! Rows: {len(result.data)}")
        print("[SUCCESS] Connection test PASSED!")
        return True
        
    except Exception as e:
        print(f"[FAIL] Connection test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_connection()
