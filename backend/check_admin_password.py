import os
import sys

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入Flask应用和模型
from app import app, db, User
from werkzeug.security import generate_password_hash, check_password_hash

# 检查并重置管理员密码
def check_admin_password():
    with app.app_context():
        print("开始检查管理员密码")
        
        # 查找管理员用户
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            print("管理员用户不存在，正在创建...")
            admin_user = User(
                username='admin',
                password=generate_password_hash('admin123'),
                role='admin'
            )
            db.session.add(admin_user)
            db.session.commit()
            print("成功创建管理员用户，密码: admin123")
        else:
            print(f"找到管理员用户，ID: {admin_user.id}")
            
            # 验证默认密码是否正确
            default_password_correct = check_password_hash(admin_user.password, 'admin123')
            print(f"默认密码 (admin123) 是否正确: {default_password_correct}")
            
            # 验证空密码是否正确
            empty_password_correct = check_password_hash(admin_user.password, '')
            print(f"空密码是否正确: {empty_password_correct}")
            
            # 如果默认密码不正确，重置密码
            if not default_password_correct and not empty_password_correct:
                print("正在重置管理员密码为: admin123")
                admin_user.password = generate_password_hash('admin123')
                db.session.commit()
                print("成功重置管理员密码")

if __name__ == '__main__':
    check_admin_password()
