"""
Check and log industry_type status to a file.
"""
import json
from database import get_database_client


def check_status():
    """Check status and save to file"""
    db = get_database_client()
    
    results = {}
    
    tables = ['invoices', 'verified_invoices', 'verification_dates', 'verification_amounts']
    
    for table_name in tables:
        try:
            # Get sample records
            result = db.client.table(table_name) \
                        .select('row_id, username, industry_type') \
                        .eq('username', 'Adnak') \
                        .limit(20) \
                        .execute()
            
            results[table_name] = {
                'total_checked': len(result.data) if result.data else 0,
                'records': []
            }
            
            if result.data:
                null_count = 0
                for rec in result.data:
                    industry = rec.get('industry_type')
                    if industry is None or industry == '':
                        null_count += 1
                    
                    results[table_name]['records'].append({
                        'row_id': rec.get('row_id', '')[:50],
                        'username': rec.get('username'),
                        'industry_type': industry if industry else '<NULL>'
                    })
                
                results[table_name]['null_count'] = null_count
                results[table_name]['filled_count'] = len(result.data) - null_count
        
        except Exception as e:
            results[table_name] = {'error': str(e)}
    
    # Write to file
    with open('industry_check_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("Results written to industry_check_results.json")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    check_status()
