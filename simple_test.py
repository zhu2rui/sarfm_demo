import requests

# Simple test without f-string issues

def simple_test():
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
    
    sample_table = None
    for t in tables:
        if t['table_name'] == '样品':
            sample_table = t
            break
    if not sample_table:
        sample_table = tables[0]
    
    table_id = sample_table['id']
    print(f"Testing export for table: {sample_table['table_name']} (ID: {table_id})")
    
    # Test export
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    response = requests.get(export_url, headers=headers)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        content = response.text
        print("\nExported CSV content:")
        print(content)
        
        # Count lines by splitting on both CR+LF and LF
        crlf_lines = content.split('\r\n')
        lf_lines = content.split('\n')
        print(f"\nLine count analysis:")
        print(f"Lines with CR+LF split: {len(crlf_lines)}")
        print(f"Lines with LF split: {len(lf_lines)}")
        
        print("\nSample data points:")
        print(f"First 100 chars: {repr(content[:100])}")
        print(f"Last 100 chars: {repr(content[-100:])}")
    else:
        print(f"Error: {response.text}")

if __name__ == '__main__':
    simple_test()
