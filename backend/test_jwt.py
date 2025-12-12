import jwt
print(f'PyJWT版本: {jwt.__version__}')
print(f'JWT模块路径: {jwt.__file__}')
print(f'JWT模块所有属性: {jwt.__all__}')

# 测试不同的导入方式
try:
    print('\n尝试从jwt导入JWT类:')
    from jwt import JWT
    print('成功导入JWT类')
except Exception as e:
    print(f'导入失败: {e}')

try:
    print('\n尝试从jwt导入encode函数:')
    from jwt import encode
    print('成功导入encode函数')
except Exception as e:
    print(f'导入失败: {e}')

try:
    print('\n尝试从jwt导入decode函数:')
    from jwt import decode
    print('成功导入decode函数')
except Exception as e:
    print(f'导入失败: {e}')

try:
    print('\n尝试使用jwt.encode:')
    token = jwt.encode({'test': 'data'}, 'secret', algorithm='HS256')
    print(f'成功生成token: {token}')
except Exception as e:
    print(f'生成token失败: {e}')
    import traceback
    traceback.print_exc()
