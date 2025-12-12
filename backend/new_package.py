import os
import shutil
import subprocess
import sys

# 确保当前目录是backend
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=== 新打包脚本 ===")
print(f"当前Python版本: {sys.version}")
print(f"当前工作目录: {os.getcwd()}")

# 安装依赖
print("\n检查并安装依赖...")
subprocess.run([sys.executable, '-m', 'pip', 'install', '--upgrade', 'pyinstaller', 'flask', 'flask-cors', 'flask-sqlalchemy', 'python-dotenv', 'jwt'], check=True)

# 清理旧文件
print("\n清理旧文件...")
if os.path.exists('dist'):
    shutil.rmtree('dist')
if os.path.exists('build'):
    shutil.rmtree('build')
if os.path.exists('InventoryManagementSystem.spec'):
    os.remove('InventoryManagementSystem.spec')

# 确保前端文件存在
print("\n检查前端文件...")
frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../frontend/dist')
backend_frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend_dist')

if not os.path.exists(frontend_dist):
    print("前端dist目录不存在，请先构建前端项目")
    sys.exit(1)

# 复制前端文件
print("复制前端文件...")
os.makedirs(backend_frontend_dist, exist_ok=True)
for root, dirs, files in os.walk(frontend_dist):
    for file in files:
        src = os.path.join(root, file)
        rel_path = os.path.relpath(src, frontend_dist)
        dst = os.path.join(backend_frontend_dist, rel_path)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
print("前端文件复制完成")

# 修改app.py文件
print("\n修改app.py文件...")
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 确保有编码声明
if not content.startswith('# -*- coding:'):
    content = '# -*- coding: utf-8 -*-' + '\n' + content

# 修改静态文件路径
new_content = content.replace(
    "app.config['FRONTEND_DIST'] = os.path.join(app.root_path, '../frontend/dist')",
    "app.config['FRONTEND_DIST'] = os.path.join(app.root_path, 'frontend_dist')"
)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("app.py文件修改完成")

# 创建spec文件
print("\n创建spec文件...")
# 使用正斜杠代替反斜杠，避免转义问题
current_path = os.getcwd().replace('\\', '/')

spec_content = """# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=['%s'],
    binaries=[],
    datas=[('frontend_dist', 'frontend_dist'), ('instance', 'instance')],
    hiddenimports=['app', 'flask', 'flask_cors', 'flask_sqlalchemy', 'dotenv', 'jwt'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='InventoryManagementSystem',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
""" % current_path

with open('InventoryManagementSystem.spec', 'w', encoding='utf-8') as f:
    f.write(spec_content)
print("spec文件创建完成")

# 使用spec文件打包
print("\n使用spec文件打包...")
subprocess.run([sys.executable, '-m', 'PyInstaller', 'InventoryManagementSystem.spec'], check=True)

print("\n打包完成!")
print(f"可执行文件位置: {os.path.join('dist', 'InventoryManagementSystem.exe')}")
