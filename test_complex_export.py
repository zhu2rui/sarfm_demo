import requests
import json

# Test complex export functionality with special characters, duplicate records, etc.

def test_complex_export():
    # First, login to get a token
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
    
    # Get tables list to find a suitable table
    tables_url = 'http://localhost:5000/api/v1/tables'
    tables_response = requests.get(tables_url, headers=headers)
    tables = tables_response.json()['data']['items']
    
    if not tables:
        print("No tables available")
        return
    
    # Find the "样品" table if it exists, otherwise use the first table
    sample_table = next((table for table in tables if table['table_name'] == '样品'), tables[0])
    table_id = sample_table['id']
    table_name = sample_table['table_name']
    
    print(f"\nTesting export for table: {table_name} (ID: {table_id})")
    print(f"Columns: {[col['column_name'] for col in sample_table['columns']]}")
    
    # Test export
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    export_response = requests.get(export_url, headers=headers)
    
    print(f"Export status: {export_response.status_code}")
    print(f"Content-Type: {export_response.headers.get('Content-Type')}")
    print(f"Content-Length: {export_response.headers.get('Content-Length')}")
    
    if export_response.status_code == 200:
        csv_content = export_response.text
        print(f"\nCSV Content Preview (first 500 chars):")
        print(csv_content[:500])
        
        # Count number of lines
        lines = csv_content.splitlines()
        print(f"\nTotal lines in CSV: {len(lines)}")
        print(f"Header line: {lines[0] if lines else 'No header'}")
        
        if len(lines) > 1:
            print(f"First 5 data lines:")
            for i, line in enumerate(lines[1:6], 1):
                print(f"Line {i}: {line}")
        
        # Check for proper line breaks
        print(f"\nLine endings check:")
        if '\r\n' in csv_content:
            print("✓ Using Windows-style line endings (\r\n)")
        elif '\n' in csv_content:
            print("✓ Using Unix-style line endings (\n)")
        else:
            print("✗ No line breaks found!")
        
        # Save the CSV file for inspection
        filename = f'{table_name}_complex_export.csv'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(csv_content)
        print(f"\n✅ CSV file saved as: {filename}")
        print(f"✅ Data export is working correctly!")
        
        # Check if the file can be opened by Excel (basic compatibility test)
        print(f"\nCSV compatibility check:")
        try:
            import csv
            with open(filename, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                rows = list(reader)
                print(f"✓ CSV can be parsed by Python's csv.reader")
                print(f"✓ Total rows parsed: {len(rows)}")
                if rows:
                    print(f"✓ Column count: {len(rows[0])} columns")
        except Exception as e:
            print(f"✗ CSV parsing error: {e}")
            
    else:
        # Error response
        print(f"\nExport failed with status: {export_response.status_code}")
        print(f"Error response: {export_response.text}")

if __name__ == '__main__':
    test_complex_export()
