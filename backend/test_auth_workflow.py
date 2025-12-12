import requests
import time

# 配置测试参数
base_url = 'http://127.0.0.1:5000/api/v1'
login_url = f'{base_url}/auth/login'
reset_password_url = f'{base_url}/auth/reset-password'
users_url = f'{base_url}/users'

test_user = {
    'username': 'testuser' + str(int(time.time())),  # 确保用户名唯一
    'password': None,  # 测试默认密码
    'role': 'member'
}

# 测试步骤：
print("===== 用户认证工作流测试 =====\n")

# 1. 管理员登录获取token
print("1. 管理员登录...")
admin_login_data = {
    'username': 'admin',
    'password': 'admin123'
}

admin_login_response = requests.post(login_url, json=admin_login_data)
if admin_login_response.status_code != 200:
    print(f"管理员登录失败: {admin_login_response.text}")
    exit()

admin_token = admin_login_response.json()['data']['token']
print(f"管理员登录成功，token: {admin_token[:20]}...\n")

# 2. 创建测试用户
print("2. 创建测试用户...")
headers = {
    'Authorization': f'Bearer {admin_token}'
}

create_user_data = {
    'username': test_user['username'],
    'role': test_user['role']
    # 不提供密码，应该使用默认密码"000000"
}

create_user_response = requests.post(users_url, json=create_user_data, headers=headers)
if create_user_response.status_code != 200:
    print(f"创建测试用户失败: {create_user_response.text}")
    exit()

print(f"测试用户创建成功: {test_user['username']}\n")

# 3. 使用默认密码登录测试用户
print("3. 使用默认密码 '000000' 登录测试用户...")
test_user_login_data = {
    'username': test_user['username'],
    'password': '000000'
}

login_response = requests.post(login_url, json=test_user_login_data)
if login_response.status_code != 200:
    print(f"登录失败: {login_response.text}")
    exit()

login_data = login_response.json()
if login_data.get('data', {}).get('need_reset_password'):
    print(f"登录成功，但需要重置密码: {login_data['message']}\n")
else:
    print("登录成功，但系统未要求重置密码，测试失败！")
    exit()

# 4. 尝试使用弱密码重置（应该失败）
print("4. 尝试使用弱密码重置（应该失败）...")
weak_password_data = {
    'username': test_user['username'],
    'new_password': 'weakpwd',
    'confirm_password': 'weakpwd'
}

weak_reset_response = requests.post(reset_password_url, json=weak_password_data)
if weak_reset_response.status_code == 400:
    print(f"预期的密码验证失败: {weak_reset_response.json()['message']}\n")
else:
    print(f"弱密码验证未生效，测试失败: {weak_reset_response.text}")
    exit()

# 5. 尝试使用默认密码作为新密码（应该失败）
print("5. 尝试使用默认密码作为新密码（应该失败）...")
default_password_data = {
    'username': test_user['username'],
    'new_password': '000000',
    'confirm_password': '000000'
}

default_reset_response = requests.post(reset_password_url, json=default_password_data)
if default_reset_response.status_code == 400:
    print(f"预期的密码验证失败: {default_reset_response.json()['message']}\n")
else:
    print(f"默认密码验证未生效，测试失败: {default_reset_response.text}")
    exit()

# 6. 使用强密码重置
print("6. 使用强密码重置...")
strong_password = "Test@123456"
strong_password_data = {
    'username': test_user['username'],
    'new_password': strong_password,
    'confirm_password': strong_password
}

strong_reset_response = requests.post(reset_password_url, json=strong_password_data)
if strong_reset_response.status_code != 200:
    print(f"密码重置失败: {strong_reset_response.text}")
    exit()

print(f"密码重置成功: {strong_reset_response.json()['message']}\n")

# 7. 使用新密码登录
print("7. 使用新密码登录...")
new_password_login_data = {
    'username': test_user['username'],
    'password': strong_password
}

new_login_response = requests.post(login_url, json=new_password_login_data)
if new_login_response.status_code != 200:
    print(f"使用新密码登录失败: {new_login_response.text}")
    exit()

if 'token' in new_login_response.json()['data']:
    print("使用新密码登录成功！\n")
else:
    print(f"登录成功但未获取到token: {new_login_response.text}")
    exit()

# 8. 尝试使用旧密码登录
print("8. 尝试使用旧密码 '000000' 登录...")
old_password_login_data = {
    'username': test_user['username'],
    'password': '000000'
}

old_login_response = requests.post(login_url, json=old_password_login_data)
if old_login_response.status_code == 401:
    print("旧密码登录失败，符合预期！\n")
else:
    print(f"旧密码仍然可以登录，测试失败: {old_login_response.text}")
    exit()

print("===== 测试完成 =====")
print("所有测试步骤均已通过！")
print(f"测试用户: {test_user['username']}")
print(f"默认密码: 000000")
print(f"新密码: {strong_password}")
