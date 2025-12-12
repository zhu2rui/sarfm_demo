import requests

# Simple verification of the export fix

def simple_verification():
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
        sample_table = tables[0]
    
    table_id = sample_table['id']
    print(f"Testing export for: {sample_table['table_name']} (ID: {table_id})")
    
    # Test export
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    export_response = requests.get(export_url, headers=headers)
    
    if export_response.status_code == 200:
        csv_content = export_response.text
        
        # Check for the specific issue
        problematic_pattern = 'IO2,pme18s-2,atgggt,A,。。。购买,2027/12/7 IO1'
        has_issue = problematic_pattern in csv_content
        
        print(f"\nExport Analysis:")
        print(f"Status Code: {export_response.status_code}")
        print(f"Content Length: {len(csv_content)}")
        print(f"Issue Detected: {has_issue}")
        
        if has_issue:
            print("❌ FAIL: All records are on one line")
            print("Sample of problematic content:")
            print(csv_content[:200])
        else:
            print("✅ PASS: Records are properly separated")
            print("Sample of exported content:")
            lines = csv_content.splitlines()
            for i, line in enumerate(lines[:5]):
                print(f"Line {i+1}: {line}")
    else:
        print(f"Export failed: {export_response.status_code} - {export_response.text}")

if __name__ == '__main__':
    simple_verification()
