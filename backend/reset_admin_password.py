from app import app, db, User
from werkzeug.security import generate_password_hash

# 重置管理员密码为默认密码
def reset_admin_password():
    with app.app_context():
        # 查找管理员用户
        admin_user = User.query.filter_by(username='admin').first()
        if admin_user:
            # 重置密码为默认密码
            admin_user.password = generate_password_hash('admin123')
            admin_user.first_login = False  # 设置为非首次登录，允许直接登录
            db.session.commit()
            print('管理员密码已重置为默认密码: admin123，可直接登录')
        else:
            print('未找到管理员用户')

if __name__ == '__main__':
    reset_admin_password()