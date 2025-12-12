import PyInstaller.__main__
import os
import shutil

# 清理旧的构建文件
for folder in ['build', 'dist']:
    if os.path.exists(folder):
        shutil.rmtree(folder)

# 清理旧的spec文件
for file in os.listdir('.'):
    if file.endswith('.spec'):
        os.remove(file)

# 使用PyInstaller API打包应用
PyInstaller.__main__.run([
    '--onefile',
    '--name=InventoryManagementSystem',
    '--add-data=frontend_dist;frontend_dist',
    '--add-data=instance;instance',
    '--hidden-import=app',
    '--hidden-import=flask',
    '--hidden-import=flask_cors',
    '--hidden-import=flask_sqlalchemy',
    '--hidden-import=dotenv',
    '--hidden-import=jwt',
    '--hidden-import=werkzeug',
    '--hidden-import=sqlalchemy',
    'main.py'
])

# 检查是否生成了可执行文件
if os.path.exists('dist/InventoryManagementSystem.exe'):
    print("\n✅ 打包成功！可执行文件已生成在 dist/InventoryManagementSystem.exe")
    print(f"文件大小: {os.path.getsize('dist/InventoryManagementSystem.exe')} 字节")
else:
    print("\n❌ 打包失败！未生成可执行文件")
    if os.path.exists('pyi.log'):
        print("\n查看日志文件: pyi.log")
