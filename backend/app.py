# -*- coding: utf-8 -*-
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
import sys
import jwt
import shutil
import threading
from datetime import datetime, timedelta
from jwt import decode as jwt_decode
from functools import wraps
import json
import codecs
import re

# 获取应用程序根目录（兼容PyInstaller打包）
def get_app_root():
    if hasattr(sys, '_MEIPASS'):
        # PyInstaller打包后的环境
        return sys._MEIPASS
    else:
        # 开发环境
        return os.path.dirname(os.path.abspath(__file__))

# 加载环境变量
load_dotenv()

# 创建Flask应用
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# 设置JWT密钥
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key')

# 配置数据库
import os
from sqlalchemy.engine import Engine
from sqlalchemy import event

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(get_app_root(), 'instance', 'inventory.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'connect_args': {'timeout': 30}
}

# 初始化数据库实例
db = SQLAlchemy(app)

# 启用SQLite外键级联检查
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# 创建instance目录（如果不存在）
os.makedirs(os.path.join(app.root_path, 'instance'), exist_ok=True)

# 设置静态文件目录
from flask import send_from_directory
import os
from sqlalchemy import or_

# 设置静态文件目录
frontend_dist_path = os.path.join(get_app_root(), '..', 'frontend', 'dist')
if os.path.exists(frontend_dist_path):
    app.config['FRONTEND_DIST'] = frontend_dist_path
else:
    app.config['FRONTEND_DIST'] = os.path.join(get_app_root(), 'frontend_dist')

# 确保JSON响应使用UTF-8编码
@app.after_request
def after_request(response):
    # 只对JSON响应设置Content-Type
    if 'application/json' in response.headers.get('Content-Type', ''):
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
    return response

# 提供前端静态文件
@app.route('/')
def serve_index():
    # 显式设置Content-Type为text/html
    from flask import make_response
    response = make_response(send_from_directory(app.config['FRONTEND_DIST'], 'index.html'))
    response.headers['Content-Type'] = 'text/html; charset=utf-8'
    return response

@app.route('/<path:path>')
def serve_static(path):
    # 根据文件扩展名设置正确的Content-Type
    from flask import make_response, send_from_directory, abort
    import mimetypes
    import os
    
    # 防止SPA通配路由吞掉不存在的API请求
    if path.startswith('api/') or path == 'api':
        return jsonify({'code': 404, 'message': 'API endpoint not found', 'data': None}), 404

    # 检查文件是否存在
    file_path = os.path.join(app.config['FRONTEND_DIST'], path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        # 获取文件的MIME类型
        mime_type, _ = mimetypes.guess_type(path)
        if not mime_type:
            mime_type = 'application/octet-stream'
        
        # 发送文件并设置正确的Content-Type
        response = make_response(send_from_directory(app.config['FRONTEND_DIST'], path))
        response.headers['Content-Type'] = f'{mime_type}; charset=utf-8'
        return response
    else:
        # SPA应用处理：所有未匹配的路由都返回index.html，让React Router处理
        response = make_response(send_from_directory(app.config['FRONTEND_DIST'], 'index.html'))
        response.headers['Content-Type'] = 'text/html; charset=utf-8'
        return response

# 用户模型
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # admin/leader/member
    first_login = db.Column(db.Boolean, default=True, nullable=False)  # 标记是否首次登录
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

# 表格结构模型
class TableStructure(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    table_name = db.Column(db.String(255), nullable=False)
    columns = db.Column(db.Text, nullable=False)  # JSON字符串格式: [{"column_name": "列名", "data_type": "数据类型"}...]
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

# 库存数据模型
class InventoryData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    table_id = db.Column(db.Integer, db.ForeignKey('table_structure.id'), nullable=False)
    data = db.Column(db.Text, nullable=False)  # JSON字符串格式: {"列名1": "值1", "列名2": "值2", ...}
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

# 操作日志模型
class OperationLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    operation = db.Column(db.String(255), nullable=False)
    table_id = db.Column(db.Integer, nullable=True)
    data_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.now())

# 自增序列模型
class AutoIncrementSequence(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    table_id = db.Column(db.Integer, db.ForeignKey('table_structure.id'), nullable=False)
    column_name = db.Column(db.String(255), nullable=False)
    current_value = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())
    
    # 唯一约束，确保每个表格的每列只有一个自增序列
    __table_args__ = (db.UniqueConstraint('table_id', 'column_name', name='_table_column_unique'),)

# Bug反馈模型
class BugReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    reporter_username = db.Column(db.String(50), nullable=False)
    is_resolved = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

# 液氮罐模型
class NitrogenTank(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

# 冻存盒模型
class CryoBox(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tank_id = db.Column(db.Integer, db.ForeignKey('nitrogen_tank.id'), nullable=False)
    box_name = db.Column(db.String(255), nullable=False)
    box_description = db.Column(db.Text, default='')
    columns = db.Column(db.Text, nullable=False)  # JSON格式字段定义
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

# 冻存位置模型
class CryoCell(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    box_id = db.Column(db.Integer, db.ForeignKey('cryo_box.id'), nullable=False)
    row = db.Column(db.Integer, nullable=False)  # 1-9 (对应 A-I)
    col = db.Column(db.Integer, nullable=False)  # 1-9
    data = db.Column(db.Text, nullable=False)  # JSON格式: {"字段名": "值", ...}
    linked_table_id = db.Column(db.Integer, nullable=True)  # 关联的表格ID（通过存储列关联）
    linked_data_id = db.Column(db.Integer, nullable=True)   # 关联的数据行ID
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    __table_args__ = (db.UniqueConstraint('box_id', 'row', 'col', name='_box_row_col_unique'),)

# JWT认证装饰器
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # 从请求头获取token
        auth_header = request.headers.get('Authorization', '').strip()
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
            elif len(parts) == 1:
                token = parts[0]
        
        if not token:
            return jsonify({'code': 401, 'message': 'Token is missing or invalid format!', 'data': None}), 401
        
        try:
            # 解码token
            data = jwt_decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.filter_by(id=data['user_id']).first()
            if not current_user:
                return jsonify({'code': 401, 'message': '用户不存在!', 'data': None}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'code': 401, 'message': '令牌已过期!', 'data': None}), 401
        except jwt.InvalidTokenError:
            return jsonify({'code': 401, 'message': '无效的令牌!', 'data': None}), 401
        
        # 将用户信息传递给路由处理函数
        return f(current_user, *args, **kwargs)
    return decorated

# 初始化数据库
with app.app_context():
    db.create_all()

    # 创建默认用户账号
    from werkzeug.security import generate_password_hash
    
    # 创建管理员账号
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        admin = User(username='admin', password=generate_password_hash('admin123'), role='admin')
        db.session.add(admin)
    
    # 创建组长账号
    leader_user = User.query.filter_by(username='leader').first()
    if not leader_user:
        leader = User(username='leader', password=generate_password_hash('leader123'), role='leader')
        db.session.add(leader)
    
    # 创建成员账号
    member_user = User.query.filter_by(username='member').first()
    if not member_user:
        member = User(username='member', password=generate_password_hash('member123'), role='member')
        db.session.add(member)
    
    # 创建测试机器人账号
    testbot_user = User.query.filter_by(username='testbot_playwright').first()
    if not testbot_user:
        testbot = User(username='testbot_playwright', password=generate_password_hash('000000'), role='member')
        db.session.add(testbot)
    
    db.session.commit()

# 健康检查路由
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'code': 200, 'message': 'success', 'data': {'status': 'healthy'}}), 200

# 登录路由
@app.route('/api/v1/auth/login', methods=['POST'])
def login():
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password')
    remember = data.get('remember', False)
    
    logger.info(f'登录请求: 用户名={username}, remember={remember}')
    
    if not username:
        logger.info(f'登录失败: 用户名不能为空')
        return jsonify({'code': 400, 'message': '用户名不能为空', 'data': None}), 400
    
    # 处理密码为空的情况，允许用户使用空密码登录
    password = password or ''
    
    user = User.query.filter_by(username=username).first()
    if not user:
        logger.info(f'登录失败: 用户名 {username} 不存在')
        return jsonify({'code': 401, 'message': '用户名或密码错误', 'data': None}), 401
    
    from werkzeug.security import check_password_hash, generate_password_hash

    # 检查密码是否为空（兼容scrypt等可能抛出异常的hash格式）
    try:
        is_empty_password = check_password_hash(user.password, '')
    except Exception:
        is_empty_password = (user.password == '')

    # 测试密码是否匹配（兼容scrypt等可能抛出异常的hash格式）
    try:
        password_matches = check_password_hash(user.password, password)
    except Exception:
        password_matches = False

    # 检查是否使用默认密码登录（兼容scrypt等可能抛出异常的hash格式）
    try:
        is_default_password = check_password_hash(user.password, '000000')
    except Exception:
        is_default_password = False
    logger.info(f'是否使用默认密码? {is_default_password}, 密码是000000? {password == "000000"}')

    # 进行密码验证（兼容scrypt等可能抛出异常的hash格式）
    # 豁免条件：用户首次登录且密码是默认密码'000000'，允许空密码登录去重置
    is_first_login_with_default = user.first_login and is_default_password
    if not password_matches and not is_first_login_with_default:
        logger.info(f'登录失败: 用户名 {username} 的密码不正确')
        return jsonify({'code': 401, 'message': '用户名或密码错误', 'data': None}), 401

    # 如果是首次登录或使用默认密码登录，需要重置密码
    if user.first_login or (is_default_password and password == "000000"):
        logger.info(f'首次登录或使用默认密码: 用户 {username} 需要重置密码')
        # 记录初始登录尝试
        try:
            log = OperationLog(
                user_id=user.id,
                operation=f'用户 {username} 首次登录或使用默认密码登录，需要重置密码'
            )
            db.session.add(log)
            db.session.commit()
        except Exception as e:
            logger.error(f'记录日志失败: {str(e)}')
            db.session.rollback()
        return jsonify({
            'code': 200,
            'message': '首次登录或使用默认密码，请重置密码',
            'data': {
                'need_reset_password': True,
                'username': user.username
            }
        }), 200
    
    logger.info(f'登录成功: 用户名 {username}')
    
    # 根据remember参数设置token过期时间
    if remember:
        # 30天内免登录
        expires_in = timedelta(days=30)
    else:
        # 1小时过期
        expires_in = timedelta(hours=1)
    
    # 生成JWT token (使用PyJWT 2.x的正确API)
    try:
        token = jwt.encode(
            {
                'user_id': user.id,
                'username': user.username,
                'role': user.role,
                'exp': datetime.utcnow() + expires_in  # 设置token过期时间
            }, 
            app.config['SECRET_KEY'], 
            algorithm='HS256'
        )
        logger.info(f'成功生成token: {token}, 过期时间: {expires_in}')
    except Exception as e:
        logger.error(f'生成token失败: {e}')
        # 如果JWT生成失败，使用一个简单的token
        token = f"simple-token-{user.id}-{datetime.utcnow().timestamp()}"
        logger.info(f'使用简化token: {token}')
    
    return jsonify({
        'code': 200,
        'message': '登录成功',
        'data': {
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        }
    }), 200

# 获取当前用户信息
@app.route('/api/v1/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'id': current_user.id,
            'username': current_user.username,
            'role': current_user.role,
            'created_at': current_user.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': current_user.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }
    }), 200

# 重置密码路由
@app.route('/api/v1/auth/reset-password', methods=['POST'])
def reset_password():
    import logging
    import traceback
    import sys
    
    # 配置日志，确保所有日志都能被输出
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    logger.info('=' * 50)
    logger.info('开始处理密码重置请求')
    
    try:
        # 打印请求信息
        logger.debug(f'请求方法: {request.method}')
        logger.debug(f'请求URL: {request.url}')
        logger.debug(f'请求头: {dict(request.headers)}')
        
        # 获取请求数据
        data = request.get_json() or {}
        logger.debug(f'原始请求数据: {data}')
        
        # 验证请求数据
        if not data:
            logger.error('请求数据为空或格式错误')
            return jsonify({'code': 400, 'message': '请求数据格式错误', 'data': None}), 400
        
        username = data.get('username')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        logger.info(f'请求参数: username={username}')
        
        # 验证请求参数
        if not username:
            logger.warning('用户名为空')
            return jsonify({'code': 400, 'message': '用户名不能为空', 'data': None}), 400
        if not new_password:
            logger.warning('新密码为空')
            return jsonify({'code': 400, 'message': '新密码不能为空', 'data': None}), 400
        if not confirm_password:
            logger.warning('确认密码为空')
            return jsonify({'code': 400, 'message': '确认密码不能为空', 'data': None}), 400
        
        # 验证两次密码输入一致
        if new_password != confirm_password:
            logger.warning(f'用户 {username} 两次密码输入不一致')
            return jsonify({'code': 400, 'message': '两次密码输入不一致', 'data': None}), 400
        
        logger.info('密码强度验证通过')
        
        # 查找用户
        logger.info(f'查找用户: {username}')
        user = User.query.filter_by(username=username).first()
        if not user:
            logger.warning(f'用户 {username} 不存在')
            return jsonify({'code': 404, 'message': '用户不存在', 'data': None}), 404
        
        # 安全加固：仅允许首次登录用户通过此接口重置密码，防止任意越权改密
        if not user.first_login:
            logger.warning(f'用户 {username} 非首次登录状态，拒绝无凭证重置密码')
            return jsonify({'code': 403, 'message': '非首次登录用户不能通过此接口重置密码，请登录后在个人中心修改', 'data': None}), 403
        
        logger.info(f'找到用户: id={user.id}, username={user.username}, first_login={user.first_login}, role={user.role}')
        
        # 更新密码
        logger.info(f'更新用户 {username} 的密码')
        from werkzeug.security import generate_password_hash
        user.password = generate_password_hash(new_password)
        user.first_login = False  # 标记为非首次登录
        
        # 打印用户更新后的信息
        logger.debug(f'用户更新后: password_hash={user.password[:20]}..., first_login={user.first_login}')
        
        # 尝试保存到数据库
        logger.info('开始提交到数据库')
        try:
            db.session.commit()
            logger.info(f'用户 {username} 密码重置成功！')
            return jsonify({
                'code': 200,
                'message': '密码修改成功，请使用新密码登录',
                'data': None
            }), 200
        except Exception as db_error:
            logger.error(f'数据库提交失败: {str(db_error)}')
            logger.error(f'详细错误信息: {traceback.format_exc()}')
            logger.error(f'错误类型: {type(db_error).__name__}')
            logger.error(f'错误参数: {db_error.args}')
            db.session.rollback()
            return jsonify({'code': 500, 'message': f'重置密码失败: 数据库操作错误 - {str(db_error)}', 'data': None}), 500
            
    except Exception as e:
        logger.error(f'密码重置过程中发生未知错误: {str(e)}')
        logger.error(f'详细错误信息: {traceback.format_exc()}')
        logger.error(f'错误类型: {type(e).__name__}')
        logger.error(f'错误参数: {e.args}')
        logger.error(f'堆栈信息: {sys.exc_info()[2]}')
        return jsonify({'code': 500, 'message': f'重置密码失败: 系统错误 - {str(e)}', 'data': None}), 500
    finally:
        logger.info('密码重置请求处理完成')
        logger.info('=' * 50)

# 获取用户列表
@app.route('/api/v1/users', methods=['GET'])
@token_required
def get_users(current_user):
    # 只有管理员可以查看用户列表
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    users = User.query.all()
    users_data = []
    for user in users:
        users_data.append({
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': user.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'items': users_data,
            'total': len(users_data)
        }
    }), 200

# 创建用户
@app.route('/api/v1/users', methods=['POST'])
@token_required
def add_user(current_user):
    # 只有管理员可以创建用户
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password')
    role = (data.get('role') or '').strip()
    
    if not username or not role:
        return jsonify({'code': 400, 'message': '用户名和角色不能为空', 'data': None}), 400
    
    # 检查用户是否已存在
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'code': 400, 'message': '用户名已存在', 'data': None}), 400
    
    # 检查角色是否合法
    if role not in ['admin', 'leader', 'member']:
        return jsonify({'code': 400, 'message': '角色必须是admin、leader或member', 'data': None}), 400
    
    # 创建新用户
    from werkzeug.security import generate_password_hash
    # 设置默认密码为"000000"如果未提供
    hashed_password = generate_password_hash(password or '000000')
    new_user = User(
        username=username,
        password=hashed_password,
        role=role
    )
    
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({
            'code': 200,
            'message': '用户创建成功，初始密码为空，用户可以立即使用用户名登录',
            'data': {
                'id': new_user.id,
                'username': new_user.username,
                'role': new_user.role,
                'created_at': new_user.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'创建用户失败: {str(e)}', 'data': None}), 500

# 更新用户
@app.route('/api/v1/users/<int:user_id>', methods=['PUT'])
@token_required
def update_user(current_user, user_id):
    # 只有管理员可以更新用户
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'code': 404, 'message': '用户不存在', 'data': None}), 404
    
    data = request.get_json() or {}
    password = data.get('password')
    role = data.get('role')
    
    # 更新密码
    if password:
        from werkzeug.security import generate_password_hash
        user.password = generate_password_hash(password)
    
    # 更新角色
    if role:
        if role not in ['admin', 'leader', 'member']:
            return jsonify({'code': 400, 'message': '角色必须是admin、leader或member', 'data': None}), 400
        if user.username == 'admin' and role != 'admin':
            return jsonify({'code': 400, 'message': '不能修改admin用户的管理员角色', 'data': None}), 400
        user.role = role
    
    try:
        db.session.commit()
        return jsonify({
            'code': 200,
            'message': '用户更新成功',
            'data': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'updated_at': user.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'更新用户失败: {str(e)}', 'data': None}), 500

# 删除用户
@app.route('/api/v1/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(current_user, user_id):
    # 只有管理员可以删除用户
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    # 不能删除自己
    if current_user.id == user_id:
        return jsonify({'code': 400, 'message': '不能删除自己', 'data': None}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'code': 404, 'message': '用户不存在', 'data': None}), 404
    
    # 不能删除admin用户
    if user.username == 'admin':
        return jsonify({'code': 400, 'message': '不能删除admin用户', 'data': None}), 400
    
    try:
        # 转移该用户创建的库存数据给当前管理员，防止数据丢失与外键报错
        InventoryData.query.filter_by(created_by=user_id).update({'created_by': current_user.id})
        # 清理该用户的操作日志，防止外键报错
        OperationLog.query.filter_by(user_id=user_id).delete()
        db.session.delete(user)
        db.session.commit()
        return jsonify({'code': 200, 'message': '用户删除成功', 'data': None}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'删除用户失败: {str(e)}', 'data': None}), 500

# 创建表格结构
@app.route('/api/v1/tables', methods=['POST'])
@token_required
def create_table_structure(current_user):
    # 只有管理员可以创建表格结构
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    data = request.get_json() or {}
    table_name = (data.get('table_name') or '').strip()
    columns = data.get('columns')
    
    if not table_name or not columns:
        return jsonify({'code': 400, 'message': '表格名称和列配置不能为空', 'data': None}), 400
    
    # 检查表格名称不能包含 Excel sheet 非法字符
    if re.search(r'[\\/?*:[\]]', table_name):
        return jsonify({'code': 400, 'message': '表格名称不能包含特殊字符: \\ / ? * : [ ]', 'data': None}), 400

    if not isinstance(columns, list) or len(columns) == 0:
        return jsonify({'code': 400, 'message': '列配置必须是非空数组，至少需要一列', 'data': None}), 400
    
    # 检查表格名称是否已存在
    if TableStructure.query.filter_by(table_name=table_name).first():
        return jsonify({'code': 400, 'message': f'表格名称「{table_name}」已存在', 'data': None}), 400

    # 验证列配置格式与列名唯一性
    col_names = set()
    for column in columns:
        if not isinstance(column, dict):
            return jsonify({'code': 400, 'message': '列配置项必须是对象', 'data': None}), 400
        cname = column.get('column_name', '').strip()
        if not cname or not column.get('data_type'):
            return jsonify({'code': 400, 'message': '每一列都必须有列名和数据类型', 'data': None}), 400
        if cname in col_names:
            return jsonify({'code': 400, 'message': f'表格中存在重复列名: 「{cname}」', 'data': None}), 400
        col_names.add(cname)
        # 储存列与自增+前缀互斥
        if column.get('is_storage'):
            column['autoIncrement'] = False
            column['prefix'] = ''
        # 为没有hidden属性的列设置默认值
        if 'hidden' not in column:
            column['hidden'] = False
    
    # 将列配置转换为JSON字符串
    columns_json = json.dumps(columns, ensure_ascii=False)
    
    try:
        new_table = TableStructure(
            table_name=table_name,
            columns=columns_json
        )
        db.session.add(new_table)
        db.session.flush()

        # 初始化自增序列
        for column in columns:
            if column.get('autoIncrement'):
                seq = AutoIncrementSequence(
                    table_id=new_table.id,
                    column_name=column['column_name'],
                    current_value=0
                )
                db.session.add(seq)

        db.session.commit()
        
        return jsonify({
            'code': 200,
            'message': '表格结构创建成功',
            'data': {
                'id': new_table.id,
                'table_name': new_table.table_name,
                'columns': columns,
                'created_at': new_table.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': new_table.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'创建表格结构失败: {str(e)}', 'data': None}), 500

# 获取表格结构列表
@app.route('/api/v1/tables', methods=['GET'])
@token_required
def get_table_structures(current_user):
    tables = TableStructure.query.all()
    tables_data = []
    
    for table in tables:
        tables_data.append({
            'id': table.id,
            'table_name': table.table_name,
            'columns': json.loads(table.columns),
            'created_at': table.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': table.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'items': tables_data,
            'total': len(tables_data)
        }
    }), 200

# 获取表格结构详情
@app.route('/api/v1/tables/<int:table_id>', methods=['GET'])
@token_required
def get_table_structure_detail(current_user, table_id):
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'id': table.id,
            'table_name': table.table_name,
            'columns': json.loads(table.columns),
            'created_at': table.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': table.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }
    }), 200

# 更新表格结构
@app.route('/api/v1/tables/<int:table_id>', methods=['PUT'])
@token_required
def update_table_structure(current_user, table_id):
    # 只有管理员可以更新表格结构
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    data = request.get_json() or {}
    table_name = data.get('table_name')
    columns = data.get('columns')
    
    if table_name is not None:
        table_name = table_name.strip()
        if not table_name:
            return jsonify({'code': 400, 'message': '表格名称不能为空', 'data': None}), 400
        if re.search(r'[\\/?*:[\]]', table_name):
            return jsonify({'code': 400, 'message': '表格名称不能包含特殊字符: \\ / ? * : [ ]', 'data': None}), 400
        dup = TableStructure.query.filter(TableStructure.table_name == table_name, TableStructure.id != table_id).first()
        if dup:
            return jsonify({'code': 400, 'message': f'表格名称「{table_name}」已存在', 'data': None}), 400
        table.table_name = table_name
    
    if columns is not None:
        if not isinstance(columns, list) or len(columns) == 0:
            return jsonify({'code': 400, 'message': '列配置必须是非空数组，至少需要一列', 'data': None}), 400
        
        # 验证列配置格式与列名唯一性
        col_names = set()
        for column in columns:
            if not isinstance(column, dict):
                return jsonify({'code': 400, 'message': '列配置项必须是对象', 'data': None}), 400
            cname = column.get('column_name', '').strip()
            if not cname or not column.get('data_type'):
                return jsonify({'code': 400, 'message': '每一列都必须有列名和数据类型', 'data': None}), 400
            if cname in col_names:
                return jsonify({'code': 400, 'message': f'表格中存在重复列名: 「{cname}」', 'data': None}), 400
            col_names.add(cname)
            # 储存列与自增+前缀互斥
            if column.get('is_storage'):
                column['autoIncrement'] = False
                column['prefix'] = ''
            # 为没有hidden属性的列设置默认值
            if 'hidden' not in column:
                column['hidden'] = False
        
        table.columns = json.dumps(columns, ensure_ascii=False)
        
        # 获取该表格所有数据，按ID升序排序，用于处理自增列补全
        inventory_data_list = InventoryData.query.filter_by(table_id=table_id).order_by(InventoryData.id.asc()).all()
        
        # 处理自增列的自增序列和历史数据自动补全
        active_auto_cols = []
        for column in columns:
            if column.get('autoIncrement'):
                column_name = column['column_name']
                prefix = column.get('prefix') or ''
                active_auto_cols.append(column_name)
                
                # 查找现有数据中已有的最大序号，并收集未编号记录
                max_value = 0
                unassigned_records = []
                
                for inventory_data in inventory_data_list:
                    data_json = json.loads(inventory_data.data) if isinstance(inventory_data.data, str) else (inventory_data.data or {})
                    val = data_json.get(column_name)
                    if val is None or str(val).strip() == '':
                        unassigned_records.append((inventory_data, data_json))
                    else:
                        match = re.match(r'^(.*?)(\d+)$', str(val).strip())
                        if match:
                            numeric_part = int(match.group(2))
                            if numeric_part > max_value:
                                max_value = numeric_part
                            # 迁移/统一数据前缀为新前缀，保留原有编号数字
                            new_val = f"{prefix}{numeric_part}"
                            if str(val).strip() != new_val:
                                data_json[column_name] = new_val
                                inventory_data.data = json.dumps(data_json, ensure_ascii=False)
                                db.session.add(inventory_data)
                
                # 为历史未编号的数据按顺序补齐自增编号
                for inventory_data, data_json in unassigned_records:
                    max_value += 1
                    data_json[column_name] = f"{prefix}{max_value}"
                    inventory_data.data = json.dumps(data_json, ensure_ascii=False)
                    db.session.add(inventory_data)
                
                # 获取或创建自增序列
                sequence = AutoIncrementSequence.query.filter_by(
                    table_id=table_id,
                    column_name=column_name
                ).first()
                
                if not sequence:
                    sequence = AutoIncrementSequence(
                        table_id=table_id,
                        column_name=column_name,
                        current_value=max_value
                    )
                    db.session.add(sequence)
                else:
                    sequence.current_value = max_value
        
        # 清理不再启用的自增序列
        if active_auto_cols:
            AutoIncrementSequence.query.filter(
                AutoIncrementSequence.table_id == table_id,
                AutoIncrementSequence.column_name.notin_(active_auto_cols)
            ).delete(synchronize_session=False)
        else:
            AutoIncrementSequence.query.filter_by(table_id=table_id).delete(synchronize_session=False)

        # 同步更新关联该表格的所有 CryoCell 缓存
        linked_cells = CryoCell.query.filter_by(linked_table_id=table_id).all()
        if linked_cells:
            inv_ids = {c.linked_data_id for c in linked_cells if c.linked_data_id}
            inv_map = {d.id: d for d in InventoryData.query.filter(InventoryData.id.in_(inv_ids)).all()} if inv_ids else {}
            for c in linked_cells:
                inv = inv_map.get(c.linked_data_id)
                if inv:
                    inv_dict = json.loads(inv.data) if isinstance(inv.data, str) else (inv.data or {})
                    disp_dict = {}
                    for k, v in inv_dict.items():
                        if isinstance(v, dict) and v.get('_storage'):
                            disp_dict[k] = v.get('_text', '')
                        elif isinstance(v, dict) and v.get('_text'):
                            disp_dict[k] = v.get('_text', '')
                        else:
                            disp_dict[k] = v
                    c_data = json.loads(c.data) if c.data else {}
                    c_data['_linked'] = True
                    c_data['_table_id'] = table.id
                    c_data['_data_id'] = inv.id
                    c_data['_table_name'] = table.table_name
                    c_data['_table_columns'] = columns
                    c_data['_row_data'] = disp_dict
                    c.data = json.dumps(c_data, ensure_ascii=False)
                    db.session.add(c)
    
    try:
        db.session.commit()
        return jsonify({
            'code': 200,
            'message': '表格结构更新成功',
            'data': {
                'id': table.id,
                'table_name': table.table_name,
                'columns': json.loads(table.columns),
                'created_at': table.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': table.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'更新表格结构失败: {str(e)}', 'data': None}), 500

# 检查自增列数据是否符合要求
@app.route('/api/v1/tables/<int:table_id>/check-auto-increment', methods=['POST'])
@token_required
def check_auto_increment(current_user, table_id):
    # 只有管理员可以检查自增列数据
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    data = request.get_json() or {}
    column_name = data.get('column_name')
    prefix = data.get('prefix')
    if prefix is None:
        prefix = ''
    else:
        prefix = str(prefix)
    
    if not column_name:
        return jsonify({'code': 400, 'message': '列名不能为空', 'data': None}), 400
    
    # 获取该表格所有数据
    inventory_data_list = InventoryData.query.filter_by(table_id=table_id).all()
    
    # 分离已编号数据与未编号记录
    assigned_values = []
    unassigned_count = 0
    
    for inventory_data in inventory_data_list:
        data_json = json.loads(inventory_data.data) if isinstance(inventory_data.data, str) else (inventory_data.data or {})
        val = data_json.get(column_name)
        if val is None or str(val).strip() == '':
            unassigned_count += 1
        else:
            assigned_values.append(str(val).strip())
    
    # 如果没有已填写的编号数据，直接通过
    if not assigned_values:
        return jsonify({
            'code': 200,
            'message': '数据符合要求',
            'data': {
                'max_value': 0,
                'prefix': prefix,
                'old_prefix': prefix,
                'is_prefix_changed': False,
                'sample_old': '',
                'sample_new': '',
                'unassigned_count': unassigned_count,
                'total_count': len(inventory_data_list),
                'assigned_count': 0
            }
        }), 200
    
    # 1. 逐条解析所有已编号数据，校验是否符合 [前缀][数字] 结构
    parsed_items = []
    for val in assigned_values:
        m = re.match(r'^(.*?)(\d+)$', val)
        if not m:
            return jsonify({
                'code': 400,
                'message': f'列「{column_name}」中存在不符合编号格式的数据: "{val}"（必须符合 [前缀][数字] 格式）。存在不规则数据，不予改变前缀。',
                'data': None
            }), 400
        parsed_items.append((m.group(1), m.group(2), int(m.group(2))))
    
    # 2. 检查现有前缀是否统一 (统一性检查)
    prefixes_found = list({item[0] for item in parsed_items})
    if len(prefixes_found) > 1:
        prefixes_display = ', '.join([f'「{p}」' if p else '「(无前缀)」' for p in sorted(prefixes_found)])
        return jsonify({
            'code': 400,
            'message': f'列「{column_name}」中存在多种编号形式（检测到多种前缀: {prefixes_display}），数据不统一，不予改变前缀。请先规范整理该列数据。',
            'data': {
                'multiple_prefixes': prefixes_found
            }
        }), 400
    
    # 3. 验证数字部分的唯一性
    numeric_list = [item[2] for item in parsed_items]
    if len(numeric_list) != len(set(numeric_list)):
        seen = set()
        dups = set()
        for n in numeric_list:
            if n in seen:
                dups.add(n)
            seen.add(n)
        return jsonify({
            'code': 400,
            'message': f'列「{column_name}」中存在重复编号: {sorted(list(dups))}。请重新整理数据，确保编号唯一。',
            'data': None
        }), 400
    
    # 4. 前缀统一，判断是否发生前缀变更
    existing_prefix = prefixes_found[0]
    is_prefix_changed = (existing_prefix != prefix)
    min_num = min(numeric_list)
    max_num = max(numeric_list)
    sample_old = f"{existing_prefix}{min_num}"
    sample_new = f"{prefix}{min_num}"
    
    return jsonify({
        'code': 200,
        'message': '数据符合要求',
        'data': {
            'max_value': max_num,
            'prefix': prefix,
            'old_prefix': existing_prefix,
            'is_prefix_changed': is_prefix_changed,
            'sample_old': sample_old,
            'sample_new': sample_new,
            'unassigned_count': unassigned_count,
            'total_count': len(inventory_data_list),
            'assigned_count': len(assigned_values)
        }
    }), 200

# 删除表格结构
@app.route('/api/v1/tables/<int:table_id>', methods=['DELETE'])
@token_required
def delete_table_structure(current_user, table_id):
    # 只有管理员可以删除表格结构
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    try:
        # 删除关联的自增序列
        AutoIncrementSequence.query.filter_by(table_id=table_id).delete()
        # 删除冻存格中引用的本表格关联格
        data_ids = [d.id for d in InventoryData.query.filter_by(table_id=table_id).all()]
        if data_ids:
            CryoCell.query.filter(CryoCell.linked_data_id.in_(data_ids)).delete(synchronize_session=False)
        CryoCell.query.filter_by(linked_table_id=table_id).delete(synchronize_session=False)
        # 删除关联的库存数据
        InventoryData.query.filter_by(table_id=table_id).delete()
        # 删除表格结构
        db.session.delete(table)
        db.session.commit()
        
        return jsonify({'code': 200, 'message': '表格结构删除成功', 'data': None}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'删除表格结构失败: {str(e)}', 'data': None}), 500

# 删除所有表格结构
@app.route('/api/v1/tables/all', methods=['DELETE'])
@token_required
def delete_all_tables(current_user):
    # 只有用户名为"admin"的管理员才能删除所有表格结构
    if current_user.role != 'admin' or current_user.username != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    try:
        # 删除所有冻存格中引用的表格关联
        CryoCell.query.filter(or_(CryoCell.linked_table_id.isnot(None), CryoCell.linked_data_id.isnot(None))).delete(synchronize_session=False)
        # 删除所有关联的库存数据
        InventoryData.query.delete()
        # 删除所有自增序列
        AutoIncrementSequence.query.delete()
        # 删除所有表格结构
        TableStructure.query.delete()
        db.session.commit()
        
        return jsonify({'code': 200, 'message': '所有表格结构删除成功', 'data': None}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'删除所有表格结构失败: {str(e)}', 'data': None}), 500

# 添加库存数据
@app.route('/api/v1/tables/<int:table_id>/data', methods=['POST'])
@token_required
def add_inventory_data(current_user, table_id):
    # 检查表格是否存在
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    data = request.get_json() or {}
    inventory_data = data.get('data')
    
    if not inventory_data or not isinstance(inventory_data, dict):
        return jsonify({'code': 400, 'message': '数据格式错误', 'data': None}), 400
    
    # 获取表格列配置
    columns = json.loads(table.columns)
    
    # 处理自增列
    for column in columns:
        if column.get('autoIncrement'):
            column_name = column['column_name']
            prefix = column.get('prefix', '')

            # 获取或创建自增序列
            sequence = AutoIncrementSequence.query.filter_by(
                table_id=table_id,
                column_name=column_name
            ).first()

            if not sequence:
                # 创建新的自增序列
                sequence = AutoIncrementSequence(
                    table_id=table_id,
                    column_name=column_name,
                    current_value=0
                )
                db.session.add(sequence)

            # 递增序列值
            sequence.current_value += 1

            # 生成自增值
            auto_value = f"{prefix}{sequence.current_value}"

            # 将自增值添加到数据中
            inventory_data[column_name] = auto_value

    # 验证并处理存储列
    storage_positions_to_link = []  # [(column_name, position_info), ...]
    seen_pos_keys = set()
    for column in columns:
        if column.get('is_storage'):
            col_name = column['column_name']
            storage_data = inventory_data.get(col_name)
            if not storage_data or not isinstance(storage_data, dict) or not storage_data.get('_storage'):
                continue
            positions = storage_data.get('_positions', [])
            if not isinstance(positions, list) or not positions:
                continue
            for pos in positions:
                if not isinstance(pos, dict):
                    return jsonify({'code': 400, 'message': '存储位置数组中的元素必须是对象', 'data': None}), 400
                box_id = pos.get('box_id')
                row = pos.get('row')
                col = pos.get('col')
                if not box_id or row is None or col is None:
                    return jsonify({'code': 400, 'message': f'存储位置格式错误: {pos}', 'data': None}), 400
                try:
                    row_int = int(row)
                    col_int = int(col)
                    if row_int < 1 or row_int > 9 or col_int < 1 or col_int > 9:
                        return jsonify({'code': 400, 'message': f'存储位置坐标超出范围(1-9): {pos}', 'data': None}), 400
                except (ValueError, TypeError):
                    return jsonify({'code': 400, 'message': f'存储位置坐标必须是整数: {pos}', 'data': None}), 400
                pos['row'] = row_int
                pos['col'] = col_int
                pos_key = (box_id, row_int, col_int)
                if pos_key in seen_pos_keys:
                    return jsonify({'code': 400, 'message': f'请求数据中包含重复的存储位置: {pos.get("label", "")}', 'data': None}), 400
                seen_pos_keys.add(pos_key)
                # 检查盒子存在
                box = CryoBox.query.get(box_id)
                if not box:
                    return jsonify({'code': 400, 'message': f'冻存盒不存在: {box_id}', 'data': None}), 400
                # 检查位置是否已被其他数据占用
                existing = CryoCell.query.filter_by(box_id=box_id, row=row, col=col).first()
                if existing and _is_meaningful_cryo_cell(existing):
                    return jsonify({'code': 400, 'message': f'位置 {pos.get("label", "")} 已被占用', 'data': None}), 400
                storage_positions_to_link.append((col_name, pos))

    # 将库存数据转换为JSON字符串
    data_json = json.dumps(inventory_data, ensure_ascii=False)

    try:
        new_data = InventoryData(
            table_id=table_id,
            data=data_json,
            created_by=current_user.id
        )
        db.session.add(new_data)
        db.session.flush()  # 获取 new_data.id 但不提交

        # 关联存储位置到冻存格（同一事务）
        for col_name, pos in storage_positions_to_link:
            box_id = pos['box_id']
            row = pos['row']
            col_val = pos['col']
            existing = CryoCell.query.filter_by(box_id=box_id, row=row, col=col_val).first()
            row_data = {}
            for k, v in inventory_data.items():
                if isinstance(v, dict) and v.get('_storage'):
                    row_data[k] = v.get('_text', '')
                else:
                    row_data[k] = v
            cell_data = {
                '_linked': True,
                '_table_id': table_id,
                '_data_id': new_data.id,
                '_table_name': table.table_name,
                '_table_columns': columns,
                '_row_data': row_data
            }
            if existing:
                existing.data = json.dumps(cell_data, ensure_ascii=False)
                existing.linked_table_id = table_id
                existing.linked_data_id = new_data.id
            else:
                new_cell = CryoCell(
                    box_id=box_id, row=row, col=col_val,
                    data=json.dumps(cell_data, ensure_ascii=False),
                    linked_table_id=table_id,
                    linked_data_id=new_data.id
                )
                db.session.add(new_cell)

        db.session.commit()  # 一次性提交：InventoryData + 所有 CryoCell

        return jsonify({
            'code': 200,
            'message': '库存数据添加成功',
            'data': {
                'id': new_data.id,
                'table_id': new_data.table_id,
                'data': inventory_data,
                'created_by': new_data.created_by,
                'created_at': new_data.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': new_data.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        err_msg = str(e)
        if 'UNIQUE constraint' in err_msg or 'duplicate' in err_msg.lower():
            return jsonify({'code': 400, 'message': '所选位置已被占用，请重新选择', 'data': None}), 400
        return jsonify({'code': 500, 'message': f'添加库存数据失败: {err_msg}', 'data': None}), 500

# 获取库存数据列表
@app.route('/api/v1/tables/<int:table_id>/data', methods=['GET'])
@token_required
def get_inventory_data_list(current_user, table_id):
    # 检查表格是否存在
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    # 获取查询参数（防非法输入或负数越界）
    try:
        page = max(1, int(request.args.get('page', 1)))
    except (ValueError, TypeError):
        page = 1
    try:
        per_page = min(500, max(1, int(request.args.get('per_page', 10))))
    except (ValueError, TypeError):
        per_page = 10
    search = request.args.get('search', '')
    filters = request.args.get('filters', '')
    
    # 构建查询
    query = InventoryData.query.filter_by(table_id=table_id)
    
    # 如果有搜索关键词，在SQL层使用LIKE模糊匹配，同时支持明文字符与历史转义unicode
    if search:
        search_pattern = f"%{search}%"
        patterns = [
            InventoryData.data.like(search_pattern),
            InventoryData.created_at.like(search_pattern)
        ]
        try:
            escaped_search = json.dumps(search)[1:-1]
            if escaped_search != search:
                patterns.append(InventoryData.data.like(f"%{escaped_search}%"))
        except Exception:
            pass
        query = query.filter(or_(*patterns))
    
    # 执行查询并使用默认排序与统一的分页逻辑
    paginated_data = query.order_by(
        InventoryData.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    # 转换数据格式
    items = []
    for item in paginated_data.items:
        items.append({
            'id': item.id,
            'table_id': item.table_id,
            'data': json.loads(item.data) if isinstance(item.data, str) else item.data,
            'created_by': item.created_by,
            'created_at': item.created_at.strftime('%Y-%m-%d %H:%M:%S') if item.created_at else '',
            'updated_at': item.updated_at.strftime('%Y-%m-%d %H:%M:%S') if item.updated_at else ''
        })
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'items': items,
            'total': paginated_data.total,
            'page': page,
            'per_page': per_page
        }
    }), 200

# 获取库存数据详情
@app.route('/api/v1/tables/<int:table_id>/data/<int:data_id>', methods=['GET'])
@token_required
def get_inventory_data_detail(current_user, table_id, data_id):
    # 检查表格是否存在
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    # 获取库存数据
    inventory_data = InventoryData.query.filter_by(id=data_id, table_id=table_id).first()
    if not inventory_data:
        return jsonify({'code': 404, 'message': '库存数据不存在', 'data': None}), 404
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'id': inventory_data.id,
            'table_id': inventory_data.table_id,
            'data': json.loads(inventory_data.data),
            'created_by': inventory_data.created_by,
            'created_at': inventory_data.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': inventory_data.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }
    }), 200

# 更新库存数据
@app.route('/api/v1/tables/<int:table_id>/data/<int:data_id>', methods=['PUT'])
@token_required
def update_inventory_data(current_user, table_id, data_id):
    # 检查表格是否存在
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    # 检查用户权限，管理员、组长和组员都可以修改数据
    if current_user.role not in ['admin', 'leader', 'member']:
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    # 获取库存数据
    inventory_data = InventoryData.query.filter_by(id=data_id, table_id=table_id).first()
    if not inventory_data:
        return jsonify({'code': 404, 'message': '库存数据不存在', 'data': None}), 404
    
    data = request.get_json() or {}
    new_data = data.get('data')

    if not new_data or not isinstance(new_data, dict):
        return jsonify({'code': 400, 'message': '数据格式错误', 'data': None}), 400

    # 解析旧数据，释放之前占用的存储位置
    old_data_obj = json.loads(inventory_data.data) if isinstance(inventory_data.data, str) else inventory_data.data
    columns = json.loads(table.columns)
    for column in columns:
        if column.get('is_storage'):
            col_name = column['column_name']
            old_storage = old_data_obj.get(col_name)
            if isinstance(old_storage, dict) and old_storage.get('_storage'):
                old_positions = old_storage.get('_positions', [])
                new_storage = new_data.get(col_name)
                new_positions = []
                if isinstance(new_storage, dict) and new_storage.get('_storage'):
                    new_positions = new_storage.get('_positions', [])
                # 找出被移除的位置（在旧不在新）
                new_pos_keys = {(p['box_id'], p['row'], p['col']) for p in new_positions if isinstance(p, dict) and 'box_id' in p and 'row' in p and 'col' in p}
                for old_pos in old_positions:
                    if isinstance(old_pos, dict) and 'box_id' in old_pos and 'row' in old_pos and 'col' in old_pos:
                        key = (old_pos['box_id'], old_pos['row'], old_pos['col'])
                        if key not in new_pos_keys:
                            cell = CryoCell.query.filter_by(
                                box_id=old_pos['box_id'], row=old_pos['row'], col=old_pos['col']
                            ).first()
                            if cell:
                                db.session.delete(cell)

    # 验证并处理新的存储位置
    storage_positions_to_link = []
    seen_pos_keys = set()
    for column in columns:
        if column.get('is_storage'):
            col_name = column['column_name']
            storage_data = new_data.get(col_name)
            if not storage_data or not isinstance(storage_data, dict) or not storage_data.get('_storage'):
                continue
            positions = storage_data.get('_positions', [])
            if not isinstance(positions, list) or not positions:
                continue
            for pos in positions:
                if not isinstance(pos, dict):
                    return jsonify({'code': 400, 'message': '存储位置数组中的元素必须是对象', 'data': None}), 400
                box_id = pos.get('box_id')
                row = pos.get('row')
                col = pos.get('col')
                if not box_id or row is None or col is None:
                    return jsonify({'code': 400, 'message': f'存储位置格式错误: {pos}', 'data': None}), 400
                try:
                    row_int = int(row)
                    col_int = int(col)
                    if row_int < 1 or row_int > 9 or col_int < 1 or col_int > 9:
                        return jsonify({'code': 400, 'message': f'存储位置坐标超出范围(1-9): {pos}', 'data': None}), 400
                except (ValueError, TypeError):
                    return jsonify({'code': 400, 'message': f'存储位置坐标必须是整数: {pos}', 'data': None}), 400
                pos['row'] = row_int
                pos['col'] = col_int
                pos_key = (box_id, row_int, col_int)
                if pos_key in seen_pos_keys:
                    return jsonify({'code': 400, 'message': f'请求数据中包含重复的存储位置: {pos.get("label", "")}', 'data': None}), 400
                seen_pos_keys.add(pos_key)
                box = CryoBox.query.get(box_id)
                if not box:
                    return jsonify({'code': 400, 'message': f'冻存盒不存在: {box_id}', 'data': None}), 400
                existing = CryoCell.query.filter_by(box_id=box_id, row=row_int, col=col_int).first()
                if existing and _is_meaningful_cryo_cell(existing):
                    if existing.linked_data_id != data_id:
                        return jsonify({'code': 400, 'message': f'位置 {pos.get("label", "")} 已被占用', 'data': None}), 400
                storage_positions_to_link.append((col_name, pos))

    # 更新库存数据
    inventory_data.data = json.dumps(new_data, ensure_ascii=False)

    try:
        # 关联新存储位置（同一事务内）
        for col_name, pos in storage_positions_to_link:
            box_id = pos['box_id']
            row = pos['row']
            col_val = pos['col']
            existing = CryoCell.query.filter_by(box_id=box_id, row=row, col=col_val).first()
            row_data = {}
            for k, v in new_data.items():
                if isinstance(v, dict) and v.get('_storage'):
                    row_data[k] = v.get('_text', '')
                else:
                    row_data[k] = v
            cell_data = {
                '_linked': True,
                '_table_id': table_id,
                '_data_id': data_id,
                '_table_name': table.table_name,
                '_table_columns': columns,
                '_row_data': row_data
            }
            if existing:
                existing.data = json.dumps(cell_data, ensure_ascii=False)
                existing.linked_table_id = table_id
                existing.linked_data_id = data_id
            else:
                new_cell = CryoCell(
                    box_id=box_id, row=row, col=col_val,
                    data=json.dumps(cell_data, ensure_ascii=False),
                    linked_table_id=table_id,
                    linked_data_id=data_id
                )
                db.session.add(new_cell)

        db.session.commit()  # 一次性提交：旧位释放 + 数据更新 + 新位关联

        return jsonify({
            'code': 200,
            'message': '库存数据更新成功',
            'data': {
                'id': inventory_data.id,
                'table_id': inventory_data.table_id,
                'data': new_data,
                'created_by': inventory_data.created_by,
                'created_at': inventory_data.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': inventory_data.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        err_msg = str(e)
        if 'UNIQUE constraint' in err_msg or 'duplicate' in err_msg.lower():
            return jsonify({'code': 400, 'message': '所选位置已被占用，请重新选择', 'data': None}), 400
        return jsonify({'code': 500, 'message': f'更新库存数据失败: {err_msg}', 'data': None}), 500

def _release_linked_positions(inventory_data_row):
    """释放一条库存数据占用的所有冻存位置"""
    try:
        # 1. 直接删除与该数据行绑定的所有 CryoCell
        if hasattr(inventory_data_row, 'id') and inventory_data_row.id:
            CryoCell.query.filter_by(linked_data_id=inventory_data_row.id).delete()

        # 2. 兜底根据数据 JSON 中记录的 _positions 再次核对清理
        data_obj = json.loads(inventory_data_row.data) if isinstance(inventory_data_row.data, str) else inventory_data_row.data
        for key, value in data_obj.items():
            if isinstance(value, dict) and value.get('_storage'):
                for pos in value.get('_positions', []):
                    cell = CryoCell.query.filter_by(
                        box_id=pos['box_id'], row=pos['row'], col=pos['col']
                    ).first()
                    if cell:
                        db.session.delete(cell)
    except Exception:
        pass


# 删除库存数据
@app.route('/api/v1/tables/<int:table_id>/data/<int:data_id>', methods=['DELETE'])
@token_required
def delete_inventory_data(current_user, table_id, data_id):
    # 检查表格是否存在
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404

    # 检查用户权限，只有管理员和组长可以删除数据
    if current_user.role not in ['admin', 'leader']:
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403

    # 获取库存数据
    inventory_data = InventoryData.query.filter_by(id=data_id, table_id=table_id).first()
    if not inventory_data:
        return jsonify({'code': 404, 'message': '库存数据不存在', 'data': None}), 404

    # 释放关联的冻存位置
    _release_linked_positions(inventory_data)

    try:
        db.session.delete(inventory_data)
        db.session.commit()
        return jsonify({'code': 200, 'message': '库存数据删除成功', 'data': None}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'删除库存数据失败: {str(e)}', 'data': None}), 500

# 批量删除库存数据
@app.route('/api/v1/tables/<int:table_id>/data', methods=['DELETE'])
@token_required
def batch_delete_inventory_data(current_user, table_id):
    # 检查表格是否存在
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    # 检查用户权限，只有管理员和组长可以删除数据
    if current_user.role not in ['admin', 'leader']:
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    # 获取要删除的ID列表
    data = request.get_json() or {}
    ids = data.get('ids', [])
    
    if not ids or not isinstance(ids, list) or len(ids) == 0:
        return jsonify({'code': 400, 'message': '删除ID列表不能为空', 'data': None}), 400
    
    try:
        # 释放每条数据关联的冻存位置
        rows_to_delete = InventoryData.query.filter_by(table_id=table_id).filter(InventoryData.id.in_(ids)).all()
        for row in rows_to_delete:
            _release_linked_positions(row)

        # 执行批量删除
        deleted_count = InventoryData.query.filter_by(table_id=table_id).filter(InventoryData.id.in_(ids)).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({'code': 200, 'message': f'成功删除{deleted_count}条数据', 'data': {'deleted_count': deleted_count}}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'批量删除库存数据失败: {str(e)}', 'data': None}), 500

# 批量添加库存数据
@app.route('/api/v1/tables/<int:table_id>/data/batch', methods=['POST'])
@token_required
def batch_add_inventory_data(current_user, table_id):
    # 检查表格是否存在
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    # 检查用户权限，只有管理员和组长可以批量添加数据
    if current_user.role not in ['admin', 'leader']:
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    data = request.get_json() or {}
    items = data.get('items')
    
    if not items or not isinstance(items, list) or len(items) == 0:
        return jsonify({'code': 400, 'message': '批量数据格式错误', 'data': None}), 400
    
    success_count = 0
    error_count = 0
    error_messages = []
    
    try:
        # 获取表格列配置并初始化自增列序列映射
        columns = json.loads(table.columns)
        auto_cols = [c for c in columns if c.get('autoIncrement')]
        auto_seq_map = {}
        for c in auto_cols:
            c_name = c['column_name']
            prefix = c.get('prefix') or ''
            seq = AutoIncrementSequence.query.filter_by(table_id=table_id, column_name=c_name).first()
            if not seq:
                seq = AutoIncrementSequence(table_id=table_id, column_name=c_name, current_value=0)
                db.session.add(seq)
            auto_seq_map[c_name] = (prefix, seq)

        for item in items:
            if not isinstance(item, dict) or not item.get('data') or not isinstance(item.get('data'), dict):
                error_count += 1
                error_messages.append(f'数据格式错误: {str(item)}')
                continue
            
            try:
                item_data = dict(item['data'])
                # 为未提供自增值的自增列自动分配递增编号
                for c_name, (prefix, seq) in auto_seq_map.items():
                    val = item_data.get(c_name)
                    if val is None or str(val).strip() == '':
                        seq.current_value += 1
                        item_data[c_name] = f"{prefix}{seq.current_value}"
                
                # 将库存数据转换为JSON字符串
                data_json = json.dumps(item_data, ensure_ascii=False)
                
                new_data = InventoryData(
                    table_id=table_id,
                    data=data_json,
                    created_by=current_user.id
                )
                db.session.add(new_data)
                success_count += 1
            except Exception as e:
                error_count += 1
                error_messages.append(f'添加数据失败: {str(e)}')
        
        db.session.commit()
        return jsonify({
            'code': 200,
            'message': f'批量添加成功，成功{success_count}条，失败{error_count}条',
            'data': {
                'success_count': success_count,
                'error_count': error_count,
                'error_messages': error_messages
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'批量添加库存数据失败: {str(e)}', 'data': None}), 500

# 获取统计数据
@app.route('/api/v1/reports/<int:table_id>/stats', methods=['GET'])
@token_required
def get_inventory_stats(current_user, table_id):
    # 检查表格是否存在
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    # 获取查询参数
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    group_by = request.args.get('group_by')
    
    # 构建查询
    query = InventoryData.query.filter_by(table_id=table_id)
    
    # 时间范围过滤
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(InventoryData.created_at >= start_dt)
        except (ValueError, TypeError):
            return jsonify({'code': 400, 'message': 'start_date 格式无效，应为 YYYY-MM-DD', 'data': None}), 400
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
            query = query.filter(InventoryData.created_at < end_dt)
        except (ValueError, TypeError):
            return jsonify({'code': 400, 'message': 'end_date 格式无效，应为 YYYY-MM-DD', 'data': None}), 400
    
    # 获取所有数据
    all_data = query.all()
    
    # 统计数据
    stats_data = []
    if group_by:
        # 按指定字段分组统计
        group_dict = {}
        
        for item in all_data:
            item_data = json.loads(item.data) if isinstance(item.data, str) else (item.data or {})
            # 检查分组字段是否存在
            if group_by in item_data:
                raw_val = item_data[group_by]
                if isinstance(raw_val, dict):
                    key = raw_val.get('_text', str(raw_val))
                elif isinstance(raw_val, list):
                    key = ', '.join(str(x) for x in raw_val)
                else:
                    key = str(raw_val) if raw_val is not None else '(空)'
                if key not in group_dict:
                    group_dict[key] = 0
                group_dict[key] += 1
        
        # 转换为列表格式
        for key, count in group_dict.items():
            stats_data.append({
                'group': key,
                'count': count
            })
    else:
        # 默认按日期分组
        group_dict = {}
        
        for item in all_data:
            # 格式化日期 (YYYY-MM-DD)
            date_key = item.created_at.strftime('%Y-%m-%d')
            if date_key not in group_dict:
                group_dict[date_key] = 0
            group_dict[date_key] += 1
        
        # 转换为列表格式并按日期排序
        for date_key in sorted(group_dict.keys()):
            stats_data.append({
                'group': date_key,
                'count': group_dict[date_key]
            })
    
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'table_id': table_id,
            'table_name': table.table_name,
            'start_date': start_date,
            'end_date': end_date,
            'group_by': group_by,
            'total_records': len(all_data),
            'stats_data': stats_data
        }
    }), 200

# 数据导出API
@app.route('/api/v1/tables/<int:table_id>/export', methods=['GET'])
@token_required
def export_table_data(current_user, table_id):
    # 检查表格是否存在
    table = TableStructure.query.get(table_id)
    if not table:
        # 返回404错误，确保JSON格式返回正确
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    try:
        # 获取所有数据
        all_data = InventoryData.query.filter_by(table_id=table_id).all()
        columns = json.loads(table.columns)
        
        # 生成CSV数据
        import csv
        from io import StringIO
        
        # 使用UTF-8编码的StringIO对象，处理中文分隔符
        output = StringIO()
        
        # 写表头
        header = [col['column_name'] for col in columns]
        # 准备CSV数据，确保正确的分隔符
        csv_lines = []
        
        # 添加表头
        csv_lines.append(','.join(header))
        
        # 写数据行
        for item in all_data:
            item_data = json.loads(item.data)
            # 确保每个值都转换为字符串，处理特殊字符
            row = []
            for col in columns:
                value = item_data.get(col['column_name'], '')
                # 如果值为None，转换为空字符串
                if value is None:
                    value = ''
                elif isinstance(value, dict):
                    if '_text' in value:
                        value = str(value['_text'])
                    elif '_storage' in value:
                        value = str(value.get('_text', ''))
                    else:
                        value = json.dumps(value, ensure_ascii=False)
                else:
                    value = str(value)
                # 处理CSV特殊字符
                # 1. 如果值包含逗号、引号或换行符，需要用引号包裹
                # 2. 如果值包含引号，需要转换为双引号
                if ',' in value or '"' in value or '\n' in value or '\r' in value:
                    value = '"' + value.replace('"', '""') + '"'
                row.append(value)
            # 将数据行转换为CSV格式
            csv_lines.append(','.join(row))
        
        # 使用Windows风格的换行符\r\n，确保跨平台兼容性
        csv_content_str = '\r\n'.join(csv_lines)
        # 转换为字节流并添加UTF-8 BOM，确保Windows Excel打开中文不乱码
        csv_content = codecs.BOM_UTF8 + csv_content_str.encode('utf-8')
        
        # 设置响应头
        from flask import Response
        # 确保文件名使用UTF-8编码，解决中文文件名问题
        from urllib.parse import quote
        filename = f'{table.table_name}_export.csv'
        encoded_filename = quote(filename)
        
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{encoded_filename}"',
                'Content-Length': str(len(csv_content)),
                'Content-Type': 'text/csv; charset=utf-8'
            }
        )
    except Exception as e:
        # 打印详细错误信息到日志
        import traceback
        print(f"导出数据发生错误: {traceback.format_exc()}")
        # 返回JSON格式的错误响应
        return jsonify({'code': 500, 'message': f'数据导出失败: {str(e)}', 'data': None}), 500

# 数据导入API
@app.route('/api/v1/tables/<int:table_id>/import', methods=['POST'])
@token_required
def import_table_data(current_user, table_id):
    # 检查表格是否存在
    table = TableStructure.query.get(table_id)
    if not table:
        return jsonify({'code': 404, 'message': '表格结构不存在', 'data': None}), 404
    
    # 检查用户权限
    if current_user.role not in ['admin', 'leader']:
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    try:
        data = request.get_json() or {}
        csv_content = data.get('csv_content')
        
        if not csv_content:
            return jsonify({'code': 400, 'message': 'CSV数据不能为空', 'data': None}), 400
        
        # 解析CSV数据
        import csv
        from io import StringIO
        
        csv_file = StringIO(csv_content)
        reader = csv.reader(csv_file)
        
        # 获取表头
        headers = next(reader, None)
        if not headers:
            return jsonify({'code': 400, 'message': 'CSV文件为空', 'data': None}), 400
        
        # 获取表格列配置
        columns = json.loads(table.columns)
        column_names = [col['column_name'] for col in columns]
        
        # 验证表头与列配置是否匹配
        if len(headers) != len(column_names):
            return jsonify({'code': 400, 'message': f'CSV表头数量不匹配，需要{len(column_names)}列，CSV文件有{len(headers)}列', 'data': None}), 400
        
        for i, header in enumerate(headers):
            if header != column_names[i]:
                return jsonify({'code': 400, 'message': f'CSV表头内容不匹配，第{i+1}列应为"{column_names[i]}"，实际为"{header}"', 'data': None}), 400
        
        # 处理数据行
        success_count = 0
        fail_count = 0
        error_messages = []
        
        for row_num, row in enumerate(reader, start=2):  # 从第2行开始处理数据
            if len(row) != len(columns):
                fail_count += 1
                error_messages.append(f'第{row_num}行，列数不匹配，需要{len(columns)}列，实际有{len(row)}列')
                continue
            
            try:
                # 构建数据字典
                row_data = {}
                for i, col in enumerate(columns):
                    row_data[col['column_name']] = row[i]
                
                # 保存库存数据记录
                new_data = InventoryData(
                    table_id=table_id,
                    data=json.dumps(row_data, ensure_ascii=False),
                    created_by=current_user.id
                )
                db.session.add(new_data)
                success_count += 1
            except Exception as e:
                fail_count += 1
                error_messages.append(f'第{row_num}行，处理失败: {str(e)}')
        
        db.session.commit()

        # 同步更新该表所有自增序列的当前最大值
        try:
            for col in columns:
                if col.get('autoIncrement'):
                    column_name = col['column_name']
                    prefix = col.get('prefix') or ''
                    all_data = InventoryData.query.filter_by(table_id=table_id).all()
                    max_value = 0
                    if all_data:
                        pattern = re.compile(rf'^{re.escape(prefix)}(\d+)$')
                        for item in all_data:
                            try:
                                item_data = json.loads(item.data) if isinstance(item.data, str) else (item.data or {})
                                if column_name in item_data:
                                    val = str(item_data[column_name])
                                    m = pattern.match(val)
                                    if m:
                                        num = int(m.group(1))
                                        if num > max_value:
                                            max_value = num
                            except Exception:
                                pass
                    seq = AutoIncrementSequence.query.filter_by(
                        table_id=table_id,
                        column_name=column_name
                    ).first()
                    if seq:
                        if max_value > seq.current_value:
                            seq.current_value = max_value
                    else:
                        seq = AutoIncrementSequence(
                            table_id=table_id,
                            column_name=column_name,
                            current_value=max_value
                        )
                        db.session.add(seq)
            db.session.commit()
        except Exception as seq_err:
            print(f"Auto-increment sequence sync error in import_table_data: {seq_err}")
        
        return jsonify({
            'code': 200,
            'message': f'数据导入成功，成功{success_count}条，失败{fail_count}条',
            'data': {
                'success_count': success_count,
                'fail_count': fail_count,
                'error_messages': error_messages
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'数据导入失败: {str(e)}', 'data': None}), 500

# Bug反馈API - 提交Bug
@app.route('/api/v1/bugs', methods=['POST'])
@token_required
def submit_bug(current_user):
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    content = (data.get('content') or '').strip()
    
    if not title or not content:
        return jsonify({'code': 400, 'message': '标题和内容不能为空', 'data': None}), 400
    
    try:
        new_bug = BugReport(
            title=title,
            content=content,
            reporter_username=current_user.username
        )
        db.session.add(new_bug)
        db.session.commit()
        return jsonify({
            'code': 200,
            'message': 'Bug反馈提交成功',
            'data': {
                'id': new_bug.id,
                'title': new_bug.title,
                'content': new_bug.content,
                'reporter_username': new_bug.reporter_username,
                'is_resolved': new_bug.is_resolved,
                'created_at': new_bug.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'提交Bug失败: {str(e)}', 'data': None}), 500

# Bug反馈API - 获取所有Bug列表
@app.route('/api/v1/bugs', methods=['GET'])
@token_required
def get_bugs(current_user):
    # 所有人都可以查看Bug列表
    try:
        bugs = BugReport.query.all()
        bugs_data = []
        for bug in bugs:
            bugs_data.append({
                'id': bug.id,
                'title': bug.title,
                'content': bug.content,
                'reporter_username': bug.reporter_username,
                'is_resolved': bug.is_resolved,
                'created_at': bug.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'updated_at': bug.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return jsonify({
            'code': 200,
            'message': 'success',
            'data': {
                'items': bugs_data,
                'total': len(bugs_data)
            }
        }), 200
    except Exception as e:
        return jsonify({'code': 500, 'message': f'获取Bug列表失败: {str(e)}', 'data': None}), 500

# Bug反馈API - 更新Bug状态
@app.route('/api/v1/bugs/<int:bug_id>', methods=['PUT'])
@token_required
def update_bug(current_user, bug_id):
    # 只有admin可以更新Bug状态
    if current_user.username != 'admin':
        return jsonify({'code': 403, 'message': '权限不足，只有admin用户可以更新Bug状态', 'data': None}), 403
    
    bug = BugReport.query.get(bug_id)
    if not bug:
        return jsonify({'code': 404, 'message': 'Bug不存在', 'data': None}), 404
    
    try:
        bug.is_resolved = not bug.is_resolved
        db.session.commit()
        return jsonify({
            'code': 200,
            'message': 'Bug状态更新成功',
            'data': {
                'id': bug.id,
                'is_resolved': bug.is_resolved
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'更新Bug状态失败: {str(e)}', 'data': None}), 500

# Bug反馈API - 删除Bug
@app.route('/api/v1/bugs/<int:bug_id>', methods=['DELETE'])
@token_required
def delete_bug(current_user, bug_id):
    # 只有admin可以删除Bug
    if current_user.username != 'admin':
        return jsonify({'code': 403, 'message': '权限不足，只有admin用户可以删除Bug', 'data': None}), 403
    
    bug = BugReport.query.get(bug_id)
    if not bug:
        return jsonify({'code': 404, 'message': 'Bug不存在', 'data': None}), 404
    
    try:
        db.session.delete(bug)
        db.session.commit()
        return jsonify({
            'code': 200,
            'message': 'Bug删除成功',
            'data': None
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'删除Bug失败: {str(e)}', 'data': None}), 500

# 数据导出API - 将所有表格数据导出为XLS文件
@app.route('/api/v1/export-all-data', methods=['GET'])
@token_required
def export_all_data(current_user):
    # 检查用户权限，只有admin角色可以执行此操作
    if current_user.role != 'admin':
        # 记录操作日志
        log = OperationLog(
            user_id=current_user.id,
            operation='export_all_data',
            table_id=None,
            data_id=None
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'code': 403, 'message': '权限不足，只有管理员可以执行此操作', 'data': None}), 403
    
    try:
        print("开始执行导出所有数据功能")
        from io import BytesIO
        from openpyxl import Workbook
        
        # 创建工作簿
        wb = Workbook()
        print("成功创建工作簿")
        
        # 获取所有表格结构
        tables = TableStructure.query.all()
        print(f"成功获取{len(tables)}个表格结构")
        
        if not tables:
            print("没有可导出的表格数据")
            return jsonify({'code': 400, 'message': '没有可导出的表格数据', 'data': None}), 400
        
        # 删除默认工作表
        # 遍历所有工作表，删除名称为'Sheet'或'Sheet1'的默认工作表
        for sheet in wb.sheetnames:
            if sheet in ['Sheet', 'Sheet1']:
                del wb[sheet]
                print(f"成功删除默认工作表: {sheet}")
                break
        
        # 为每个表格创建一个工作表
        for table in tables:
            table_name = table.table_name
            print(f"\n===== 开始处理表格: {table_name} (ID: {table.id}) =====")
            
            # 输出表格完整信息
            print(f"表格完整信息: {table}")
            print(f"表格columns字段原始内容: {table.columns}")
            
            # 解析columns
            try:
                columns = json.loads(table.columns)
                print(f"成功解析表格{table_name}的columns: {len(columns)}列")
                print(f"列配置详情: {columns}")
            except json.JSONDecodeError as e:
                print(f"解析表格{table_name}的columns失败: {str(e)}")
                print(f"columns原始内容: {table.columns}")
                continue  # 跳过无法解析columns的表格
            
            # 显示当前工作簿中的工作表（创建数据工作表前）
            print(f"当前工作簿中的工作表（创建数据工作表前）: {wb.sheetnames}")
            
            # 创建数据工作表与属性工作表，确保无非法字符且名称唯一不冲突
            def _get_unique_sheet_title(base_name):
                clean_name = re.sub(r'[\\/?*:[\]]', '_', base_name).strip()[:28] or 'Sheet'
                cand = clean_name
                c_idx = 1
                while cand in wb.sheetnames:
                    cand = f"{clean_name[:24]}_{c_idx}"
                    c_idx += 1
                return cand

            data_sheet_name = _get_unique_sheet_title(table_name)
            data_ws = wb.create_sheet(title=data_sheet_name)
            print(f"成功创建数据工作表: {data_sheet_name}")
            print(f"数据工作表对象: {data_ws}")
            print(f"当前工作簿中的工作表（创建数据工作表后）: {wb.sheetnames}")
            
            properties_sheet_name = _get_unique_sheet_title(f"{table_name[:20]}_属性")
            properties_ws = wb.create_sheet(title=properties_sheet_name)
            print(f"成功创建列属性工作表: {properties_sheet_name}")
            print(f"属性工作表对象: {properties_ws}")
            print(f"当前工作簿中的工作表（创建属性工作表后）: {wb.sheetnames}")
            
            # 写入列属性工作表
            # 列属性表头
            properties_headers = ['column_name', 'data_type', 'dropDown', 'autoIncrement', 'prefix', 'hidden', 'is_storage']
            print(f"写入属性工作表表头: {properties_headers}")
            headers_result = properties_ws.append(properties_headers)
            print(f"写入表头结果: {headers_result}")
            
            # 验证表头写入
            header_row = next(properties_ws.iter_rows(min_row=1, max_row=1, values_only=True))
            print(f"属性工作表表头实际内容: {header_row}")
            
            # 写入列属性数据
            print("开始写入列属性数据:")
            for i, col in enumerate(columns):
                properties_row = [
                    col.get('column_name', ''),
                    col.get('data_type', 'string'),
                    col.get('dropDown', False),
                    col.get('autoIncrement', False),
                    col.get('prefix', ''),
                    col.get('hidden', False),
                    col.get('is_storage', False)
                ]
                print(f"写入第{i+1}列属性: {properties_row}")
                row_result = properties_ws.append(properties_row)
                print(f"写入行结果: {row_result}")
                
                # 验证写入是否成功
                row_count = sum(1 for _ in properties_ws.iter_rows())
                print(f"属性工作表当前行数: {row_count}")
                
                # 读取并打印刚刚写入的行
                written_row = next(properties_ws.iter_rows(min_row=i+2, max_row=i+2, values_only=True))
                print(f"刚刚写入的行实际内容: {written_row}")
            
            # 验证属性工作表完整内容
            print(f"\n=== 属性工作表{properties_sheet_name}完整内容 ===")
            for i, row in enumerate(properties_ws.iter_rows(), 1):
                row_values = [cell.value for cell in row]
                print(f"第{i}行: {row_values}")
            
            print(f"\n===== 成功处理表格: {table_name} =====")
            
            # 获取表格数据
            all_data = InventoryData.query.filter_by(table_id=table.id).all()
            print(f"成功获取表格{table_name}的{len(all_data)}条数据")
            
            # 生成数据工作表表头，包含所有列名和创建时间
            data_headers = [col['column_name'] for col in columns] + ['创建时间']
            data_ws.append(data_headers)
            print(f"成功写入数据工作表表头: {data_headers}")
            
            # 写数据行
            for i, item in enumerate(all_data):
                try:
                    print(f"处理表格{table_name}的数据行 {i+1}/{len(all_data)}")
                    
                    # 将JSON字符串转换为Python对象
                    item_data = json.loads(item.data)
                    
                    # 处理数据行
                    row = []
                    for col in columns:
                        value = item_data.get(col['column_name'], '')
                        # 确保value不是None
                        if value is None:
                            value = ''
                        
                        # 处理链接对象和存储对象，提取文本部分
                        if isinstance(value, dict):
                            if '_text' in value:
                                value = value['_text']
                            elif '_storage' in value:
                                value = value.get('_text', '')
                            else:
                                value = json.dumps(value)
                        
                        # 确保value是基本类型，可被Excel处理
                        if not isinstance(value, (str, int, float, bool)):
                            value = str(value)
                        
                        row.append(value)
                    
                    # 添加创建时间
                    row.append(item.created_at.strftime('%Y-%m-%d %H:%M:%S'))
                    data_ws.append(row)
                    print(f"成功写入表格{table_name}的数据行 {i+1}")
                except Exception as e:
                    print(f"处理表格{table_name}的数据行 {i+1}失败: {str(e)}")
                    # 打印详细错误信息，便于调试
                    print(f"数据行原始内容: {item.data}")
                    import traceback
                    traceback.print_exc()
                    continue  # 跳过无法处理的数据行
            
            print(f"成功写入表格{table_name}的所有数据")
        
        # 保存工作簿前的最终检查
        print(f"\n=== 保存工作簿前的最终检查 ===")
        print(f"工作簿中包含的所有工作表: {wb.sheetnames}")
        
        # 检查每个属性工作表的内容
        for sheet_name in wb.sheetnames:
            if sheet_name.endswith('_属性'):
                print(f"\n=== 属性工作表{sheet_name}最终内容 ===")
                ws = wb[sheet_name]
                for i, row in enumerate(ws.iter_rows(), 1):
                    row_values = [cell.value for cell in row]
                    print(f"第{i}行: {row_values}")
        
        # ===== 导出冻存数据 =====
        print("\n===== 开始导出冻存管理数据 =====")
        tanks = NitrogenTank.query.all()
        if tanks:
            # Tanks sheet
            tank_ws = wb.create_sheet(title='_cryo_tanks')
            tank_ws.append(['id', 'name', 'description', 'created_at'])
            for t in tanks:
                tank_ws.append([t.id, t.name, t.description or '',
                    t.created_at.strftime('%Y-%m-%d %H:%M:%S') if t.created_at else ''])
            print(f"导出 {len(tanks)} 个液氮罐")

            # Boxes sheet
            box_ws = wb.create_sheet(title='_cryo_boxes')
            box_ws.append(['id', 'tank_name', 'box_name', 'box_description', 'created_at'])
            boxes = CryoBox.query.all()
            for b in boxes:
                tank = NitrogenTank.query.get(b.tank_id)
                box_ws.append([b.id, tank.name if tank else '', b.box_name,
                    b.box_description or '',
                    b.created_at.strftime('%Y-%m-%d %H:%M:%S') if b.created_at else ''])
            print(f"导出 {len(boxes)} 个冻存盒")

            # Cells sheet
            cell_ws = wb.create_sheet(title='_cryo_cells')
            cell_ws.append(['box_name', 'row', 'col', 'label', 'is_manual', 'reason',
                'linked_table_name', 'linked_data_index'])
            cells = CryoCell.query.all()
            # Pre-build data row index lookup: {table_id: {data_id: index}}
            data_index_map = {}
            for table in tables:
                all_rows = InventoryData.query.filter_by(table_id=table.id).order_by(InventoryData.created_at).all()
                data_index_map[table.id] = {row.id: idx for idx, row in enumerate(all_rows)}
            for c in cells:
                box = CryoBox.query.get(c.box_id)
                box_name = box.box_name if box else ''
                try:
                    cell_data = json.loads(c.data) if c.data else {}
                except Exception:
                    cell_data = {}
                is_manual = cell_data.get('_manual', False)
                reason = cell_data.get('_reason', '')
                r_idx = c.row - 1
                row_char = ROW_LABELS[r_idx] if (0 <= r_idx < len(ROW_LABELS)) else str(c.row)
                label = f'{row_char}{c.col}'

                # Linked info for re-linking on import
                linked_table_name = ''
                linked_data_index = ''
                if c.linked_table_id and c.linked_data_id:
                    lt = TableStructure.query.get(c.linked_table_id)
                    linked_table_name = lt.table_name if lt else ''
                    idx_map = data_index_map.get(c.linked_table_id, {})
                    linked_data_index = str(idx_map.get(c.linked_data_id, ''))

                cell_ws.append([box_name, c.row, c.col, label, str(is_manual), reason,
                    linked_table_name, linked_data_index])
            print(f"导出 {len(cells)} 个冻存格子")

        # 将工作簿保存到BytesIO对象
        print("\n=== 开始保存工作簿到BytesIO对象 ===")
        output = BytesIO()
        wb.save(output)
        print(f"工作簿保存成功，BytesIO位置: {output.tell()}字节")
        
        output.seek(0)
        print(f"BytesIO重置位置: {output.tell()}字节")
        
        # 记录操作日志
        log = OperationLog(
            user_id=current_user.id,
            operation='export_all_data',
            table_id=None,
            data_id=None
        )
        db.session.add(log)
        db.session.commit()
        print("成功记录操作日志")
        
        # 设置响应头
        from flask import Response
        print("准备返回响应")
        
        # 创建响应对象
        response = Response(
            output.getvalue(),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': 'attachment; filename="all_data.xlsx"',
                'Content-Length': str(len(output.getvalue())),
            }
        )
        
        print(f"响应对象创建成功，响应内容长度: {len(output.getvalue())}字节")
        print(f"响应头: {dict(response.headers)}")
        
        return response
    except Exception as e:
        import traceback
        error_msg = f"导出所有数据发生错误: {str(e)}"
        error_trace = traceback.format_exc()
        print(error_msg)
        print(error_trace)
        return jsonify({'code': 500, 'message': f'导出所有数据失败: {str(e)}', 'data': None}), 500

# 数据导入API - 从XLS文件导入数据
@app.route('/api/v1/import-data', methods=['POST'])
@token_required
def import_data(current_user):
    # 检查用户权限，只有admin角色可以执行此操作
    if current_user.role != 'admin':
        # 记录操作日志
        log = OperationLog(
            user_id=current_user.id,
            operation='import_data',
            table_id=None,
            data_id=None
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'code': 403, 'message': '权限不足，只有管理员可以执行此操作', 'data': None}), 403
    
    try:
        # 检查是否有文件上传
        if 'file' not in request.files:
            return jsonify({'code': 400, 'message': '请选择要导入的XLS文件', 'data': None}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'code': 400, 'message': '请选择要导入的XLS文件', 'data': None}), 400
        
        # 检查文件扩展名
        if not file.filename.endswith('.xlsx') and not file.filename.endswith('.xls'):
            return jsonify({'code': 400, 'message': '只支持XLS和XLSX文件格式', 'data': None}), 400
        
        from openpyxl import load_workbook
        
        # 读取文件内容
        wb = load_workbook(file)
        
        # 处理每个工作表
        results = []
        imported_tables = []
        
        # 首先区分数据工作表和属性工作表
        data_sheets = []
        properties_sheets = {}
        
        for sheet_name in wb.sheetnames:
            if sheet_name.startswith('_cryo_'):
                continue  # 冻存数据工作表，稍后单独处理
            if sheet_name.endswith('_属性'):
                # 属性工作表，提取原始表格名称
                original_table_name = sheet_name[:-3]  # 移除'_属性'后缀
                properties_sheets[original_table_name] = sheet_name
            else:
                # 数据工作表
                data_sheets.append(sheet_name)
        
        print(f"识别到数据工作表: {data_sheets}")
        print(f"识别到属性工作表: {properties_sheets}")
        
        # 处理每个数据工作表
        print(f"准备处理{len(data_sheets)}个数据工作表")
        for i, sheet_name in enumerate(data_sheets):
            print(f"\n===== 开始处理第{i+1}个数据工作表: {sheet_name} =====")
            ws = wb[sheet_name]
            imported_tables.append(sheet_name)
            
            # 获取表头
            try:
                header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
                print(f"工作表{sheet_name}的表头: {header_row}")
                print(f"表头长度: {len(header_row)}")
            except StopIteration:
                print(f"工作表{sheet_name}没有表头行")
                results.append({
                    'table_name': sheet_name,
                    'status': 'failed',
                    'message': '工作表没有表头行'
                })
                continue
            
            if len(header_row) < 2:  # 至少需要一个列名和一个数据行
                print(f"工作表{sheet_name}表头格式不正确，至少需要一个列名和一个数据行")
                results.append({
                    'table_name': sheet_name,
                    'status': 'failed',
                    'message': '表头格式不正确，至少需要一个列名和一个数据行'
                })
                continue
            
            # 检查是否包含创建时间列
            created_at_column_index = None
            for i, header in enumerate(header_row):
                if header == '创建时间':
                    created_at_column_index = i
                    break
            
            if created_at_column_index is None:
                print(f"工作表{sheet_name}缺少创建时间列")
                results.append({
                    'table_name': sheet_name,
                    'status': 'failed',
                    'message': '缺少创建时间列'
                })
                continue
            else:
                print(f"工作表{sheet_name}的创建时间列索引: {created_at_column_index}")
            
            # 获取数据列名
            data_headers = header_row[:created_at_column_index] + header_row[created_at_column_index+1:]
            
            # 查找对应的属性工作表
            columns_def = []
            properties_ws = None
            
            print(f"准备查找表格{sheet_name}的属性工作表")
            print(f"当前properties_sheets字典: {properties_sheets}")
            
            if sheet_name in properties_sheets:
                # 找到属性工作表
                properties_sheet_name = properties_sheets[sheet_name]
                print(f"找到表格{sheet_name}的属性工作表: {properties_sheet_name}")
                
                try:
                    properties_ws = wb[properties_sheet_name]
                    print(f"成功获取属性工作表对象")
                except KeyError:
                    print(f"无法找到属性工作表{properties_sheet_name}")
                    # 使用默认配置
                    for header in data_headers:
                        columns_def.append({
                            'column_name': header,
                            'data_type': 'string',
                            'hidden': False
                        })
                    
                # 读取属性工作表数据
                try:
                    properties_rows = list(properties_ws.iter_rows(min_row=1, values_only=True))
                    print(f"属性工作表{properties_sheet_name}共有{len(properties_rows)}行数据")
                    
                    if len(properties_rows) < 2:  # 至少需要表头和一行数据
                        print(f"属性工作表{properties_sheet_name}格式不正确，使用默认配置")
                        # 使用默认配置
                        for header in data_headers:
                            columns_def.append({
                                'column_name': header,
                                'data_type': 'string',
                                'hidden': False
                            })
                    else:
                        # 解析属性工作表
                        properties_header = properties_rows[0]
                        print(f"属性工作表{properties_sheet_name}的表头: {properties_header}")
                        
                        # 验证属性表头
                        expected_headers = ['column_name', 'data_type', 'dropDown', 'autoIncrement', 'prefix', 'hidden', 'is_storage']
                        if list(properties_header) != expected_headers:
                            print(f"属性工作表{properties_sheet_name}表头不匹配，使用默认配置")
                            # 使用默认配置
                            for header in data_headers:
                                columns_def.append({
                                    'column_name': header,
                                    'data_type': 'string',
                                    'hidden': False
                                })
                        else:
                            # 使用属性工作表定义的列配置
                            for row in properties_rows[1:]:
                                if len(row) >= 6:
                                    is_storage_val = bool(row[6]) if len(row) > 6 else False
                                    columns_def.append({
                                        'column_name': row[0] or '',
                                        'data_type': row[1] or 'string',
                                        'dropDown': bool(row[2]),
                                        'autoIncrement': False if is_storage_val else bool(row[3]),
                                        'prefix': '' if is_storage_val else (row[4] or ''),
                                        'hidden': bool(row[5]),
                                        'is_storage': is_storage_val
                                    })
                            print(f"成功读取表格{sheet_name}的列属性: {len(columns_def)}列")
                except Exception as e:
                    print(f"读取属性工作表{properties_sheet_name}失败: {str(e)}")
                    # 使用默认配置
                    for header in data_headers:
                        columns_def.append({
                            'column_name': header,
                            'data_type': 'string',
                            'hidden': False
                        })
            else:
                # 没有属性工作表，使用默认配置
                print(f"未找到表格{sheet_name}的属性工作表，使用默认配置")
                for header in data_headers:
                    columns_def.append({
                        'column_name': header,
                        'data_type': 'string',
                        'hidden': False,
                        'is_storage': False
                    })
            
            print(f"表格{sheet_name}的列配置: {columns_def}")
            
            try:
                # 检查表格是否已存在
                existing_table = TableStructure.query.filter_by(table_name=sheet_name).first()
                
                if existing_table:
                    # 如果表格已存在，删除现有表格及其数据
                    print(f"表格{sheet_name}已存在，删除现有表格和数据")
                    old_data_ids = [d.id for d in InventoryData.query.filter_by(table_id=existing_table.id).all()]
                    if old_data_ids:
                        CryoCell.query.filter(CryoCell.linked_data_id.in_(old_data_ids)).delete(synchronize_session=False)
                    CryoCell.query.filter_by(linked_table_id=existing_table.id).delete(synchronize_session=False)
                    InventoryData.query.filter_by(table_id=existing_table.id).delete()
                    AutoIncrementSequence.query.filter_by(table_id=existing_table.id).delete()
                    db.session.delete(existing_table)
                    print(f"成功删除现有表格和数据")
                
                # 创建新的表格结构
                columns_json = json.dumps(columns_def)
                
                new_table = TableStructure(
                    table_name=sheet_name,
                    columns=columns_json
                )
                db.session.add(new_table)
                db.session.flush()  # 获取新表ID，但不提交事务
                print(f"成功创建表格{sheet_name}，ID: {new_table.id}")
                
                # 初始化自增序列
                for col in columns_def:
                    if col.get('autoIncrement'):
                        column_name = col['column_name']
                        # 创建自增序列，初始值为0
                        sequence = AutoIncrementSequence(
                            table_id=new_table.id,
                            column_name=column_name,
                            current_value=0
                        )
                        db.session.add(sequence)
                
                # 提交表格和序列创建
                db.session.commit()
                print(f"成功初始化表格{sheet_name}的自增序列")
            except Exception as e:
                # 回滚事务
                db.session.rollback()
                print(f"创建表格{sheet_name}失败: {str(e)}")
                results.append({
                    'table_name': sheet_name,
                    'status': 'failed',
                    'message': f'创建表格结构失败: {str(e)}'
                })
                continue
            
            # 处理数据行
            success_count = 0
            fail_count = 0
            error_messages = []
            
            try:
                # 从第二行开始读取数据
                for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                    if len(row) < created_at_column_index + 1:
                        fail_count += 1
                        error_messages.append(f'第{row_num}行，数据为空')
                        continue
                    
                    try:
                        # 构建数据字典
                        row_data = {}
                        for i, header in enumerate(data_headers):
                            if i < len(row):
                                row_data[header] = str(row[i]) if row[i] is not None else ''
                            else:
                                row_data[header] = ''
                        
                        # 获取创建时间值
                        created_at_str = row[created_at_column_index]
                        created_at = None
                        if created_at_str:
                            # 尝试解析时间字符串
                            from datetime import datetime
                            try:
                                created_at = datetime.strptime(created_at_str, '%Y-%m-%d %H:%M:%S')
                            except ValueError:
                                # 如果时间格式不正确，使用当前时间
                                from datetime import datetime
                                created_at = datetime.now()
                        else:
                            # 如果没有创建时间，使用当前时间
                            from datetime import datetime
                            created_at = datetime.now()
                        
                        # 保存库存数据记录
                        new_data = InventoryData(
                            table_id=new_table.id,
                            data=json.dumps(row_data, ensure_ascii=False),
                            created_by=current_user.id,
                            created_at=created_at
                        )
                        db.session.add(new_data)
                        success_count += 1
                    except Exception as e:
                        fail_count += 1
                        error_messages.append(f'第{row_num}行，处理失败: {str(e)}')
                
                # 提交数据
                db.session.commit()
                print(f"成功导入表格{sheet_name}的{success_count}条数据")
            except Exception as e:
                # 回滚事务
                db.session.rollback()
                print(f"导入表格{sheet_name}的数据失败: {str(e)}")
                results.append({
                    'table_name': sheet_name,
                    'status': 'failed',
                    'message': f'导入数据失败: {str(e)}',
                    'success_count': 0,
                    'fail_count': 0,
                    'error_messages': [f'数据导入失败: {str(e)}']
                })
                continue
            
            # 更新自增序列的当前值
            try:
                for col in columns_def:
                    if col.get('autoIncrement'):
                        column_name = col['column_name']
                        prefix = col.get('prefix', '')
                        
                        # 获取该列的最大值
                        all_data = InventoryData.query.filter_by(table_id=new_table.id).all()
                        max_value = 0
                        
                        if all_data:
                            import re
                            pattern = re.compile(rf'^{re.escape(prefix)}(\d+)$')
                            
                            for item in all_data:
                                item_data = json.loads(item.data)
                                if column_name in item_data:
                                    value = item_data[column_name]
                                    match = pattern.match(value)
                                    if match:
                                        numeric_part = int(match.group(1))
                                        if numeric_part > max_value:
                                            max_value = numeric_part
                        
                        # 更新自增序列
                        sequence = AutoIncrementSequence.query.filter_by(
                            table_id=new_table.id,
                            column_name=column_name
                        ).first()
                        if sequence:
                            sequence.current_value = max_value
                            db.session.commit()
                        print(f"成功更新表格{sheet_name}列{column_name}的自增序列，当前值为{max_value}")
                
                results.append({
                    'table_name': sheet_name,
                    'status': 'success',
                    'message': f'成功导入{success_count}条数据，失败{fail_count}条',
                    'success_count': success_count,
                    'fail_count': fail_count,
                    'error_messages': error_messages
                })
            except Exception as e:
                # 回滚事务
                db.session.rollback()
                print(f"更新自增序列失败: {str(e)}")
                results.append({
                    'table_name': sheet_name,
                    'status': 'failed',
                    'message': f'更新自增序列失败: {str(e)}',
                    'success_count': success_count,
                    'fail_count': fail_count + 1,
                    'error_messages': error_messages + [f'更新自增序列失败: {str(e)}']
                })
                continue
        
        # 记录操作日志
        log = OperationLog(
            user_id=current_user.id,
            operation='import_data',
            table_id=None,
            data_id=None
        )
        db.session.add(log)
        db.session.commit()

        # ===== 导入冻存数据 =====
        cryo_results = []
        try:
            # Name → ID lookups built during import
            tank_name_to_id = {}
            box_name_to_id = {}

            # Import tanks
            if '_cryo_tanks' in wb.sheetnames:
                tws = wb['_cryo_tanks']
                rows = list(tws.iter_rows(min_row=2, values_only=True))
                for row in rows:
                    if not row or len(row) < 2 or not row[1]:
                        continue
                    tank_name = str(row[1]).strip()
                    if not tank_name:
                        continue
                    tank_desc = str(row[2]) if len(row) > 2 and row[2] is not None else ''
                    existing = NitrogenTank.query.filter_by(name=tank_name).first()
                    if not existing:
                        tank = NitrogenTank(name=tank_name, description=tank_desc)
                        db.session.add(tank)
                        db.session.flush()
                        tank_name_to_id[tank_name] = tank.id
                    else:
                        tank_name_to_id[tank_name] = existing.id
                cryo_results.append(f"Imported {len(rows)} tanks")

            # Import boxes
            if '_cryo_boxes' in wb.sheetnames:
                bws = wb['_cryo_boxes']
                rows = list(bws.iter_rows(min_row=2, values_only=True))
                for row in rows:
                    if not row or len(row) < 3:
                        continue
                    tank_name = str(row[1]).strip() if row[1] else ''
                    box_name = str(row[2]).strip() if row[2] else ''
                    if not box_name:
                        continue
                    tank_id = tank_name_to_id.get(tank_name)
                    if not tank_id:
                        continue
                    box_desc = str(row[3]) if len(row) > 3 and row[3] is not None else ''
                    existing = CryoBox.query.filter_by(tank_id=tank_id, box_name=box_name).first()
                    if not existing:
                        box = CryoBox(tank_id=tank_id, box_name=box_name,
                            box_description=box_desc, columns='[]')
                        db.session.add(box)
                        db.session.flush()
                        box_name_to_id[f"{tank_name}|{box_name}"] = box.id
                    else:
                        box_name_to_id[f"{tank_name}|{box_name}"] = existing.id
                cryo_results.append(f"Imported {len(rows)} boxes")

            db.session.commit()

            # Import cells and re-link
            if '_cryo_cells' in wb.sheetnames:
                cws = wb['_cryo_cells']
                rows = list(cws.iter_rows(min_row=2, values_only=True))
                linked_cells = []
                for row in rows:
                    if not row or len(row) < 3:
                        continue
                    box_name = str(row[0]).strip() if row[0] else ''
                    try:
                        cell_row = int(row[1]) if row[1] is not None else 0
                    except (ValueError, TypeError):
                        cell_row = 0
                    try:
                        cell_col = int(row[2]) if row[2] is not None else 0
                    except (ValueError, TypeError):
                        cell_col = 0
                    is_manual = (str(row[4]).strip().lower() == 'true') if len(row) > 4 and row[4] is not None else False
                    reason = str(row[5]) if len(row) > 5 and row[5] is not None else ''
                    linked_table_name = str(row[6]).strip() if len(row) > 6 and row[6] is not None else ''
                    linked_data_index_str = str(row[7]).strip() if len(row) > 7 and row[7] is not None else ''

                    # Find box
                    box_id = None
                    for key, bid in box_name_to_id.items():
                        if key.endswith(f"|{box_name}"):
                            box_id = bid
                            break

                    if not box_id or not (1 <= cell_row <= 9) or not (1 <= cell_col <= 9):
                        continue

                    # Check if cell already exists
                    existing = CryoCell.query.filter_by(box_id=box_id, row=cell_row, col=cell_col).first()
                    if existing:
                        continue

                    # Build cell data
                    cell_data = {}
                    if is_manual:
                        cell_data = {'_manual': True, '_reason': reason}
                    elif linked_table_name and linked_data_index_str:
                        # Find linked table and data row by index
                        lt = TableStructure.query.filter_by(table_name=linked_table_name).first()
                        if lt:
                            all_rows = InventoryData.query.filter_by(table_id=lt.id).order_by(InventoryData.created_at).all()
                            try:
                                ld_idx = int(linked_data_index_str)
                            except (ValueError, TypeError):
                                ld_idx = -1
                            if 0 <= ld_idx < len(all_rows):
                                ld = all_rows[ld_idx]
                                cell_data = {
                                    '_linked': True,
                                    '_table_id': lt.id,
                                    '_data_id': ld.id,
                                    '_table_name': lt.table_name,
                                    '_table_columns': json.loads(lt.columns) if lt.columns else [],
                                    '_row_data': json.loads(ld.data) if ld.data else {}
                                }
                                linked_cells.append((box_id, cell_row, cell_col, lt.id, ld.id))

                    if cell_data:
                        cell = CryoCell(box_id=box_id, row=cell_row, col=cell_col,
                            data=json.dumps(cell_data, ensure_ascii=False))
                        if linked_cells and linked_cells[-1][0] == box_id and linked_cells[-1][1] == cell_row and linked_cells[-1][2] == cell_col:
                            cell.linked_table_id = linked_cells[-1][3]
                            cell.linked_data_id = linked_cells[-1][4]
                        db.session.add(cell)

                db.session.commit()
                # Rebuild storage column links in table data
                relinked = 0
                for table_name in imported_tables:
                    table = TableStructure.query.filter_by(table_name=table_name).first()
                    if not table:
                        continue
                    columns = json.loads(table.columns)
                    storage_cols = [c['column_name'] for c in columns if c.get('is_storage')]
                    if not storage_cols:
                        continue

                    all_data = InventoryData.query.filter_by(table_id=table.id).all()
                    for data_row in all_data:
                        row_dict = json.loads(data_row.data)
                        for col_name in storage_cols:
                            # Find cryo cells linked to this data row
                            linked_cells = CryoCell.query.filter_by(
                                linked_table_id=table.id,
                                linked_data_id=data_row.id
                            ).all()

                            if not linked_cells:
                                # If the original value was a storage text string, keep it as-is
                                continue

                            positions = []
                            for lc in linked_cells:
                                box = CryoBox.query.get(lc.box_id)
                                tank = NitrogenTank.query.get(box.tank_id) if box else None
                                positions.append({
                                    'tank_id': tank.id if tank else None,
                                    'tank_name': tank.name if tank else '',
                                    'box_id': lc.box_id,
                                    'box_name': box.box_name if box else '',
                                    'row': lc.row,
                                    'col': lc.col,
                                    'label': f'{ROW_LABELS[lc.row-1]}{lc.col}'
                                })

                            text_parts = [f"{p['tank_name']} > {p['box_name']} > {p['label']}" for p in positions]
                            row_dict[col_name] = {
                                '_storage': True,
                                '_positions': positions,
                                '_text': ', '.join(text_parts)
                            }
                            relinked += 1

                        data_row.data = json.dumps(row_dict, ensure_ascii=False)

                if relinked:
                    db.session.commit()
                    cryo_results.append(f"Relinked {relinked} storage columns")

                cryo_results.append(f"Imported {len(rows)} cells")

        except Exception as e:
            print(f"Import cryo data error: {e}")
            cryo_results.append(f"Cryo import partial: {str(e)}")

        if cryo_results:
            results.append({'cryo_import': cryo_results})

        return jsonify({
            'code': 200,
            'message': '数据导入成功',
            'data': {
                'results': results
            }
        }), 200
    except Exception as e:
        import traceback
        print(f"导入数据发生错误: {traceback.format_exc()}")
        return jsonify({'code': 500, 'message': f'数据导入失败: {str(e)}', 'data': None}), 500

# 修改密码路由
@app.route('/api/v1/auth/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.get_json() or {}
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')
    
    # 验证请求参数
    if not current_password or not new_password or not confirm_password:
        return jsonify({'code': 400, 'message': '当前密码、新密码和确认密码不能为空', 'data': None}), 400
    
    # 验证两次密码输入一致
    if new_password != confirm_password:
        return jsonify({'code': 400, 'message': '新密码和确认密码不一致', 'data': None}), 400
    
    from werkzeug.security import check_password_hash, generate_password_hash
    
    # 验证当前密码是否正确
    if not check_password_hash(current_user.password, current_password):
        return jsonify({'code': 400, 'message': '当前密码错误', 'data': None}), 400
    
    # 只验证密码长度大于零
    if len(new_password) == 0:
        return jsonify({'code': 400, 'message': '新密码不能为空', 'data': None}), 400
    
    # 更新密码
    current_user.password = generate_password_hash(new_password)
    
    try:
        db.session.commit()
        return jsonify({
            'code': 200,
            'message': '密码修改成功',
            'data': None
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'message': f'密码修改失败: {str(e)}', 'data': None}), 500

# ==================== 数据库备份功能 ====================

BACKUP_CONFIG_FILE = os.path.join(get_app_root(), 'instance', 'backup_config.json')
BACKUP_FOLDER = os.path.join(get_app_root(), 'db_backup')

def get_backup_config():
    if os.path.exists(BACKUP_CONFIG_FILE):
        with open(BACKUP_CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'backup_interval_days': 7, 'enabled': False, 'last_backup_time': None}

def save_backup_config(config):
    with open(BACKUP_CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

def create_db_backup():
    try:
        os.makedirs(BACKUP_FOLDER, exist_ok=True)
        
        db_path = os.path.join(get_app_root(), 'instance', 'inventory.db')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'inventory_backup_{timestamp}.db'
        backup_path = os.path.join(BACKUP_FOLDER, backup_filename)
        
        # 使用SQLite官方Online Backup API，防止热备时数据损坏
        import sqlite3
        src_conn = sqlite3.connect(db_path)
        dst_conn = sqlite3.connect(backup_path)
        src_conn.backup(dst_conn)
        dst_conn.close()
        src_conn.close()
        
        config = get_backup_config()
        config['last_backup_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        save_backup_config(config)
        
        print(f'数据库备份成功: {backup_filename}')
        return True, backup_filename
    except Exception as e:
        print(f'数据库备份失败: {str(e)}')
        return False, str(e)

def backup_scheduler_loop():
    while True:
        try:
            config = get_backup_config()
            if config.get('enabled', False):
                interval_days = config.get('backup_interval_days', 7)
                last_backup = config.get('last_backup_time')
                
                if last_backup:
                    last_backup_dt = datetime.strptime(last_backup, '%Y-%m-%d %H:%M:%S')
                    days_since_backup = (datetime.now() - last_backup_dt).days
                    
                    if days_since_backup >= interval_days:
                        create_db_backup()
                else:
                    create_db_backup()
        except Exception as e:
            print(f'备份调度器错误: {str(e)}')
        
        threading.Timer(3600, backup_scheduler_loop).start()
        break

def start_backup_scheduler():
    backup_thread = threading.Thread(target=backup_scheduler_loop, daemon=True)
    backup_thread.start()

@app.route('/api/v1/backup/config', methods=['GET'])
@token_required
def get_backup_config_api(current_user):
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    config = get_backup_config()
    return jsonify({'code': 200, 'message': 'success', 'data': config}), 200

@app.route('/api/v1/backup/config', methods=['POST'])
@token_required
def set_backup_config_api(current_user):
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    try:
        data = request.get_json() or {}
        try:
            backup_interval_days = int(data.get('backup_interval_days', 7))
        except (ValueError, TypeError):
            return jsonify({'code': 400, 'message': '备份间隔必须为有效整数', 'data': None}), 400
        enabled = bool(data.get('enabled', False))
        
        if backup_interval_days < 1:
            return jsonify({'code': 400, 'message': '备份间隔不能少于1天', 'data': None}), 400
        
        config = get_backup_config()
        config['backup_interval_days'] = backup_interval_days
        config['enabled'] = enabled
        save_backup_config(config)
        
        return jsonify({'code': 200, 'message': '备份配置已更新', 'data': config}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'code': 500, 'message': f'保存配置失败: {str(e)}', 'data': None}), 500

@app.route('/api/v1/backup/backup-now', methods=['POST'])
@token_required
def backup_now_api(current_user):
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    success, result = create_db_backup()
    
    if success:
        return jsonify({'code': 200, 'message': f'备份成功: {result}', 'data': {'filename': result}}), 200
    else:
        return jsonify({'code': 500, 'message': f'备份失败: {result}', 'data': None}), 500

@app.route('/api/v1/backup/list', methods=['GET'])
@token_required
def list_backups_api(current_user):
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    try:
        os.makedirs(BACKUP_FOLDER, exist_ok=True)
        files = os.listdir(BACKUP_FOLDER)
        backups = []
        
        for f in files:
            if f.startswith('inventory_backup_') and f.endswith('.db'):
                file_path = os.path.join(BACKUP_FOLDER, f)
                stat = os.stat(file_path)
                backups.append({
                    'filename': f,
                    'size': stat.st_size,
                    'created_time': datetime.fromtimestamp(stat.st_ctime).strftime('%Y-%m-%d %H:%M:%S')
                })
        
        backups.sort(key=lambda x: x['created_time'], reverse=True)
        
        return jsonify({'code': 200, 'message': 'success', 'data': backups}), 200
    except Exception as e:
        return jsonify({'code': 500, 'message': f'获取备份列表失败: {str(e)}', 'data': None}), 500

@app.route('/api/v1/backup/download/<filename>', methods=['GET'])
@token_required
def download_backup_api(current_user, filename):
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    from werkzeug.utils import secure_filename
    safe_filename = secure_filename(filename)
    if not safe_filename or safe_filename != filename or not (safe_filename.startswith('inventory_backup_') and safe_filename.endswith('.db')):
        return jsonify({'code': 400, 'message': '非法备份文件名，仅允许操作标准备份文件', 'data': None}), 400
    
    backup_path = os.path.abspath(os.path.join(BACKUP_FOLDER, safe_filename))
    if not backup_path.startswith(os.path.abspath(BACKUP_FOLDER)):
        return jsonify({'code': 403, 'message': '禁止路径遍历', 'data': None}), 403
    
    if not os.path.exists(backup_path):
        return jsonify({'code': 404, 'message': '备份文件不存在', 'data': None}), 404
    
    return Response(
        open(backup_path, 'rb'),
        mimetype='application/octet-stream',
        headers={'Content-Disposition': f'attachment; filename={safe_filename}'}
    )

@app.route('/api/v1/backup/delete/<filename>', methods=['DELETE'])
@token_required
def delete_backup_api(current_user, filename):
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403
    
    from werkzeug.utils import secure_filename
    safe_filename = secure_filename(filename)
    if not safe_filename or safe_filename != filename or not (safe_filename.startswith('inventory_backup_') and safe_filename.endswith('.db')):
        return jsonify({'code': 400, 'message': '非法备份文件名，仅允许操作标准备份文件', 'data': None}), 400
    
    backup_path = os.path.abspath(os.path.join(BACKUP_FOLDER, safe_filename))
    if not backup_path.startswith(os.path.abspath(BACKUP_FOLDER)):
        return jsonify({'code': 403, 'message': '禁止路径遍历', 'data': None}), 403
    
    if not os.path.exists(backup_path):
        return jsonify({'code': 404, 'message': '备份文件不存在', 'data': None}), 404
    
    try:
        os.remove(backup_path)
        return jsonify({'code': 200, 'message': '删除成功', 'data': None}), 200
    except Exception as e:
        return jsonify({'code': 500, 'message': f'删除失败: {str(e)}', 'data': None}), 500

# ========== 冻存管理 API ==========

# ---------- 液氮罐 CRUD ----------

@app.route('/api/v1/cryo-tanks', methods=['GET'])
@token_required
def get_cryo_tanks(current_user):
    """获取液氮罐列表"""
    tanks = NitrogenTank.query.order_by(NitrogenTank.created_at.desc()).all()
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'items': [{
                'id': t.id,
                'name': t.name,
                'description': t.description,
                'created_at': t.created_at.strftime('%Y-%m-%d %H:%M:%S') if t.created_at else '',
                'updated_at': t.updated_at.strftime('%Y-%m-%d %H:%M:%S') if t.updated_at else ''
            } for t in tanks]
        }
    }), 200


@app.route('/api/v1/cryo-tanks', methods=['POST'])
@token_required
def create_cryo_tank(current_user):
    """创建液氮罐 (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403

    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'code': 400, 'message': '液氮罐名称不能为空', 'data': None}), 400
    if NitrogenTank.query.filter_by(name=name).first():
        return jsonify({'code': 400, 'message': f'液氮罐「{name}」已存在', 'data': None}), 400

    tank = NitrogenTank(
        name=name,
        description=data.get('description', '')
    )
    db.session.add(tank)
    db.session.commit()

    return jsonify({
        'code': 200,
        'message': '液氮罐创建成功',
        'data': {
            'id': tank.id,
            'name': tank.name,
            'description': tank.description
        }
    }), 200


@app.route('/api/v1/cryo-tanks/<int:tank_id>', methods=['PUT'])
@token_required
def update_cryo_tank(current_user, tank_id):
    """更新液氮罐 (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403

    tank = NitrogenTank.query.get(tank_id)
    if not tank:
        return jsonify({'code': 404, 'message': '液氮罐不存在', 'data': None}), 404

    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if name:
        dup = NitrogenTank.query.filter(NitrogenTank.name == name, NitrogenTank.id != tank_id).first()
        if dup:
            return jsonify({'code': 400, 'message': f'液氮罐「{name}」已存在', 'data': None}), 400
        tank.name = name
    if 'description' in data:
        tank.description = data.get('description', '')
    db.session.commit()

    return jsonify({'code': 200, 'message': '液氮罐更新成功', 'data': None}), 200


def _clean_inventory_storage_for_box_ids(box_ids):
    """当冻存盒被删除时，清理库存数据中引用这些盒子的存储位置"""
    if not box_ids:
        return
    linked_cells = CryoCell.query.filter(CryoCell.box_id.in_(box_ids)).all()
    linked_data_ids = {c.linked_data_id for c in linked_cells if c.linked_data_id}
    if linked_data_ids:
        for inv_row in InventoryData.query.filter(InventoryData.id.in_(linked_data_ids)).all():
            try:
                row_dict = json.loads(inv_row.data) if isinstance(inv_row.data, str) else inv_row.data
                changed = False
                for k, v in row_dict.items():
                    if isinstance(v, dict) and v.get('_storage'):
                        positions = v.get('_positions', [])
                        new_pos = [p for p in positions if p.get('box_id') not in box_ids]
                        if len(new_pos) != len(positions):
                            if new_pos:
                                text_parts = [f"{p.get('tank_name','') or ''} > {p.get('box_name','') or ''} > {p.get('label','') or ''}" for p in new_pos]
                                row_dict[k] = {'_storage': True, '_positions': new_pos, '_text': ', '.join(text_parts)}
                            else:
                                row_dict[k] = ''
                            changed = True
                if changed:
                    inv_row.data = json.dumps(row_dict, ensure_ascii=False)
            except Exception:
                pass


@app.route('/api/v1/cryo-tanks/<int:tank_id>', methods=['DELETE'])
@token_required
def delete_cryo_tank(current_user, tank_id):
    """删除液氮罐及其所有盒子和数据 (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403

    tank = NitrogenTank.query.get(tank_id)
    if not tank:
        return jsonify({'code': 404, 'message': '液氮罐不存在', 'data': None}), 404

    # 级联删除：清理库存数据中的位置引用，删除该罐下所有盒子的所有格子，再删除盒子
    boxes = CryoBox.query.filter_by(tank_id=tank_id).all()
    box_ids = [b.id for b in boxes]
    _clean_inventory_storage_for_box_ids(box_ids)
    for box in boxes:
        CryoCell.query.filter_by(box_id=box.id).delete()
        db.session.delete(box)
    db.session.delete(tank)
    db.session.commit()

    return jsonify({'code': 200, 'message': '液氮罐及其所有盒子已删除', 'data': None}), 200


# ---------- 冻存盒 CRUD ----------

@app.route('/api/v1/cryo-tanks/<int:tank_id>/boxes', methods=['GET'])
@token_required
def get_cryo_boxes(current_user, tank_id):
    """获取某液氮罐下的所有冻存盒"""
    tank = NitrogenTank.query.get(tank_id)
    if not tank:
        return jsonify({'code': 404, 'message': '液氮罐不存在', 'data': None}), 404

    boxes = CryoBox.query.filter_by(tank_id=tank_id).order_by(CryoBox.created_at.desc()).all()

    result = []
    for box in boxes:
        columns = json.loads(box.columns) if box.columns else []
        total_cells = 81
        occupied = CryoCell.query.filter_by(box_id=box.id).count()
        result.append({
            'id': box.id,
            'tank_id': box.tank_id,
            'box_name': box.box_name,
            'box_description': box.box_description,
            'columns': columns,
            'occupied': occupied,
            'total': total_cells,
            'created_at': box.created_at.strftime('%Y-%m-%d %H:%M:%S') if box.created_at else '',
            'updated_at': box.updated_at.strftime('%Y-%m-%d %H:%M:%S') if box.updated_at else ''
        })

    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'tank': {
                'id': tank.id,
                'name': tank.name,
                'description': tank.description
            },
            'boxes': result
        }
    }), 200


@app.route('/api/v1/cryo-tanks/<int:tank_id>/boxes', methods=['POST'])
@token_required
def create_cryo_box(current_user, tank_id):
    """创建冻存盒 (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403

    tank = NitrogenTank.query.get(tank_id)
    if not tank:
        return jsonify({'code': 404, 'message': '液氮罐不存在', 'data': None}), 404

    data = request.get_json() or {}
    box_name = (data.get('box_name') or '').strip()
    if not box_name:
        return jsonify({'code': 400, 'message': '盒子名称不能为空', 'data': None}), 400
    if CryoBox.query.filter_by(tank_id=tank_id, box_name=box_name).first():
        return jsonify({'code': 400, 'message': f'该液氮罐下已存在名为「{box_name}」的冻存盒', 'data': None}), 400

    columns = data.get('columns', [])

    box = CryoBox(
        tank_id=tank_id,
        box_name=box_name,
        box_description=data.get('box_description', ''),
        columns=json.dumps(columns, ensure_ascii=False)
    )
    db.session.add(box)
    db.session.commit()

    return jsonify({
        'code': 200,
        'message': '冻存盒创建成功',
        'data': {'id': box.id, 'box_name': box.box_name}
    }), 200


@app.route('/api/v1/cryo-boxes/<int:box_id>', methods=['PUT'])
@token_required
def update_cryo_box(current_user, box_id):
    """更新冻存盒 (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403

    box = CryoBox.query.get(box_id)
    if not box:
        return jsonify({'code': 404, 'message': '冻存盒不存在', 'data': None}), 404

    data = request.get_json() or {}
    if 'box_name' in data:
        new_name = (data['box_name'] or '').strip()
        if not new_name:
            return jsonify({'code': 400, 'message': '盒子名称不能为空', 'data': None}), 400
        dup = CryoBox.query.filter(CryoBox.tank_id == box.tank_id, CryoBox.box_name == new_name, CryoBox.id != box_id).first()
        if dup:
            return jsonify({'code': 400, 'message': f'该液氮罐下已存在名为「{new_name}」的冻存盒', 'data': None}), 400
        box.box_name = new_name
    if 'box_description' in data:
        box.box_description = data.get('box_description', '')
    if 'columns' in data:
        box.columns = json.dumps(data['columns'], ensure_ascii=False)
    db.session.commit()

    return jsonify({'code': 200, 'message': '冻存盒更新成功', 'data': None}), 200


@app.route('/api/v1/cryo-boxes/<int:box_id>', methods=['DELETE'])
@token_required
def delete_cryo_box(current_user, box_id):
    """删除冻存盒及其所有格子数据 (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403

    box = CryoBox.query.get(box_id)
    if not box:
        return jsonify({'code': 404, 'message': '冻存盒不存在', 'data': None}), 404

    _clean_inventory_storage_for_box_ids([box_id])
    CryoCell.query.filter_by(box_id=box_id).delete()
    db.session.delete(box)
    db.session.commit()

    return jsonify({'code': 200, 'message': '冻存盒已删除', 'data': None}), 200


# ---------- 网格数据 API ----------

ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']


def _is_meaningful_cryo_cell(cell):
    """A real occupied cell must have linked data or non-empty content."""
    if not cell:
        return False
    if cell.linked_table_id or cell.linked_data_id:
        return True
    try:
        data_obj = json.loads(cell.data) if isinstance(cell.data, str) else (cell.data or {})
    except Exception:
        data_obj = {}
    return bool(data_obj) and data_obj != {}

@app.route('/api/v1/cryo-boxes/<int:box_id>/grid', methods=['GET'])
@token_required
def get_cryo_grid(current_user, box_id):
    """获取盒子的 9x9 网格数据"""
    box = CryoBox.query.get(box_id)
    if not box:
        return jsonify({'code': 404, 'message': '冻存盒不存在', 'data': None}), 404

    tank = NitrogenTank.query.get(box.tank_id)
    columns = json.loads(box.columns) if box.columns else []

    # 获取所有已占用的格子
    cells = CryoCell.query.filter_by(box_id=box_id).all()
    meaningful_cells = [c for c in cells if _is_meaningful_cryo_cell(c)]

    # 批量预加载关联的表格定义和库存数据，保证返回实时最新的列与数据
    linked_table_ids = {c.linked_table_id for c in meaningful_cells if c.linked_table_id}
    linked_data_ids = {c.linked_data_id for c in meaningful_cells if c.linked_data_id}
    tables_map = {t.id: t for t in TableStructure.query.filter(TableStructure.id.in_(linked_table_ids)).all()} if linked_table_ids else {}
    inv_data_map = {d.id: d for d in InventoryData.query.filter(InventoryData.id.in_(linked_data_ids)).all()} if linked_data_ids else {}

    cell_map = {}
    for cell in meaningful_cells:
        raw_cell_data = json.loads(cell.data) if cell.data else {}
        linked_table = tables_map.get(cell.linked_table_id) if cell.linked_table_id else None
        inv_data = inv_data_map.get(cell.linked_data_id) if cell.linked_data_id else None

        if linked_table and inv_data:
            current_table_columns = json.loads(linked_table.columns) if linked_table.columns else []
            current_row_dict = json.loads(inv_data.data) if isinstance(inv_data.data, str) else (inv_data.data or {})

            display_row_data = {}
            for k, v in current_row_dict.items():
                if isinstance(v, dict) and v.get('_storage'):
                    display_row_data[k] = v.get('_text', '')
                elif isinstance(v, dict) and v.get('_text'):
                    display_row_data[k] = v.get('_text', '')
                else:
                    display_row_data[k] = v

            cell_data = dict(raw_cell_data)
            cell_data['_linked'] = True
            cell_data['_table_id'] = linked_table.id
            cell_data['_data_id'] = inv_data.id
            cell_data['_table_name'] = linked_table.table_name
            cell_data['_table_columns'] = current_table_columns
            cell_data['_row_data'] = display_row_data

            cell_info = {
                'id': cell.id,
                'row': cell.row,
                'col': cell.col,
                'data': cell_data,
                'linked_table_id': cell.linked_table_id,
                'linked_data_id': cell.linked_data_id,
                'linked_table_name': linked_table.table_name,
                'created_at': cell.created_at.strftime('%Y-%m-%d %H:%M:%S') if cell.created_at else '',
                'updated_at': cell.updated_at.strftime('%Y-%m-%d %H:%M:%S') if cell.updated_at else ''
            }
        else:
            cell_info = {
                'id': cell.id,
                'row': cell.row,
                'col': cell.col,
                'data': raw_cell_data,
                'linked_table_id': cell.linked_table_id,
                'linked_data_id': cell.linked_data_id,
                'created_at': cell.created_at.strftime('%Y-%m-%d %H:%M:%S') if cell.created_at else '',
                'updated_at': cell.updated_at.strftime('%Y-%m-%d %H:%M:%S') if cell.updated_at else ''
            }
            if cell.linked_table_id and linked_table:
                cell_info['linked_table_name'] = linked_table.table_name

        cell_map[f"{cell.row},{cell.col}"] = cell_info

    # 构建完整的 9x9 网格 (row 1-9, col 1-9)
    grid = []
    for r in range(1, 10):
        row_data = []
        for c in range(1, 10):
            key = f"{r},{c}"
            if key in cell_map:
                row_data.append(cell_map[key])
            else:
                row_data.append(None)  # 空格子
        grid.append(row_data)

    occupied = len([cell for cell in cells if _is_meaningful_cryo_cell(cell)])
    total = 81

    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'box': {
                'id': box.id,
                'box_name': box.box_name,
                'box_description': box.box_description,
                'tank_id': box.tank_id,
                'tank_name': tank.name if tank else ''
            },
            'columns': columns,
            'grid': grid,
            'row_labels': ROW_LABELS,
            'occupied': occupied,
            'total': total
        }
    }), 200


@app.route('/api/v1/cryo-boxes/<int:box_id>/available-positions', methods=['GET'])
@token_required
def get_available_positions(current_user, box_id):
    """获取盒子的所有空位置"""
    box = CryoBox.query.get(box_id)
    if not box:
        return jsonify({'code': 404, 'message': '冻存盒不存在', 'data': None}), 404

    # 获取已占用的位置
    occupied = [
        cell for cell in CryoCell.query.filter_by(box_id=box_id).all()
        if _is_meaningful_cryo_cell(cell)
    ]
    occupied_set = {(c.row, c.col) for c in occupied}

    # 生成所有空位置列表
    available = []
    for r in range(1, 10):
        for c in range(1, 10):
            if (r, c) not in occupied_set:
                available.append({
                    'row': r,
                    'col': c,
                    'label': f'{ROW_LABELS[r-1]}{c}'
                })

    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'available': available,
            'total': len(available)
        }
    }), 200


@app.route('/api/v1/cryo-boxes/<int:box_id>/cells/<int:row>/<int:col>', methods=['GET'])
@token_required
def get_cryo_cell(current_user, box_id, row, col):
    """获取单个格子数据"""
    if row < 1 or row > 9 or col < 1 or col > 9:
        return jsonify({'code': 400, 'message': '行列必须在1-9范围内', 'data': None}), 400

    cell = CryoCell.query.filter_by(box_id=box_id, row=row, col=col).first()
    if not cell:
        return jsonify({'code': 200, 'message': '空格子', 'data': None}), 200

    raw_cell_data = json.loads(cell.data) if cell.data else {}
    linked_table_name = None

    if cell.linked_table_id and cell.linked_data_id:
        table = TableStructure.query.get(cell.linked_table_id)
        inv = InventoryData.query.get(cell.linked_data_id)
        if table and inv:
            linked_table_name = table.table_name
            current_table_columns = json.loads(table.columns) if table.columns else []
            current_row_dict = json.loads(inv.data) if isinstance(inv.data, str) else (inv.data or {})

            display_row_data = {}
            for k, v in current_row_dict.items():
                if isinstance(v, dict) and v.get('_storage'):
                    display_row_data[k] = v.get('_text', '')
                elif isinstance(v, dict) and v.get('_text'):
                    display_row_data[k] = v.get('_text', '')
                else:
                    display_row_data[k] = v

            raw_cell_data['_linked'] = True
            raw_cell_data['_table_id'] = table.id
            raw_cell_data['_data_id'] = inv.id
            raw_cell_data['_table_name'] = table.table_name
            raw_cell_data['_table_columns'] = current_table_columns
            raw_cell_data['_row_data'] = display_row_data

    return jsonify({
        'code': 200,
        'message': 'success',
        'data': {
            'id': cell.id,
            'row': cell.row,
            'col': cell.col,
            'data': raw_cell_data,
            'linked_table_id': cell.linked_table_id,
            'linked_data_id': cell.linked_data_id,
            'linked_table_name': linked_table_name,
            'created_at': cell.created_at.strftime('%Y-%m-%d %H:%M:%S') if cell.created_at else '',
            'updated_at': cell.updated_at.strftime('%Y-%m-%d %H:%M:%S') if cell.updated_at else ''
        }
    }), 200


@app.route('/api/v1/cryo-boxes/<int:box_id>/cells/<int:row>/<int:col>', methods=['PUT'])
@token_required
def upsert_cryo_cell(current_user, box_id, row, col):
    """创建或更新格子数据"""
    if current_user.role not in ['admin', 'leader', 'member']:
        return jsonify({'code': 403, 'message': '权限不足', 'data': None}), 403

    if row < 1 or row > 9 or col < 1 or col > 9:
        return jsonify({'code': 400, 'message': '行列必须在1-9范围内', 'data': None}), 400

    box = CryoBox.query.get(box_id)
    if not box:
        return jsonify({'code': 404, 'message': '冻存盒不存在', 'data': None}), 404

    data = request.get_json() or {}
    cell_data = data.get('data')
    if not isinstance(cell_data, dict):
        cell_data = {}

    cell = CryoCell.query.filter_by(box_id=box_id, row=row, col=col).first()
    if cell:
        cell.data = json.dumps(cell_data, ensure_ascii=False)
        msg = '格子数据更新成功'
    else:
        cell = CryoCell(
            box_id=box_id,
            row=row,
            col=col,
            data=json.dumps(cell_data, ensure_ascii=False)
        )
        db.session.add(cell)
        msg = '格子数据添加成功'

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        err_msg = str(e)
        if 'UNIQUE constraint' in err_msg or 'duplicate' in err_msg.lower():
            return jsonify({'code': 400, 'message': '该位置已被占用', 'data': None}), 400
        return jsonify({'code': 500, 'message': f'保存格子数据失败: {err_msg}', 'data': None}), 500

    return jsonify({
        'code': 200,
        'message': msg,
        'data': {
            'id': cell.id,
            'row': row,
            'col': col,
            'label': f"{ROW_LABELS[row-1]}{col}"
        }
    }), 200


@app.route('/api/v1/cryo-boxes/<int:box_id>/cells/<int:row>/<int:col>', methods=['DELETE'])
@token_required
def delete_cryo_cell(current_user, box_id, row, col):
    """清空某个格子 (admin/leader only)"""
    if current_user.role not in ['admin', 'leader']:
        return jsonify({'code': 403, 'message': '权限不足，只有管理员和组长可以清空格子', 'data': None}), 403

    if row < 1 or row > 9 or col < 1 or col > 9:
        return jsonify({'code': 400, 'message': '行列必须在1-9范围内', 'data': None}), 400

    cell = CryoCell.query.filter_by(box_id=box_id, row=row, col=col).first()
    if not cell:
        return jsonify({'code': 404, 'message': '该格子已经是空的', 'data': None}), 404

    # 如果该格子关联了表格数据，需要同步更新表格中的存储列
    if cell.linked_table_id and cell.linked_data_id:
        linked_row = InventoryData.query.get(cell.linked_data_id)
        if linked_row:
            table = TableStructure.query.get(cell.linked_table_id)
            if table:
                try:
                    row_data = json.loads(linked_row.data) if isinstance(linked_row.data, str) else (linked_row.data or {})
                    columns = json.loads(table.columns) if isinstance(table.columns, str) else (table.columns or [])

                    for col_def in columns:
                        if col_def.get('is_storage'):
                            col_name = col_def['column_name']
                            storage_val = row_data.get(col_name)
                            if isinstance(storage_val, dict) and storage_val.get('_storage'):
                                positions = storage_val.get('_positions', [])
                                new_positions = [
                                    p for p in positions
                                    if not (p.get('box_id') == box_id and p.get('row') == row and p.get('col') == col)
                                ]
                                if len(new_positions) < len(positions):
                                    if new_positions:
                                        text_parts = [f"{p.get('tank_name','')} > {p.get('box_name','')} > {p.get('label','')}" for p in new_positions]
                                        row_data[col_name] = {
                                            '_storage': True,
                                            '_positions': new_positions,
                                            '_text': ', '.join(text_parts)
                                        }
                                    else:
                                        row_data[col_name] = ''
                                    linked_row.data = json.dumps(row_data, ensure_ascii=False)
                            break
                except Exception:
                    pass

    # 清空格子 + 表格数据更新 → 一次性提交
    db.session.delete(cell)
    db.session.commit()

    return jsonify({'code': 200, 'message': '格子已清空', 'data': None}), 200


# 启动定时备份调度器
start_backup_scheduler()

# 启动应用
if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
