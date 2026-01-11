"""
Restore missing 803 line items to verification_amounts as 8030
"""
import sys
import os
import uuid
import datetime

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client

def restore_items():
    db = get_database_client()
    username = 'Adnak'
    
    # 1. Get source items from invoices
    print("Fetching source invoices for 803...")
    invoices = db.query('invoices').eq('username', username).eq('receipt_number', '803').execute().data
    
    if not invoices:
        print("No source invoices found! Cannot restore.")
        return

    print(f"Found {len(invoices)} items to restore.")
    
    # 2. Prepare restore data
    restore_data = []
    for inv in invoices:
        # Create a new unique row_id for the line item
        # Since header is 803_0, let's use 8030_0, 8030_1 etc to avoid collision
        # Or better, just generate new ones based on the new receipt number '8030'
        
        # Check if we already have 8030 items to determine index?
        # No, current count is 0.
        
        idx = invoices.index(inv)
        new_row_id = f"8030_{idx}" 
        
        new_item = {
            'username': username,
            'receipt_number': '8030', # Link to the new header
            'description': inv.get('description'),
            'quantity': inv.get('quantity'),
            'rate': inv.get('rate'),
            'amount': inv.get('amount'),
            'receipt_link': inv.get('receipt_link'),
            'verification_status': 'Pending',
            'row_id': new_row_id,
            'created_at': datetime.datetime.utcnow().isoformat(),
            # Copy bboxes if available (assuming column names match or similar)
            'line_item_row_bbox': inv.get('line_item_row_bbox'),
            'description_bbox': inv.get('description_bbox'),
            'quantity_bbox': inv.get('quantity_bbox'),
            'rate_bbox': inv.get('rate_bbox'),
            'amount_bbox': inv.get('amount_bbox')
        }
        
        restore_data.append(new_item)
        
    # 3. Insert into verification_amounts
    print(f"Restoring {len(restore_data)} items as receipt '8030'...")
    try:
        data = db.insert('verification_amounts', restore_data)
        print("✓ Restore successful!")
    except Exception as e:
        print(f"✗ Restore failed: {e}")

if __name__ == "__main__":
    restore_items()
