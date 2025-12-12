import os
import sys

# 复制get_app_root函数的实现
def get_app_root():
    if hasattr(sys, '_MEIPASS'):
        # PyInstaller打包后的环境
        return sys._MEIPASS
    else:
        # 开发环境
        return os.path.dirname(os.path.abspath(__file__))

# 打印当前目录结构
print(f'当前工作目录: {os.getcwd()}')
print(f'get_app_root()返回: {get_app_root()}')

# 构建数据库路径
db_path = os.path.join(get_app_root(), 'instance', 'inventory.db')
print(f'数据库路径: {db_path}')
print(f'数据库文件是否存在: {os.path.exists(db_path)}')

# 打印instance目录下的文件
instance_dir = os.path.join(get_app_root(), 'instance')
if os.path.exists(instance_dir):
    print(f'instance目录下的文件: {os.listdir(instance_dir)}')
else:
    print(f'instance目录不存在')

# 打印backend目录下的结构
backend_dir = get_app_root()
print(f'backend目录结构: {os.listdir(backend_dir)}')
