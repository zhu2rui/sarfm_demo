import React, { useState, useContext } from 'react'
import { Card, Button, Input, Form, Space, message, Checkbox, Tag } from 'antd'
import { HolderOutlined, ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import axios from 'axios'
import { TableContext } from '../App'
import { useI18n } from '../i18n/I18nContext'

const TableDefinition = () => {
  const [form] = Form.useForm()
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const tableContext = useContext(TableContext)
  const fetchTables = tableContext?.fetchTables || (() => {})
  const { t } = useI18n()
  
  // 初始值，包含一列默认列
  const initialValues = {
    tableName: '',
    columns: [{ column_name: '', data_type: 'string', dropDown: false, autoIncrement: false, prefix: '', is_storage: false }]
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

  // 提交表格结构
  const handleSubmit = async (values) => {
    try {
      const sanitizedColumns = (values.columns || []).map(col => {
        if (col.is_storage) {
          return { ...col, autoIncrement: false, prefix: '' };
        }
        return col;
      });
      const response = await axios.post('/api/v1/tables', {
        table_name: values.tableName,
        columns: sanitizedColumns
      })
      
      if (response.data.code === 200) {
        message.success(t('tableDefinition.success'))
        form.resetFields()
        await fetchTables() // 刷新侧边栏表格列表
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || t('tableDefinition.error') || '创建表格失败'
      message.error(errMsg)
      console.error('Create table error:', error)
    }
  }

  return (
    <Card title={t('tableDefinition.title')} style={{ marginBottom: 16 }}>
      <Form 
        layout="vertical" 
        form={form}
        initialValues={initialValues}
        onFinish={handleSubmit}
      >
        <Form.Item label={t('tableDefinition.tableName')} name="tableName" rules={[{ required: true, message: t('tableDefinition.tableNameRequired') }]}>
          <Input placeholder={t('tableDefinition.tableName')} />
        </Form.Item>
        
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span>{t('tableDefinition.columnName')}</span>
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
                      rules={[{ required: true, message: t('tableDefinition.columnNameRequired') }]}
                      noStyle
                    >
                      <Input placeholder={t('tableDefinition.columnName')} style={{ width: 140, flex: '1 1 120px' }} />
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
                                    if (form.setFieldValue) {
                                      form.setFieldValue(['columns', name, 'is_storage'], false);
                                    } else {
                                      form.setFieldsValue({
                                        columns: (form.getFieldValue('columns') || []).map((col, i) => i === name ? { ...col, is_storage: false, autoIncrement: true } : col)
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
                                    if (form.setFieldValue) {
                                      form.setFieldValue(['columns', name, 'autoIncrement'], false);
                                      form.setFieldValue(['columns', name, 'prefix'], '');
                                    } else {
                                      form.setFieldsValue({
                                        columns: (form.getFieldValue('columns') || []).map((col, i) => i === name ? { ...col, autoIncrement: false, prefix: '', is_storage: true } : col)
                                      });
                                    }
                                  }
                                  return checked;
                                }}
                              >
                                <Checkbox style={{ whiteSpace: 'nowrap' }}>{t('tableDefinition.storageColumn')}</Checkbox>
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
                      {t('dataManagement.deleteData')}
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
                    {t('tableDefinition.addColumn')}
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Card>
        
        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            {t('tableDefinition.saveTable')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default TableDefinition