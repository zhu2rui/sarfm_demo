# 实验室多端Web库存管理系统

## 系统概述

基于PRD文档开发的实验室多端Web库存管理系统，支持自定义表格结构、库存管理、角色权限控制和多端兼容，采用React+Flask+SQLite技术栈。

## 技术栈

### 前端
- React.js 18.2.0
- Ant Design 5.12.0
- Vite 5.0.8
- React Router DOM 6.21.0
- Axios 1.6.0
- Recharts 2.10.3

### 后端
- Flask
- Python 3.10.11
- Flask-SQLAlchemy
- Flask-CORS
- JWT
- bcrypt

### 数据库
- SQLite

## 系统功能

1. **用户认证与授权**
   - 登录/注销
   - JWT认证
   - 基于角色的权限控制（admin/leader/member）

2. **表格结构管理**
   - 自定义表格结构
   - 列定义（列名、数据类型）
   - 表格结构的增删改查

3. **库存数据管理**
   - 数据的增删改查
   - 分页查询
   - 按条件筛选

4. **报表统计**
   - 数据统计报表
   - 柱状图展示
   - CSV导出

## 系统部署

### 后端部署

#### 环境要求
- Python 3.8+

#### 部署步骤

1. 进入后端目录
   ```bash
   cd backend
   ```

2. 创建虚拟环境（可选）
   ```bash
   python -m venv venv
   ```

3. 激活虚拟环境
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

4. 安装依赖
   ```bash
   pip install -r requirements.txt
   ```

5. 启动后端服务
   ```bash
   python app.py
   ```

   后端服务将运行在 http://localhost:5000

### 前端部署

#### 环境要求
- Node.js 16+
- npm 8+

#### 部署步骤

1. 进入前端目录
   ```bash
   cd frontend
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 构建生产版本
   ```bash
   npm run build
   ```

4. 部署构建后的文件
   - 构建后的文件位于 `dist` 目录
   - 可使用Nginx、Apache等Web服务器部署

## 开发模式运行

### 后端开发模式
```bash
cd backend
python app.py
```

### 前端开发模式
```bash
cd frontend
npm run dev
```

前端开发服务器将运行在 http://localhost:3000

## API接口文档

### 认证接口
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/me` - 获取当前用户信息

### 表格结构管理
- `POST /api/v1/tables` - 创建表格结构
- `GET /api/v1/tables` - 获取表格结构列表
- `GET /api/v1/tables/{id}` - 获取表格结构详情
- `PUT /api/v1/tables/{id}` - 更新表格结构
- `DELETE /api/v1/tables/{id}` - 删除表格结构

### 库存数据管理
- `POST /api/v1/tables/{table_id}/data` - 添加库存数据
- `GET /api/v1/tables/{table_id}/data` - 获取库存数据列表
- `GET /api/v1/tables/{table_id}/data/{id}` - 获取库存数据详情
- `PUT /api/v1/tables/{table_id}/data/{id}` - 更新库存数据
- `DELETE /api/v1/tables/{table_id}/data/{id}` - 删除库存数据

### 报表统计
- `GET /api/v1/reports/{table_id}/stats` - 获取库存统计报表

### 用户管理
- `GET /api/v1/users` - 获取用户列表
- `POST /api/v1/users` - 添加用户
- `PUT /api/v1/users/{id}` - 更新用户信息
- `DELETE /api/v1/users/{id}` - 删除用户

## 数据库结构

### 用户表（users）
- id: 主键
- username: 用户名（唯一）
- password: 密码（加密存储）
- role: 角色（admin/leader/member）
- created_at: 创建时间
- updated_at: 更新时间

### 表格结构表（table_structures）
- id: 主键
- table_name: 总表名
- columns: 列定义（JSON字符串）
- created_at: 创建时间
- updated_at: 更新时间

### 库存数据表（inventory_data）
- id: 主键
- table_id: 所属表格ID
- data: 库存数据（JSON字符串）
- created_by: 创建者ID
- created_at: 创建时间
- updated_at: 更新时间

### 操作日志表（operation_logs）
- id: 主键
- user_id: 操作用户ID
- operation: 操作描述
- table_id: 涉及的表格ID
- data_id: 涉及的数据ID
- created_at: 操作时间

## 初始账户

系统初始化时会自动创建管理员账户：
- 用户名：admin
- 密码：admin123

## 系统配置

### 环境变量
- `SECRET_KEY` - JWT密钥，默认使用"your-secret-key"

## 注意事项

1. 首次运行时，系统会自动创建数据库文件 `instance/inventory.db`
2. 建议修改初始管理员密码
3. 生产环境中应配置强JWT密钥
4. 生产环境中建议使用更安全的数据库（如MySQL、PostgreSQL）

## 开发规范

### 代码规范
- 前端使用ESLint进行代码检查
- 后端使用PEP8规范

### 提交规范
- 提交信息格式：`类型: 描述`
- 类型包括：feat（新功能）、fix（修复）、docs（文档）、style（格式）、refactor（重构）、test（测试）、chore（构建）

## 系统维护

### 数据库备份
- 定期备份 `instance/inventory.db` 文件

### 日志管理
- 系统操作日志可通过API查询和清理

## 联系方式

如有问题，请联系系统管理员。