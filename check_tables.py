import sqlite3
import json

# 连接到数据库
conn = sqlite3.connect('c:\\Users\\zA\\OneDrive\\lyf\\sarfm_demo\\instance\\inventory.db')
cursor = conn.cursor()

# 查询所有表格
cursor.execute("SELECT * FROM table_structure")
tables = cursor.fetchall()

print(f"找到 {len(tables)} 个表格：")
for table in tables:
    print(f"ID: {table[0]}, 名称: {table[1]}")
    columns = json.loads(table[2])
    print(f"  列定义: {[col['column_name'] for col in columns]}")
    # 检查是否包含dropDown属性
    for col in columns:
        if 'dropDown' in col:
            print(f"  {col['column_name']} - dropDown: {col['dropDown']}")

# 查询用户表，确认默认用户存在
cursor.execute("SELECT * FROM user")
users = cursor.fetchall()
print(f"\n找到 {len(users)} 个用户：")
for user in users:
    print(f"ID: {user[0]}, 用户名: {user[1]}, 角色: {user[2]}")

# 关闭连接
conn.close()