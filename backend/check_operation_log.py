from app import app, db, OperationLog

# 检查OperationLog表和创建记录
def check_operation_log():
    with app.app_context():
        # 检查OperationLog表是否存在
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print(f'数据库中的表: {tables}')
        
        if 'operation_log' not in tables:
            print('OperationLog表不存在，需要创建')
            # 创建所有表
            db.create_all()
            print('表创建成功')
        else:
            print('OperationLog表已存在')
            
            # 检查表结构
            columns = inspector.get_columns('operation_log')
            print('表结构:')
            for column in columns:
                print(f'  {column["name"]}: {column["type"]}, nullable={column["nullable"]}')
            
            # 尝试创建一条记录
            print('尝试创建一条OperationLog记录...')
            try:
                # 假设用户ID为1的用户存在
                log = OperationLog(
                    user_id=1,
                    operation='测试操作'
                )
                db.session.add(log)
                db.session.commit()
                print('记录创建成功')
                
                # 查询所有记录
                logs = OperationLog.query.all()
                print(f'当前记录数量: {len(logs)}')
                for log in logs[-5:]:  # 只显示最近5条
                    print(f'  ID: {log.id}, 用户ID: {log.user_id}, 操作: {log.operation}, 创建时间: {log.created_at}')
            except Exception as e:
                db.session.rollback()
                print(f'创建记录失败: {str(e)}')
                import traceback
                traceback.print_exc()

if __name__ == '__main__':
    check_operation_log()