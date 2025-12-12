import requests
import json

# Test the frontend fix for CSV export

def test_frontend_fix():
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
    sample_table = next((t for t in tables if t['table_name'] == '样品'), tables[0])
    table_id = sample_table['id']
    print(f"Testing export for: {sample_table['table_name']} (ID: {table_id})")
    
    # Test export with blob response type (simulating frontend behavior)
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    
    # Test 1: Text response (simulate backend behavior)
    print("\n1. Testing with text response:")
    text_response = requests.get(export_url, headers=headers)
    text_content = text_response.text
    print(f"Contains CR+LF: {'\r\n' in text_content}")
    print(f"Contains LF: {'\n' in text_content}")
    lines = text_content.split('\n')
    print(f"Lines: {len(lines)}")
    
    # Test 2: Blob response (simulate frontend behavior)
    print("\n2. Testing with blob response:")
    blob_response = requests.get(export_url, headers=headers, stream=True)
    blob_content = blob_response.content
    # Convert blob to text
    blob_text = blob_content.decode('utf-8')
    print(f"Contains CR+LF: {'\r\n' in blob_text}")
    print(f"Contains LF: {'\n' in blob_text}")
    blob_lines = blob_text.split('\n')
    print(f"Lines: {len(blob_lines)}")
    
    # Verify the fix works
    print("\n3. Verifying fix:")
    has_problem = 'IO2,pme18s-2,atgggt,A,。。。购买,2027/12/7 IO1' in blob_text
    print(f"Contains all records on one line: {has_problem}")
    
    if not has_problem:
        print("✅ Fix is working! Records are properly separated.")
        # Print first few lines to verify
        print("\nFirst 3 lines:")
        for i, line in enumerate(blob_lines[:3]):
            print(f"Line {i+1}: {line}")
    else:
        print("❌ Fix is not working. Records are still on one line.")
        print("\nFirst 100 chars:")
        print(repr(blob_text[:100]))

if __name__ == '__main__':
    test_frontend_fix()
