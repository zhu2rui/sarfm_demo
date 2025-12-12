import requests
import json

# 测试新用户000000登录后重置密码
def test_new_user_reset():
    # 基础URL
    base_url = 'http://localhost:5000/api/v1'
    
    # 测试用户信息
    test_user = {
        'username': 'test_new_user',
        'initial_password': '000000',  # 初始密码为默认密码000000
        'new_password': 'Test@123456',  # 新密码
        'confirm_password': 'Test@123456'  # 确认新密码
    }
    
    print('=' * 60)
    print('开始测试新用户密码重置流程')
    print('=' * 60)
    
    # 1. 管理员登录
    print('\n1. 管理员登录...')
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
    
    # 2. 创建测试用户，初始密码设为000000
    print('\n2. 创建测试用户...')
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
    
    print(f'创建测试用户 {test_user["username"]} 成功，初始密码: {test_user["initial_password"]}')
    
    # 3. 新用户首次登录，应该提示需要重置密码
    print('\n3. 新用户首次登录...')
    login_data = {
        'username': test_user['username'],
        'password': test_user['initial_password']
    }
    
    login_response = requests.post(login_url, json=login_data)
    print(f'登录状态码: {login_response.status_code}')
    print(f'登录响应: {login_response.text}')
    
    login_result = login_response.json()
    
    if login_result.get('data', {}).get('need_reset_password'):
        print('登录成功，收到需要重置密码的提示')
        
        # 4. 执行密码重置
        print('\n4. 执行密码重置...')
        reset_password_url = f'{base_url}/auth/reset-password'
        reset_password_data = {
            'username': test_user['username'],
            'new_password': test_user['new_password'],
            'confirm_password': test_user['confirm_password']
        }
        
        print(f'重置密码请求: {reset_password_data}')
        reset_response = requests.post(reset_password_url, json=reset_password_data)
        print(f'密码重置状态码: {reset_response.status_code}')
        print(f'密码重置响应: {reset_response.text}')
        
        if reset_response.status_code == 200:
            print('密码重置成功！')
            
            # 5. 使用新密码登录
            print('\n5. 使用新密码登录...')
            new_login_data = {
                'username': test_user['username'],
                'password': test_user['new_password']
            }
            
            new_login_response = requests.post(login_url, json=new_login_data)
            print(f'新密码登录状态码: {new_login_response.status_code}')
            print(f'新密码登录响应: {new_login_response.text}')
            
            if new_login_response.status_code == 200:
                print('新密码登录成功！测试通过！')
            else:
                print('新密码登录失败！')
        else:
            print('密码重置失败！请查看服务器日志获取详细错误信息')
    else:
        print('登录成功，但未收到需要重置密码的提示')
    
    print('\n' + '=' * 60)
    print('测试完成，请查看服务器控制台日志获取详细调试信息')
    print('=' * 60)

if __name__ == '__main__':
    test_new_user_reset()