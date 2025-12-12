import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Title } = Typography
const { Item } = Form

const ChangePassword = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [fetchingUser, setFetchingUser] = useState(true)
  
  // 获取当前用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get('/api/v1/auth/me')
        if (response.data.code === 200) {
          setUsername(response.data.data.username)
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        message.error('获取用户信息失败')
      } finally {
        setFetchingUser(false)
      }
    }
    
    fetchCurrentUser()
  }, [])
  
  // 处理表单提交
  const handleSubmit = async (values) => {
    try {
      setLoading(true)
      
      // 调用修改密码API
      const response = await axios.post('/api/v1/auth/change-password', values)
      
      if (response.data.code === 200) {
        message.success('密码修改成功')
        form.resetFields()
      } else {
        message.error(response.data.message || '密码修改失败')
      }
    } catch (error) {
      console.error('修改密码失败:', error)
      if (error.response) {
        message.error(error.response.data.message || '密码修改失败')
      } else {
        message.error('网络错误，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)', padding: '20px' }}>
      <Card 
        style={{ width: '100%', maxWidth: '500px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
        title={<Title level={3} style={{ margin: 0 }}>修改密码</Title>}
      >
        {/* 当前用户信息显示 */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          backgroundColor: '#f0f2f5', 
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <UserOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }} />
          <div>
            <Typography.Text strong style={{ fontSize: '16px', marginRight: '8px' }}>当前用户名:</Typography.Text>
            <Typography.Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
              {fetchingUser ? '加载中...' : username}
            </Typography.Text>
          </div>
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{}}
        >
          <Item
            name="current_password"
            label="当前密码"
            rules={[
              { required: true, message: '请输入当前密码' },
              { min: 1, message: '当前密码不能为空' }
            ]}
          >
            <Input
              prefix={<LockOutlined />}
              type="password"
              placeholder="请输入当前密码"
              autoComplete="current-password"
            />
          </Item>
          
          <Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 1, message: '新密码不能为空' }
            ]}
          >
            <Input
              prefix={<LockOutlined />}
              type="password"
              placeholder="请输入新密码"
              autoComplete="new-password"
            />
          </Item>
          
          <Item
            name="confirm_password"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的新密码不一致'))
                },
              }),
            ]}
          >
            <Input
              prefix={<LockOutlined />}
              type="password"
              placeholder="请确认新密码"
              autoComplete="new-password"
            />
          </Item>
          
          <Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block 
              size="large"
              style={{ marginTop: '16px' }}
            >
              确认修改
            </Button>
          </Item>
        </Form>
      </Card>
    </div>
  )
}

export default ChangePassword