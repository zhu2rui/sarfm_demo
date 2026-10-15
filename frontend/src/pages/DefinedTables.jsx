import React, { useState, useEffect, useContext } from 'react'
import { Card, List, Button, Space, Input, Modal, Form, message, Popconfirm, Checkbox, Descriptions, Tag } from 'antd'
import { EditOutlined, DeleteOutlined, EyeOutlined, HolderOutlined, ArrowUpOutlined, ArrowDownOutlined, PlusOutlined, DatabaseOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { TableContext } from '../App'
import { useI18n } from '../i18n/I18nContext'

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
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const tableContext = useContext(TableContext)
  const navigate = useNavigate()
  const { t } = useI18n()

  // 获取用户角色
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'))
    if (user) {
      setUserRole(user.role)
    }
  }, [])

  // 处理删除所有表格
  const handleDeleteAllTables = async () => {
    try {
      Modal.confirm({
        title: '警告！',
        content: '确定要删除所有表格吗？此操作将删除所有表格及其数据，不可恢复！',
        okText: '确定',
        cancelText: '取消',
        okType: 'danger',
        async onOk() {
          // 调用API删除所有表格
          const response = await axios.delete('/api/v1/tables/all')
          if (response.data.code === 200) {
            message.success('所有表格删除成功')
            try {
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('column_preferences_') || key === 'selectedTableId') {
                  localStorage.removeItem(key)
                }
              })
            } catch (e) {}
            if (tableContext?.setSelectedTableId) {
              tableContext.setSelectedTableId(null)
            }
            await fetchTables() // 刷新当前页面及全局表格列表
          } else {
            message.error(response.data.message)
          }
        }
      })
    } catch (error) {
      message.error('删除所有表格失败')
      console.error('Delete all tables error:', error)
    }
  }

  // 获取表格列表
  const fetchTables = async () => {
    setLoading(true)
    try {
      if (tableContext?.fetchTables) {
        const items = await tableContext.fetchTables()
        if (items && Array.isArray(items)) {
          setTables(items)
          return items
        }
      }
      const response = await axios.get('/api/v1/tables')
      if (response.data.code === 200) {
        const tablesWithDefaults = response.data.data.items.map(table => ({
          ...table,
          columns: table.columns.map(column => ({
            ...column,
            dropDown: column.dropDown || false,
            autoIncrement: column.autoIncrement || false,
            prefix: column.prefix || ''
          }))
        }))
        setTables(tablesWithDefaults)
        return tablesWithDefaults
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
    // 为columns中的每个字段添加默认值，确保dropDown、autoIncrement和prefix属性存在
    const columnsWithDefaults = table.columns.map(column => ({
      ...column,
      dropDown: column.dropDown || false,
      autoIncrement: column.is_storage ? false : (column.autoIncrement || false),
      prefix: column.is_storage ? '' : (column.prefix || ''),
      is_storage: column.is_storage || false
    }))
    editForm.setFieldsValue({
      tableName: table.table_name,
      columns: columnsWithDefaults
    })
    setDraggedIndex(null)
    setDragOverIndex(null)
    setIsEditModalVisible(true)
  }

  // 列拖拽排序处理
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    // 保持状态稳定
  }

  const handleDrop = (e, targetIndex, move) => {
    e.preventDefault()
    const sourceIndex = draggedIndex !== null ? draggedIndex : parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      move(sourceIndex, targetIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }
  
  // 显示详情模态框
  const showDetailModal = (table) => {
    setCurrentTable(table)
    setIsDetailModalVisible(true)
  }

  // 处理编辑提交
  const handleEditSubmit = async (values) => {
    if (!currentTable) return
    
    // 对存储列与自增+前缀做互斥数据规范化
    const sanitizedColumns = (values.columns || []).map(col => {
      if (col.is_storage) {
        return { ...col, autoIncrement: false, prefix: '' };
      }
      return col;
    });

    // 查验自增列数据
    const checkAutoIncrementColumns = async () => {
      for (const [index, column] of sanitizedColumns.entries()) {
        if (column.autoIncrement) {
          // 调用API查验数据
          try {
            const response = await axios.post(`/api/v1/tables/${currentTable.id}/check-auto-increment`, {
              column_name: column.column_name,
              prefix: column.prefix
            })
            
            if (response.data.code === 200) {
              const resData = response.data.data || {}
              const unassignedCount = resData.unassigned_count || 0
              const maxValue = resData.max_value || 0
              const isPrefixChanged = resData.is_prefix_changed
              const oldPrefix = resData.old_prefix || ''
              const newPrefix = column.prefix || ''
              const oldPrefixDisplay = oldPrefix ? `「${oldPrefix}」` : '「(无前缀/纯数字)」'
              const newPrefixDisplay = newPrefix ? `「${newPrefix}」` : '「(无前缀/纯数字)」'
              const sampleOld = resData.sample_old || ''
              const sampleNew = resData.sample_new || ''
              
              let modalTitle = '自增列配置确认'
              let confirmContent = ''

              if (isPrefixChanged) {
                modalTitle = '自增列前缀变更确认'
                confirmContent = `检测到列「${column.column_name}」现有数据统一采用前缀 ${oldPrefixDisplay}。\n\n保存后系统将把该列所有现有记录的前缀从 ${oldPrefixDisplay} 批量修改为 ${newPrefixDisplay}（编号数字保持不变，例如 ${sampleOld} -> ${sampleNew}），后续新建数据也将按新前缀 ${newPrefixDisplay} 继续自增。\n\n是否确认修改？`
                if (unassignedCount > 0) {
                  confirmContent += `\n（同时将为 ${unassignedCount} 条尚未编号的历史记录自动按新前缀补齐编号）`
                }
              } else if (unassignedCount > 0) {
                confirmContent = `列「${column.column_name}」检测到有 ${unassignedCount} 条现有记录尚未编号。保存后系统将自动按记录创建顺序依次补齐自增编号（从已有最大编号 ${maxValue} 之后继续递增），后续新建数据也将继续自增。是否确认保存？`
              } else {
                confirmContent = `列「${column.column_name}」所有数据均符合自增格式。后续新增数据将从已有最大编号（${maxValue}）+1 开始自增。是否确认保存？`
              }
              
              // 数据符合要求，提示用户确认
              const userConfirmed = await new Promise((resolve) => {
                Modal.confirm({
                  title: modalTitle,
                  content: <div style={{ whiteSpace: 'pre-line' }}>{confirmContent}</div>,
                  okText: isPrefixChanged ? '确认修改前缀' : '确认保存',
                  cancelText: '取消',
                  onOk() {
                    resolve(true)
                  },
                  onCancel() {
                    resolve(false)
                  }
                })
              })

              if (!userConfirmed) {
                return false
              }
            } else {
              // 数据不符合要求，弹窗警告用户
              Modal.warning({
                title: '无法保存自增列配置',
                content: response.data.message,
                okText: '我知道了'
              })
              return false
            }
          } catch (error) {
            // 捕获错误并以警告弹窗提示用户（如存在多种编号形式）
            const errMsg = error.response?.data?.message || (error.request ? '无法连接到服务器，请稍后重试' : error.message)
            Modal.warning({
              title: '无法更改前置字符串',
              content: errMsg,
              okText: '我知道了'
            })
            console.error('Check auto increment error:', error)
            return false
          }
        }
      }
      return true // 没有自增列，直接通过
    }
    
    // 执行查验
    const canProceed = await checkAutoIncrementColumns()
    if (!canProceed) return
    
    try {
      const response = await axios.put(`/api/v1/tables/${currentTable.id}`, {
        table_name: values.tableName,
        columns: sanitizedColumns
      })
      
      if (response.data.code === 200) {
        message.success('表格结构更新成功')
        setIsEditModalVisible(false)
        // 清理本地旧的列显示偏好缓存，让新结构（新列、列重命名、下拉属性变更）立即生效
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('column_preferences_') && key.endsWith(`_${currentTable.id}`)) {
              localStorage.removeItem(key)
            }
          })
        } catch (e) {}
        await fetchTables() // 刷新当前页面及全局表格列表
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error(error.response?.data?.message || '更新表格结构失败')
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
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.includes(`_${tableId}`)) {
              localStorage.removeItem(key)
            }
          })
        } catch (e) {}
        if (tableContext?.selectedTableId === tableId) {
          tableContext.setSelectedTableId(null)
          localStorage.removeItem('selectedTableId')
        }
        await fetchTables() // 刷新当前页面及全局表格列表
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error(error.response?.data?.message || '删除表格结构失败')
      console.error('Delete table error:', error)
    } finally {
      setDeletingTableId(null) // 重置正在删除的表格ID
    }
  }

  return (
    <Card title="已定义表格" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Input.Search 
          placeholder="搜索表格名称" 
          allowClear={true} 
          style={{ width: 300 }} 
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {/* 只有用户名为"admin"的管理员才能使用一键删除所有表格功能 */}
        {(() => {
          const user = JSON.parse(localStorage.getItem('user'));
          return user && user.username === 'admin' && user.role === 'admin' && (
            <Button 
              type="danger" 
              onClick={handleDeleteAllTables}
            >
              一键删除所有表格
            </Button>
          );
        })()}
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
                  <Button 
                    type="link" 
                    icon={<DatabaseOutlined />} 
                    onClick={() => {
                      if (tableContext?.setSelectedTableId) {
                        tableContext.setSelectedTableId(table.id)
                      }
                      if (tableContext?.refreshTable) {
                        tableContext.refreshTable()
                      }
                      navigate('/data-management')
                    }}
                  >
                    进入数据
                  </Button>
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
                  {/* 使用水平滚动容器，解决列名标签挤成竖向排布的问题 */}
                  <div style={{
                    display: 'flex',
                    overflowX: 'auto',
                    padding: '4px 0',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#1890ff transparent'
                  }}>
                    {/* 使用Space组件，并设置wrap为false，确保所有标签在同一行 */}
                    <Space size="small" wrap={false}>
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
                            borderColor: column.dropDown ? '#d9d9d9' : '#91d5ff',
                            whiteSpace: 'nowrap', // 确保文字不换行
                            display: 'inline-block', // 确保标签是块级元素，能够设置宽度
                            minWidth: '60px', // 设置最小宽度，确保标签有足够的空间
                            textAlign: 'center' // 文字居中显示
                          }}
                        >
                          {column.column_name}{column.dropDown && ' (下拉)'}
                        </span>
                        ))}
                      </Space>
                    </div>
                  </div>
              </Space>
            </Card>
          </List.Item>
        )}
      />

      {/* 编辑表格模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EditOutlined style={{ color: '#1890ff' }} />
            <span>编辑表格结构</span>
          </div>
        }
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        width={940}
        destroyOnClose
      >
        <Form 
          layout="vertical" 
          form={editForm}
          onFinish={handleEditSubmit}
        >
          <Form.Item label="总表名" name="tableName" rules={[{ required: true, message: '请输入总表名!' }]}>
            <Input placeholder="请输入总表名" />
          </Form.Item>
          
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>列定义</span>
                <span style={{ fontSize: 12, fontWeight: 'normal', color: '#8c8c8c' }}>
                  按住左侧把手可上下拖动调整顺序，或使用上下箭头微调
                </span>
              </div>
            } 
            style={{ marginBottom: 16 }}
          >
            <Form.List name="columns">
              {(fields, { add, remove, move }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <div
                      key={key}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index, move)}
                      onDragEnd={handleDragEnd}
                      className={`column-definition-row ${dragOverIndex === index ? 'is-drag-over' : ''} ${draggedIndex === index ? 'is-dragging' : ''}`}
                    >
                      {/* 拖动把手与排序序号 */}
                      <div className="column-drag-handle" title="按住拖拽调整列顺序">
                        <HolderOutlined style={{ fontSize: 16 }} />
                      </div>
                      <Tag color="blue" style={{ margin: 0, fontWeight: 600, minWidth: 32, textAlign: 'center' }}>
                        #{index + 1}
                      </Tag>

                      {/* 快捷上下微调按钮 */}
                      <Space.Compact size="small" style={{ flexShrink: 0 }}>
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<ArrowUpOutlined />} 
                          disabled={index === 0} 
                          onClick={() => move(index, index - 1)}
                          title="上移"
                        />
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<ArrowDownOutlined />} 
                          disabled={index === fields.length - 1} 
                          onClick={() => move(index, index + 1)}
                          title="下移"
                        />
                      </Space.Compact>

                      {/* 列名输入框 */}
                      <Form.Item
                        {...restField}
                        name={[name, 'column_name']}
                        rules={[{ required: true, message: '请输入列名!' }]}
                        noStyle
                      >
                        <Input placeholder="列名" style={{ width: 140, flex: '1 1 120px' }} />
                      </Form.Item>

                      {/* 数据类型 - 隐藏输入 + 紧凑Tag */}
                      <Form.Item
                        {...restField}
                        name={[name, 'data_type']}
                        noStyle
                        initialValue="string"
                      >
                        <Input type="hidden" />
                      </Form.Item>
                      <Tag style={{ margin: 0, color: '#595959', background: '#f0f0f0', border: '1px solid #d9d9d9', height: 32, lineHeight: '30px', padding: '0 8px', flexShrink: 0 }}>
                        文本
                      </Tag>

                      {/* 选项组与前缀输入框（存储列与自增+前缀互斥） */}
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                          const isStorage = !!getFieldValue(['columns', name, 'is_storage']);
                          return (
                            <>
                              <div className="column-checkboxes" style={{ display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'dropDown']}
                                  valuePropName="checked"
                                  noStyle
                                >
                                  <Checkbox style={{ whiteSpace: 'nowrap' }}>下拉显示</Checkbox>
                                </Form.Item>

                                <Form.Item
                                  {...restField}
                                  name={[name, 'autoIncrement']}
                                  valuePropName="checked"
                                  noStyle
                                  getValueFromEvent={(e) => {
                                    const checked = e?.target?.checked;
                                    if (checked) {
                                      if (editForm.setFieldValue) {
                                        editForm.setFieldValue(['columns', name, 'is_storage'], false);
                                      } else {
                                        editForm.setFieldsValue({
                                          columns: (editForm.getFieldValue('columns') || []).map((col, i) => i === name ? { ...col, is_storage: false, autoIncrement: true } : col)
                                        });
                                      }
                                    }
                                    return checked;
                                  }}
                                >
                                  <Checkbox disabled={isStorage} style={{ whiteSpace: 'nowrap' }}>是否自增</Checkbox>
                                </Form.Item>

                                <Form.Item
                                  {...restField}
                                  name={[name, 'is_storage']}
                                  valuePropName="checked"
                                  noStyle
                                  getValueFromEvent={(e) => {
                                    const checked = e?.target?.checked;
                                    if (checked) {
                                      if (editForm.setFieldValue) {
                                        editForm.setFieldValue(['columns', name, 'autoIncrement'], false);
                                        editForm.setFieldValue(['columns', name, 'prefix'], '');
                                      } else {
                                        editForm.setFieldsValue({
                                          columns: (editForm.getFieldValue('columns') || []).map((col, i) => i === name ? { ...col, autoIncrement: false, prefix: '', is_storage: true } : col)
                                        });
                                      }
                                    }
                                    return checked;
                                  }}
                                >
                                  <Checkbox style={{ whiteSpace: 'nowrap' }}>存储列</Checkbox>
                                </Form.Item>
                              </div>

                              {/* 前缀输入框 */}
                              <Form.Item
                                {...restField}
                                name={[name, 'prefix']}
                                noStyle
                              >
                                <Input 
                                  disabled={isStorage}
                                  placeholder={isStorage ? "存储列无前缀" : "前置字符串(如SN-)"} 
                                  style={{ width: 130, flexShrink: 0 }}
                                />
                              </Form.Item>
                            </>
                          );
                        }}
                      </Form.Item>

                      {/* 删除按钮 */}
                      <Button 
                        danger 
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)} 
                        disabled={fields.length === 1}
                        style={{ marginLeft: 'auto', flexShrink: 0 }}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                  <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                    <Button 
                      type="dashed" 
                      icon={<PlusOutlined />}
                      onClick={() => add({ column_name: '', data_type: 'string', dropDown: false, autoIncrement: false, prefix: '', is_storage: false })} 
                      block
                    >
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