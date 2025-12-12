import React, { useState, useEffect, useContext } from 'react'
import { Card, List, Button, Space, Input, Modal, Form, message, Popconfirm, Checkbox, Descriptions } from 'antd'
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import axios from 'axios'
import { TableContext } from '../App'

const DefinedTables = () => {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingTableId, setDeletingTableId] = useState(null) // 记录正在删除的表格ID，防止重复提交
  const [searchText, setSearchText] = useState('')
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [editForm] = Form.useForm()
  const [currentTable, setCurrentTable] = useState(null)
  const [userRole, setUserRole] = useState('member')
  const tableContext = useContext(TableContext)
  const fetchContextTables = tableContext?.fetchTables || (() => {})

  // 获取用户角色
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'))
    if (user) {
      setUserRole(user.role)
    }
  }, [])

  // 获取表格列表
  const fetchTables = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/v1/tables')
      if (response.data.code === 200) {
        setTables(response.data.data.items)
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('获取表格列表失败')
      console.error('Fetch tables error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时获取表格列表
  useEffect(() => {
    fetchTables()
  }, [])

  // 过滤表格列表
  const filteredTables = tables.filter(table => 
    table.table_name.toLowerCase().includes(searchText.toLowerCase())
  )

  // 显示编辑模态框
  const showEditModal = (table) => {
    setCurrentTable(table)
    editForm.setFieldsValue({
      tableName: table.table_name,
      columns: table.columns
    })
    setIsEditModalVisible(true)
  }
  
  // 显示详情模态框
  const showDetailModal = (table) => {
    setCurrentTable(table)
    setIsDetailModalVisible(true)
  }

  // 处理编辑提交
  const handleEditSubmit = async (values) => {
    if (!currentTable) return
    
    try {
      const response = await axios.put(`/api/v1/tables/${currentTable.id}`, {
        table_name: values.tableName,
        columns: values.columns
      })
      
      if (response.data.code === 200) {
        message.success('表格结构更新成功')
        setIsEditModalVisible(false)
        fetchTables() // 刷新当前页面表格列表
        fetchContextTables() // 刷新侧边栏表格列表
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('更新表格结构失败')
      console.error('Update table error:', error)
    }
  }

  // 处理删除表格
  const handleDeleteTable = async (tableId) => {
    if (deletingTableId) return // 防止重复提交
    
    try {
      setDeletingTableId(tableId) // 设置正在删除的表格ID
      const response = await axios.delete(`/api/v1/tables/${tableId}`)
      
      if (response.data.code === 200) {
        message.success('表格结构删除成功')
        fetchTables() // 刷新当前页面表格列表
        fetchContextTables() // 刷新侧边栏表格列表
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('删除表格结构失败')
      console.error('Delete table error:', error)
    } finally {
      setDeletingTableId(null) // 重置正在删除的表格ID
    }
  }

  return (
    <Card title="已定义表格" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Input.Search 
          placeholder="搜索表格名称" 
          allowClear={true} 
          style={{ width: 300 }} 
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>
      
      <List
        loading={loading}
        grid={{ gutter: 16, column: 1 }}
        dataSource={filteredTables}
        renderItem={(table) => (
          <List.Item>
            <Card
              title={table.table_name}
              extra={
                <Space>
                  <Button type="link" icon={<EyeOutlined />} onClick={() => showDetailModal(table)}>
                    查看
                  </Button>
                  {userRole === 'admin' && (
                    <Button type="link" icon={<EditOutlined />} onClick={() => showEditModal(table)}>
                      编辑
                    </Button>
                  )}
                  {userRole === 'admin' && (
                    <Popconfirm
                      title="确定要删除这个表格吗？"
                      onConfirm={() => handleDeleteTable(table.id)}
                      okText="确定"
                      cancelText="取消"
                      disabled={deletingTableId !== null}
                    >
                      <Button 
                        type="link" 
                        danger 
                        icon={<DeleteOutlined />}
                        loading={deletingTableId === table.id}
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <span style={{ color: '#666' }}>创建时间: {table.created_at}</span>
                  <span style={{ color: '#666' }}>列数量: {table.columns.length}</span>
                  <span style={{ color: '#666' }}>可见列: {table.columns.filter(col => !col.dropDown).length}</span>
                  <span style={{ color: '#666' }}>下拉列: {table.columns.filter(col => col.dropDown).length}</span>
                </Space>
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: '#666', marginRight: 8 }}>列定义:</span>
                  <Space size="small">
                    {table.columns.map((column, index) => (
                      <span 
                          key={column.column_name} 
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            backgroundColor: column.dropDown ? '#f5f5f5' : '#e6f7ff',
                            color: column.dropDown ? '#666' : '#1890ff',
                            fontSize: 12,
                            border: '1px solid',
                            borderColor: column.dropDown ? '#d9d9d9' : '#91d5ff'
                          }}
                        >
                          {column.column_name}{column.dropDown && ' (下拉)'}
                        </span>
                    ))}
                  </Space>
                </div>
              </Space>
            </Card>
          </List.Item>
        )}
      />

      {/* 编辑表格模态框 */}
      <Modal
        title="编辑表格结构"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form 
          layout="vertical" 
          form={editForm}
          onFinish={handleEditSubmit}
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
                      <Button danger onClick={() => remove(name)} disabled={fields.length === 1}>
                        删除
                      </Button>
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add({ column_name: '', data_type: 'string', dropDown: false })} block>
                        + 添加列
                      </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Card>
          
          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Button onClick={() => setIsEditModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 表格详情模态框 */}
      <Modal
        title="表格详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {currentTable && (
          <Descriptions variant="outlined" column={1}>
            <Descriptions.Item label="表格名称">
              {currentTable.table_name}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {currentTable.created_at}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {currentTable.updated_at}
            </Descriptions.Item>
            <Descriptions.Item label="列数量">
              {currentTable.columns.length}
            </Descriptions.Item>
            <Descriptions.Item label="可见列数量">
              {currentTable.columns.filter(col => !col.dropDown).length}
            </Descriptions.Item>
            <Descriptions.Item label="下拉列数量">
              {currentTable.columns.filter(col => col.dropDown).length}
            </Descriptions.Item>
            <Descriptions.Item label="列定义">
              <Space direction="vertical" style={{ width: '100%' }}>
                {currentTable.columns.map((column, index) => (
                  <Card key={column.column_name} size="small" title={`列 ${index + 1}`}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <strong>列名:</strong> {column.column_name}
                      </div>
                      <div>
                        <strong>数据类型:</strong> {column.data_type}
                      </div>
                      <div>
                        <strong>状态:</strong> {column.dropDown ? '下拉' : '可见'}
                      </div>
                    </Space>
                  </Card>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Card>
  )
}

export default DefinedTables