import requests
import json

# Simple debug script to test export functionality

def debug_export():
    # Login
    login_url = 'http://localhost:5000/api/v1/auth/login'
    login_data = {'username': 'admin', 'password': 'admin123'}
    login_response = requests.post(login_url, json=login_data)
    token = login_response.json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get tables and find sample table
    tables_url = 'http://localhost:5000/api/v1/tables'
    tables_response = requests.get(tables_url, headers=headers)
    tables = tables_response.json()['data']['items']
    
    sample_table = None
    for t in tables:
        if t['table_name'] == '样品':
            sample_table = t
            break
    
    if not sample_table:
        print("Sample table not found")
        return
    
    table_id = sample_table['id']
    print(f"Testing export for: {sample_table['table_name']} (ID: {table_id})")
    
    # Test export
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    export_response = requests.get(export_url, headers=headers)
    
    print(f"Export status: {export_response.status_code}")
    if export_response.status_code == 200:
        csv_content = export_response.text
        print(f"Content-Length header: {export_response.headers.get('Content-Length')}")
        print(f"Actual content length: {len(csv_content)}")
        print(f"Content-Type: {export_response.headers.get('Content-Type')}")
        
        # Debug the CSV content
        print("\nCSV Content Analysis:")
        
        # Check for the exact issue described
        problematic_pattern = 'IO2,pme18s-2,atgggt,A,。。。购买,2027/12/7 IO1'
        has_problem = problematic_pattern in csv_content
        print(f"Contains problematic pattern: {has_problem}")
        
        if has_problem:
            print("\n❌ Issue reproduced! All records on one line.")
        else:
            print("\n✅ No issue - records are properly separated.")
        
        # Check line separators
        has_crlf = '\r\n' in csv_content
        has_lf = '\n' in csv_content
        print(f"Contains CR+LF: {has_crlf}")
        print(f"Contains LF: {has_lf}")
        
        # Count lines
        if has_crlf:
            lines = csv_content.split('\r\n')
        else:
            lines = csv_content.split('\n')
        
        print(f"\nLine Count: {len(lines)}")
        print(f"Lines with content: {sum(1 for line in lines if line.strip())}")
        
        # Show first few lines
        print("\nFirst 5 lines:")
        for i, line in enumerate(lines[:5]):
            print(f"Line {i+1}: {repr(line)}")
        
        # Save the file
        filename = "debug_export.csv"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(csv_content)
        print(f"\nSaved to {filename}")
    else:
        print(f"Export failed: {export_response.text}")

if __name__ == '__main__':
    debug_export()
