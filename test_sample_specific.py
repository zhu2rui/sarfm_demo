import requests
import json

# Test specifically for the sample table

def test_sample_specific():
    # Login
    login_url = 'http://localhost:5000/api/v1/auth/login'
    login_data = {'username': 'admin', 'password': 'admin123'}
    login_response = requests.post(login_url, json=login_data)
    token = login_response.json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get tables
    tables_url = 'http://localhost:5000/api/v1/tables'
    tables_response = requests.get(tables_url, headers=headers)
    tables = tables_response.json()['data']['items']
    
    # Find sample table
    sample_table = None
    for t in tables:
        if t['table_name'] == '样品':
            sample_table = t
            break
    
    if not sample_table:
        print("Sample table not found")
        return
    
    table_id = sample_table['id']
    print(f"Testing sample table: {sample_table['table_name']} (ID: {table_id})")
    print(f"Columns: {[col['column_name'] for col in sample_table['columns']]}")
    
    # Get all data from the sample table
    data_url = f'http://localhost:5000/api/v1/tables/{table_id}/data'
    data_response = requests.get(data_url, headers=headers)
    data_items = data_response.json()['data']['items']
    
    print(f"\nTotal records in sample table: {len(data_items)}")
    
    # Check for duplicate records in the database
    print("\nChecking for duplicate records in database:")
    seen = {}
    duplicates = []
    
    for item in data_items:
        data_str = json.dumps(item['data'], sort_keys=True)
        if data_str in seen:
            duplicates.append(item)
        else:
            seen[data_str] = item
    
    if duplicates:
        print(f"Found {len(duplicates)} duplicate records in database!")
        print(f"First duplicate data: {json.dumps(duplicates[0]['data'])}")
    else:
        print("No duplicate records found in database")
    
    # Print all records to see what's stored
    print("\nAll records in database:")
    for i, item in enumerate(data_items):
        print(f"Record {i+1}: {json.dumps(item['data'])}")
    
    # Test export
    print("\nTesting export:")
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    export_response = requests.get(export_url, headers=headers)
    
    if export_response.status_code == 200:
        csv_content = export_response.text
        print(f"Export successful! Length: {len(csv_content)} chars")
        
        # Print the raw content
        print("\nExported CSV content:")
        print(csv_content)
        
        # Count lines
        lines = csv_content.split('\r\n')
        print(f"\nLine count: {len(lines)}")
        
        # Check for the reported issue
        if 'IO2,pme18s-2,atgggt,A,。。。购买,2027/12/7' in csv_content:
            print("\n✓ Found the problematic record in export")
        else:
            print("\n✗ Problematic record not found in export")
    else:
        print(f"Export failed: {export_response.status_code} - {export_response.text}")

if __name__ == '__main__':
    test_sample_specific()
