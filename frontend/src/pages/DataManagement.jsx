import React, { useState, useEffect, useContext } from 'react'
import { Card, Button, Modal, Form, Input, message, Popconfirm, Space, InputNumber, Upload, Alert, Select, Dropdown, Menu, Checkbox } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, AppstoreOutlined, SearchOutlined } from '@ant-design/icons'
import axios from 'axios'
import { TableContext } from '../App'
import MultiSelectDelete from '../components/MultiSelectDelete'

const DataManagement = () => {
  const tableContext = useContext(TableContext);
  const tables = tableContext?.tables || [];
  const selectedTableId = tableContext?.selectedTableId || null;
  const setSelectedTableId = tableContext?.setSelectedTableId || (() => {});
  const fetchTables = tableContext?.fetchTables || (() => {});
  const [selectedTable, setSelectedTable] = useState(null)
  const [dataList, setDataList] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentData, setCurrentData] = useState(null)
  const [form] = Form.useForm()
  const [userRole, setUserRole] = useState('member')
  const [importing, setImporting] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [selectedEncoding, setSelectedEncoding] = useState('UTF-8')
  const [showEncodingModal, setShowEncodingModal] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  // 展开行状态管理
  const [expandedRowKeys, setExpandedRowKeys] = useState([])
  // 下拉列功能相关状态
  // 使用默认对象而不是null，确保状态始终可用
  const [visibleColumns, setVisibleColumns] = useState({
    'created_at': true,
    'action': true
  })
  const [isAllColumnsChecked, setIsAllColumnsChecked] = useState(true)
  
  // 搜索功能相关状态 - 改为基于表格ID的独立存储
  const [searchStates, setSearchStates] = useState({})
  
  // 获取当前表格的搜索状态
  const getCurrentSearchState = () => {
    if (!selectedTable) return {
      searchText: '',
      searchResults: [],
      isSearching: false,
      searchCount: 0,
      highlightedText: ''
    }
    return searchStates[selectedTable.id] || {
      searchText: '',
      searchResults: [],
      isSearching: false,
      searchCount: 0,
      highlightedText: ''
    }
  }
  
  // 设置当前表格的搜索状态
  const setCurrentSearchState = (newState) => {
    if (!selectedTable) return
    setSearchStates(prev => ({
      ...prev,
      [selectedTable.id]: {
        ...getCurrentSearchState(),
        ...newState
      }
    }))
  }

  // 获取用户角色和上次选择的编码方式
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'))
    if (user) {
      setUserRole(user.role)
    }
    
    // 从localStorage中读取上次选择的编码方式
    const savedEncoding = localStorage.getItem('importEncoding')
    if (savedEncoding) {
      setSelectedEncoding(savedEncoding)
    }
  }, [])

  // 根据selectedTableId获取选中的表格
  useEffect(() => {
    if (tables.length > 0) {
      if (selectedTableId) {
        const table = tables.find(t => t.id === selectedTableId)
        if (table) {
          setSelectedTable(table)
          setPage(1) // 重置分页
        } else {
          // 如果找不到对应的表格，设置为null
          console.warn(`找不到ID为${selectedTableId}的表格，重置为null`)
          setSelectedTable(null)
          setPage(1) // 重置分页
        }
      } else {
        // 如果没有选中的表格，设置为null
        setSelectedTable(null)
        setPage(1) // 重置分页
      }
    } else {
      setSelectedTable(null)
    }
  }, [selectedTableId, tables])

  // 获取库存数据
  const fetchData = async () => {
    if (!selectedTable) return
    
    setLoading(true)
    try {
      // 准备API请求参数
      const params = {
        page,
        per_page: pageSize
      }
      
      const response = await axios.get(`/api/v1/tables/${selectedTable.id}/data`, {
        params
      })
      
      if (response.data.code === 200) {
        setDataList(response.data.data.items)
        setTotal(response.data.data.total)
      } else {
        message.error(response.data.message)
        // 确保数据列表为空时也能正常显示
        setDataList([])
        setTotal(0)
      }
    } catch (error) {
      message.error('获取库存数据失败')
      console.error('Fetch data error:', error)
      // 确保数据列表为空时也能正常显示
      setDataList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // 当选中表格或分页参数变化时获取数据
  useEffect(() => {
    fetchData()
  }, [selectedTable, page, pageSize])

  // 初始化可见列状态，优先从本地存储恢复，其次使用数据库中定义的dropDown属性
  useEffect(() => {
    if (selectedTable) {
      console.log('Initializing visibleColumns for table:', selectedTable.table_name)
      
      // 先从数据库配置中获取默认下拉显示状态
      const defaultVisibleColumns = {
        'created_at': true,
        'action': true
      }
      
      // 安全检查：确保selectedTable.columns是数组
      if (Array.isArray(selectedTable.columns)) {
        selectedTable.columns.forEach(column => {
          // 使用数据库中定义的dropDown属性作为默认值
          // 如果数据库中没有dropDown属性，则默认为可见
          // 如果dropDown为true，则默认隐藏；否则默认显示
          defaultVisibleColumns[column.column_name] = column.dropDown !== true
        })
      }
      
      let finalVisibleColumns = defaultVisibleColumns
      
      const user = JSON.parse(localStorage.getItem('user'))
      if (user) {
        // 从本地存储获取用户的列显示偏好，用户偏好优先级高于数据库配置
        const savedPreferences = localStorage.getItem(`column_preferences_${user.id}_${selectedTable.id}`)
        if (savedPreferences) {
          try {
            const parsedPreferences = JSON.parse(savedPreferences)
            console.log('Loaded saved preferences:', parsedPreferences)
            
            // 合并保存的偏好和默认值，确保所有必要的列都有定义
            finalVisibleColumns = { ...defaultVisibleColumns, ...parsedPreferences }
          } catch (error) {
            console.error('解析列偏好失败:', error)
          }
        }
      }
      
      console.log('Final visibleColumns:', finalVisibleColumns)
      setVisibleColumns(finalVisibleColumns)
      
      // 检查是否所有列都被选中
      const allChecked = Object.values(finalVisibleColumns).every(visible => visible === true)
      setIsAllColumnsChecked(allChecked)
    }
  }, [selectedTable])

  // 保存用户列显示偏好到本地存储
  const saveColumnPreferences = (columns) => {
    const user = JSON.parse(localStorage.getItem('user'))
    if (user && selectedTable) {
      // 保存用户的列显示偏好到本地存储，确保刷新后状态保持一致
      localStorage.setItem(`column_preferences_${user.id}_${selectedTable.id}`, JSON.stringify(columns))
      console.log('Saved column preferences:', columns)
    }
  }

  // 处理列选择变化
  const handleColumnChange = (columnKey) => {
    setVisibleColumns(prev => {
      const newVisibleColumns = { ...prev }
      newVisibleColumns[columnKey] = !newVisibleColumns[columnKey]
      
      // 检查是否所有列都被选中
      const allChecked = Object.values(newVisibleColumns).every(visible => visible)
      setIsAllColumnsChecked(allChecked)
      
      // 保存到本地存储
      saveColumnPreferences(newVisibleColumns)
      
      return newVisibleColumns
    })
  }

  // 处理全选/取消全选
  const handleSelectAllColumns = () => {
    const newIsAllChecked = !isAllColumnsChecked
    const newVisibleColumns = {}
    
    // 设置所有列为相同状态
    newVisibleColumns['created_at'] = newIsAllChecked
    if (Array.isArray(selectedTable.columns)) {
      selectedTable.columns.forEach(column => {
        newVisibleColumns[column.column_name] = newIsAllChecked
      })
    }
    newVisibleColumns['action'] = newIsAllChecked
    
    setVisibleColumns(newVisibleColumns)
    setIsAllColumnsChecked(newIsAllChecked)
    
    // 保存到本地存储
    saveColumnPreferences(newVisibleColumns)
  }

  // 处理数据导出
  const handleExport = async () => {
    if (!selectedTable) {
      message.error('请先选择一个表格')
      return
    }
    
    const exportLoading = message.loading('正在导出数据，请稍候...', 0)
    
    try {
      console.log(`开始导出表格 ${selectedTable.id} (${selectedTable.table_name}) 的数据`)
      
      const response = await axios.get(`/api/v1/tables/${selectedTable.id}/export`, {
        responseType: 'blob'
      })
      
      console.log('导出请求成功，开始处理下载')
      
      // 检查响应类型（使用包含关系，允许带charset参数）
      const contentType = response.headers['content-type']
      if (!contentType || !contentType.includes('text/csv')) {
        // 尝试解析错误信息
        const errorText = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.readAsText(response.data)
        })
        
        console.error('导出失败，服务器返回错误:', errorText)
        message.error(`数据导出失败: ${errorText}`)
        return
      }
      
      // 直接使用响应返回的 Blob 对象，因为 responseType: 'blob' 已经将响应转换为 Blob
      const blob = response.data
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      // 获取文件名（优先从响应头获取，否则使用默认名称）
      let filename = `${selectedTable.table_name}_export.csv`
      const contentDisposition = response.headers['content-disposition']
      if (contentDisposition) {
        const matches = /filename="([^\"]+)"/.exec(contentDisposition)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }
      
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 释放URL对象
      window.URL.revokeObjectURL(url)
      
      console.log(`数据导出成功，文件名: ${filename}`)
      message.success(`数据导出成功，文件名: ${filename}`)
    } catch (error) {
      console.error('导出数据错误详情:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        } : null,
        config: error.config ? {
          url: error.config.url,
          method: error.config.method
        } : null
      })
      
      if (error.response) {
        // 服务器返回错误
        if (error.response.status === 401) {
          message.error('登录已过期，请重新登录')
        } else if (error.response.status === 403) {
          message.error('您没有导出数据的权限')
        } else if (error.response.status === 404) {
          message.error('表格不存在或已被删除')
        } else if (error.response.status === 500) {
          message.error('服务器内部错误，请联系管理员')
        } else {
          message.error(`数据导出失败，错误码: ${error.response.status}`)
        }
      } else if (error.request) {
        // 请求已发送但没有收到响应
        message.error('网络异常，服务器没有响应，请检查网络连接')
      } else {
        // 请求配置错误
        message.error(`数据导出失败: ${error.message}`)
      }
    } finally {
      exportLoading() // 关闭加载提示
    }
  }

  // 处理数据导入 - 显示编码选择模态框
  const handleImport = (file) => {
    if (!selectedTable) {
      message.error('请先选择一个表格')
      return false
    }
    
    // 验证文件类型
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      message.error('请选择CSV格式的文件')
      return false
    }
    
    // 保存待处理的文件，显示编码选择模态框
    setPendingFile(file)
    setShowEncodingModal(true)
    
    return false // 阻止自动上传
  }

  // 确认编码选择，处理导入
  const confirmEncoding = async () => {
    if (!pendingFile || !selectedTable) {
      message.error('导入失败，请重试')
      setShowEncodingModal(false)
      return
    }
    
    // 将当前选择的编码方式保存到localStorage
    localStorage.setItem('importEncoding', selectedEncoding)
    
    setImporting(true)
    setUploadError(null)
    setShowEncodingModal(false)
    
    try {
      // 读取文件内容
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = (e) => reject(new Error(`文件读取失败 (${selectedEncoding})`))
        reader.readAsText(pendingFile, selectedEncoding)
      })
      
      // 发送导入请求
      const response = await axios.post(`/api/v1/tables/${selectedTable.id}/import`, {
        csv_content: content
      })
      
      if (response.data.code === 200) {
        message.success(`成功导入 ${response.data.data.success_count} 条数据，失败 ${response.data.data.fail_count} 条`)
        // 如果有失败的记录，显示详细错误信息
        if (response.data.data.fail_count > 0) {
          setUploadError(`导入失败的记录：\n${response.data.data.error_messages.join('\n')}`)
        }
        fetchData() // 刷新数据
      } else {
        message.error(response.data.message)
        setUploadError(response.data.message)
      }
    } catch (error) {
      console.error('Import data error:', error)
      if (error.response && error.response.data) {
        // 显示后端返回的详细错误信息
        message.error(error.response.data.message)
        setUploadError(error.response.data.message)
      } else if (error.message.includes('文件读取失败')) {
        message.error(`文件读取失败，请尝试其他编码格式 (当前编码: ${selectedEncoding})`)
        setUploadError(`文件读取失败，请尝试其他编码格式 (当前编码: ${selectedEncoding})`)
      } else {
        message.error('数据导入失败，请检查网络连接或文件格式')
        setUploadError('数据导入失败，请检查网络连接或文件格式')
      }
    } finally {
      setImporting(false)
      setPendingFile(null)
    }
  }

  // 下载示例CSV文件
  const downloadSampleCSV = () => {
    if (!selectedTable || !Array.isArray(selectedTable.columns)) return
    
    // 生成示例CSV内容
    const headers = selectedTable.columns.map(col => col.column_name).join(',')
    const sampleRow = selectedTable.columns.map(col => `示例${col.column_name}`).join(',')
    const csvContent = `${headers}\n${sampleRow}`
    
    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${selectedTable.table_name}_sample.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 显示添加/编辑模态框
  const showModal = (record = null) => {
    if (record) {
      setIsEditMode(true)
      setCurrentData(record)
      form.setFieldsValue(record.data)
    } else {
      setIsEditMode(false)
      setCurrentData(null)
      form.resetFields()
    }
    setIsModalVisible(true)
  }

  // 处理表单提交
  const handleSubmit = async (values) => {
    if (!selectedTable) return
    
    try {
      let response
      let submitData = { ...values }
      
      // 在编辑模式下，保留自增列的数据
      if (isEditMode && currentData) {
        // 遍历所有列，找到自增列并保留其原有值
        if (Array.isArray(selectedTable.columns)) {
          selectedTable.columns.forEach(column => {
            if (column.autoIncrement && currentData.data[column.column_name]) {
              // 保留自增列的原有值
              submitData[column.column_name] = currentData.data[column.column_name]
            }
          })
        }
        
        // 编辑模式
        response = await axios.put(`/api/v1/tables/${selectedTable.id}/data/${currentData.id}`, {
          data: submitData
        })
      } else {
        // 添加模式
        response = await axios.post(`/api/v1/tables/${selectedTable.id}/data`, {
          data: submitData
        })
      }
      
      if (response.data.code === 200) {
        message.success(isEditMode ? '数据更新成功' : '数据添加成功')
        setIsModalVisible(false)
        fetchData() // 刷新数据
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error(isEditMode ? '更新数据失败' : '添加数据失败')
      console.error('Submit data error:', error)
    }
  }

  // 处理删除数据（支持单个和批量删除）
  const handleDelete = async (selectedIds) => {
    if (!selectedTable) return
    
    // 如果传入的是单个记录对象，则转换为ID数组
    const idsToDelete = Array.isArray(selectedIds) ? selectedIds : [selectedIds.id]
    
    setDeleteLoading(true)
    
    try {
      // 调用批量删除API
      const response = await axios.delete(`/api/v1/tables/${selectedTable.id}/data`, {
        data: { ids: idsToDelete } // 使用data属性传递删除的ID数组
      })
      
      if (response.data.code === 200) {
        message.success('数据删除成功')
        fetchData() // 刷新数据
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('删除数据失败')
      console.error('Delete data error:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  // 处理分页变化
  const handlePaginationChange = (newPage, newPageSize) => {
    setPage(newPage)
    setPageSize(newPageSize)
  }
  
  // 搜索功能实现
  const handleSearch = async () => {
    const currentState = getCurrentSearchState()
    if (!currentState.searchText.trim() || !selectedTable) {
      message.warning('请输入搜索关键词')
      return
    }
    
    try {
      // 使用异步处理，避免阻塞主线程
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 编译正则表达式
      const regex = new RegExp(currentState.searchText, 'i')
      
      // 搜索所有数据列和所有行
      const results = dataList.filter(item => {
        // 搜索数据字段
        for (const key in item.data) {
          const value = item.data[key]
          if (typeof value === 'string' && regex.test(value)) {
            return true
          }
        }
        // 搜索创建时间字段
        if (regex.test(item.created_at)) {
          return true
        }
        return false
      })
      
      setCurrentSearchState({
        searchResults: results,
        isSearching: true,
        searchCount: results.length,
        highlightedText: currentState.searchText
      })
      setPage(1) // 重置分页
    } catch (error) {
      message.error('搜索失败，请检查正则表达式格式')
      console.error('Search error:', error)
    }
  }
  
  // 清除搜索
  const handleClearSearch = () => {
    setCurrentSearchState({
      searchText: '',
      searchResults: [],
      isSearching: false,
      searchCount: 0,
      highlightedText: ''
    })
    setPage(1) // 重置分页
  }
  
  // 高亮显示匹配文本
  const highlightText = (text) => {
    const currentState = getCurrentSearchState()
    if (!currentState.highlightedText || typeof text !== 'string') {
      return text
    }
    
    try {
      const regex = new RegExp(`(${currentState.highlightedText})`, 'gi')
      return text.replace(regex, '<span style="background-color: #fff212; font-weight: 500;">$1</span>')
    } catch (error) {
      return text
    }
  }

  // 响应式处理：根据屏幕宽度自动调整列显示
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)
  
  // 监听屏幕尺寸变化
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // 计算是否为移动端
  const isMobile = screenWidth < 768
  
  // 生成表格列配置 - 返回可见列和下拉列，添加响应式处理
  const generateColumns = () => {
    if (!selectedTable) return { visibleColumns: [], hiddenColumns: [] }
    
    const visibleColumnsList = []
    const hiddenColumnsList = []
    
    // 基础列：创建时间
    const createdAtColumn = {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100, // 固定宽度，正好显示日期
      minWidth: 100,
      maxWidth: 120
    }
    
    // 操作列
    const actionColumn = {
      title: '操作',
      key: 'action',
      width: isMobile ? 180 : 250, // 减少宽度，因为只需要两个按钮
      align: 'center', // 居中对齐
      fixed: 'right', // 固定在右侧，提升用户体验
      render: (text, record) => (
        <Space 
          size={isMobile ? 'small' : 'middle'} 
          style={{ 
            width: '100%', 
            justifyContent: 'center',
            flexWrap: 'nowrap' // 所有设备都禁止换行，确保按钮在同一水平线上
          }}
        >
          {(userRole === 'admin' || userRole === 'leader') && (
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              size={isMobile ? 'small' : 'middle'} 
              onClick={() => showModal(record)}
              className="action-button"
              style={{ 
                padding: isMobile ? '2px 8px' : '4px 12px', 
                margin: isMobile ? '2px 0' : '0',
                fontSize: isMobile ? '11px' : '13px',
                minWidth: isMobile ? 60 : 80
              }}
            >
              {isMobile ? '编辑' : '编辑'}
            </Button>
          )}
          {(userRole === 'admin' || userRole === 'leader') && (
            <Popconfirm
              title="确定要删除这条数据吗？"
              onConfirm={() => handleDelete(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                size={isMobile ? 'small' : 'middle'}
                className="action-button"
                style={{ 
                  padding: isMobile ? '2px 8px' : '4px 12px', 
                  margin: isMobile ? '2px 0' : '0',
                  fontSize: isMobile ? '11px' : '13px',
                  minWidth: isMobile ? 60 : 80
                }}
              >
                {isMobile ? '删除' : '删除'}
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
    
    // 处理展开/收起行
    const handleExpandRow = (record) => {
      const recordKey = record.id;
      setExpandedRowKeys(prev => {
        if (prev.includes(recordKey)) {
          return prev.filter(key => key !== recordKey);
        } else {
          return [...prev, recordKey];
        }
      });
    };
    
    // 动态生成数据列，添加响应式处理
    const dataColumns = []
    if (Array.isArray(selectedTable.columns)) {
      selectedTable.columns.forEach(column => {
        const dataColumn = {
          title: column.column_name,
          dataIndex: ['data', column.column_name],
          key: column.column_name,
          ellipsis: true,
          // 设置固定宽度，防止表格宽度不断变化
          width: 200,
          minWidth: 120,
          maxWidth: 300,
          render: (text, record) => {
            const value = record.data[column.column_name]
            return <span dangerouslySetInnerHTML={{ __html: highlightText(value) }} />;
          }
        }
        dataColumns.push(dataColumn)
      })
    }
    
    // 筛选出用户设置为可见的列
    const userVisibleColumns = dataColumns.filter(column => visibleColumns[column.key] === true)
    
    // 基础可见列（始终显示）
    const baseVisibleColumns = [createdAtColumn]
    // 基础下拉列
    const baseHiddenColumns = []
    
    // 根据列的dropDown属性和用户设置，将列分为可见列和下拉列
    const dropdownColumns = []
    const nonDropdownColumns = []
    
    // 遍历用户可见的列，根据dropDown属性分类
    userVisibleColumns.forEach(column => {
      const tableColumn = selectedTable.columns.find(col => col.column_name === column.key)
      if (tableColumn && tableColumn.dropDown === true) {
        // 明确设置为下拉显示的列
        dropdownColumns.push(column)
      } else {
        // 非下拉显示的列
        nonDropdownColumns.push(column)
      }
    })
    
    // 严格按照表格定义的"下拉显示"属性来显示列，不允许系统自行调整
    if (isMobile) {
      // 移动端处理：
      // 1. 显示所有非下拉列在主表格中
      // 2. 所有下拉列放入展开行
      // 3. 不允许系统自行调整列的位置，必须严格按照定义
      
      // 将基础列和所有非下拉数据列添加到可见列列表
      visibleColumnsList.push(...baseVisibleColumns)
      visibleColumnsList.push(...nonDropdownColumns)
      
      // 将所有下拉列添加到下拉列列表
      baseHiddenColumns.push(...dropdownColumns)
    } else {
      // 桌面端：
      // 1. 显示所有非下拉列（根据用户设置）
      // 2. 所有下拉列放入展开行
      visibleColumnsList.push(...baseVisibleColumns)
      visibleColumnsList.push(...nonDropdownColumns)
      baseHiddenColumns.push(...dropdownColumns)
    }
    
    // 检查创建时间列是否应该显示
    if (visibleColumns['created_at'] !== true) {
      // 如果用户设置创建时间列为隐藏，则从可见列中移除
      const createdAtIndex = visibleColumnsList.findIndex(col => col.key === 'created_at')
      if (createdAtIndex > -1) {
        visibleColumnsList.splice(createdAtIndex, 1)
        baseHiddenColumns.push(createdAtColumn)
      }
    }
    
    // 添加操作列
    if (visibleColumns['action'] === true) {
      visibleColumnsList.push(actionColumn)
    } else {
      baseHiddenColumns.push(actionColumn)
    }
    
    // 找出用户设置为隐藏的数据列，添加到下拉列中
    const hiddenDataColumns = dataColumns.filter(column => visibleColumns[column.key] !== true)
    baseHiddenColumns.push(...hiddenDataColumns)
    
    // 合并所有下拉列
    const allHiddenColumns = [...baseHiddenColumns]
    
    return { visibleColumns: visibleColumnsList, hiddenColumns: allHiddenColumns }
  }

  // 生成表单字段
  const generateFormItems = () => {
    if (!selectedTable || !Array.isArray(selectedTable.columns)) return null
    
    return selectedTable.columns.map(column => {
      // 如果该列启用了自增功能，则不显示输入框
      if (column.autoIncrement) {
        return null
      }
      
      return (
        <Form.Item 
          key={column.column_name} 
          label={column.column_name} 
          name={column.column_name}
          rules={[{ required: true, message: `请输入${column.column_name}!` }]}
        >
          <Input placeholder={`请输入${column.column_name}`} />
        </Form.Item>
      )
    }).filter(item => item !== null) // 过滤掉自增列
  }

  return (
    <Card 
      title="数据管理" 
      style={{ 
        marginBottom: 20, 
        borderRadius: 8, 
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f0f0f0',
        padding: isMobile ? '12px' : '20px'
      }}
      styles={{ 
        header: {
          backgroundColor: '#fafafa',
          borderBottom: '2px solid #e8e8e8',
          fontSize: '16px',
          fontWeight: 600,
          padding: isMobile ? '10px 12px' : '16px 20px'
        }
      }}
    >
      <div style={{ 
        marginBottom: isMobile ? 12 : 20, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        padding: isMobile ? '0 4px' : '0'
      }}>
        <div>
          {selectedTable && (
            <span style={{ 
              fontSize: 15, 
              fontWeight: 600, 
              color: '#333',
              marginRight: 16
            }}>
              当前表格: {selectedTable.table_name}
            </span>
          )}
        </div>
        <Space size={isMobile ? "small" : "middle"} wrap style={{ width: '100%', justifyContent: isMobile ? 'center' : 'flex-end' }}>
          {(userRole === 'admin' || userRole === 'leader' || userRole === 'member') && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => showModal()}
              disabled={!selectedTable}
              style={{
                borderRadius: 6,
                fontWeight: 500,
                transition: 'all 0.3s ease',
                padding: isMobile ? '4px 12px' : '8px 16px',
                fontSize: isMobile ? '12px' : '14px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {isMobile ? '添加' : '添加数据'}
            </Button>
          )}
          {(userRole === 'admin' || userRole === 'leader') && (
            <>
              <Upload
                beforeUpload={handleImport}
                showUploadList={false}
                accept=".csv"
              >
                <Button 
                  type="default" 
                  icon={<UploadOutlined />}
                  loading={importing}
                  disabled={!selectedTable}
                  style={{
                    borderRadius: 6,
                    fontWeight: 500,
                    transition: 'all 0.3s ease',
                    padding: isMobile ? '4px 12px' : '8px 16px',
                    fontSize: isMobile ? '12px' : '14px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {isMobile ? '导入' : '导入数据'}
                </Button>
              </Upload>
              <Button 
                type="default" 
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={!selectedTable}
                style={{
                  borderRadius: 6,
                  fontWeight: 500,
                  transition: 'all 0.3s ease',
                  padding: isMobile ? '4px 12px' : '8px 16px',
                  fontSize: isMobile ? '12px' : '14px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {isMobile ? '导出' : '导出数据'}
              </Button>
              <Button 
                type="default" 
                onClick={downloadSampleCSV}
                disabled={!selectedTable}
                style={{
                  borderRadius: 6,
                  fontWeight: 500,
                  transition: 'all 0.3s ease',
                  padding: isMobile ? '4px 12px' : '8px 16px',
                  fontSize: isMobile ? '12px' : '14px',
                  display: isMobile ? 'none' : 'inline-flex' // 移动端隐藏下载示例CSV按钮
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                下载示例CSV
              </Button>
            </>
          )}
        </Space>
      </div>
      
      {uploadError && (
        <Alert
          message="导入错误"
          description={uploadError}
          type="error"
          showIcon
          style={{ 
            marginBottom: 20, 
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(255, 102, 102, 0.1)'
          }}
        />
      )}

      {selectedTable && (
        <div style={{ 
          marginBottom: isMobile ? 12 : 20, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: isMobile ? '0 4px' : '0'
        }}>
          {/* 搜索组件 */}
          <div style={{ 
            display: 'flex', 
            gap: 8,
            width: '100%',
            maxWidth: 600
          }}>
            <Input
              placeholder="输入搜索关键词或正则表达式"
              value={getCurrentSearchState().searchText}
              onChange={(e) => setCurrentSearchState({ searchText: e.target.value })}
              onPressEnter={handleSearch}
              allowClear={true}
              onClear={handleClearSearch}
              style={{ 
                borderRadius: 6,
                flex: 1
              }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
              style={{ 
                borderRadius: 6,
                whiteSpace: 'nowrap'
              }}
            >
              搜索
            </Button>
            {getCurrentSearchState().isSearching && (
              <Button
                onClick={handleClearSearch}
                style={{ 
                  borderRadius: 6,
                  whiteSpace: 'nowrap'
                }}
              >
                清除
              </Button>
            )}
          </div>
          
          {/* 搜索结果统计 */}
          {getCurrentSearchState().isSearching && (
            <div style={{ 
              fontSize: 14, 
              color: '#666',
              fontWeight: 500
            }}>
              共找到 <span style={{ color: '#1890ff', fontWeight: 600 }}>{getCurrentSearchState().searchCount}</span> 条匹配记录
            </div>
          )}
        </div>
      )}

      {!selectedTable ? (
        <Card
          style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            backgroundColor: '#fff'
          }}
          variant="outlined"
        >
          <div style={{ fontSize: 16, color: '#666', lineHeight: 1.6 }}>
            请从左侧菜单选择一个表格来管理数据
          </div>
        </Card>
      ) : loading ? (
        <Card
          style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            backgroundColor: '#fff'
          }}
          variant="outlined"
        >
          <div style={{ fontSize: 16, color: '#666', lineHeight: 1.6 }}>
            数据加载中...
          </div>
        </Card>
      ) : dataList.length === 0 ? (
        <Card
          style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            backgroundColor: '#fff'
          }}
          variant="outlined"
        >
          <div style={{ fontSize: 16, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
            当前表格暂无数据
          </div>
          {(userRole === 'admin' || userRole === 'leader' || userRole === 'member') && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => showModal()}
              style={{
                borderRadius: 6,
                padding: '8px 24px',
                fontWeight: 500,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              添加第一条数据
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* 生成列配置，包含可见列和下拉列 */}
          {(() => {
            const { visibleColumns, hiddenColumns } = generateColumns();
            return (
              <MultiSelectDelete
                columns={visibleColumns}
                hiddenColumns={hiddenColumns}
                dataSource={getCurrentSearchState().isSearching ? getCurrentSearchState().searchResults : dataList}
                rowKey="id"
                loading={loading}
                deleteLoading={deleteLoading}
                onDelete={handleDelete}
                pagination={{
                  current: page,
                  pageSize: pageSize,
                  total: getCurrentSearchState().isSearching ? getCurrentSearchState().searchCount : total,
                  onChange: handlePaginationChange,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100']
                }}
                expandable={{
                  expandedRowKeys: expandedRowKeys,
                  onExpandedRowsChange: setExpandedRowKeys
                }}
              />
            );
          })()}
        </>
      )}

      {/* 数据编辑/添加模态框 */}
      <Modal
        title={isEditMode ? '编辑数据' : '添加数据'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {generateFormItems()}
          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {isEditMode ? '保存修改' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编码选择模态框 */}
      <Modal
        title="选择文件编码"
        open={showEncodingModal}
        onOk={confirmEncoding}
        onCancel={() => setShowEncodingModal(false)}
        okText="确定"
        cancelText="取消"
        width={400}
      >
        <div style={{ marginBottom: 16 }}>
          <p>请选择CSV文件的编码格式：</p>
        </div>
        <Select
          value={selectedEncoding}
          onChange={setSelectedEncoding}
          style={{ width: '100%' }}
          options={[
            { value: 'UTF-8', label: 'UTF-8' },
            { value: 'GBK', label: 'GBK (中文Windows)' },
            { value: 'Big5', label: 'Big5 (繁体中文)' },
            { value: 'ISO-8859-1', label: 'ISO-8859-1 (Latin-1)' },
            { value: 'UTF-16', label: 'UTF-16' }
          ]}
        />
        <div style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
          <p>提示：</p>
          <ul style={{ margin: '8px 0' }}>
            <li>UTF-8：适用于大多数现代CSV文件</li>
            <li>GBK：适用于中文Windows系统生成的CSV文件</li>
            <li>Big5：适用于繁体中文系统生成的CSV文件</li>
          </ul>
        </div>
      </Modal>
    </Card>
  )
}

export default DataManagement