import React, { useState, useEffect } from 'react'
import { Card, Button, Modal, Form, Input, message, Popconfirm, Space, List, Empty } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useI18n } from '../i18n/I18nContext'

const CryoTankManagement = () => {
  const [tanks, setTanks] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentTank, setCurrentTank] = useState(null)
  const [form] = Form.useForm()
  const [userRole, setUserRole] = useState('member')
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'))
    if (user) setUserRole(user.role)
    fetchTanks()
  }, [])

  const fetchTanks = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/v1/cryo-tanks')
      if (response.data.code === 200) {
        setTanks(response.data.data.items)
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('获取液氮罐列表失败')
    } finally {
      setLoading(false)
    }
  }

  const showAddModal = () => {
    setIsEditMode(false)
    setCurrentTank(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const showEditModal = (tank) => {
    setIsEditMode(true)
    setCurrentTank(tank)
    form.setFieldsValue({ name: tank.name, description: tank.description })
    setIsModalVisible(true)
  }

  const handleSubmit = async (values) => {
    try {
      if (isEditMode && currentTank) {
        const response = await axios.put(`/api/v1/cryo-tanks/${currentTank.id}`, values)
        if (response.data.code === 200) {
          message.success(t('cryo.tankUpdateSuccess'))
        } else {
          message.error(response.data.message)
          return
        }
      } else {
        const response = await axios.post('/api/v1/cryo-tanks', values)
        if (response.data.code === 200) {
          message.success(t('cryo.tankAddSuccess'))
        } else {
          message.error(response.data.message)
          return
        }
      }
      setIsModalVisible(false)
      form.resetFields()
      fetchTanks()
    } catch (error) {
      message.error(isEditMode ? '更新液氮罐失败' : '添加液氮罐失败')
    }
  }

  const handleDelete = async (tankId) => {
    try {
      const response = await axios.delete(`/api/v1/cryo-tanks/${tankId}`)
      if (response.data.code === 200) {
        message.success(t('cryo.tankDeleteSuccess'))
        fetchTanks()
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('删除液氮罐失败')
    }
  }

  const handleTankClick = (tankId) => {
    navigate(`/cryo-tank/${tankId}/boxes`)
  }

  return (
    <Card
      title={t('cryo.title')}
      extra={
        userRole === 'admin' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            {t('cryo.addTank')}
          </Button>
        )
      }
      style={{ marginBottom: 16 }}
    >
      {tanks.length === 0 && !loading ? (
        <Empty description={t('cryo.noTanks')} />
      ) : (
        <List
          loading={loading}
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
          dataSource={tanks}
          renderItem={(tank) => (
            <List.Item>
              <Card
                hoverable
                onClick={() => handleTankClick(tank.id)}
                title={tank.name}
                extra={
                  userRole === 'admin' && (
                    <Space onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => showEditModal(tank)}
                      />
                      <Popconfirm
                        title={t('cryo.confirmDeleteTank')}
                        onConfirm={() => handleDelete(tank.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          type="link"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Space>
                  )
                }
              >
                <p style={{ color: '#999', margin: 0 }}>
                  {tank.description || '暂无描述'}
                </p>
                <p style={{ color: '#bbb', margin: '8px 0 0', fontSize: 12 }}>
                  {tank.created_at}
                </p>
              </Card>
            </List.Item>
          )}
        />
      )}

      {/* 添加/编辑液氮罐 Modal */}
      <Modal
        title={isEditMode ? t('cryo.editTank') : t('cryo.addTank')}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label={t('cryo.tankName')}
            rules={[{ required: true, message: t('cryo.tankNameRequired') }]}
          >
            <Input placeholder={t('cryo.tankName')} />
          </Form.Item>
          <Form.Item name="description" label={t('cryo.tankDescription')}>
            <Input.TextArea rows={3} placeholder={t('cryo.tankDescription')} />
          </Form.Item>
          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {isEditMode ? '保存修改' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default CryoTankManagement
