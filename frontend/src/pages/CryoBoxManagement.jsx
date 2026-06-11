import React, { useState, useEffect } from 'react'
import { Card, Button, Modal, Form, Input, message, Popconfirm, Space, List, Empty, Breadcrumb, Checkbox, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, HomeOutlined } from '@ant-design/icons'
import { useNavigate, useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useI18n } from '../i18n/I18nContext'

const CryoBoxManagement = () => {
  const [tank, setTank] = useState(null)
  const [boxes, setBoxes] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentBox, setCurrentBox] = useState(null)
  const [form] = Form.useForm()
  const [userRole, setUserRole] = useState('member')
  const navigate = useNavigate()
  const { tankId } = useParams()
  const { t } = useI18n()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'))
    if (user) setUserRole(user.role)
    if (tankId) fetchData()
  }, [tankId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/v1/cryo-tanks/${tankId}/boxes`)
      if (response.data.code === 200) {
        setTank(response.data.data.tank)
        setBoxes(response.data.data.boxes)
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('获取盒子列表失败')
    } finally {
      setLoading(false)
    }
  }

  const showAddModal = () => {
    setIsEditMode(false)
    setCurrentBox(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const showEditModal = (box) => {
    setIsEditMode(true)
    setCurrentBox(box)
    form.setFieldsValue({
      box_name: box.box_name,
      box_description: box.box_description
    })
    setIsModalVisible(true)
  }

  const handleSubmit = async (values) => {
    const payload = {
      box_name: values.box_name,
      box_description: values.box_description,
      columns: []
    }

    try {
      if (isEditMode && currentBox) {
        const response = await axios.put(`/api/v1/cryo-boxes/${currentBox.id}`, payload)
        if (response.data.code === 200) {
          message.success(t('cryo.boxUpdateSuccess'))
        } else {
          message.error(response.data.message)
          return
        }
      } else {
        const response = await axios.post(`/api/v1/cryo-tanks/${tankId}/boxes`, payload)
        if (response.data.code === 200) {
          message.success(t('cryo.boxAddSuccess'))
        } else {
          message.error(response.data.message)
          return
        }
      }
      setIsModalVisible(false)
      form.resetFields()
      fetchData()
    } catch (error) {
      message.error(isEditMode ? '更新冻存盒失败' : '添加冻存盒失败')
    }
  }

  const handleDelete = async (boxId) => {
    try {
      const response = await axios.delete(`/api/v1/cryo-boxes/${boxId}`)
      if (response.data.code === 200) {
        message.success(t('cryo.boxDeleteSuccess'))
        fetchData()
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('删除冻存盒失败')
    }
  }

  const handleBoxClick = (boxId) => {
    navigate(`/cryo-box/${boxId}/grid`)
  }

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item><Link to="/cryo-management"><HomeOutlined /> {t('cryo.title')}</Link></Breadcrumb.Item>
        <Breadcrumb.Item>{tank?.name || t('cryo.boxManagement')}</Breadcrumb.Item>
      </Breadcrumb>

      <Card
        title={tank ? `${tank.name} - ${t('cryo.boxManagement')}` : t('cryo.boxManagement')}
        extra={
          userRole === 'admin' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
              {t('cryo.addBox')}
            </Button>
          )
        }
        style={{ marginBottom: 16 }}
      >
        {boxes.length === 0 && !loading ? (
          <Empty description={t('cryo.noBoxes')}>
            {userRole === 'admin' && (
              <Button type="primary" onClick={showAddModal}>{t('cryo.addBox')}</Button>
            )}
          </Empty>
        ) : (
          <List
            loading={loading}
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={boxes}
            renderItem={(box) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => handleBoxClick(box.id)}
                  title={box.box_name}
                  extra={
                    <Space onClick={(e) => e.stopPropagation()}>
                      {userRole === 'admin' && (
                        <>
                          <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => showEditModal(box)}
                          />
                          <Popconfirm
                            title={t('cryo.confirmDeleteBox')}
                            onConfirm={() => handleDelete(box.id)}
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
                        </>
                      )}
                      <Button
                        type="link"
                        size="small"
                        icon={<AppstoreOutlined />}
                        onClick={() => handleBoxClick(box.id)}
                      >
                        {t('cryo.gridView')}
                      </Button>
                    </Space>
                  }
                >
                  <p style={{ color: '#999', margin: 0 }}>
                    {box.box_description || '暂无描述'}
                  </p>
                  <div style={{ marginTop: 8 }}>
                    <Tag color="blue">{t('cryo.occupied')}: {box.occupied}/{box.total}</Tag>
                    <Tag color="green">
                      {box.total > 0 ? Math.round((box.occupied / box.total) * 100) : 0}%
                    </Tag>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {box.columns.map((col, idx) => (
                      <Tag key={idx} style={{ marginBottom: 4 }}>{col.column_name}</Tag>
                    ))}
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 添加/编辑盒子 Modal */}
      <Modal
        title={isEditMode ? t('cryo.editBox') : t('cryo.addBox')}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="box_name"
            label={t('cryo.boxName')}
            rules={[{ required: true, message: t('cryo.boxNameRequired') }]}
          >
            <Input placeholder={t('cryo.boxName')} />
          </Form.Item>
          <Form.Item name="box_description" label={t('cryo.boxDescription')}>
            <Input.TextArea rows={2} placeholder={t('cryo.boxDescription')} />
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
    </div>
  )
}

export default CryoBoxManagement
