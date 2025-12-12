import requests
import json

# Simple test for data export functionality

def simple_test_export():
    # Login to get token
    login_url = 'http://localhost:5000/api/v1/auth/login'
    login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    print("Logging in...")
    login_response = requests.post(login_url, json=login_data)
    token = login_response.json()['data']['token']
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # Get tables list
    tables_url = 'http://localhost:5000/api/v1/tables'
    tables_response = requests.get(tables_url, headers=headers)
    tables = tables_response.json()['data']['items']
    
    if not tables:
        print("No tables available")
        return
    
    # Test export for the first table
    table_id = tables[0]['id']
    table_name = tables[0]['table_name']
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    
    print(f"\nTesting export for table: {table_name} (ID: {table_id})")
    
    # Test export without stream=True to see the full response
    export_response = requests.get(export_url, headers=headers)
    print(f"Export status: {export_response.status_code}")
    print(f"Content-Type: {export_response.headers.get('Content-Type')}")
    
    if export_response.status_code == 200:
        print("\nExport successful! CSV content:")
        print(export_response.text)
        print("\n✅ Data export is working correctly!")
    else:
        print(f"\nExport failed! Response: {export_response.text}")

if __name__ == '__main__':
    simple_test_export()
