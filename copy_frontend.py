import os
import shutil

def copy_frontend_files():
    # 源目录：前端构建输出目录
    src_dir = "C:/Users/zA/OneDrive/lyf/sarfm_demo/frontend/dist"
    # 目标目录：后端静态文件目录
    dest_dir = "C:/Users/zA/OneDrive/lyf/sarfm_demo/backend/frontend_dist"
    
    print(f"正在复制前端构建文件从 {src_dir} 到 {dest_dir}...")
    
    # 确保目标目录存在
    os.makedirs(dest_dir, exist_ok=True)
    
    # 复制所有文件和子目录
    if os.path.exists(src_dir):
        for item in os.listdir(src_dir):
            src_item = os.path.join(src_dir, item)
            dest_item = os.path.join(dest_dir, item)
            
            if os.path.isdir(src_item):
                # 递归复制目录
                shutil.copytree(src_item, dest_item, dirs_exist_ok=True)
                print(f"已复制目录: {item}")
            else:
                # 复制文件
                shutil.copy2(src_item, dest_item)
                print(f"已复制文件: {item}")
        
        print("前端文件复制完成！")
    else:
        print(f"错误：源目录 {src_dir} 不存在")

if __name__ == "__main__":
    copy_frontend_files()
