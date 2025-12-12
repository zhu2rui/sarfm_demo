import requests
import json

# 测试密码重置功能
def test_reset_password():
    # 基础URL
    base_url = 'http://localhost:5000/api/v1'
    
    # 测试用户信息
    test_user = {
        'username': 'test_reset_user',
        'initial_password': '',  # 初始密码为空
        'new_password': 'Test@123456',  # 新密码
        'confirm_password': 'Test@123456'  # 确认新密码
    }
    
    # 管理员登录
    login_url = f'{base_url}/auth/login'
    admin_login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    admin_login_response = requests.post(login_url, json=admin_login_data)
    if admin_login_response.status_code != 200:
        print(f'管理员登录失败: {admin_login_response.text}')
        return
    
    admin_token = admin_login_response.json()['data']['token']
    print(f'管理员登录成功，token: {admin_token[:20]}...')
    
    # 创建测试用户
    create_user_url = f'{base_url}/users'
    headers = {
        'Authorization': f'Bearer {admin_token}'
    }
    create_user_data = {
        'username': test_user['username'],
        'password': test_user['initial_password'],
        'role': 'member'
    }
    
    create_user_response = requests.post(create_user_url, json=create_user_data, headers=headers)
    if create_user_response.status_code != 200:
        print(f'创建测试用户失败: {create_user_response.text}')
        return
    
    print(f'创建测试用户 {test_user["username"]} 成功')
    
    # 测试密码重置
    print('\n测试密码重置功能...')
    reset_password_url = f'{base_url}/auth/reset-password'
    reset_password_data = {
        'username': test_user['username'],
        'new_password': test_user['new_password'],
        'confirm_password': test_user['confirm_password']
    }
    
    reset_password_response = requests.post(reset_password_url, json=reset_password_data)
    print(f'密码重置请求状态码: {reset_password_response.status_code}')
    print(f'密码重置响应内容: {reset_password_response.text}')
    
    if reset_password_response.status_code == 200:
        print('密码重置成功！')
        
        # 验证新密码是否可以登录
        login_data = {
            'username': test_user['username'],
            'password': test_user['new_password']
        }
        
        login_response = requests.post(login_url, json=login_data)
        print(f'\n使用新密码登录状态码: {login_response.status_code}')
        print(f'使用新密码登录响应内容: {login_response.text}')
        
        if login_response.status_code == 200:
            print('使用新密码登录成功！')
        else:
            print('使用新密码登录失败！')
    else:
        print('密码重置失败！')

if __name__ == '__main__':
    test_reset_password()