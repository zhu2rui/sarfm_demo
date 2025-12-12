from app import app, db, User
from werkzeug.security import generate_password_hash, check_password_hash

with app.app_context():
    users = User.query.all()
    print('当前系统用户列表:')
    for user in users:
        print(f'用户名: {user.username}, 角色: {user.role}')
        # 测试密码是否正确
        test_passwords = ['admin123', 'leader123', 'member123']
        for pwd in test_passwords:
            if check_password_hash(user.password, pwd):
                print(f'  正确密码: {pwd}')
        print()
