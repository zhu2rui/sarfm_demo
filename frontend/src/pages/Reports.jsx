import React, { useState, useEffect } from 'react'
import { Card, Select, DatePicker, Button, Table, message, Space, Statistic, Row, Col } from 'antd'
import { BarChartOutlined, ExportOutlined } from '@ant-design/icons'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const { RangePicker } = DatePicker

const Reports = () => {
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [groupByOptions, setGroupByOptions] = useState([])
  const [selectedGroupBy, setSelectedGroupBy] = useState('')
  const [dateRange, setDateRange] = useState(null)
  const [statsData, setStatsData] = useState([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tableData, setTableData] = useState([])

  // 获取表格列表
  const fetchTables = async () => {
    try {
      const response = await axios.get('/api/v1/tables')
      if (response.data.code === 200) {
        setTables(response.data.data.items)
        if (response.data.data.items.length > 0 && !selectedTable) {
          setSelectedTable(response.data.data.items[0])
        }
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('获取表格列表失败')
      console.error('Fetch tables error:', error)
    }
  }

  // 组件挂载时获取表格列表
  useEffect(() => {
    fetchTables()
  }, [])

  // 当选中表格变化时，更新分组选项
  useEffect(() => {
    if (selectedTable) {
      // 生成分组选项，包括所有列名
      const options = selectedTable.columns.map(column => ({
        value: column.column_name,
        label: column.column_name
      }))
      setGroupByOptions(options)
      setSelectedGroupBy('') // 重置分组选项
    }
  }, [selectedTable])

  // 获取统计数据
  const fetchStatsData = async () => {
    if (!selectedTable) return
    
    setLoading(true)
    try {
      // 构建查询参数
      const params = {}
      
      if (dateRange && dateRange.length === 2) {
        params.start_date = dateRange[0].format('YYYY-MM-DD')
        params.end_date = dateRange[1].format('YYYY-MM-DD')
      }
      
      if (selectedGroupBy) {
        params.group_by = selectedGroupBy
      }
      
      const response = await axios.get(`/api/v1/reports/${selectedTable.id}/stats`, { params })
      
      if (response.data.code === 200) {
        const data = response.data.data
        setStatsData(data.stats_data)
        setTotalRecords(data.total_records)
        
        // 转换为表格数据格式
        const tableFormatData = data.stats_data.map(item => ({
          key: item.group,
          group: item.group,
          count: item.count
        }))
        setTableData(tableFormatData)
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('获取统计数据失败')
      console.error('Fetch stats error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 切换表格
  const handleTableChange = (value) => {
    const table = tables.find(t => t.id === value)
    setSelectedTable(table)
  }

  // 处理查询
  const handleQuery = () => {
    fetchStatsData()
  }

  // 处理重置
  const handleReset = () => {
    setDateRange(null)
    setSelectedGroupBy('')
    setStatsData([])
    setTotalRecords(0)
    setTableData([])
  }

  // 处理导出
  const handleExport = () => {
    if (!selectedTable || statsData.length === 0) {
      message.warning('没有数据可以导出')
      return
    }
    
    // 生成CSV内容
    let csvContent = 'Group,Count\n'
    statsData.forEach(item => {
      csvContent += `${item.group},${item.count}\n`
    })
    
    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    // 格式化日期为YYYY-MM-DD
    const formatDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    link.setAttribute('href', url)
    link.setAttribute('download', `${selectedTable.table_name}_报表_${formatDate(new Date())}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    message.success('报表导出成功')
  }

  // 表格列配置
  const columns = [
    {
      title: '分组',
      dataIndex: 'group',
      key: 'group'
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      align: 'right'
    }
  ]

  return (
    <Card title="报表统计" style={{ marginBottom: 16 }}>
      {/* 查询条件 */}
      <Card title="查询条件" style={{ marginBottom: 16 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            placeholder="选择表格"
            style={{ width: 200 }}
            value={selectedTable?.id}
            onChange={handleTableChange}
            options={tables.map(table => ({
              value: table.id,
              label: table.table_name
            }))}
          />
          
          <Select
            placeholder="分组字段"
            style={{ width: 200 }}
            value={selectedGroupBy}
            onChange={setSelectedGroupBy}
            options={groupByOptions}
          />
          
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder={['开始日期', '结束日期']}
          />
          
          <Space>
            <Button type="primary" icon={<BarChartOutlined />} onClick={handleQuery} loading={loading}>
              查询
            </Button>
            <Button onClick={handleReset}>
              重置
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport} disabled={statsData.length === 0}>
              导出
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 统计概览 */}
      <Card title="统计概览" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic 
                title="总记录数" 
                value={totalRecords} 
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="数据组数" 
                value={statsData.length} 
                prefix={<BarChartOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic 
                title="当前表格" 
                value={selectedTable?.table_name || '未选择'} 
                suffix="表格"
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 图表展示 */}
      <Card title="图表展示" style={{ marginBottom: 16, height: 400 }}>
        {statsData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="group" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="数量" fill="#1890ff" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999' }}>
            请选择表格并点击查询获取统计数据
          </div>
        )}
      </Card>

      {/* 表格展示 */}
      <Card title="表格数据">
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={false}
          bordered={true}
        />
      </Card>
    </Card>
  )
}

export default Reports