import os
import shutil
import subprocess
import sys
import time

def safe_remove_directory(path):
    """安全删除目录，带有重试机制"""
    if not os.path.exists(path):
        return True
    
    print(f"尝试删除目录: {path}")
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            shutil.rmtree(path)
            print(f"成功删除目录: {path}")
            return True
        except Exception as e:
            print(f"删除目录失败 (尝试 {attempt + 1}/{max_attempts}): {e}")
            if attempt < max_attempts - 1:
                print("等待1秒后重试...")
                time.sleep(1)
    
    # 如果删除失败，尝试重命名目录
    try:
        new_path = path + "_old_" + str(int(time.time()))
        os.rename(path, new_path)
        print(f"无法删除目录，已重命名为: {new_path}")
        return True
    except Exception as e:
        print(f"重命名目录失败: {e}")
        return False

def main():
    # 设置路径
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(backend_dir, "dist")
    app_dir = os.path.join(dist_dir, "InventoryManagementSystem")
    spec_file = os.path.join(backend_dir, "InventoryManagementSystem.spec")
    frontend_dist_src = os.path.join(backend_dir, "frontend_dist")
    frontend_dist_dest = os.path.join(app_dir, "frontend_dist")
    instance_src = os.path.join(backend_dir, "instance")
    instance_dest = os.path.join(app_dir, "instance")
    
    # 安全删除可能导致问题的目录
    print("安全删除可能导致问题的目录...")
    # 先删除旧的spec文件
    if os.path.exists(spec_file):
        try:
            os.remove(spec_file)
            print("已删除旧的spec文件")
        except Exception as e:
            print(f"删除旧的spec文件失败: {e}")
    
    # 删除或重命名旧的应用程序目录
    safe_remove_directory(app_dir)
    
    # 使用PyInstaller构建应用程序（不使用-y参数，避免自动清理）
    print("使用PyInstaller构建应用程序...")
    result = subprocess.run([sys.executable, "-m", "PyInstaller", "--name=InventoryManagementSystem", "--collect-all", "app", "main.py"], 
                           cwd=backend_dir, capture_output=True, text=True)
    
    if result.returncode != 0:
        print("构建失败:")
        print(result.stderr)
        return False
    
    print("构建成功!")
    
    # 手动复制frontend_dist目录
    print(f"复制frontend_dist目录: {frontend_dist_src} -> {frontend_dist_dest}")
    if os.path.exists(frontend_dist_src):
        # 如果目标目录已存在，先删除
        if os.path.exists(frontend_dist_dest):
            try:
                shutil.rmtree(frontend_dist_dest)
            except Exception as e:
                print(f"删除旧的frontend_dist目录失败: {e}")
        # 复制新的目录
        try:
            shutil.copytree(frontend_dist_src, frontend_dist_dest)
            print("frontend_dist目录复制成功!")
        except Exception as e:
            print(f"复制frontend_dist目录失败: {e}")
    else:
        print("警告: frontend_dist目录不存在!")
    
    # 手动复制instance目录
    print(f"复制instance目录: {instance_src} -> {instance_dest}")
    if os.path.exists(instance_src):
        # 如果目标目录已存在，先删除
        if os.path.exists(instance_dest):
            try:
                shutil.rmtree(instance_dest)
            except Exception as e:
                print(f"删除旧的instance目录失败: {e}")
        # 复制新的目录
        try:
            shutil.copytree(instance_src, instance_dest)
            print("instance目录复制成功!")
        except Exception as e:
            print(f"复制instance目录失败: {e}")
    else:
        print("警告: instance目录不存在!")
    
    # 验证构建结果
    print("验证构建结果...")
    exe_path = os.path.join(app_dir, "InventoryManagementSystem.exe")
    if os.path.exists(exe_path):
        print(f"可执行文件存在: {exe_path}")
    else:
        print("错误: 可执行文件不存在!")
        return False
    
    # 验证frontend_dist和instance目录是否复制成功
    if os.path.exists(frontend_dist_dest):
        print(f"frontend_dist目录存在: {frontend_dist_dest}")
    else:
        print(f"错误: frontend_dist目录不存在: {frontend_dist_dest}")
        return False
    
    if os.path.exists(instance_dest):
        print(f"instance目录存在: {instance_dest}")
    else:
        print(f"错误: instance目录不存在: {instance_dest}")
        return False
    
    print("构建和复制完成!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
