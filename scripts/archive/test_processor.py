"""Test script to debug processor failure"""
import sys
import asyncio
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_processor():
    from services.storage import get_storage_client
    from services.processor import process_invoices_batch
    
    # Test parameters from user
    file_keys = ["Adnak/uploads/20251224_194733_test_image.jpg"]  # Adjust timestamp
    r2_bucket = "adnak-sir-invoices"
    sheet_id = "1741gK1V-MQlr3CE3ldkyDh26jbGe7r8CKCSkUCm2Pbg"
    username = "Adnak"
    
    print("Testing invoice processing...")
    print(f"File keys: {file_keys}")
    print(f"R2 Bucket: {r2_bucket}")
    print(f"Sheet ID: {sheet_id}")
    print()
    
    try:
        results = await process_invoices_batch(
            file_keys=file_keys,
            r2_bucket=r2_bucket,
            sheet_id=sheet_id,
            username=username
        )
        
        print("Results:")
        print(f"Total: {results['total']}")
        print(f"Processed: {results['processed']}")
        print(f"Failed: {results['failed']}")
        if results['errors']:
            print("Errors:")
            for error in results['errors']:
                print(f"  - {error}")
                
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_processor())
