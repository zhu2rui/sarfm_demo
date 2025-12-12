import React, { useState, useContext } from 'react'
import { Card, Button, Input, Form, Space, message, Checkbox } from 'antd'
import axios from 'axios'
import { TableContext } from '../App'

const TableDefinition = () => {
  const [form] = Form.useForm()
  const tableContext = useContext(TableContext)
  const fetchTables = tableContext?.fetchTables || (() => {})
  
  // 初始值，包含一列默认列
  const initialValues = {
    tableName: '',
    columns: [{ column_name: '', data_type: 'string', dropDown: false, autoIncrement: false, prefix: '' }]
  }

  // 提交表格结构
  const handleSubmit = async (values) => {
    try {
      const response = await axios.post('/api/v1/tables', {
        table_name: values.tableName,
        columns: values.columns
      })
      
      if (response.data.code === 200) {
        message.success('表格结构创建成功')
        form.resetFields()
        fetchTables() // 刷新侧边栏表格列表
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('创建表格结构失败，请检查网络连接或联系管理员')
      console.error('Create table error:', error)
    }
  }

  return (
    <Card title="表格定义" style={{ marginBottom: 16 }}>
      <Form 
        layout="vertical" 
        form={form}
        initialValues={initialValues}
        onFinish={handleSubmit}
      >
        <Form.Item label="总表名" name="tableName" rules={[{ required: true, message: '请输入总表名!' }]}>
          <Input placeholder="请输入总表名" />
        </Form.Item>
        
        <Card title="列定义" style={{ marginBottom: 16 }}>
          <Form.List name="columns">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'column_name']}
                      rules={[{ required: true, message: '请输入列名!' }]}
                      noStyle
                    >
                      <Input placeholder="列名" style={{ width: 150 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'data_type']}
                      noStyle
                    >
                      <Input placeholder="数据类型" style={{ width: 150 }} disabled />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'dropDown']}
                      valuePropName="checked"
                      noStyle
                    >
                      <Checkbox>下拉显示</Checkbox>
                    </Form.Item>
                    {/* 自增功能配置 */}
                    <Form.Item
                      {...restField}
                      name={[name, 'autoIncrement']}
                      valuePropName="checked"
                      noStyle
                    >
                      <Checkbox>启用自增</Checkbox>
                    </Form.Item>
                    {/* 前缀输入框 - 简化实现，直接显示 */}
                    <Form.Item
                      {...restField}
                      name={[name, 'prefix']}
                      noStyle
                    >
                      <Input 
                        placeholder="自增前缀（可选）" 
                        style={{ width: 150, marginLeft: 8 }}
                      />
                    </Form.Item>
                    <Button danger onClick={() => remove(name)} disabled={fields.length === 1}>
                      删除
                    </Button>
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ column_name: '', data_type: 'string', dropDown: false, autoIncrement: false, prefix: '' })} block>
                    + 添加列
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Card>
        
        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            保存表格
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default TableDefinition