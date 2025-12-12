import requests
import json

# 测试密码重置功能的各种情况
def test_reset_password_comprehensive():
    # 基础URL
    base_url = 'http://localhost:5000/api/v1'
    
    # 测试用户信息
    test_user = {
        'username': 'test_reset_comprehensive',
        'initial_password': '',  # 初始密码为空
        'role': 'member'
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
        'role': test_user['role']
    }
    
    create_user_response = requests.post(create_user_url, json=create_user_data, headers=headers)
    if create_user_response.status_code != 200:
        print(f'创建测试用户失败: {create_user_response.text}')
        return
    
    print(f'创建测试用户 {test_user["username"]} 成功')
    
    # 密码重置URL
    reset_password_url = f'{base_url}/auth/reset-password'
    
    # 测试用例列表
    test_cases = [
        {
            'name': '正常情况 - 强密码',
            'new_password': 'Test@123456',
            'confirm_password': 'Test@123456',
            'expected_status': 200
        },
        {
            'name': '密码不一致',
            'new_password': 'Test@123456',
            'confirm_password': 'Test@654321',
            'expected_status': 400
        },
        {
            'name': '密码长度不足',
            'new_password': 'Test@123',
            'confirm_password': 'Test@123',
            'expected_status': 400
        },
        {
            'name': '缺少大写字母',
            'new_password': 'test@123456',
            'confirm_password': 'test@123456',
            'expected_status': 400
        },
        {
            'name': '缺少小写字母',
            'new_password': 'TEST@123456',
            'confirm_password': 'TEST@123456',
            'expected_status': 400
        },
        {
            'name': '缺少数字',
            'new_password': 'Test@abcdef',
            'confirm_password': 'Test@abcdef',
            'expected_status': 400
        },
        {
            'name': '缺少特殊字符',
            'new_password': 'Test123456',
            'confirm_password': 'Test123456',
            'expected_status': 400
        },
        {
            'name': '默认密码',
            'new_password': '000000',
            'confirm_password': '000000',
            'expected_status': 400
        },
        {
            'name': '使用其他特殊字符',
            'new_password': 'Test!123456',
            'confirm_password': 'Test!123456',
            'expected_status': 200
        },
        {
            'name': '用户名不存在',
            'new_password': 'Test@123456',
            'confirm_password': 'Test@123456',
            'username': 'non_existent_user',
            'expected_status': 404
        }
    ]
    
    # 运行所有测试用例
    for test_case in test_cases:
        print(f'\n=== 测试: {test_case["name"]} ===')
        
        # 使用测试用例中的用户名，如果没有则使用默认的测试用户名
        username = test_case.get('username', test_user['username'])
        
        # 构造密码重置请求
        reset_password_data = {
            'username': username,
            'new_password': test_case['new_password'],
            'confirm_password': test_case['confirm_password']
        }
        
        # 发送请求
        try:
            response = requests.post(reset_password_url, json=reset_password_data)
            print(f'状态码: {response.status_code}')
            print(f'预期状态码: {test_case["expected_status"]}')
            print(f'响应内容: {response.text}')
            
            # 检查结果
            if response.status_code == test_case['expected_status']:
                print(f'测试通过: {test_case["name"]}')
            else:
                print(f'测试失败: {test_case["name"]}')
        except Exception as e:
            print(f'测试过程中发生错误: {str(e)}')
    
    # 最后测试一个成功的情况，确保用户可以正常登录
    print(f'\n=== 最终测试: 成功重置密码并登录 ===')
    
    # 成功重置密码
    reset_password_data = {
        'username': test_user['username'],
        'new_password': 'Test@123456',
        'confirm_password': 'Test@123456'
    }
    
    response = requests.post(reset_password_url, json=reset_password_data)
    print(f'密码重置状态码: {response.status_code}')
    print(f'密码重置响应: {response.text}')
    
    if response.status_code == 200:
        # 验证新密码是否可以登录
        login_data = {
            'username': test_user['username'],
            'password': 'Test@123456'
        }
        
        login_response = requests.post(login_url, json=login_data)
        print(f'登录状态码: {login_response.status_code}')
        print(f'登录响应: {login_response.text}')
        
        if login_response.status_code == 200:
            print('最终测试通过: 密码重置成功并可以登录')
        else:
            print('最终测试失败: 密码重置成功但无法登录')
    else:
        print('最终测试失败: 密码重置失败')

if __name__ == '__main__':
    test_reset_password_comprehensive()