import requests

# 测试当前登录情况
def test_current_login():
    login_url = 'http://localhost:5000/api/v1/auth/login'
    
    # 测试默认管理员密码
    admin_login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    print('测试默认管理员密码...')
    response = requests.post(login_url, json=admin_login_data)
    print(f'状态码: {response.status_code}')
    print(f'响应内容: {response.text}')
    
    # 测试可能的新密码
    admin_login_data['password'] = 'Admin@123456'
    print('\n测试可能的新密码...')
    response = requests.post(login_url, json=admin_login_data)
    print(f'状态码: {response.status_code}')
    print(f'响应内容: {response.text}')

if __name__ == '__main__':
    test_current_login()