import requests
import json

# 测试强制密码重置功能
def test_force_password_reset():
    # 基础URL
    base_url = 'http://localhost:5000/api/v1'
    
    # 测试用户信息
    test_user = {
        'username': 'testuser',
        'password': '',  # 初始密码为空
        'new_password': 'Test@123456',  # 新密码
        'confirm_password': 'Test@123456'  # 确认新密码
    }
    
    # 管理员登录，获取token
    print('1. 管理员登录...')
    login_url = f'{base_url}/auth/login'
    admin_login_data = {
        'username': 'admin',
        'password': 'admin123'  # 初始密码是admin123
    }
    
    admin_login_response = requests.post(login_url, json=admin_login_data)
    if admin_login_response.status_code != 200:
        print(f'管理员登录失败: {admin_login_response.text}')
        return False
    
    admin_login_result = admin_login_response.json()
    
    # 检查是否需要重置密码
    if admin_login_result.get('data', {}).get('need_reset_password'):
        print('管理员首次登录，需要重置密码...')
        # 重置管理员密码
        reset_password_url = f'{base_url}/auth/reset-password'
        reset_password_data = {
            'username': 'admin',
            'new_password': 'Admin@123456',
            'confirm_password': 'Admin@123456'
        }
        
        reset_password_response = requests.post(reset_password_url, json=reset_password_data)
        if reset_password_response.status_code != 200:
            print(f'重置管理员密码失败: {reset_password_response.text}')
            return False
        
        print('管理员密码重置成功，重新登录...')
        # 使用新密码重新登录
        admin_login_data = {
            'username': 'admin',
            'password': 'Admin@123456'
        }
        
        admin_login_response = requests.post(login_url, json=admin_login_data)
        if admin_login_response.status_code != 200:
            print(f'管理员重新登录失败: {admin_login_response.text}')
            return False
        
        admin_token = admin_login_response.json()['data']['token']
        print(f'管理员重新登录成功，token: {admin_token[:20]}...')
    else:
        # 不需要重置密码，直接获取token
        admin_token = admin_login_result['data']['token']
        print(f'管理员登录成功，token: {admin_token[:20]}...')
    
    # 创建测试用户
    print('\n2. 创建测试用户...')
    create_user_url = f'{base_url}/users'
    headers = {
        'Authorization': f'Bearer {admin_token}'
    }
    create_user_data = {
        'username': test_user['username'],
        'password': test_user['password'],
        'role': 'member'
    }
    
    create_user_response = requests.post(create_user_url, json=create_user_data, headers=headers)
    if create_user_response.status_code != 200:
        print(f'创建测试用户失败: {create_user_response.text}')
        return False
    
    print(f'创建测试用户 {test_user["username"]} 成功')
    
    # 测试用户首次登录
    print('\n3. 测试用户首次登录...')
    test_login_data = {
        'username': test_user['username'],
        'password': test_user['password']
    }
    
    test_login_response = requests.post(login_url, json=test_login_data)
    if test_login_response.status_code != 200:
        print(f'测试用户登录失败: {test_login_response.text}')
        return False
    
    test_login_result = test_login_response.json()
    if test_login_result.get('data', {}).get('need_reset_password'):
        print('测试用户首次登录成功，收到需要重置密码的提示')
    else:
        print('测试用户首次登录成功，但未收到需要重置密码的提示，测试失败')
        return False
    
    # 重置密码
    print('\n4. 重置密码...')
    reset_password_url = f'{base_url}/auth/reset-password'
    reset_password_data = {
        'username': test_user['username'],
        'new_password': test_user['new_password'],
        'confirm_password': test_user['confirm_password']
    }
    
    reset_password_response = requests.post(reset_password_url, json=reset_password_data)
    if reset_password_response.status_code != 200:
        print(f'重置密码失败: {reset_password_response.text}')
        return False
    
    print('密码重置成功')
    
    # 使用新密码登录
    print('\n5. 使用新密码登录...')
    new_login_data = {
        'username': test_user['username'],
        'password': test_user['new_password']
    }
    
    new_login_response = requests.post(login_url, json=new_login_data)
    if new_login_response.status_code != 200:
        print(f'使用新密码登录失败: {new_login_response.text}')
        return False
    
    new_login_result = new_login_response.json()
    if 'token' in new_login_result.get('data', {}):
        print('使用新密码登录成功，获取到token，测试通过！')
        return True
    else:
        print('使用新密码登录成功，但未获取到token，测试失败')
        return False

if __name__ == '__main__':
    print('测试强制密码重置功能...')
    success = test_force_password_reset()
    if success:
        print('\n所有测试都通过了！强制密码重置功能正常工作。')
    else:
        print('\n测试失败，请检查代码。')