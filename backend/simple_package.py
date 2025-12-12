import os
import shutil
import sys

# 确保当前目录是backend
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=== 简单打包脚本 ===")
print(f"当前Python版本: {sys.version}")
print(f"当前工作目录: {os.getcwd()}")

# 检查PyInstaller是否可以导入
try:
    import PyInstaller
    print(f"成功导入PyInstaller, 版本: {PyInstaller.__version__}")
except ImportError as e:
    print(f"无法导入PyInstaller: {e}")
    print("尝试重新安装PyInstaller...")
    import subprocess
    subprocess.run([sys.executable, '-m', 'pip', 'install', '--upgrade', '--force-reinstall', 'pyinstaller'], check=True)
    # 尝试再次导入
    import PyInstaller
    print(f"成功导入PyInstaller, 版本: {PyInstaller.__version__}")

# 复制前端静态文件
print("\n复制前端静态文件...")
frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend/dist')
backend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend_dist')

# 创建目录
os.makedirs(backend_dist, exist_ok=True)
os.makedirs(os.path.join(backend_dist, 'assets'), exist_ok=True)

# 复制文件
shutil.copy2(os.path.join(frontend_dist, 'index.html'), backend_dist)
for file in os.listdir(os.path.join(frontend_dist, 'assets')):
    shutil.copy2(os.path.join(frontend_dist, 'assets', file), os.path.join(backend_dist, 'assets'))
print("前端静态文件复制完成")

# 修改app.py文件，使用正确的静态文件路径
print("\n修改app.py文件...")
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = content.replace(
    "app.config['FRONTEND_DIST'] = os.path.join(app.root_path, '../frontend/dist')",
    "app.config['FRONTEND_DIST'] = os.path.join(app.root_path, 'frontend_dist')"
)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("app.py文件修改完成")

# 使用PyInstaller API打包
print("\n使用PyInstaller API打包...")
from PyInstaller import __main__ as pyi_main

# 构建PyInstaller命令参数
pyi_args = [
    '--onefile',
    '--name', 'InventoryManagementSystem',
    '--add-data', f'frontend_dist{os.pathsep}frontend_dist',
    '--add-data', f'instance{os.pathsep}instance',
    '--console',
    '--paths', '.',
    '--hidden-import', 'app',
    'main.py'
]

print(f"PyInstaller参数: {pyi_args}")

# 执行打包
pyi_main.run(pyi_args)

print("\n打包完成!")
print(f"可执行文件位置: {os.path.join('dist', 'InventoryManagementSystem.exe')}")

# 恢复app.py文件
print("\n恢复app.py文件...")
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("app.py文件恢复完成")

# 清理临时文件
print("\n清理临时文件...")
if os.path.exists(backend_dist):
    shutil.rmtree(backend_dist)
print("临时文件清理完成")

print("\n=== 打包脚本执行完毕 ===")
