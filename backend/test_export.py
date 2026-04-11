import requests
import json
import os

# 登录获取token
def get_token():
    url = 'http://localhost:5000/api/v1/auth/login'
    headers = {'Content-Type': 'application/json'}
    data = {
        'username': 'admin',
        'password': 'admin123'
    }
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        return response.json()['data']['token']
    else:
        print(f'登录失败: {response.status_code}')
        print(response.text)
        return None

# 测试导出所有数据
def test_export_all_data():
    token = get_token()
    if not token:
        return
    
    url = 'http://localhost:5000/api/v1/export-all-data'
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    response = requests.get(url, headers=headers, stream=True)
    if response.status_code == 200:
        # 保存文件
        with open('test_export.xlsx', 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print('导出成功，文件已保存为test_export.xlsx')
        
        # 检查文件大小
        file_size = os.path.getsize('test_export.xlsx')
        print(f'文件大小: {file_size} 字节')
        
        # 检查文件是否存在
        if os.path.exists('test_export.xlsx'):
            print('文件已成功创建')
        else:
            print('文件创建失败')
    else:
        print(f'导出失败: {response.status_code}')
        print(response.text)

if __name__ == '__main__':
    test_export_all_data()
