import requests
import json

# Direct test of backend export functionality

def test_backend_export():
    # Login to get token
    login_url = 'http://localhost:5000/api/v1/auth/login'
    login_data = {'username': 'admin', 'password': 'admin123'}
    login_response = requests.post(login_url, json=login_data)
    token = login_response.json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get tables
    tables_url = 'http://localhost:5000/api/v1/tables'
    tables_response = requests.get(tables_url, headers=headers)
    tables = tables_response.json()['data']['items']
    
    sample_table = next((t for t in tables if t['table_name'] == '样品'), tables[0])
    table_id = sample_table['id']
    print(f"Testing export for table: {sample_table['table_name']} (ID: {table_id})")
    
    # Test export with different response types
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    
    print("\n1. Testing export with text response:")
    text_response = requests.get(export_url, headers=headers)
    print(f"Status: {text_response.status_code}")
    print(f"Content-Type: {text_response.headers.get('Content-Type')}")
    print(f"Content-Length: {text_response.headers.get('Content-Length')}")
    
    if text_response.status_code == 200:
        csv_content = text_response.text
        print(f"\nCSV Text Response (first 500 chars):")
        print(repr(csv_content[:500]))
        
        # Check line breaks
        print("\nLine break analysis:")
        print(f"Contains CR+LF: {csv_content.find('\r\n') != -1}")
        print(f"Contains LF: {csv_content.find('\n') != -1}")
        
        # Count lines
        lines = csv_content.split('\r\n')
        print(f"Lines with CR+LF split: {len(lines)}")
        
        # Print first few lines
        print("\nFirst 3 lines:")
        for i, line in enumerate(lines[:3]):
            print(f"Line {i+1}: {line!r}")
    
    print("\n2. Testing export with raw response:")
    raw_response = requests.get(export_url, headers=headers, stream=True)
    raw_content = raw_response.raw.read()
    print(f"Raw content length: {len(raw_content)}")
    print(f"Raw content (first 200 bytes):")
    print(repr(raw_content[:200]))
    
    # Test duplicate records issue
    print("\n3. Checking for duplicate records:")
    # Get all data directly to check for duplicates
    data_url = f'http://localhost:5000/api/v1/tables/{table_id}/data'
    data_response = requests.get(data_url, headers=headers)
    data_items = data_response.json()['data']['items']
    print(f"Total records from API: {len(data_items)}")
    
    # Check for duplicates
    seen = set()
    duplicates = []
    for item in data_items:
        item_str = json.dumps(item)
        if item_str in seen:
            duplicates.append(item)
        seen.add(item_str)
    
    if duplicates:
        print(f"Found {len(duplicates)} duplicate records!")
        print(f"First duplicate: {json.dumps(duplicates[0])}")
    else:
        print("No duplicate records found in API response")

if __name__ == '__main__':
    test_backend_export()
