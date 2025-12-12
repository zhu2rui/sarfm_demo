import requests
import json

# 测试登录和获取表格列表的完整流程
def test_get_tables():
    print("=== 测试获取表格列表API ===")
    
    # 1. 测试登录
    login_url = "http://127.0.0.1:5000/api/v1/auth/login"
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    print(f"\n1. 登录请求: {login_url}")
    print(f"   登录数据: {json.dumps(login_data)}")
    
    try:
        login_response = requests.post(login_url, json=login_data)
        print(f"   登录响应状态码: {login_response.status_code}")
        print(f"   登录响应数据: {login_response.text}")
        
        if login_response.status_code == 200:
            login_result = login_response.json()
            if login_result.get("code") == 200:
                token = login_result["data"]["token"]
                print(f"   登录成功，获取到token: {token}")
                
                # 2. 使用token获取表格列表
                tables_url = "http://127.0.0.1:5000/api/v1/tables"
                headers = {
                    "Authorization": f"Bearer {token}"
                }
                
                print(f"\n2. 获取表格列表请求: {tables_url}")
                print(f"   请求头: {json.dumps(headers)}")
                
                tables_response = requests.get(tables_url, headers=headers)
                print(f"   表格列表响应状态码: {tables_response.status_code}")
                print(f"   表格列表响应数据: {tables_response.text}")
                
                if tables_response.status_code == 200:
                    tables_result = tables_response.json()
                    if tables_result.get("code") == 200:
                        tables = tables_result["data"]["items"]
                        print(f"   获取表格列表成功，共 {len(tables)} 个表格")
                        for table in tables:
                            print(f"   - 表格: {table['table_name']}, ID: {table['id']}")
                        return True
                    else:
                        print(f"   获取表格列表失败，错误信息: {tables_result.get('message')}")
                else:
                    print(f"   获取表格列表失败，状态码: {tables_response.status_code}")
            else:
                print(f"   登录失败，错误信息: {login_result.get('message')}")
        else:
            print(f"   登录请求失败，状态码: {login_response.status_code}")
    except Exception as e:
        print(f"   发生异常: {str(e)}")
    
    return False

# 测试直接访问表格列表API（未登录）
def test_get_tables_without_login():
    print("\n=== 测试未登录状态下获取表格列表API ===")
    
    tables_url = "http://127.0.0.1:5000/api/v1/tables"
    
    try:
        response = requests.get(tables_url)
        print(f"响应状态码: {response.status_code}")
        print(f"响应数据: {response.text}")
    except Exception as e:
        print(f"发生异常: {str(e)}")

# 运行测试
if __name__ == "__main__":
    test_get_tables()
    test_get_tables_without_login()
