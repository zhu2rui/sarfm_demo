import React, { useState, useContext } from 'react'
import { Card, Button, Input, Form, Space, message, Checkbox } from 'antd'
import axios from 'axios'
import { TableContext } from '../App'
import { useI18n } from '../i18n/I18nContext'

const TableDefinition = () => {
  const [form] = Form.useForm()
  const tableContext = useContext(TableContext)
  const fetchTables = tableContext?.fetchTables || (() => {})
  const { t } = useI18n()
  
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
        message.success(t('tableDefinition.success'))
        form.resetFields()
        fetchTables() // 刷新侧边栏表格列表
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error(t('tableDefinition.success'))
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
        
        <Card title={t('tableDefinition.columnName')} style={{ marginBottom: 16 }}>
          <Form.List name="columns">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'column_name']}
                      rules={[{ required: true, message: t('tableDefinition.columnNameRequired') }]}
                      noStyle
                    >
                      <Input placeholder={t('tableDefinition.columnName')} style={{ width: 150 }} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'data_type']}
                      noStyle
                    >
                      <Input placeholder={t('tableDefinition.columnType')} style={{ width: 150 }} disabled />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'dropDown']}
                      valuePropName="checked"
                      noStyle
                    >
                      <Checkbox>{t('tableDefinition.required')}</Checkbox>
                    </Form.Item>
                    {/* 自增功能配置 */}
                    <Form.Item
                      {...restField}
                      name={[name, 'autoIncrement']}
                      valuePropName="checked"
                      noStyle
                    >
                      <Checkbox>{t('tableDefinition.required')}</Checkbox>
                    </Form.Item>
                    {/* 前缀输入框 - 简化实现，直接显示 */}
                    <Form.Item
                      {...restField}
                      name={[name, 'prefix']}
                      noStyle
                    >
                      <Input 
                        placeholder={t('tableDefinition.columnType')} 
                        style={{ width: 150, marginLeft: 8 }}
                      />
                    </Form.Item>
                    <Button danger onClick={() => remove(name)} disabled={fields.length === 1}>
                      {t('dataManagement.deleteData')}
                    </Button>
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ column_name: '', data_type: 'string', dropDown: false, autoIncrement: false, prefix: '' })} block>
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