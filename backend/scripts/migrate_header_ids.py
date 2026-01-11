"""
Migration script to populate header_id in verification_amounts
Links line items to their header record (verification_dates) using receipt_number.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client

def migrate_header_ids():
    db = get_database_client()
    username = 'Adnak'
    
    print(f"Starting ID migration for user: {username}")
    
    # 1. Fetch all headers (dates)
    headers = db.query('verification_dates').eq('username', username).execute().data
    print(f"Found {len(headers)} headers.")
    
    updated_count = 0
    
    for header in headers:
        receipt_num = header.get('receipt_number')
        # Use row_id as the stable ID since we don't have a separate UUID primary key column exposed easily
        # ideally this would be 'id' if it's a UUID column
        header_id = header.get('id') 
        
        if not receipt_num or not header_id:
            print(f"Skipping invalid header: {header}")
            continue
            
        print(f"Processing header {receipt_num} (ID: {header_id})...")
        
        # 2. Find matching line items
        # We find items with matching receipt number AND (null header_id OR different header_id)
        # But simple eq check is safer for now
        line_items = db.query('verification_amounts') \
            .eq('username', username) \
            .eq('receipt_number', receipt_num) \
            .execute().data
            
        if not line_items:
            print(f"  No line items found for {receipt_num}")
            continue
            
        # 3. Update them with header_id
        # We have to update individual records or batch update if client supports it
        # Supabase client .update() works on filters
        try:
            db.client.table('verification_amounts') \
                .update({'header_id': header_id}) \
                .eq('username', username) \
                .eq('receipt_number', receipt_num) \
                .execute()
                
            updated_count += len(line_items)
            print(f"  ✓ Linked {len(line_items)} items to header {header_id}")
            
        except Exception as e:
            print(f"  ✗ Failed to update items for {receipt_num}: {e}")

    print(f"\nMigration complete. Total items linked: {updated_count}")
    
    # Check for orphans (items with no header_id)
    orphans = db.query('verification_amounts').eq('username', username).is_('header_id', 'null').execute().data
    if orphans:
        print(f"\n⚠️ WARNING: Found {len(orphans)} orphaned line items (no matching header):")
        for o in orphans:
            print(f"  - Receipt: {o.get('receipt_number')}, Desc: {o.get('description')}")
    else:
        print("\nAll items successfully linked! ✨")

if __name__ == "__main__":
    migrate_header_ids()
