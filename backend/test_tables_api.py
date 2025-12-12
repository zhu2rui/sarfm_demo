import requests
import json

# 测试登录并获取表格列表
def test_tables_api():
    # 登录URL
    login_url = 'http://localhost:5000/api/v1/auth/login'
    # 表格列表URL
    tables_url = 'http://localhost:5000/api/v1/tables'
    
    # 登录请求数据
    login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    try:
        print('正在测试登录...')
        # 发送登录请求
        login_response = requests.post(login_url, json=login_data)
        print(f'登录响应状态码: {login_response.status_code}')
        print(f'登录响应内容: {login_response.text}')
        
        if login_response.status_code == 200:
            # 提取token
            login_result = login_response.json()
            token = login_result.get('data', {}).get('token')
            
            if token:
                print('\n登录成功，正在测试获取表格列表...')
                # 发送获取表格列表请求
                headers = {
                    'Authorization': f'Bearer {token}'
                }
                tables_response = requests.get(tables_url, headers=headers)
                print(f'表格列表响应状态码: {tables_response.status_code}')
                print(f'表格列表响应内容: {tables_response.text}')
                
                if tables_response.status_code == 200:
                    tables_result = tables_response.json()
                    print(f'\n测试成功！获取到的表格数量: {len(tables_result.get("data", {}).get("items", []))}')
                else:
                    print('\n获取表格列表失败')
            else:
                print('\n登录成功，但未获取到token')
        else:
            print('\n登录失败')
    except Exception as e:
        print(f'\n测试过程中发生错误: {str(e)}')

if __name__ == '__main__':
    test_tables_api()