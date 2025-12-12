import requests
import json

# Reproduce the exact issue described in the bug report

def reproduce_issue():
    # Login
    login_url = 'http://localhost:5000/api/v1/auth/login'
    login_data = {'username': 'admin', 'password': 'admin123'}
    login_response = requests.post(login_url, json=login_data)
    token = login_response.json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Create the exact table structure as described in the issue
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
    
    print("Creating sample table...")
    create_response = requests.post(create_table_url, json=table_data, headers=headers)
    sample_table = create_response.json()['data']
    table_id = sample_table['id']
    print(f"Created sample table: {sample_table['table_name']} (ID: {table_id})")
    
    # Add the exact problematic data from the bug report
    add_data_url = f'http://localhost:5000/api/v1/tables/{table_id}/data'
    problematic_data = [
        {"编号": "IO2", "名称": "pme18s-2", "序列": "atgggt", "制备人": "A", "备注": "。。。购买", "过期日期": "2027/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"},
        {"编号": "IO1", "名称": "pme18s-1", "序列": "atgggga", "制备人": "刘亚飞", "备注": "从x处获得", "过期日期": "2026/12/7"}
    ]
    
    print(f"Adding {len(problematic_data)} problematic records...")
    for i, record in enumerate(problematic_data):
        response = requests.post(add_data_url, json={"data": record}, headers=headers)
        if response.status_code != 200:
            print(f"Failed to add record {i+1}: {response.text}")
        else:
            print(f"Added record {i+1}")
    
    # Now test export to reproduce the issue
    print("\nTesting export with problematic data...")
    export_url = f'http://localhost:5000/api/v1/tables/{table_id}/export'
    export_response = requests.get(export_url, headers=headers)
    
    print(f"Export status: {export_response.status_code}")
    if export_response.status_code == 200:
        csv_content = export_response.text
        print(f"\nExported CSV content (raw):")
        print(repr(csv_content))
        
        # Check the exact issue described in the bug report
        print("\nIssue reproduction check:")
        contains_oneline = 'IO2,pme18s-2,atgggt,A,。。。购买,2027/12/7 IO1' in csv_content
        print(f"Contains all records on one line: {contains_oneline}")
        has_newlines = '\n' in csv_content
        print(f"Proper line breaks: {has_newlines}")
        
        # Count lines
        lines = csv_content.split('\n')
        print(f"Total lines: {len(lines)}")
        
        # Print each line separately
        print("\nCSV lines:")
        for i, line in enumerate(lines):
            print(f"Line {i+1}: {repr(line)}")
        
        # Save the file to analyze
        filename = "bug_reproduction.csv"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(csv_content)
        print(f"\nSaved to {filename}")
    else:
        print(f"Export failed: {export_response.text}")

if __name__ == '__main__':
    reproduce_issue()
