import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { LockOutlined, KeyOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'

const { Title } = Typography

const ResetPassword = () => {
  const [form] = Form.useForm()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // 从URL参数或localStorage中获取用户名
  useEffect(() => {
    console.log('=== 密码重置页面加载 ===')
    console.log('当前路径:', location.pathname)
    console.log('当前搜索参数:', location.search)
    
    // 从URL搜索参数中获取用户名
    const searchParams = new URLSearchParams(location.search)
    const usernameFromUrl = searchParams.get('username')
    console.log('从URL获取的用户名:', usernameFromUrl)
    
    if (usernameFromUrl) {
      console.log('使用URL中的用户名:', usernameFromUrl)
      setUsername(usernameFromUrl)
    } else {
      // 从localStorage中获取用户名
      const usernameFromStorage = localStorage.getItem('reset_username')
      console.log('从localStorage获取的用户名:', usernameFromStorage)
      
      if (usernameFromStorage) {
        console.log('使用localStorage中的用户名:', usernameFromStorage)
        setUsername(usernameFromStorage)
        // 延迟删除localStorage中的用户名，以便调试
        setTimeout(() => {
          localStorage.removeItem('reset_username')
          console.log('已从localStorage中删除reset_username')
        }, 1000)
      } else {
        // 如果没有用户名，重定向到登录页面
        console.error('无法获取用户名信息，准备重定向到登录页面')
        message.error('无法获取用户名信息，请重新登录')
        navigate('/login')
      }
    }
  }, [location.search, navigate])

  // 处理密码重置
  const handleResetPassword = async (values) => {
    setLoading(true)
    try {
      const response = await axios.post('/api/v1/auth/reset-password', {
        username,
        new_password: values.newPassword,
        confirm_password: values.confirmPassword
      })
      
      if (response.data.code === 200) {
        message.success(response.data.message)
        // 延迟后重定向到登录页面
        setTimeout(() => {
          navigate('/login')
        }, 1500)
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('密码重置失败:', error)
      message.error('密码重置失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container" style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      background: '#f0f2f5' 
    }}>
      <Card title={<Title level={4} style={{ margin: 0 }}>设置新密码</Title>} className="login-card" style={{ width: 400 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleResetPassword}
        >
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码!' },
              { min: 1, message: '密码不能为空!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入新密码"
              iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致!'))
                }
              })
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined />}
              placeholder="请确认新密码"
              iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
              loading={loading}
              style={{ marginTop: 16 }}
            >
              提交
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default ResetPassword