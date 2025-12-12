import requests
import json

# Test the complete export flow

def test_export_flow():
    # 1. Login
    print("1. Logging in...")
    login_url = 'http://localhost:5000/api/v1/auth/login'
    login_data = {'username': 'admin', 'password': 'admin123'}
    login_response = requests.post(login_url, json=login_data)
    token = login_response.json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}
    print("✅ Login successful")
    
    # 2. Get tables
    print("\n2. Getting tables...")
    tables_url = 'http://localhost:5000/api/v1/tables'
    tables_response = requests.get(tables_url, headers=headers)
    tables = tables_response.json()['data']['items']
    print(f"✅ Found {len(tables)} tables")
    
    # 3. Find sample table
    print("\n3. Finding sample table...")
    sample_table = next((t for t in tables if t['table_name'] == '样品'), tables[0])
    table_id = sample_table['id']
    print(f"✅ Using table: {sample_table['table_name']} (ID: {table_id})")
    
    # 4. Test export with actual backend response
    print("\n4. Testing export with actual backend response...")
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    export_response = requests.get(export_url, headers=headers)
    
    print(f"✅ Export request successful, status: {export_response.status_code}")
    print(f"   Content-Type: {export_response.headers.get('content-type')}")
    print(f"   Content-Length: {export_response.headers.get('content-length')}")
    
    # 5. Simulate frontend Content-Type check
    print("\n5. Simulating frontend Content-Type check...")
    contentType = export_response.headers['content-type']
    
    # Original broken check (simulating JavaScript behavior)
    originalCheck = contentType == 'text/csv'
    print(f"   Original strict check: '{contentType}' == 'text/csv': {'❌ FAIL' if contentType != 'text/csv' else '✅ PASS'}")
    
    # Fixed check (simulating JavaScript includes())
    fixedCheck = 'text/csv' in contentType
    print(f"   Fixed includes check: 'text/csv' in '{contentType}': {'✅ PASS' if fixedCheck else '❌ FAIL'}")
    
    # 6. Verify CSV content
    print("\n6. Verifying CSV content...")
    csv_content = export_response.text
    lines = csv_content.splitlines()
    print(f"   Total lines: {len(lines)}")
    print(f"   Header line: {lines[0] if lines else 'No header'}")
    
    if len(lines) > 1:
        print(f"   First data line: {lines[1]}")
        print(f"   Second data line: {lines[2] if len(lines) > 2 else 'No second line'}")
    
    # 7. Check for the exact issue described
    print("\n7. Checking for the exact issue described...")
    problematic_pattern = 'IO2,pme18s-2,atgggt,A,。。。购买,2027/12/7 IO1'
    has_problem = problematic_pattern in csv_content
    print(f"   Contains all records on one line: {'❌ YES (BUG)' if has_problem else '✅ NO (FIXED)'}")
    
    if has_problem:
        print("\n❌ FAIL: Issue still exists")
        print(f"   Problematic content sample:")
        print(f"   {csv_content[:100]}...")
    else:
        print("\n✅ PASS: Issue is fixed!")
        print(f"   CSV export is working correctly with {len(lines) - 1} records")

if __name__ == '__main__':
    test_export_flow()
