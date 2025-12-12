from app import app, db, User
from werkzeug.security import generate_password_hash

with app.app_context():
    users = User.query.all()
    print('重置前的用户列表:')
    for user in users:
        print(f'用户名: {user.username}, 角色: {user.role}')
    
    print('\n重置密码...')
    
    for user in users:
        # 根据角色设置不同的默认密码
        if user.role == 'admin':
            new_password = 'admin123'
        elif user.role == 'leader':
            new_password = 'leader123'
        else:  # member
            new_password = 'member123'
        
        user.password = generate_password_hash(new_password)
        print(f'用户名: {user.username}, 新密码: {new_password}')
    
    db.session.commit()
    print('\n密码重置完成!')
