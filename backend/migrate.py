# 数据库迁移脚本
from app import app, db, AutoIncrementSequence

with app.app_context():
    print("开始数据库迁移...")
    # 创建所有表（包括新添加的AutoIncrementSequence表）
    db.create_all()
    print("数据库迁移完成！")
