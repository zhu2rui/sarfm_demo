import requests
import json

# Test the data export functionality

def test_export():
    # First, login to get a token
    login_url = 'http://localhost:5000/api/v1/auth/login'
    login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    print("Logging in...")
    login_response = requests.post(login_url, json=login_data)
    print(f"Login status: {login_response.status_code}")
    print(f"Login response: {login_response.text}")
    
    if login_response.status_code != 200:
        print("Login failed")
        return
    
    # Get the token
    token = login_response.json()['data']['token']
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # Test getting tables list
    tables_url = 'http://localhost:5000/api/v1/tables'
    tables_response = requests.get(tables_url, headers=headers)
    print(f"\nTables list status: {tables_response.status_code}")
    print(f"Tables list: {tables_response.text}")
    
    # Check if we have any tables
    if tables_response.status_code != 200:
        print("Failed to get tables list")
        return
    
    tables = tables_response.json()['data']['items']
    if not tables:
        print("No tables available")
        return
    
    # Test export for the first table
    table_id = tables[0]['id']
    table_name = tables[0]['table_name']
    
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    
    print(f"\nTesting export for table: {table_name} (ID: {table_id})")
    print(f"Export URL: {export_url}")
    
    try:
        export_response = requests.get(export_url, headers=headers, stream=True)
        print(f"Export status: {export_response.status_code}")
        print(f"Export headers: {export_response.headers}")
        
        if export_response.status_code == 200:
            # Check if it's a CSV file
            content_type = export_response.headers.get('Content-Type')
            print(f"Content-Type: {content_type}")
            
            if content_type == 'text/csv':
                # Save the file
                filename = f'{table_name}_export_test.csv'
                with open(filename, 'wb') as f:
                    for chunk in export_response.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"Success! File saved as: {filename}")
                
                # Read and print the first few lines
                with open(filename, 'r', encoding='utf-8') as f:
                    print("\nFirst 5 lines of exported file:")
                    for i, line in enumerate(f):
                        if i < 5:
                            print(line.strip())
                        else:
                            break
            else:
                # It's not a CSV, probably an error response
                print(f"Unexpected Content-Type: {content_type}")
                print(f"Response content: {export_response.text}")
        else:
            # Error response
            print(f"Export failed with status: {export_response.status_code}")
            print(f"Error response: {export_response.text}")
            
    except Exception as e:
        print(f"Exception during export: {str(e)}")

if __name__ == '__main__':
    test_export()
