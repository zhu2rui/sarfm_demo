import requests
import json

# 测试用例：测试不同长度的密码修改

def test_change_password():
    # 1. 先登录获取token
    login_url = 'http://127.0.0.1:5000/api/v1/auth/login'
    login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    print('=== 登录获取token ===')
    login_response = requests.post(login_url, json=login_data)
    print(f'登录状态码: {login_response.status_code}')
    print(f'登录响应: {login_response.text}')
    
    if login_response.status_code != 200:
        print('登录失败，无法继续测试')
        return
    
    token = login_response.json()['data']['token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # 2. 测试不同长度的密码
    change_password_url = 'http://127.0.0.1:5000/api/v1/auth/change-password'
    
    # 测试用例：各种长度的密码（但都包含所需的字符类型：大写字母、小写字母、数字、特殊符号）
    test_cases = [
        # 极短密码（4个字符，刚好满足所有字符类型要求）
        {'current_password': 'admin123', 'new_password': 'A1a!', 'confirm_password': 'A1a!'},
        # 短密码
        {'current_password': 'A1a!', 'new_password': 'B2b@', 'confirm_password': 'B2b@'},
        # 中等长度密码
        {'current_password': 'B2b@', 'new_password': 'C3c#D4d$', 'confirm_password': 'C3c#D4d$'},
        # 恢复原始密码用于后续测试
        {'current_password': 'C3c#D4d$', 'new_password': 'admin123', 'confirm_password': 'admin123'}
    ]
    
    print('\n=== 测试不同长度的密码修改 ===')
    for i, test_data in enumerate(test_cases, 1):
        print(f'\n测试用例 {i}: 密码长度 {len(test_data["new_password"])}')
        print(f'当前密码: {test_data["current_password"]}, 新密码: {test_data["new_password"]}')
        
        response = requests.post(change_password_url, json=test_data, headers=headers)
        print(f'状态码: {response.status_code}')
        print(f'响应: {response.text}')
        
        # 更新token以便后续测试
        if response.status_code == 200:
            # 重新登录获取新token
            login_response = requests.post(login_url, json={
                'username': 'admin',
                'password': test_data['new_password']
            })
            if login_response.status_code == 200:
                token = login_response.json()['data']['token']
                headers = {'Authorization': f'Bearer {token}'}
                print(f'获取新token成功')

if __name__ == '__main__':
    test_change_password()