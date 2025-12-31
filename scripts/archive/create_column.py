"""
SIMPLE Script to create Image Hash column in Google Sheets.
Run with: backend\\venv\\Scripts\\python create_column.py
"""
import os
import sys

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

def main():
    print("\n" + "="*60)
    print("Creating 'Image Hash' Column in Google Sheets")
    print("="*60 + "\n")
    
    try:
        from sheets import get_sheets_client, SHEET_INVOICE_ALL
        from config import get_config
        
        print("📋 Loading configuration...")
        config = get_config()
        
        # Get sheet ID from environment or config
        sheet_id = os.getenv('GOOGLE_SHEET_ID') or config.get('GOOGLE_SHEET_ID')
        
        if not sheet_id:
            print("\n❌ ERROR: Cannot find GOOGLE_SHEET_ID!")
            print("Make sure it's set in backend/.env or secrets.toml\n")
            return False
        
        print(f"✅ Found Sheet ID: {sheet_id[:10]}...\n")
        
        print("🔗 Connecting to Google Sheets...")
        sheets_client = get_sheets_client()
        print("✅ Connected!\n")
        
        print(f"➕ Adding 'Image Hash' column to '{SHEET_INVOICE_ALL}' tab...")
        sheets_client.ensure_column_exists(sheet_id, SHEET_INVOICE_ALL, "Image Hash")
        
        print("\n" + "="*60)
        print("🎉 SUCCESS! Column created!")
        print("="*60)
        print("\n👉 Open your Google Sheet and refresh the 'Invoice All' tab")
        print("   The 'Image Hash' column should now be visible at the end!\n")
        return True
        
    except ModuleNotFoundError as e:
        print(f"\n❌ Missing module: {e}")
        print("\n💡 Solution: Run this script with the backend virtual environment:")
        print("   backend\\venv\\Scripts\\python create_column.py\n")
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n")
        import traceback
        traceback.print_exc()
        print("\n💡 Check that:")
        print("   1. credentials.json exists in project root")
        print("   2. GOOGLE_SHEET_ID is correct in your config")
        print("   3. You have permission to edit the Google Sheet\n")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
