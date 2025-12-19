import React, { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Option } = Select

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/v1/users')
      if (response.data.code === 200) {
        // 过滤掉admin用户，不显示在用户管理中
        const filteredUsers = response.data.data.items.filter(user => user.username !== 'admin')
        setUsers(filteredUsers)
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时获取用户列表
  useEffect(() => {
    fetchUsers()
  }, [])

  // 显示添加用户模态框
  const showAddModal = () => {
    form.resetFields()
    setIsModalVisible(true)
  }

  // 关闭添加用户模态框
  const handleCancel = () => {
    setIsModalVisible(false)
  }

  // 添加用户
  const handleAddUser = async (values) => {
    try {
      // 调用后端API添加用户，密码设为空字符串
      const response = await axios.post('/api/v1/users', {
        ...values,
        password: '' // 空密码
      })
      if (response.data.code === 200) {
        message.success(response.data.message)
        setIsModalVisible(false)
        fetchUsers() // 刷新用户列表
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('添加用户失败:', error)
      message.error('添加用户失败')
    }
  }

  // 删除用户
  const handleDeleteUser = async (userId) => {
    try {
      const response = await axios.delete(`/api/v1/users/${userId}`)
      if (response.data.code === 200) {
        message.success(response.data.message)
        fetchUsers() // 刷新用户列表
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('删除用户失败:', error)
      message.error('删除用户失败')
    } finally {
      setDeletingId(null)
    }
  }

  // 确认删除用户
  const confirmDelete = (userId) => {
    setDeletingId(userId)
    Modal.confirm({
      title: '确认删除',
      content: '您确定要删除此用户吗？',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => handleDeleteUser(userId),
      onCancel: () => setDeletingId(null)
    })
  }

  // 表格列配置
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const roleMap = {
          admin: '管理员',
          leader: '组长',
          member: '组员'
        }
        return roleMap[role] || role
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at'
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => confirmDelete(record.id)}
          loading={deletingId === record.id}
        >
          删除
        </Button>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>用户管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={showAddModal}
        >
          添加用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      {/* 添加用户模态框 */}
      <Modal
        title="添加用户"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddUser}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">管理员</Option>
              <Option value="leader">组长</Option>
              <Option value="member">组员</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              添加
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement