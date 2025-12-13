import sys
import traceback

# 设置UTF-8编码
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

try:
    # 导入并运行app.py
    import app
    print("App imported successfully!")
except Exception as e:
    print(f"Error occurred: {type(e).__name__}: {e}")
    print("Traceback:")
    traceback.print_exc()
