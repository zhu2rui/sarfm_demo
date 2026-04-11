import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Switch, InputNumber, Space, Modal, message, Typography, Tag, Popconfirm } from 'antd'
import { DeleteOutlined, DownloadOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons'
import axios from 'axios'

const { Title, Text } = Typography

const DatabaseBackup = () => {
  const [config, setConfig] = useState({ backup_interval_days: 7, enabled: false, last_backup_time: null })
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
    fetchBackups()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/v1/backup/config')
      if (response.data.code === 200) {
        setConfig(response.data.data)
      }
    } catch (error) {
      console.error('获取配置失败:', error)
    }
  }

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/v1/backup/list')
      if (response.data.code === 200) {
        setBackups(response.data.data)
      }
    } catch (error) {
      console.error('获取备份列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = async (field, value) => {
    const newConfig = { ...config, [field]: value }
    setConfig(newConfig)
    
    setSaving(true)
    try {
      const response = await axios.post('/api/v1/backup/config', newConfig)
      if (response.data.code === 200) {
        message.success('配置已保存')
      } else {
        message.error(response.data.message || '保存失败')
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      if (error.response) {
        message.error(`保存失败: ${error.response.data?.message || error.response.status}`)
      } else if (error.request) {
        message.error('网络错误：服务器无响应')
      } else {
        message.error('保存配置失败')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleBackupNow = async () => {
    try {
      const response = await axios.post('/api/v1/backup/backup-now')
      if (response.data.code === 200) {
        message.success('备份成功')
        fetchBackups()
        fetchConfig()
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('备份失败:', error)
      message.error('备份失败')
    }
  }

  const handleDownload = async (filename) => {
    try {
      const response = await axios.get(`/api/v1/backup/download/${filename}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      message.success('下载成功')
    } catch (error) {
      console.error('下载失败:', error)
      message.error('下载失败')
    }
  }

  const handleDelete = async (filename) => {
    try {
      const response = await axios.delete(`/api/v1/backup/delete/${filename}`)
      if (response.data.code === 200) {
        message.success('删除成功')
        fetchBackups()
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size) => formatFileSize(size)
    },
    {
      title: '创建时间',
      dataIndex: 'created_time',
      key: 'created_time'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record.filename)}
          >
            下载
          </Button>
          <Popconfirm
            title="确定要删除这个备份文件吗？"
            onConfirm={() => handleDelete(record.filename)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={4} style={{ marginBottom: 24 }}>
          <DatabaseOutlined /> 数据库备份设置
        </Title>

        <div style={{ marginBottom: 32, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Text strong>自动备份：</Text>
              <Switch
                checked={config.enabled}
                onChange={(checked) => handleConfigChange('enabled', checked)}
                loading={saving}
              />
              <Text type="secondary">
                {config.enabled ? '已启用' : '已禁用'}
              </Text>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Text strong>备份间隔：</Text>
              <InputNumber
                min={1}
                max={365}
                value={config.backup_interval_days}
                onChange={(value) => handleConfigChange('backup_interval_days', value)}
                disabled={!config.enabled}
                loading={saving}
              />
              <Text>天</Text>
            </div>

            <div>
              <Text type="secondary">
                上次备份时间：{config.last_backup_time || '从未备份'}
              </Text>
            </div>

            <div>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleBackupNow}
              >
                立即备份
              </Button>
            </div>
          </Space>
        </div>

        <Title level={5}>备份历史记录</Title>
        <Table
          columns={columns}
          dataSource={backups}
          rowKey="filename"
          loading={loading}
          locale={{ emptyText: '暂无备份记录' }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}

export default DatabaseBackup
