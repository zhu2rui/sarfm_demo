from app import app
import os

def main():
    """主入口函数"""
    print("=== 实验室多端Web库存管理系统 ===")
    print("系统正在启动...")
    print("数据库文件路径:", os.path.join(app.root_path, 'instance', 'inventory.db'))
    print("访问地址: http://localhost:5000")
    print("按 Ctrl+C 停止服务")
    print("\n系统已启动，正在监听请求...")
    
    # 启动Flask应用
    app.run(debug=False, host='0.0.0.0', port=5000)

if __name__ == '__main__':
    main()
