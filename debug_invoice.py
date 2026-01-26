import asyncio
import os
import sys
from pprint import pprint

# Add backend directory to python path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.database import get_database_client

async def inspect_db():
    db = get_database_client()
    
    # Query items for the second file (ending in 002.jpg)
    response = db.client.table("inventory_items")\
        .select("*")\
        .ilike("source_file", "%002.jpg")\
        .execute()
        
    print(f"Found {len(response.data)} items for the second file:")
    for item in response.data:
        pprint(item)

if __name__ == "__main__":
    asyncio.run(inspect_db())
