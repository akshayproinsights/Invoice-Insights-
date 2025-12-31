"""
Standalone script to create the Image Hash column in Google Sheets.
Run this to manually add the column without uploading any invoices.
"""
import sys
sys.path.append('backend')

from backend.sheets import get_sheets_client
from backend.config import get_config

def main():
    print("=" * 60)
    print("Creating 'Image Hash' Column in Google Sheets")
    print("=" * 60)
    print()
    
    try:
        # Get configuration
        print("📋 Loading configuration...")
        config = get_config()
        sheet_id = config.get("GOOGLE_SHEET_ID")
        
        if not sheet_id:
            print("❌ ERROR: GOOGLE_SHEET_ID not found in config!")
            print("   Check your .env or secrets.toml file")
            return
        
        print(f"✅ Sheet ID: {sheet_id}")
        print()
        
        # Get sheets client
        print("🔗 Connecting to Google Sheets...")
        sheets_client = get_sheets_client()
        print("✅ Connected!")
        print()
        
        # Create the column
        print("➕ Creating 'Image Hash' column in 'Invoice All' tab...")
        sheets_client.ensure_column_exists(sheet_id, "Invoice All", "Image Hash")
        print("✅ Column created successfully!")
        print()
        
        print("=" * 60)
        print("🎉 SUCCESS!")
        print("=" * 60)
        print()
        print("👉 Go to your Google Sheet and check the 'Invoice All' tab")
        print("   You should see 'Image Hash' as the last column!")
        print()
        
    except Exception as e:
        print()
        print("=" * 60)
        print("❌ ERROR OCCURRED")
        print("=" * 60)
        print(f"Error: {str(e)}")
        print()
        import traceback
        print("Full traceback:")
        traceback.print_exc()
        print()
        print("💡 Common issues:")
        print("   1. Make sure backend dependencies are installed: pip install -r backend/requirements.txt")
        print("   2. Check that credentials.json exists")
        print("   3. Verify GOOGLE_SHEET_ID in your config")
        return

if __name__ == "__main__":
    main()
