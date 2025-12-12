import requests
import json

# Test export with sample table data

def test_sample_table():
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
    
    # Get all tables
    tables_url = 'http://localhost:5000/api/v1/tables'
    tables_response = requests.get(tables_url, headers=headers)
    tables = tables_response.json()['data']['items']
    
    print("\nAvailable tables:")
    for table in tables:
        print(f"- {table['table_name']} (ID: {table['id']}) - {len(table['columns'])} columns")
    
    # Find or create sample table
    sample_table = next((table for table in tables if table['table_name'] == '样品'), None)
    table_id = None
    
    if not sample_table:
        print("\nCreating sample table...")
        create_table_url = 'http://localhost:5000/api/v1/tables'
        table_data = {
            "table_name": "样品",
            "columns": [
                {"column_name": "编号", "data_type": "string", "hidden": False},
                {"column_name": "名称", "data_type": "string", "hidden": False},
                {"column_name": "序列", "data_type": "string", "hidden": False},
                {"column_name": "制备人", "data_type": "string", "hidden": False},
                {"column_name": "备注", "data_type": "string", "hidden": False},
                {"column_name": "过期日期", "data_type": "string", "hidden": False}
            ]
        }
        create_response = requests.post(create_table_url, json=table_data, headers=headers)
        sample_table = create_response.json()['data']
        table_id = sample_table['id']
        print(f"Created sample table: {sample_table['table_name']} (ID: {table_id})")
    else:
        table_id = sample_table['id']
        print(f"Found sample table: {sample_table['table_name']} (ID: {table_id})")
    
    # Add test data with special characters and duplicate records
    print("\nAdding test data...")
    add_data_url = f'http://localhost:5000/api/v1/tables/{table_id}/data'
    test_records = [
        {"编号": "IO2", "名称": "pme18s-2", "序列": "atgggt", "制备人": "A", "备注": "。。。购买", "过期日期": "2027/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO2", "名称": "pme18s-2", "序列": "atgggt", "制备人": "A", "备注": "。。。购买", "过期日期": "2027/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"}
    ]
    
    # Add records one by one
    for record in test_records:
        response = requests.post(add_data_url, json={"data": record}, headers=headers)
        if response.status_code != 200:
            print(f"Failed to add record: {record}")
    
    print(f"Added {len(test_records)} test records")
    
    # Test export with the complex data
    print("\nTesting export with complex data...")
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    export_response = requests.get(export_url, headers=headers)
    
    print(f"Export status: {export_response.status_code}")
    if export_response.status_code == 200:
        csv_content = export_response.text
        print(f"\nCSV Content Preview (first 500 chars):")
        print(repr(csv_content[:500]))
        
        # Count lines
        lines = csv_content.splitlines()
        print(f"\nTotal lines in CSV: {len(lines)}")
        print(f"Header line: {lines[0]}")
        
        if len(lines) > 1:
            print(f"First 5 data lines:")
            for i, line in enumerate(lines[1:6], 1):
                print(f"Line {i}: {repr(line)}")
        
        # Save the file
        filename = f'{sample_table["table_name"]}_export_test.csv'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(csv_content)
        print(f"\n✅ CSV file saved as: {filename}")
        print(f"✅ Export successful with {len(lines) - 1} data records")
        
        # Verify CSV validity
        import csv
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)
            print(f"\nCSV validation:")
            print(f"✓ Total rows: {len(rows)}")
            print(f"✓ Columns per row: {len(rows[0]) if rows else 0}")
    else:
        print(f"Export failed: {export_response.text}")

if __name__ == '__main__':
    test_sample_table()
