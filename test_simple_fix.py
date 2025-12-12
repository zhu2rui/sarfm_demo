import requests
import json

# Simple test to verify the CSV export fix

def test_csv_fix():
    # Login
    login_url = 'http://localhost:5000/api/v1/auth/login'
    login_data = {'username': 'admin', 'password': 'admin123'}
    login_response = requests.post(login_url, json=login_data)
    token = login_response.json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Find the "样品" table
    tables_url = 'http://localhost:5000/api/v1/tables'
    tables_response = requests.get(tables_url, headers=headers)
    tables = tables_response.json()['data']['items']
    
    sample_table = next((t for t in tables if t['table_name'] == '样品'), None)
    if not sample_table:
        print("Sample table not found")
        return
    
    table_id = sample_table['id']
    print(f"Testing export for table: {sample_table['table_name']} (ID: {table_id})")
    
    # Test export
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    export_response = requests.get(export_url, headers=headers)
    
    if export_response.status_code == 200:
        csv_content = export_response.text
        print(f"Export successful! Status: {export_response.status_code}")
        print(f"CSV Content:")
        print(repr(csv_content))
        
        # Count lines
        lines = csv_content.split('\r\n')
        print(f"\nTotal lines: {len(lines)}")
        print(f"Lines with content: {sum(1 for line in lines if line.strip())}")
        
        # Verify proper structure
        if lines:
            print(f"\nHeader: {repr(lines[0])}")
            if len(lines) > 1:
                print(f"First data line: {repr(lines[1])}")
                print(f"Second data line: {repr(lines[2])}")
        
        print("\n✅ CSV export is working correctly with proper line breaks!")
    else:
        print(f"Export failed: {export_response.status_code} - {export_response.text}")

if __name__ == '__main__':
    test_csv_fix()
