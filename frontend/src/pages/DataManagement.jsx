import React, { useState, useEffect, useContext } from 'react'
import { Card, Button, Modal, Form, Input, message, Popconfirm, Space, InputNumber, Upload, Alert, Select, Dropdown, Menu, Checkbox } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, AppstoreOutlined, SearchOutlined, CopyOutlined } from '@ant-design/icons'
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
  const [expandedRowKeys, setExpandedRowKeys] = useState(() => {
    // 从localStorage恢复展开行状态
    const savedExpandedRowKeys = localStorage.getItem('expandedRowKeys')
    return savedExpandedRowKeys ? JSON.parse(savedExpandedRowKeys) : []
  })
  // 保留链接状态管理
  const [keepLinks, setKeepLinks] = useState({})
  
  // 高亮行ID状态，用于动画效果
  const [highlightedRowId, setHighlightedRowId] = useState(null)
  
  // 复制行相关状态
  const [copiedOriginalData, setCopiedOriginalData] = useState(null)
  const [isCopyMode, setIsCopyMode] = useState(false)
  // 下拉列功能相关状态
  // 使用默认对象而不是null，确保状态始终可用
  const [visibleColumns, setVisibleColumns] = useState({
    'created_at': true,
    'action': true
  })
  const [isAllColumnsChecked, setIsAllColumnsChecked] = useState(true)
  
  // 快捷导入相关状态
  const [quickImportText, setQuickImportText] = useState('')
  const [parseMessage, setParseMessage] = useState('')
  const [parseError, setParseError] = useState('')
  
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
  
  // 当模态框关闭时清空快捷导入相关状态
  useEffect(() => {
    if (!isModalVisible) {
      setQuickImportText('');
      setParseMessage('');
      setParseError('');
    }
  }, [isModalVisible])

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

  // 生成CSV内容
  const generateCSV = (columns, data) => {
    // 表头
    const headers = ['id', 'created_at', 'updated_at']
    // 从columns中获取所有列名
    columns.forEach(col => {
      headers.push(col.column_name)
    })
    
    // 生成CSV行
    const rows = [headers.join(',')]
    
    // 处理每一行数据
    data.forEach(item => {
      const row = [
        item.id,
        item.created_at,
        item.updated_at
      ]
      
      // 处理每个列的值
      columns.forEach(col => {
        let value = item.data ? item.data[col.column_name] : ''
        // 如果是对象，转换为字符串
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value)
        } else if (value === null || value === undefined) {
          value = ''
        }
        
        // 处理CSV特殊字符：如果包含逗号、引号或换行符，用引号包裹
        if (typeof value === 'string') {
          if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
            // 转义引号
            value = value.replace(/"/g, '""')
            // 用引号包裹
            value = `"${value}"`
          }
        }
        
        row.push(value)
      })
      
      rows.push(row.join(','))
    })
    
    return rows.join('\n')
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
      
      // 对于包含链接对象的数据，先获取其纯文本表示，确保导出的数据都是纯文本
      const response = await axios.get(`/api/v1/tables/${selectedTable.id}/data`, {
        params: {
          page: 1,
          per_page: 10000 // 一次性获取所有数据进行处理
        }
      })
      
      // 检查响应
      if (!response.data || response.data.code !== 200) {
        message.error('获取数据失败，无法导出')
        return
      }
      
      // 处理数据，将所有链接对象转换为纯文本
      const processedData = response.data.data.items.map(item => {
        const processedItem = { ...item }
        // 处理data字段
        if (item.data) {
          processedItem.data = { ...item.data }
          for (const key in processedItem.data) {
            const value = processedItem.data[key]
            // 如果是链接对象，只保留文本部分
            if (typeof value === 'object' && value !== null && value._text) {
              processedItem.data[key] = value._text
            }
          }
        }
        return processedItem
      })
      
      // 手动生成CSV
      const csvContent = generateCSV(selectedTable.columns, processedData)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      // 生成文件名
      const filename = `${selectedTable.table_name}_export.csv`
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      console.log(`数据导出成功，文件名: ${filename}`)
      message.success(`数据导出成功，文件名: ${filename}`)
      return
    } catch (error) {
      console.error('前端处理导出数据失败，尝试使用后端导出:', error)
      
      // 如果前端处理失败，尝试使用后端导出
      try {
        const response = await axios.get(`/api/v1/tables/${selectedTable.id}/export`, {
          responseType: 'blob'
        })
      
      console.log('导出请求成功，开始处理下载')
      
      // 检查响应类型（使用包含关系，允许带charset参数）
      const contentType = response.headers['content-type']
      if (!contentType || !contentType.includes('text/csv')) {
        // 尝试解析错误信息
        let errorText = '未知错误'
        try {
          errorText = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.readAsText(response.data)
          })
          
          console.error('导出失败，服务器返回错误:', errorText)
          console.error('完整响应:', response)
          message.error(`数据导出失败: ${errorText}`)
        } catch (parseError) {
          console.error('导出失败，无法解析错误信息:', parseError)
          console.error('完整响应:', response)
          message.error(`数据导出失败: 服务器返回非CSV响应，状态码: ${response.status}`)
        }
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
      } catch (backendError) {
        console.error('后端导出失败:', backendError)
        console.error('导出数据错误详情:', {
          message: backendError.message,
          response: backendError.response ? {
            status: backendError.response.status,
            statusText: backendError.response.statusText,
            data: backendError.response.data,
            headers: backendError.response.headers
          } : null,
          config: backendError.config ? {
            url: backendError.config.url,
            method: backendError.config.method
          } : null
        })
        
        if (backendError.response) {
          // 服务器返回错误
          if (backendError.response.status === 401) {
            message.error('登录已过期，请重新登录')
          } else if (backendError.response.status === 403) {
            message.error('您没有导出数据的权限')
          } else if (backendError.response.status === 404) {
            message.error('表格不存在或已被删除')
          } else if (backendError.response.status === 500) {
            message.error('服务器内部错误，请联系管理员')
          } else {
            message.error(`数据导出失败，错误码: ${backendError.response.status}`)
          }
        } else if (backendError.request) {
          // 请求已发送但没有收到响应
          message.error('网络异常，服务器没有响应，请检查网络连接')
        } else {
          // 请求配置错误
          message.error(`数据导出失败: ${backendError.message}`)
        }
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
  const showModal = (record = null, isCopy = false) => {
    if (record) {
      if (isCopy) {
        // 复制模式：使用添加模式，但填充数据
        setIsEditMode(false)
        setIsCopyMode(true)
        setCurrentData(record)
        
        // 初始化保留链接状态
        const initialKeepLinks = {}
        
        // 准备表单数据
        const formData = {}
        
        // 保存原始数据用于后续比较
        const originalFormData = {}
        
        // 遍历所有列，确保每列都有对应的值
        selectedTable.columns.forEach(column => {
          const key = column.column_name
          const value = record.data[key]
          
          // 跳过自增列
          if (column.autoIncrement) {
            return
          }
          
          console.log(`[DEBUG] Processing column ${key}, value:`, value);
          console.log(`[DEBUG] Value type:`, typeof value);
          
          let fieldValue = ''
          let isLink = false
          
          // 检查是否为链接对象 { _text: '显示文本', _link: '链接URL' }
          try {
            if (typeof value === 'object' && value !== null) {
              // 尝试获取_text属性，无论是否有_link属性
              if (value._text !== undefined) {
                fieldValue = value._text
                isLink = !!value._link // 只有当有_link属性时才认为是链接
              } else {
                // 其他对象类型，转换为字符串
                fieldValue = JSON.stringify(value) || ''
                isLink = false
              }
            } else {
              // 非对象类型，直接转换为字符串
              fieldValue = value !== null && value !== undefined ? String(value) : ''
              isLink = false
            }
          } catch (error) {
            // 处理任何可能的错误
            console.error(`[DEBUG] Error processing column ${key}:`, error);
            fieldValue = value !== null && value !== undefined ? String(value) : ''
            isLink = false
          }
          
          console.log(`[DEBUG] Processed fieldValue:`, fieldValue, `isLink:`, isLink);
          
          // 设置保留链接状态和表单值
          initialKeepLinks[key] = isLink // 只有链接对象才显示保留链接选项
          formData[key] = fieldValue // 设置表单默认值
          originalFormData[key] = fieldValue // 保存原始值用于比较
        })
        
        setKeepLinks(initialKeepLinks)
        setCopiedOriginalData(originalFormData)
        
        console.log(`[DEBUG] Final formData:`, formData);
        
        // 直接设置表单值，然后显示模态框
        form.setFieldsValue(formData)
      } else {
        // 编辑模式
        setIsEditMode(true)
        setIsCopyMode(false)
        setCurrentData(record)
        
        // 初始化保留链接状态
        const initialKeepLinks = {}
        
        // 准备表单数据
        const formData = {}
        
        // 遍历所有列，确保每列都有对应的值
        selectedTable.columns.forEach(column => {
          const key = column.column_name
          const value = record.data[key]
          
          // 跳过自增列
          if (column.autoIncrement) {
            return
          }
          
          console.log(`[DEBUG] Processing column ${key}, value:`, value);
          console.log(`[DEBUG] Value type:`, typeof value);
          
          let fieldValue = ''
          let isLink = false
          
          // 检查是否为链接对象 { _text: '显示文本', _link: '链接URL' }
          try {
            if (typeof value === 'object' && value !== null) {
              // 尝试获取_text属性，无论是否有_link属性
              if (value._text !== undefined) {
                fieldValue = value._text
                isLink = !!value._link // 只有当有_link属性时才认为是链接
              } else {
                // 其他对象类型，转换为字符串
                fieldValue = JSON.stringify(value) || ''
                isLink = false
              }
            } else {
              // 非对象类型，直接转换为字符串
              fieldValue = value !== null && value !== undefined ? String(value) : ''
              isLink = false
            }
          } catch (error) {
            // 处理任何可能的错误
            console.error(`[DEBUG] Error processing column ${key}:`, error);
            fieldValue = value !== null && value !== undefined ? String(value) : ''
            isLink = false
          }
          
          console.log(`[DEBUG] Processed fieldValue:`, fieldValue, `isLink:`, isLink);
          
          // 设置保留链接状态和表单值
          initialKeepLinks[key] = isLink // 只有链接对象才显示保留链接选项
          formData[key] = fieldValue // 设置表单默认值
        })
        
        setKeepLinks(initialKeepLinks)
        
        console.log(`[DEBUG] Final formData:`, formData);
        
        // 直接设置表单值，然后显示模态框
        form.setFieldsValue(formData)
      }
    } else {
      // 添加模式
      setIsEditMode(false)
      setIsCopyMode(false)
      setCurrentData(null)
      setCopiedOriginalData(null)
      setKeepLinks({})
      form.resetFields()
    }
    
    // 显示模态框
    setIsModalVisible(true)
  }

  // 处理表单提交
  const handleSubmit = async (values) => {
    if (!selectedTable) return
    
    // 复制模式下验证：检查是否有任何字段被修改
    if (isCopyMode && copiedOriginalData) {
      const hasModified = Object.keys(values).some(key => {
        const originalValue = copiedOriginalData[key] || ''
        const currentValue = values[key] || ''
        return String(currentValue).trim() !== String(originalValue).trim()
      })
      
      if (!hasModified) {
        message.warning('没有修改任何一个值')
        return
      }
    }
    
    // 验证：确保至少有一个字段有内容
    const hasContent = Object.values(values).some(value => {
      return value !== null && value !== undefined && value.trim() !== ''
    })
    
    if (!hasContent) {
      message.warning('请至少输入一个字段的内容')
      return
    }
    
    try {
      let response
      let submitData = { ...values }
      
      // 在编辑模式下，处理保留链接和自增列
      if (isEditMode && currentData) {
        // 遍历所有列，处理每一列的数据
        selectedTable.columns.forEach(column => {
          const key = column.column_name
          
          // 跳过自增列
          if (column.autoIncrement) {
            // 保留自增列的原有值
            submitData[key] = currentData.data[key]
            return
          }
          
          // 检查当前字段是否有原始数据
          if (!currentData.data[key]) {
            return
          }
          
          // 获取当前字段的新值
          const newValue = values[key] !== undefined ? values[key] : currentData.data[key]
          
          // 检查当前字段是否为链接对象 { _text: '显示文本', _link: '链接URL' }
          const isOriginalLinkObject = typeof currentData.data[key] === 'object' && 
                                      currentData.data[key] !== null && 
                                      currentData.data[key]._text && 
                                      currentData.data[key]._link
          
          // 处理链接对象
          if (isOriginalLinkObject) {
            // 检查是否勾选了保留链接
            if (keepLinks[key]) {
              // 勾选了保留链接：将文本框的新值放入链接对象的_text中
              submitData[key] = {
                ...currentData.data[key],
                _text: newValue || currentData.data[key]._text // 使用新值或保留原文本
              }
            } else {
              // 未勾选保留链接：直接把文本框的新值放入数据库，而非再次变成对象
              submitData[key] = newValue || ''
            }
          }
          // 处理非链接对象
          else {
            // 直接使用新值
            submitData[key] = newValue
          }
        })
        
        // 编辑模式
        response = await axios.put(`/api/v1/tables/${selectedTable.id}/data/${currentData.id}`, {
          data: submitData
        })
      } else {
        // 复制模式或添加模式
        // 处理保留链接和自增列（如果有）
        if (isCopyMode && currentData) {
          selectedTable.columns.forEach(column => {
            const key = column.column_name
            
            // 跳过自增列
            if (column.autoIncrement) {
              return
            }
            
            // 检查当前字段是否有原始数据
            if (!currentData.data[key]) {
              return
            }
            
            // 获取当前字段的新值
            const newValue = values[key] !== undefined ? values[key] : ''
            
            // 检查当前字段是否为链接对象 { _text: '显示文本', _link: '链接URL' }
            const isOriginalLinkObject = typeof currentData.data[key] === 'object' && 
                                        currentData.data[key] !== null && 
                                        currentData.data[key]._text && 
                                        currentData.data[key]._link
            
            // 处理链接对象
            if (isOriginalLinkObject) {
              // 检查是否勾选了保留链接
              if (keepLinks[key]) {
                // 勾选了保留链接：将文本框的新值放入链接对象的_text中
                submitData[key] = {
                  ...currentData.data[key],
                  _text: newValue || currentData.data[key]._text // 使用新值或保留原文本
                }
              } else {
                // 未勾选保留链接：直接把文本框的新值放入数据库，而非再次变成对象
                submitData[key] = newValue || ''
              }
            }
          })
        }
        
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
          
          // 检查是否为链接对象
          if (typeof value === 'object' && value !== null && value._text) {
            // 链接对象，检查其_text属性
            if (regex.test(value._text)) {
              return true
            }
          }
          // 检查是否为字符串
          else if (typeof value === 'string' && regex.test(value)) {
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
    
    let displayText = ''
    
    // 处理链接对象
    if (typeof text === 'object' && text !== null && text._text) {
      displayText = text._text
    }
    // 处理非链接对象
    else if (typeof text === 'string') {
      displayText = text
    }
    // 处理其他类型
    else {
      displayText = text !== null && text !== undefined ? String(text) : ''
    }
    
    // 如果没有高亮文本，直接返回
    if (!currentState.highlightedText) {
      return displayText
    }
    
    try {
      const regex = new RegExp(`(${currentState.highlightedText})`, 'gi')
      return displayText.replace(regex, '<span style="background-color: #fff212; font-weight: 500;">$1</span>')
    } catch (error) {
      return displayText
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
  
  // 保存展开行状态到localStorage
  useEffect(() => {
    localStorage.setItem('expandedRowKeys', JSON.stringify(expandedRowKeys))
  }, [expandedRowKeys])
  
  // 从localStorage恢复selectedTableId
  useEffect(() => {
    const savedSelectedTableId = localStorage.getItem('selectedTableId')
    if (savedSelectedTableId && !selectedTableId) {
      setSelectedTableId(parseInt(savedSelectedTableId))
    }
  }, [selectedTableId, setSelectedTableId])
  
  // 从localStorage恢复需要自动展开的行ID
  useEffect(() => {
    console.log('[高亮调试] 开始检查自动展开和高亮...')
    console.log('[高亮调试] 数据列表长度:', dataList.length)
    console.log('[高亮调试] 当前选中表格:', selectedTable ? selectedTable.id : 'null')
    
    // 只有当数据列表加载完成且当前有选中表格时才执行自动展开和高亮
    if (dataList.length > 0 && selectedTable) {
      const autoExpandInfoStr = localStorage.getItem('autoExpandInfo')
      console.log('[高亮调试] autoExpandInfoStr:', autoExpandInfoStr)
      
      if (autoExpandInfoStr) {
        try {
          const autoExpandInfo = JSON.parse(autoExpandInfoStr)
          console.log('[高亮调试] 解析后的autoExpandInfo:', autoExpandInfo)
          console.log('[高亮调试] 类型比较 - autoExpandInfo.tableId:', typeof autoExpandInfo.tableId, 'selectedTable.id:', typeof selectedTable.id)
          
          // 只有当当前表格ID与目标表格ID匹配时才执行高亮逻辑
          if (autoExpandInfo.tableId === selectedTable.id) {
            const rowId = autoExpandInfo.rowId
            console.log('[高亮调试] 行ID:', rowId, '类型:', typeof rowId)
            
            // 检查行ID是否存在于数据中
            const rowExists = dataList.some(item => item.id === rowId)
            console.log('[高亮调试] 行是否存在:', rowExists)
            if (rowExists) {
              // 先将需要展开的行ID添加到expandedRowKeys中
              setExpandedRowKeys(prev => {
                if (!prev.includes(rowId)) {
                  console.log('[高亮调试] 添加行ID到expandedRowKeys:', rowId)
                  return [...prev, rowId]
                }
                return prev
              })
              
              // 直接设置高亮行ID，使用更简单的方式
              console.log('[高亮调试] 直接设置highlightedRowId:', rowId)
              setHighlightedRowId(rowId)
              
              // 6秒后移除高亮效果
              const clearTimer = setTimeout(() => {
                console.log('[高亮调试] 6秒后清除highlightedRowId')
                setHighlightedRowId(null)
              }, 6000)
              
              // 保存定时器引用，确保能被清除
              if (window.highlightTimer) {
                clearTimeout(window.highlightTimer)
              }
              window.highlightTimer = clearTimer
            } else {
              console.log('[高亮调试] 行ID不存在于数据中:', rowId)
            }
          } else {
            console.log('[高亮调试] 表格ID不匹配:', autoExpandInfo.tableId, '!==', selectedTable.id)
          }
        } catch (error) {
          console.error('[高亮调试] 解析autoExpandInfo失败:', error)
        }
        finally {
          // 无论是否执行高亮逻辑，都删除localStorage中的autoExpandInfo，防止每次加载都尝试展开
          console.log('[高亮调试] 清除localStorage中的autoExpandInfo')
          localStorage.removeItem('autoExpandInfo')
        }
      } else {
        console.log('[高亮调试] 没有找到autoExpandInfo')
      }
    } else {
      console.log('[高亮调试] 数据列表为空或没有选中表格，不执行高亮')
    }
  }, [setExpandedRowKeys, dataList, selectedTable])
  
  // 当selectedTableId变化时保存到localStorage
  useEffect(() => {
    if (selectedTableId) {
      localStorage.setItem('selectedTableId', selectedTableId)
    }
  }, [selectedTableId])
  
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
      width: isMobile ? 125 : 170, // 精确调整宽度，正好适配两个按钮和间距
      align: 'center', // 居中对齐
      fixed: 'right', // 固定在右侧，提升用户体验
      render: (text, record) => (
        <Space 
          size={isMobile ? 'small' : 'middle'} 
          style={{ 
            flexWrap: 'nowrap' // 所有设备都禁止换行，确保按钮在同一水平线上
          }}
        >
          {(userRole === 'admin' || userRole === 'leader' || userRole === 'member') && (
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
          {(userRole === 'admin' || userRole === 'leader' || userRole === 'member') && (
            <Button 
              type="default" 
              icon={<CopyOutlined />} 
              size={isMobile ? 'small' : 'middle'} 
              onClick={() => showModal(record, true)}
              className="action-button"
              style={{ 
                padding: isMobile ? '2px 8px' : '4px 12px', 
                margin: isMobile ? '2px 0' : '0',
                fontSize: isMobile ? '11px' : '13px',
                minWidth: isMobile ? 60 : 80
              }}
            >
              {isMobile ? '复制' : '复制'}
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
            // 如果是链接对象，直接渲染为链接
            if (typeof value === 'object' && value !== null && value._text && value._link) {
              const highlightedText = highlightText(value._text)
              
              // 检查链接是否为表格链接
              const isTableLink = value._link.startsWith('table:');
              
              if (isTableLink) {
                // 处理表格链接，格式：table:{targetTableId}:{targetRowId}
                return (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault(); // 阻止默认的href跳转
                      const [, targetTableIdStr, targetRowIdStr] = value._link.split(':');
                      console.log('[链接调试] 原始链接:', value._link);
                      console.log('[链接调试] 解析结果 - tableId:', targetTableIdStr, 'rowId:', targetRowIdStr);
                      
                      if (targetTableIdStr && targetRowIdStr) {
                        // 确保转换为数字类型
                        const targetTableId = parseInt(targetTableIdStr);
                        const targetRowId = parseInt(targetRowIdStr);
                        console.log('[链接调试] 转换后 - tableId:', targetTableId, 'rowId:', targetRowId);
                        
                        // 跳转到目标表格
                        localStorage.setItem('selectedTableId', targetTableId);
                        // 保存需要展开的行ID和目标表格ID
                        localStorage.setItem('autoExpandInfo', JSON.stringify({
                          tableId: targetTableId,
                          rowId: targetRowId
                        }));
                        console.log('[链接调试] 已保存到localStorage');
                        // 刷新页面
                        window.location.reload();
                      }
                    }}
                    style={{
                      color: '#1890ff',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      display: 'inline-block',
                      width: '100%',
                      boxSizing: 'border-box',
                      wordBreak: 'break-word',
                      overflow: 'hidden'
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightedText }}
                  />
                );
              } else {
                // 处理普通网页链接
                return (
                  <a
                    href={value._link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#1890ff',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      display: 'inline-block',
                      width: '100%',
                      boxSizing: 'border-box',
                      wordBreak: 'break-word',
                      overflow: 'hidden'
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightedText }}
                  />
                );
              }
            }
            // 否则按照原来的方式处理
            let displayValue = value
            if (typeof displayValue === 'object' && displayValue !== null) {
              displayValue = displayValue._text || JSON.stringify(displayValue)
            }
            return <span dangerouslySetInnerHTML={{ __html: highlightText(displayValue) }} />;
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

  // 解析输入数据
  const parseInputData = (inputText) => {
    if (!inputText.trim()) return null;
    
    let parsedData = null;
    let parseMethod = '';
    
    // 尝试解析JSON格式
    try {
      parsedData = JSON.parse(inputText);
      parseMethod = 'JSON';
    } catch (e) {
      // 尝试解析YAML格式（简单实现，仅支持基本键值对）
      try {
        const lines = inputText.trim().split('\n');
        parsedData = {};
        let inObject = false;
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith('#')) continue;
          
          if (trimmedLine === '{') {
            inObject = true;
            continue;
          } else if (trimmedLine === '}') {
            inObject = false;
            break;
          }
          
          const colonIndex = trimmedLine.indexOf(':');
          if (colonIndex > 0) {
            const key = trimmedLine.substring(0, colonIndex).trim().replace(/^['"]|['"]$/g, '');
            const value = trimmedLine.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
            parsedData[key] = value;
          }
        }
        parseMethod = 'YAML';
      } catch (e) {
        // 尝试解析XML格式（简单实现，仅支持基本键值对）
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(inputText, 'text/xml');
          const root = xmlDoc.documentElement;
          parsedData = {};
          
          for (let i = 0; i < root.children.length; i++) {
            const child = root.children[i];
            parsedData[child.tagName] = child.textContent;
          }
          parseMethod = 'XML';
        } catch (e) {
          // 尝试解析Excel复制的文本格式（制表符分隔或逗号分隔）
          try {
            const lines = inputText.trim().split('\n').filter(line => line.trim());
            if (lines.length >= 2) {
              // 假设第一行是表头，第二行是数据
              const headers = lines[0].split(/[\t,]/).map(header => header.trim());
              const values = lines[1].split(/[\t,]/).map(value => value.trim());
              
              parsedData = {};
              for (let i = 0; i < headers.length; i++) {
                parsedData[headers[i]] = values[i] || '';
              }
              parseMethod = 'Excel';
            }
          } catch (e) {
            return null;
          }
        }
      }
    }
    
    return parsedData;
  };
  
  // 处理快捷导入
  const handleQuickImport = () => {
    if (!quickImportText.trim()) {
      setParseError('请输入要解析的数据');
      setParseMessage('');
      return;
    }
    
    if (!selectedTable || !Array.isArray(selectedTable.columns)) {
      setParseError('请先选择一个表格');
      setParseMessage('');
      return;
    }
    
    // 解析输入数据
    const parsedData = parseInputData(quickImportText);
    if (!parsedData || typeof parsedData !== 'object') {
      setParseError('无法解析输入数据，请检查格式');
      setParseMessage('');
      return;
    }
    
    // 获取当前表格的列名
    const columnNames = selectedTable.columns
      .filter(column => !column.autoIncrement) // 排除自增列
      .map(column => column.column_name);
    
    // 准备要填充的数据
    const formData = {};
    const missingColumns = [];
    const extraColumns = [];
    
    // 检查缺失的列
    columnNames.forEach(columnName => {
      if (parsedData[columnName] !== undefined) {
        formData[columnName] = parsedData[columnName];
      } else {
        missingColumns.push(columnName);
      }
    });
    
    // 检查多余的列
    Object.keys(parsedData).forEach(key => {
      if (!columnNames.includes(key)) {
        extraColumns.push(key);
      }
    });
    
    // 填充表单数据
    form.setFieldsValue(formData);
    
    // 生成提示信息
    let missingMessage = '';
    let extraMessage = '';
    let successMessage = '';
    
    if (missingColumns.length > 0) {
      missingMessage = `缺少字段：${missingColumns.join('、')}`;
    }
    
    if (extraColumns.length > 0) {
      extraMessage = `多余字段：${extraColumns.join('、')}`;
    }
    
    if (missingColumns.length === 0 && extraColumns.length === 0) {
      successMessage = '解析成功，所有字段已填充';
    } else if (missingColumns.length === 0) {
      successMessage = '解析成功，所有必填字段已填充';
    } else if (extraColumns.length === 0) {
      successMessage = '解析成功，所有提供的字段已填充';
    } else {
      successMessage = '解析成功，部分字段已填充';
    }
    
    setParseMessage({ successMessage, missingMessage, extraMessage });
    setParseError('');
  };
  
  // 生成表单字段
  const generateFormItems = () => {
    if (!selectedTable || !Array.isArray(selectedTable.columns)) return null
    
    return selectedTable.columns.map(column => {
      // 如果该列启用了自增功能，则不显示输入框
      if (column.autoIncrement) {
        return null
      }
      
      const columnName = column.column_name
      
      // 检查当前字段是否有链接
      const hasLink = isEditMode && currentData && 
                     currentData.data[columnName] && 
                     typeof currentData.data[columnName] === 'object' && 
                     currentData.data[columnName]._link
      
      return (
        <div key={columnName} style={{ marginBottom: 16 }}>
          <Form.Item 
            label={columnName} 
            name={columnName}
            // 移除必填规则，允许字段为空
          >
            {/* 使用Form.Item只包裹Input，确保只有一个子元素 */}
            <Input 
              placeholder={`请输入${columnName}`} 
              style={{ width: '60%', marginRight: 12 }}
            />
          </Form.Item>
          {/* 如果有链接，在Form.Item外部显示保留链接checkbox */}
          {hasLink && (
            <div style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginTop: -28, marginLeft: '15%' }}>
              <Checkbox
                checked={keepLinks[columnName]}
                onChange={(e) => {
                  setKeepLinks(prev => ({
                    ...prev,
                    [columnName]: e.target.checked
                  }))
                }}
                style={{ marginRight: 8 }}
              />
              <span>保留链接</span>
            </div>
          )}
        </div>
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
                highlightedRowId={highlightedRowId}
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
          {/* 快捷导入区域 */}
          {!isEditMode && (
            <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#fafafa', borderRadius: 8, border: '1px dashed #d9d9d9' }}>
              <h4 style={{ marginBottom: 12, color: '#333' }}>快捷导入</h4>
              <p style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>支持JSON、YAML、XML和Excel复制文本格式，自动解析并填充表单</p>
              
              <div style={{ marginBottom: 12 }}>
                <textarea
                  placeholder='请输入要解析的数据，例如：{"名称":"测试产品","公司名称":"测试公司"}' 
                  style={{
                    width: '100%',
                    height: 120,
                    padding: 8,
                    fontSize: 12,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    resize: 'vertical',
                    fontFamily: 'monospace'
                  }}
                  value={quickImportText}
                  onChange={(e) => setQuickImportText(e.target.value)}
                  onFocus={() => {
                    setParseMessage('');
                    setParseError('');
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button 
                  type="default" 
                  onClick={handleQuickImport}
                  style={{ fontSize: 12 }}
                >
                  解析
                </Button>
                
                <Button 
                  type="link" 
                  onClick={() => {
                    setQuickImportText('');
                    setParseMessage('');
                    setParseError('');
                  }}
                  style={{ fontSize: 12, padding: 0 }}
                >
                  清空
                </Button>
              </div>
              
              {/* 解析结果提示 */}
              {parseError && (
                <div style={{ marginTop: 12, color: '#ff4d4f', fontSize: 12 }}>
                  {parseError}
                </div>
              )}
              
              {parseMessage && (
                <div style={{ marginTop: 12 }}>
                  {/* 成功提示 */}
                  <div style={{ fontSize: 12, color: '#52c41a', marginBottom: 4 }}>
                    {parseMessage.successMessage}
                  </div>
                  
                  {/* 缺少字段提示 - 红色 */}
                  {parseMessage.missingMessage && (
                    <div style={{ fontSize: 12, color: '#ff4d4f', marginBottom: 4 }}>
                      {parseMessage.missingMessage}
                    </div>
                  )}
                  
                  {/* 多余字段提示 - 绿色 */}
                  {parseMessage.extraMessage && (
                    <div style={{ fontSize: 12, color: '#52c41a', marginBottom: 4 }}>
                      {parseMessage.extraMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
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