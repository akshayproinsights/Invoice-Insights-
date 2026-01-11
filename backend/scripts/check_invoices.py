"""
Check invoices table for 803/8030 to recover data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import get_database_client

def check_invoices():
    db = get_database_client()
    username = 'Adnak'
    
    print("Checking invoices for 803...")
    invoices = db.query('invoices').eq('username', username).execute().data
    
    found = []
    for inv in invoices:
        r_num = inv.get('receipt_number')
        if r_num and str(r_num).startswith('803'):
            found.append(inv)
            
    print(f"Found {len(found)} invoices starting with 803:")
    for f in found:
        print(f"Receipt: {f.get('receipt_number')}, Desc: {f.get('description')}, Status: {f.get('status')}")

if __name__ == "__main__":
    check_invoices()
