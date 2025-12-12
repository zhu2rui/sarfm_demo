# 实验室多端Web库存管理系统API接口设计

## 1. 接口设计规范

### 1.1 基本结构
- **协议**：HTTP/HTTPS
- **API前缀**：`/api/v1`
- **请求方法**：GET, POST, PUT, DELETE
- **数据格式**：JSON
- **认证方式**：JWT Token，放在请求头的`Authorization`字段中，格式为`Bearer <token>`

### 1.2 响应格式
```json
{
  "code": 200,                 // 状态码
  "message": "success",        // 提示信息
  "data": {}                   // 响应数据
}
```

### 1.3 错误码
| 错误码 | 描述 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 2. 认证接口

### 2.1 用户登录
- **URL**：`/api/v1/auth/login`
- **方法**：POST
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | username | string | 是 | 用户名 |
  | password | string | 是 | 密码 |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "登录成功",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "username": "admin",
        "role": "admin",
        "created_at": "2023-01-01T00:00:00Z"
      }
    }
  }
  ```

### 2.2 用户注销
- **URL**：`/api/v1/auth/logout`
- **方法**：POST
- **请求头**：`Authorization: Bearer <token>`
- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "注销成功",
    "data": null
  }
  ```

### 2.3 获取当前用户信息
- **URL**：`/api/v1/auth/me`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  }
  ```

## 3. 表格结构管理接口

### 3.1 创建表格结构
- **URL**：`/api/v1/tables`
- **方法**：POST
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | table_name | string | 是 | 总表名 |
  | columns | array | 是 | 列定义，格式：[{"column_name": "列名", "data_type": "数据类型"}] |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "创建成功",
    "data": {
      "id": 1,
      "table_name": "引物库存表",
      "columns": [{"column_name": "时间", "data_type": "string"}, {"column_name": "姓名", "data_type": "string"}],
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  }
  ```

### 3.2 获取表格结构列表
- **URL**：`/api/v1/tables`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | int | 否 | 页码，默认1 |
  | per_page | int | 否 | 每页条数，默认10 |
  | search | string | 否 | 搜索关键词 |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "items": [
        {
          "id": 1,
          "table_name": "引物库存表",
          "columns": [{"column_name": "时间", "data_type": "string"}, {"column_name": "姓名", "data_type": "string"}],
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ],
      "total": 1,
      "page": 1,
      "per_page": 10
    }
  }
  ```

### 3.3 获取表格结构详情
- **URL**：`/api/v1/tables/{id}`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1,
      "table_name": "引物库存表",
      "columns": [{"column_name": "时间", "data_type": "string"}, {"column_name": "姓名", "data_type": "string"}],
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  }
  ```

### 3.4 更新表格结构
- **URL**：`/api/v1/tables/{id}`
- **方法**：PUT
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | table_name | string | 否 | 总表名 |
  | columns | array | 否 | 列定义，格式：[{"column_name": "列名", "data_type": "数据类型"}] |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "更新成功",
    "data": {
      "id": 1,
      "table_name": "引物库存表",
      "columns": [{"column_name": "时间", "data_type": "string"}, {"column_name": "姓名", "data_type": "string"}, {"column_name": "数量", "data_type": "string"}],
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T01:00:00Z"
    }
  }
  ```

### 3.5 删除表格结构
- **URL**：`/api/v1/tables/{id}`
- **方法**：DELETE
- **请求头**：`Authorization: Bearer <token>`
- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "删除成功",
    "data": null
  }
  ```

## 4. 库存数据管理接口

### 4.1 添加库存数据
- **URL**：`/api/v1/tables/{table_id}/data`
- **方法**：POST
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | data | object | 是 | 库存数据，格式：{"列名1": "值1", "列名2": "值2"} |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "添加成功",
    "data": {
      "id": 1,
      "table_id": 1,
      "data": {"时间": "2023-01-01", "姓名": "张三", "数量": "10"},
      "created_by": 1,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  }
  ```

### 4.2 获取库存数据列表
- **URL**：`/api/v1/tables/{table_id}/data`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | int | 否 | 页码，默认1 |
  | per_page | int | 否 | 每页条数，默认10 |
  | search | string | 否 | 搜索关键词 |
  | filters | string | 否 | 过滤条件，JSON字符串格式 |
  | sort_by | string | 否 | 排序字段 |
  | sort_order | string | 否 | 排序顺序，asc或desc |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "items": [
        {
          "id": 1,
          "table_id": 1,
          "data": {"时间": "2023-01-01", "姓名": "张三", "数量": "10"},
          "created_by": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ],
      "total": 1,
      "page": 1,
      "per_page": 10
    }
  }
  ```

### 4.3 获取库存数据详情
- **URL**：`/api/v1/tables/{table_id}/data/{id}`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1,
      "table_id": 1,
      "data": {"时间": "2023-01-01", "姓名": "张三", "数量": "10"},
      "created_by": 1,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  }
  ```

### 4.4 更新库存数据
- **URL**：`/api/v1/tables/{table_id}/data/{id}`
- **方法**：PUT
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | data | object | 是 | 库存数据，格式：{"列名1": "值1", "列名2": "值2"} |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "更新成功",
    "data": {
      "id": 1,
      "table_id": 1,
      "data": {"时间": "2023-01-01", "姓名": "张三", "数量": "20"},
      "created_by": 1,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T01:00:00Z"
    }
  }
  ```

### 4.5 删除库存数据
- **URL**：`/api/v1/tables/{table_id}/data/{id}`
- **方法**：DELETE
- **请求头**：`Authorization: Bearer <token>`
- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "删除成功",
    "data": null
  }
  ```

### 4.6 批量导入库存数据
- **URL**：`/api/v1/tables/{table_id}/data/import`
- **方法**：POST
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | file | file | 是 | CSV文件 |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "导入成功",
    "data": {
      "success": 10,
      "failed": 0
    }
  }
  ```

### 4.7 导出库存数据
- **URL**：`/api/v1/tables/{table_id}/data/export`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | filters | string | 否 | 过滤条件，JSON字符串格式 |

- **响应数据**：CSV文件

## 5. 报表统计接口

### 5.1 获取库存统计报表
- **URL**：`/api/v1/reports/{table_id}/stats`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | start_date | string | 否 | 开始日期，格式：YYYY-MM-DD |
  | end_date | string | 否 | 结束日期，格式：YYYY-MM-DD |
  | group_by | string | 否 | 分组字段 |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "table_id": 1,
      "table_name": "引物库存表",
      "start_date": "2023-01-01",
      "end_date": "2023-01-31",
      "total_records": 100,
      "stats_data": [
        {"group": "2023-01-01", "count": 10},
        {"group": "2023-01-02", "count": 15}
      ]
    }
  }
  ```

## 6. 用户管理接口

### 6.1 添加用户
- **URL**：`/api/v1/users`
- **方法**：POST
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | username | string | 是 | 用户名 |
  | password | string | 是 | 密码 |
  | role | string | 是 | 角色：admin/leader/member |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "添加成功",
    "data": {
      "id": 2,
      "username": "user1",
      "role": "member",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  }
  ```

### 6.2 获取用户列表
- **URL**：`/api/v1/users`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | int | 否 | 页码，默认1 |
  | per_page | int | 否 | 每页条数，默认10 |
  | search | string | 否 | 搜索关键词 |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "items": [
        {
          "id": 1,
          "username": "admin",
          "role": "admin",
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ],
      "total": 1,
      "page": 1,
      "per_page": 10
    }
  }
  ```

### 6.3 获取用户详情
- **URL**：`/api/v1/users/{id}`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  }
  ```

### 6.4 更新用户信息
- **URL**：`/api/v1/users/{id}`
- **方法**：PUT
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | password | string | 否 | 密码 |
  | role | string | 否 | 角色：admin/leader/member |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "更新成功",
    "data": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T01:00:00Z"
    }
  }
  ```

### 6.5 删除用户
- **URL**：`/api/v1/users/{id}`
- **方法**：DELETE
- **请求头**：`Authorization: Bearer <token>`
- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "删除成功",
    "data": null
  }
  ```

## 7. 系统设置接口

### 7.1 获取系统设置
- **URL**：`/api/v1/settings`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "system_name": "实验室库存管理系统",
      "version": "1.0.0"
    }
  }
  ```

### 7.2 更新系统设置
- **URL**：`/api/v1/settings`
- **方法**：PUT
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | system_name | string | 否 | 系统名称 |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "更新成功",
    "data": {
      "system_name": "实验室库存管理系统",
      "version": "1.0.0"
    }
  }
  ```

### 7.3 备份数据库
- **URL**：`/api/v1/settings/backup`
- **方法**：POST
- **请求头**：`Authorization: Bearer <token>`
- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "备份成功",
    "data": {
      "backup_file": "backup_20230101.sqlite"
    }
  }
  ```

### 7.4 恢复数据库
- **URL**：`/api/v1/settings/restore`
- **方法**：POST
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | file | file | 是 | 备份文件 |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "恢复成功",
    "data": null
  }
  ```

## 8. 操作日志接口

### 8.1 获取操作日志列表
- **URL**：`/api/v1/logs`
- **方法**：GET
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | page | int | 否 | 页码，默认1 |
  | per_page | int | 否 | 每页条数，默认10 |
  | user_id | int | 否 | 操作用户ID |
  | start_time | string | 否 | 开始时间，格式：YYYY-MM-DD HH:MM:SS |
  | end_time | string | 否 | 结束时间，格式：YYYY-MM-DD HH:MM:SS |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "success",
    "data": {
      "items": [
        {
          "id": 1,
          "user_id": 1,
          "username": "admin",
          "operation": "登录系统",
          "table_id": null,
          "data_id": null,
          "created_at": "2023-01-01T00:00:00Z"
        }
      ],
      "total": 1,
      "page": 1,
      "per_page": 10
    }
  }
  ```

### 8.2 清理操作日志
- **URL**：`/api/v1/logs/clean`
- **方法**：POST
- **请求头**：`Authorization: Bearer <token>`
- **请求参数**：
  | 参数名 | 类型 | 必填 | 描述 |
  |--------|------|------|------|
  | days | int | 是 | 保留天数 |

- **响应数据**：
  ```json
  {
    "code": 200,
    "message": "清理成功",
    "data": {
      "deleted": 100
    }
  }
  ```