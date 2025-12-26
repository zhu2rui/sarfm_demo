import React, { useState, useEffect, useRef, useContext } from 'react'
import { Table, Checkbox, Button, message, Modal, Space, Tag, Spin, Dropdown, Menu, Input, Select } from 'antd'
import { DeleteOutlined, LoadingOutlined, LinkOutlined, EditOutlined, SearchOutlined, CopyOutlined } from '@ant-design/icons'
import axios from 'axios'
import { TableContext } from '../App'

const { confirm } = Modal

const MultiSelectDelete = ({ 
  dataSource, 
  columns, 
  hiddenColumns = [], // 下拉列列表
  onDelete, 
  rowKey = 'id',
  loading = false,
  deleteLoading = false,
  showIndex = true,
  pagination = {},
  // 展开行配置
  expandable = {},
  // 高亮行ID，用于动画效果
  highlightedRowId = null
}) => {
  // 选中的行ID集合
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  // 最近一次点击的行索引
  const lastClickIndex = useRef(-1)
  // 数据索引映射
  const dataIndexMap = useRef(new Map())
  // 动态列宽映射
  const [columnWidths, setColumnWidths] = useState({})
  // 表格容器引用
  const tableRef = useRef(null)
  // 表格滚动容器引用
  const tableContainerRef = useRef(null)
  // 鼠标拖动相关状态
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  // 右键菜单相关状态
  const [contextMenuVisible, setContextMenuVisible] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedCellValue, setSelectedCellValue] = useState('')
  const [selectedCellInfo, setSelectedCellInfo] = useState({ record: null, column: null })
  const [isMobileLongPress, setIsMobileLongPress] = useState(false)
  const longPressTimer = useRef(null)
  // 表头右键菜单相关状态
  const [headerContextMenuVisible, setHeaderContextMenuVisible] = useState(false)
  const [headerContextMenuPosition, setHeaderContextMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedHeaderColumn, setSelectedHeaderColumn] = useState(null)
  // 存储哪些列需要显示字符长度列，格式：{ tableId: { columnKey: true/false } }
  const [showCharacterLengthColumns, setShowCharacterLengthColumns] = useState(() => {
    // 从localStorage恢复状态
    const saved = localStorage.getItem('showCharacterLengthColumns')
    return saved ? JSON.parse(saved) : {}
  })
  // 链接网页功能相关状态
  const [linkModalVisible, setLinkModalVisible] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  // 保存当前正在编辑链接的单元格信息
  const [currentEditingLink, setCurrentEditingLink] = useState({ record: null, column: null })
  
  // 链接到表格功能相关状态
  const [linkToTableModalVisible, setLinkToTableModalVisible] = useState(false)
  const [tablesList, setTablesList] = useState([])
  const [selectedTargetTable, setSelectedTargetTable] = useState(null)
  const [targetTableData, setTargetTableData] = useState([])
  const [targetTableColumns, setTargetTableColumns] = useState([])
  const [selectedTargetRow, setSelectedTargetRow] = useState(null)
  const [tablesLoading, setTablesLoading] = useState(false)
  const [targetTableLoading, setTargetTableLoading] = useState(false)
  // 分页相关状态
  const [targetTableCurrentPage, setTargetTableCurrentPage] = useState(1)
  const [targetTablePageSize, setTargetTablePageSize] = useState(20)
  const [targetTableTotal, setTargetTableTotal] = useState(0)
  
  // 使用TableContext获取表格数据
  const tableContext = useContext(TableContext)
  const tables = tableContext?.tables || []
  const fetchTables = tableContext?.fetchTables || (() => {})
  
  // 更新数据索引映射
  useEffect(() => {
    const map = new Map()
    dataSource.forEach((item, index) => {
      map.set(item[rowKey], index)
    })
    dataIndexMap.current = map
  }, [dataSource, rowKey])
  
  // 获取表格列表
  const fetchTablesList = async () => {
    try {
      setTablesLoading(true)
      // 如果上下文中没有表格数据，直接从API获取
      if (tables.length === 0) {
        const response = await axios.get('/api/v1/tables')
        if (response.data.code === 200) {
          setTablesList(response.data.data)
        } else {
          message.error(response.data.message)
          setTablesList([])
        }
      } else {
        // 使用上下文中的表格数据
        setTablesList(tables)
      }
    } catch (error) {
      console.error('获取表格列表失败:', error)
      message.error('获取表格列表失败，请重试')
      setTablesList([])
    } finally {
      setTablesLoading(false)
    }
  }
  
  // 获取目标表格数据
  const fetchTargetTableData = async (tableId, page = 1, pageSize = 20) => {
    try {
      setTargetTableLoading(true)
      
      // 获取目标表格详情，包括列配置
      const tableDetailResponse = await axios.get(`/api/v1/tables/${tableId}`)
      let tableColumns = []
      if (tableDetailResponse.data.code === 200) {
        tableColumns = tableDetailResponse.data.data.columns || []
        setTargetTableColumns(tableColumns)
      }
      
      // 获取目标表格数据
      const dataResponse = await axios.get(`/api/v1/tables/${tableId}/data`, {
        params: {
          page,
          per_page: pageSize
        }
      })
      
      if (dataResponse.data.code === 200) {
        setTargetTableData(dataResponse.data.data.items)
        setTargetTableTotal(dataResponse.data.data.total)
        setTargetTableCurrentPage(page)
        setTargetTablePageSize(pageSize)
      } else {
        message.error(dataResponse.data.message)
        setTargetTableData([])
        setTargetTableTotal(0)
      }
    } catch (error) {
      console.error('获取目标表格数据失败:', error)
      message.error('获取目标表格数据失败，请重试')
      setTargetTableData([])
      setTargetTableTotal(0)
    } finally {
      setTargetTableLoading(false)
    }
  }
  
  // 清除长按定时器
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])
  
  // 添加PC端鼠标拖动平移表格功能
  useEffect(() => {
    const handleMouseDown = (e) => {
      // 只在PC端且拖动容器存在时启用拖动
      if (tableContainerRef.current && e.button === 0) { // 只响应左键
        // 检查表格是否可滚动
        const container = tableContainerRef.current
        if (container.scrollWidth > container.clientWidth) {
          isDragging.current = true
          startX.current = e.pageX - container.offsetLeft
          scrollLeft.current = container.scrollLeft
          container.style.cursor = 'grabbing'
          e.preventDefault()
        }
      }
    }
    
    const handleMouseMove = (e) => {
      if (!isDragging.current || !tableContainerRef.current) return
      
      e.preventDefault()
      const x = e.pageX - tableContainerRef.current.offsetLeft
      const walk = (x - startX.current) * 1.5 // 拖动速度
      tableContainerRef.current.scrollLeft = scrollLeft.current - walk
    }
    
    const handleMouseUp = () => {
      isDragging.current = false
      if (tableContainerRef.current) {
        tableContainerRef.current.style.cursor = 'grab'
      }
    }
    
    // 添加全局事件监听，确保鼠标移动时即使光标离开容器也能继续拖动
    const handleGlobalMouseUp = () => {
      isDragging.current = false
      if (tableContainerRef.current) {
        tableContainerRef.current.style.cursor = 'grab'
      }
    }
    
    const handleGlobalMouseMove = (e) => {
      if (!isDragging.current || !tableContainerRef.current) return
      
      e.preventDefault()
      const container = tableContainerRef.current
      const x = e.pageX - container.offsetLeft
      const walk = (x - startX.current) * 1.5 // 拖动速度
      container.scrollLeft = scrollLeft.current - walk
    }
    
    // 添加事件监听
    if (tableContainerRef.current) {
      const container = tableContainerRef.current
      // 设置初始鼠标样式
      container.style.cursor = 'grab'
      
      // 添加本地事件监听
      container.addEventListener('mousedown', handleMouseDown)
      container.addEventListener('mousemove', handleMouseMove)
      container.addEventListener('mouseup', handleMouseUp)
      
      // 添加全局事件监听
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.addEventListener('mousemove', handleGlobalMouseMove)
    }
    
    // 清理事件监听
    return () => {
      if (tableContainerRef.current) {
        const container = tableContainerRef.current
        // 移除本地事件监听
        container.removeEventListener('mousedown', handleMouseDown)
        container.removeEventListener('mousemove', handleMouseMove)
        container.removeEventListener('mouseup', handleMouseUp)
      }
      
      // 移除全局事件监听
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [tableContainerRef])
  
  // 处理链接到表格
  const handleLinkToTable = () => {
    // 保存当前编辑的单元格信息
    const { record, column } = selectedCellInfo
    setCurrentEditingLink({ record, column })
    
    // 清空之前的选择
    setSelectedTargetTable(null)
    setTargetTableData([])
    setSelectedTargetRow(null)
    
    // 关闭右键菜单
    setContextMenuVisible(false)
    setIsMobileLongPress(false)
    
    // 打开链接到表格的模态框
    setLinkToTableModalVisible(true)
    
    // 加载表格列表
    fetchTablesList()
  }
  
  // 处理链接到网页
  const handleLinkToWeb = () => {
    // 只保存必要的信息，避免循环引用
    const { record, column } = selectedCellInfo
    const safeRecord = {
      [rowKey]: record[rowKey],
      table_id: record.table_id,
      data: record.data
    }
    setCurrentEditingLink({ record: safeRecord, column })
    setLinkModalVisible(true)
    setLinkUrl('') // 重置输入框
    setContextMenuVisible(false)
    setIsMobileLongPress(false)
  }
  
  // 处理链接保存
  const handleLinkSave = async () => {
    if (!linkUrl.trim()) {
      message.error('请输入有效的网址')
      return
    }
    
    // 验证网址格式
    let finalUrl = linkUrl
    try {
      new URL(finalUrl)
    } catch (e) {
      // 如果不是完整URL，尝试添加https://前缀
      try {
        new URL(`https://${linkUrl}`)
        finalUrl = `https://${linkUrl}`
      } catch (e) {
        message.error('请输入有效的网址格式')
        return
      }
    }
    
    // 获取当前正在编辑的记录和列信息
    const { record, column } = currentEditingLink
    if (!record || !column) {
      message.error('无效的编辑状态')
      return
    }
    
    try {
      // 获取必要的ID信息，确保使用基本类型
      const recordId = String(record[rowKey])
      const tableId = String(record.table_id)
      
      // 直接使用selectedCellInfo中的column，避免使用可能有循环引用的column对象
      const originalColumn = selectedCellInfo.column
      if (!originalColumn) {
        message.error('无效的列信息')
        return
      }
      
      // 获取列名：确保只使用字符串
      let columnKey = originalColumn.key || ''
      if (!columnKey && originalColumn.dataIndex) {
        if (Array.isArray(originalColumn.dataIndex) && originalColumn.dataIndex.length > 1) {
          // 对于嵌套数据索引，如['data', 'column_name']，取第二个元素
          columnKey = originalColumn.dataIndex[1]
        } else if (typeof originalColumn.dataIndex === 'string') {
          // 对于直接字符串索引，直接使用
          columnKey = originalColumn.dataIndex
        } else {
          // 对于其他情况，使用列标题作为备选
          columnKey = originalColumn.title
        }
      }
      
      // 确保columnKey是字符串
      columnKey = String(columnKey)
      
      // 创建一个全新的数据对象，避免继承任何循环引用
      const newData = {}
      
      // 复制现有数据，确保只复制基本类型
      if (typeof record.data === 'object' && record.data !== null) {
        for (const [key, value] of Object.entries(record.data)) {
          // 只复制基本类型或简单对象
          if (value === null || typeof value !== 'object') {
            newData[key] = value
          } else if (typeof value === 'object' && ('_text' in value && '_link' in value)) {
            // 如果已经是链接数据，保留
            newData[key] = { ...value }
          } else {
            // 对于其他对象，转换为字符串
            newData[key] = String(value)
          }
        }
      }
      
      // 使用特殊格式保存链接信息：只使用基本类型
      newData[columnKey] = {
        _text: String(selectedCellValue),
        _link: String(finalUrl)
      }
      
      // 构建API URL
      const apiUrl = `/api/v1/tables/${tableId}/data/${recordId}`
      
      // 构建请求头
      const headers = {
        'Content-Type': 'application/json'
      }
      
      // 添加认证token
      const token = localStorage.getItem('token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // 构建请求体，确保只包含基本类型
      const requestBody = {
        data: newData
      }
      
      // 使用fetch API发送请求
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(requestBody)
      })
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // 解析响应数据
      const result = await response.json()
      
      if (result.code === 200) {
        message.success('链接设置成功')
        setLinkModalVisible(false)
        
        // 刷新页面获取最新数据
        window.location.reload()
      } else {
        message.error(result.message || '链接设置失败')
      }
    } catch (error) {
      console.error('Error saving link:', error)
      message.error('链接设置失败，请检查网络连接')
    }
  }
  
  // 处理链接取消
  const handleLinkCancel = () => {
    setLinkModalVisible(false)
  }
  
  // 处理取消链接
  const handleUnlink = async () => {
    // 获取当前正在编辑的记录和列信息
    const { record, column } = selectedCellInfo
    if (!record || !column) {
      message.error('无效的编辑状态')
      return
    }
    
    try {
      // 获取必要的ID信息，确保使用基本类型
      const recordId = String(record[rowKey])
      const tableId = String(record.table_id)
      
      // 直接使用selectedCellInfo中的column，避免使用可能有循环引用的column对象
      const originalColumn = selectedCellInfo.column
      if (!originalColumn) {
        message.error('无效的列信息')
        return
      }
      
      // 获取列名：确保只使用字符串
      let columnKey = originalColumn.key || ''
      if (!columnKey && originalColumn.dataIndex) {
        if (Array.isArray(originalColumn.dataIndex) && originalColumn.dataIndex.length > 1) {
          // 对于嵌套数据索引，如['data', 'column_name']，取第二个元素
          columnKey = originalColumn.dataIndex[1]
        } else if (typeof originalColumn.dataIndex === 'string') {
          // 对于直接字符串索引，直接使用
          columnKey = originalColumn.dataIndex
        } else {
          // 对于其他情况，使用列标题作为备选
          columnKey = originalColumn.title
        }
      }
      
      // 确保columnKey是字符串
      columnKey = String(columnKey)
      
      // 创建一个全新的数据对象，避免继承任何循环引用
      const newData = { ...record.data }
      
      // 对于链接对象，只保留文本部分，移除链接信息
      if (typeof newData[columnKey] === 'object' && newData[columnKey] !== null && newData[columnKey]._text) {
        newData[columnKey] = newData[columnKey]._text
      }
      
      // 构建API URL
      const apiUrl = `/api/v1/tables/${tableId}/data/${recordId}`
      
      // 构建请求头
      const headers = {
        'Content-Type': 'application/json'
      }
      
      // 添加认证token
      const token = localStorage.getItem('token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // 构建请求体，确保只包含基本类型
      const requestBody = {
        data: newData
      }
      
      // 使用fetch API发送请求
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(requestBody)
      })
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // 解析响应数据
      const result = await response.json()
      
      if (result.code === 200) {
        message.success('取消链接成功')
        setContextMenuVisible(false)
        setIsMobileLongPress(false)
        
        // 刷新页面获取最新数据
        window.location.reload()
      } else {
        message.error(result.message || '取消链接失败')
      }
    } catch (error) {
      console.error('Error unlinking:', error)
      message.error('取消链接失败，请检查网络连接')
    }
  }
  
  // 处理链接到表格保存
  const handleLinkToTableSave = async () => {
    // 获取当前正在编辑的记录和列信息
    const { record, column } = currentEditingLink
    if (!record || !column) {
      message.error('无效的编辑状态')
      return
    }
    
    try {
      // 获取必要的ID信息，确保使用基本类型
      const recordId = String(record[rowKey])
      const tableId = String(record.table_id)
      
      // 获取列名：确保只使用字符串
      let columnKey = column.key || ''
      if (!columnKey && column.dataIndex) {
        if (Array.isArray(column.dataIndex) && column.dataIndex.length > 1) {
          // 对于嵌套数据索引，如['data', 'column_name']，取第二个元素
          columnKey = column.dataIndex[1]
        } else if (typeof column.dataIndex === 'string') {
          // 对于直接字符串索引，直接使用
          columnKey = column.dataIndex
        } else {
          // 对于其他情况，使用列标题作为备选
          columnKey = column.title
        }
      }
      
      // 确保columnKey是字符串
      columnKey = String(columnKey)
      
      // 获取当前单元格的值
      let currentValue = record.data[columnKey]
      
      // 获取当前显示文本
      let displayText
      if (typeof currentValue === 'object' && currentValue !== null && currentValue._text) {
        displayText = currentValue._text
      } else {
        displayText = String(currentValue)
      }
      
      // 创建链接对象，格式为 { _text: '显示文本', _link: '链接信息' }
      // 链接信息格式：table:{targetTableId}:{targetRowId}
      const linkObject = {
        _text: displayText,
        _link: `table:${selectedTargetTable}:${selectedTargetRow}`
      }
      
      // 创建一个全新的数据对象，避免继承任何循环引用
      const newData = { ...record.data }
      newData[columnKey] = linkObject
      
      // 构建API URL
      const apiUrl = `/api/v1/tables/${tableId}/data/${recordId}`
      
      // 构建请求头
      const headers = {
        'Content-Type': 'application/json'
      }
      
      // 添加认证token
      const token = localStorage.getItem('token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // 构建请求体，确保只包含基本类型
      const requestBody = {
        data: newData
      }
      
      // 使用fetch API发送请求
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(requestBody)
      })
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // 解析响应数据
      const result = await response.json()
      
      if (result.code === 200) {
        message.success('链接到表格成功')
        // 关闭模态框
        setLinkToTableModalVisible(false)
        // 刷新页面获取最新数据
        window.location.reload()
      } else {
        message.error(result.message || '链接到表格失败')
      }
    } catch (error) {
      console.error('Error linking to table:', error)
      message.error('链接到表格失败，请检查网络连接')
    }
  }
  
  // 处理链接到表格取消
  const handleLinkToTableCancel = () => {
    setLinkToTableModalVisible(false)
  }
  
  // 处理复制功能
  const handleCopy = async () => {
    try {
      // 获取当前选中的单元格值
      let copyText = '';
      
      // 处理不同类型的值
      if (typeof selectedCellValue === 'object' && selectedCellValue !== null) {
        // 如果是链接对象，只复制文本部分
        if (selectedCellValue._text) {
          copyText = selectedCellValue._text;
        } else {
          // 其他对象类型转换为字符串
          copyText = JSON.stringify(selectedCellValue);
        }
      } else if (selectedCellValue !== null && selectedCellValue !== undefined) {
        // 基本类型直接转换为字符串
        copyText = String(selectedCellValue);
      } else {
        // 空值处理
        copyText = '';
      }
      
      // 使用Clipboard API复制文本
      await navigator.clipboard.writeText(copyText);
      
      // 显示复制成功提示
      message.success('已复制', 1); // 1秒后自动关闭
    } catch (err) {
      console.error('复制失败:', err);
      // 降级方案：使用传统的document.execCommand('copy')
      try {
        const textArea = document.createElement('textarea');
        let copyText = '';
        
        if (typeof selectedCellValue === 'object' && selectedCellValue !== null) {
          if (selectedCellValue._text) {
            copyText = selectedCellValue._text;
          } else {
            copyText = JSON.stringify(selectedCellValue);
          }
        } else if (selectedCellValue !== null && selectedCellValue !== undefined) {
          copyText = String(selectedCellValue);
        } else {
          copyText = '';
        }
        
        textArea.value = copyText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        message.success('已复制', 1);
      } catch (fallbackErr) {
        console.error('复制失败（降级方案）:', fallbackErr);
        message.error('复制失败，请手动选择并复制', 2);
      }
    }
    
    // 关闭右键菜单
    setContextMenuVisible(false);
    setIsMobileLongPress(false);
  };
  
  // 右键菜单内容
  const contextMenuItems = [
    {
      label: '复制',
      key: 'copy',
      icon: <CopyOutlined />,
      onClick: handleCopy
    },
    {
      label: '链接到表格',
      key: 'link-to-table',
      icon: <LinkOutlined />,
      onClick: handleLinkToTable
    },
    {
      label: '链接到网页',
      key: 'link-to-web',
      icon: <EditOutlined />,
      onClick: handleLinkToWeb
    },
    {
      label: '取消链接',
      key: 'unlink',
      icon: <LinkOutlined />,
      onClick: handleUnlink,
      // 只有当selectedCellValue是对象且包含_link属性时才显示
      disabled: !(typeof selectedCellValue === 'object' && selectedCellValue !== null && selectedCellValue._link)
    }
  ]
  
  // 处理表头右键点击事件
  const handleHeaderContextMenu = (e, column) => {
    e.preventDefault()
    setSelectedHeaderColumn(column)
    setHeaderContextMenuPosition({ x: e.clientX, y: e.clientY })
    setHeaderContextMenuVisible(true)
  }
  
  // 处理表头菜单点击事件
  const handleHeaderMenuClick = (e) => {
    const { key } = e
    if (key === 'show-character-length') {
      handleToggleCharacterLength()
    }
    setHeaderContextMenuVisible(false)
  }
  
  // 表头右键菜单内容
  const headerContextMenuItems = [
    {
      label: '显示字符长度',
      key: 'show-character-length',
      onClick: handleHeaderMenuClick
    }
  ]
  
  // 处理右键点击事件
  const handleContextMenu = (e, value, record, column) => {
    e.preventDefault()
    setSelectedCellValue(value)
    setSelectedCellInfo({ record, column })
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setContextMenuVisible(true)
  }
  
  // 处理长按开始
  const handleLongPressStart = (e, value, record, column) => {
    setSelectedCellValue(value)
    setSelectedCellInfo({ record, column })
    longPressTimer.current = setTimeout(() => {
      setIsMobileLongPress(true)
    }, 500) // 500ms 长按触发
  }
  
  // 处理长按结束
  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }
  
  // 处理点击事件，关闭菜单
  const handleClick = () => {
    setContextMenuVisible(false)
    setHeaderContextMenuVisible(false)
    setIsMobileLongPress(false)
  }
  
  // 处理显示/隐藏字符长度列
  const handleToggleCharacterLength = () => {
    if (!selectedHeaderColumn) return
    
    // 获取表格ID
    const tableId = dataSource.length > 0 ? dataSource[0].table_id : 'default'
    // 获取当前列的key
    const columnKey = selectedHeaderColumn.key || selectedHeaderColumn.dataIndex
    
    // 更新状态
    setShowCharacterLengthColumns(prev => {
      // 确保每个表格都有独立的配置
      const tableConfig = prev[tableId] || {}
      // 切换状态
      const newConfig = {
        ...tableConfig,
        [columnKey]: !tableConfig[columnKey]
      }
      
      const newState = {
        ...prev,
        [tableId]: newConfig
      }
      
      // 保存到localStorage
      localStorage.setItem('showCharacterLengthColumns', JSON.stringify(newState))
      
      return newState
    })
  }
  
  // 添加全局点击事件监听，用于关闭菜单
  useEffect(() => {
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])
  
  // 计算文本宽度的辅助函数
  const getTextWidth = (text) => {
    // 创建一个临时元素来测量文本宽度
    const tempElement = document.createElement('span')
    tempElement.style.visibility = 'hidden'
    tempElement.style.position = 'absolute'
    tempElement.style.whiteSpace = 'nowrap'
    tempElement.style.fontSize = '13px' // 与表格字体大小一致
    tempElement.style.fontFamily = 'Arial, sans-serif'
    tempElement.textContent = text
    document.body.appendChild(tempElement)
    
    const width = tempElement.offsetWidth
    document.body.removeChild(tempElement)
    
    return width
  }
  
  // 计算数据长度，考虑不同数据类型
  const calculateDataLength = (value) => {
    if (value === null || value === undefined) {
      return 0
    }
    
    let text
    if (typeof value === 'object') {
      // 如果是包含链接信息的对象 { _text: '原始文本', _link: '链接URL' }
      if (value._text && value._link) {
        text = String(value._text)
      } else {
        text = JSON.stringify(value)
      }
    } else {
      text = String(value)
    }
    
    // 计算文本宽度，考虑中文字符占两倍宽度
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const otherChars = text.length - chineseChars
    
    // 中文字符占16px，其他字符占8px，加上一些间距
    return chineseChars * 16 + otherChars * 8 + 20
  }
  
  // 计算最佳列宽
  const calculateOptimalColumnWidths = () => {
    const newColumnWidths = {}
    
    // 计算每列的宽度
    columns.forEach(column => {
      // 跳过操作列和没有dataIndex的列
      if (!column.dataIndex || column.key === 'action' || column.title === '操作') return
      
      const columnKey = column.key || column.dataIndex
      
      // 计算标题宽度
      const titleWidth = getTextWidth(column.title) + 40 // 加上一些间距
      
      // 检查是否为创建时间列
      const isCreateTimeColumn = [
        '创建时间', 'createTime', 'created_at', 'create_at', '创建日期', 'date'
      ].includes(columnKey) || 
      [
        '创建时间', '创建日期', '日期'
      ].includes(column.title)
      
      // 计算数据宽度
      let maxDataWidth = 0
      dataSource.forEach(record => {
        let value = record
        const dataIndex = Array.isArray(column.dataIndex) ? column.dataIndex : [column.dataIndex]
        
        // 处理嵌套路径
        let found = true
        for (const key of dataIndex) {
          if (value === null || value === undefined) {
            found = false
            break
          }
          value = value[key]
        }
        
        if (found) {
          let displayValue = value
          
          // 如果是创建时间列，格式化后再计算宽度
          if (isCreateTimeColumn) {
            displayValue = formatDateOnly(String(value))
          }
          
          const dataWidth = calculateDataLength(displayValue)
          if (dataWidth > maxDataWidth) {
            maxDataWidth = dataWidth
          }
        }
      })
      
      // 最佳宽度取标题宽度和数据宽度的最大值
      let optimalWidth = Math.max(titleWidth, maxDataWidth)
      
      // 设置最小和最大宽度限制
      optimalWidth = Math.max(optimalWidth, 100) // 最小宽度调整为100px，确保时间列有足够宽度
      optimalWidth = Math.min(optimalWidth, 500) // 最大宽度
      
      newColumnWidths[columnKey] = optimalWidth
    })
    
    setColumnWidths(newColumnWidths)
  }
  
  // 监听数据变化，重新计算列宽
  useEffect(() => {
    // 添加一个小延迟，确保DOM已渲染
    const timer = setTimeout(() => {
      if (dataSource.length > 0) {
        calculateOptimalColumnWidths()
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [dataSource, columns])
  
  // 监听窗口大小变化，重新计算列宽
  useEffect(() => {
    const handleResize = () => {
      if (dataSource.length > 0) {
        calculateOptimalColumnWidths()
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [dataSource, columns])
  
  // 处理单个选择
  const handleSingleSelect = (record, checked) => {
    const newSelectedRowKeys = [...selectedRowKeys]
    const recordKey = record[rowKey]
    
    if (checked) {
      newSelectedRowKeys.push(recordKey)
    } else {
      const index = newSelectedRowKeys.indexOf(recordKey)
      if (index > -1) {
        newSelectedRowKeys.splice(index, 1)
      }
    }
    
    setSelectedRowKeys(newSelectedRowKeys)
    lastClickIndex.current = dataIndexMap.current.get(recordKey)
  }
  
  // 处理连续选择（Shift键）
  const handleRangeSelect = (record, checked, e) => {
    if (e.shiftKey && lastClickIndex.current !== -1) {
      const currentIndex = dataIndexMap.current.get(record[rowKey])
      const startIndex = Math.min(lastClickIndex.current, currentIndex)
      const endIndex = Math.max(lastClickIndex.current, currentIndex)
      
      const newSelectedRowKeys = []
      
      for (let i = startIndex; i <= endIndex; i++) {
        newSelectedRowKeys.push(dataSource[i][rowKey])
      }
      
      setSelectedRowKeys(newSelectedRowKeys)
      lastClickIndex.current = currentIndex
    } else {
      handleSingleSelect(record, checked)
    }
  }
  
  // 处理非连续选择（Ctrl/Cmd键）
  const handleNonContinuousSelect = (record, checked, e) => {
    if (e.ctrlKey || e.metaKey) {
      handleSingleSelect(record, checked)
    } else {
      handleRangeSelect(record, checked, e)
    }
  }
  
  // 处理行选择变化
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys)
  }
  
  // 处理删除操作
  const handleDelete = () => {
    if (selectedRowKeys.length === 0) return
    
    // 二次确认对话框
    confirm({
      title: '确认删除',
      content: '删除操作不可逆转，确定要删除选中的项目吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        return new Promise((resolve, reject) => {
          // 调用外部删除函数
          onDelete(selectedRowKeys)
            .then(() => {
              message.success('删除成功')
              // 重置选择状态
              setSelectedRowKeys([])
              resolve()
            })
            .catch(error => {
              message.error(`删除失败：${error.message || '未知错误'}`)
              reject(error)
            })
        })
      },
      onCancel() {
        console.log('取消删除')
      },
    })
  }
  
  // 取消选择
  const handleCancel = () => {
    setSelectedRowKeys([])
  }
  
  // 自定义选择列
  const selectionColumn = {
    title: showIndex ? <Checkbox
      checked={selectedRowKeys.length === dataSource.length}
      onChange={(e) => {
        if (e.target.checked) {
          // 全选
          setSelectedRowKeys(dataSource.map(item => item[rowKey]))
        } else {
          // 取消全选
          setSelectedRowKeys([])
        }
      }}
      style={{ margin: 0 }}
    /> : '',
    key: 'selection',
    width: showIndex ? 32 : 24, // 固定宽度，正好显示checkbox
    minWidth: showIndex ? 32 : 24,
    maxWidth: 36,
    align: 'center',
    // 选择列不需要调整宽度
    resizable: false,
    render: (text, record) => {
      const isSelected = selectedRowKeys.includes(record[rowKey])
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0' }}>
          <Checkbox
            checked={isSelected}
            onChange={(e) => handleNonContinuousSelect(record, e.target.checked, e.nativeEvent)}
            style={{ margin: 0 }}
          />
        </div>
      )
    },
  }
  
  // 验证：检查是否已有包含checkbox的列，确保每行只有一个复选框
  useEffect(() => {
    // 检查传入的columns中是否已有包含checkbox的列
    const hasCheckboxColumn = columns.some(column => {
      // 检查列的render函数是否返回Checkbox组件
      if (column.render) {
        // 简单检查render函数的字符串表示中是否包含Checkbox
        // 更复杂的检查可能需要运行时检查，但这会影响性能
        const renderStr = column.render.toString()
        return renderStr.includes('Checkbox') || renderStr.includes('checkbox')
      }
      return false
    })
    
    if (hasCheckboxColumn) {
      console.error('警告：检测到columns中已包含checkbox列，这可能导致每行出现多个复选框。请检查传入的columns配置。')
      message.error('检测到表格中已包含选择列，这可能导致每行出现多个复选框。请检查配置。')
    }
  }, [columns])
  
  // 实现展开行渲染函数，用于显示下拉列，优化移动端体验
  const expandedRowRender = (record) => {
    if (!hiddenColumns || hiddenColumns.length === 0) {
      return null;
    }
    
    return (
      <div className="expanded-hidden-columns" style={{ 
          padding: '16px 24px', 
          backgroundColor: '#f8f9fa',
          border: '1px solid #e1e4e8',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          animation: 'fadeIn 0.3s ease',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <div style={{ 
            color: '#333'
          }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              color: '#24292e',
              fontSize: '16px',
              fontWeight: '600',
              borderBottom: '1px solid #e1e4e8',
              paddingBottom: '8px'
            }}>详细信息</h4>
            
            {/* 使用表格形式展示键值对 */}
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)'
            }}>
              <tbody>
                {hiddenColumns.map(column => {
                  // 获取列数据，支持嵌套路径如 ['data', 'column_name']
                  let value = record;
                  const dataIndex = Array.isArray(column.dataIndex) ? column.dataIndex : [column.dataIndex];
                  
                  for (const key of dataIndex) {
                    if (value === null || value === undefined) break;
                    value = value[key];
                  }
                  
                  // 处理值和链接信息
                  let displayValue = value !== null && value !== undefined ? value : '-';
                  let finalContent = displayValue;
                  let valueForEvent = displayValue;
                  
                  // 检查数据是否包含链接信息
                  if (typeof displayValue === 'object' && displayValue !== null) {
                    // 如果数据是包含链接信息的对象 { _text: '原始文本', _link: '链接URL' }
                    if (displayValue._text && displayValue._link) {
                      valueForEvent = displayValue._text;
                      
                      // 检查链接是否为表格链接
                      const isTableLink = displayValue._link.startsWith('table:');
                      
                      if (isTableLink) {
                        // 处理表格链接，格式：table:{targetTableId}:{targetRowId}
                        finalContent = (
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault(); // 阻止默认的href跳转
                              const [, targetTableId, targetRowId] = displayValue._link.split(':');
                              if (targetTableId && targetRowId) {
                                // 跳转到目标表格
                                localStorage.setItem('selectedTableId', targetTableId);
                                // 保存需要展开的行ID和目标表格ID
                                localStorage.setItem('autoExpandInfo', JSON.stringify({
                                  tableId: parseInt(targetTableId),
                                  rowId: parseInt(targetRowId)
                                }));
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
                          >
                            {displayValue._text}
                          </a>
                        );
                      } else {
                        // 处理普通网页链接
                        finalContent = (
                          <a
                            href={displayValue._link}
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
                          >
                            {displayValue._text}
                          </a>
                        );
                      }
                    }
                  } else if (typeof displayValue === 'string') {
                    // 如果是普通字符串，直接使用
                    valueForEvent = displayValue;
                  }
                  
                  return (
                    <tr key={column.key || column.dataIndex} style={{ 
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'background-color 0.2s ease'
                    }}>
                      <td style={{ 
                        padding: '12px 16px',
                        backgroundColor: '#fafbfc',
                        fontWeight: '600',
                        color: '#586069',
                        width: '200px',
                        textAlign: 'left',
                        borderRight: '1px solid #f0f0f0'
                      }}>
                        {column.title}
                      </td>
                      <td style={{ 
                        padding: '12px 16px',
                        color: '#24292e',
                        textAlign: 'left',
                        wordBreak: 'break-word'
                      }}>
                        <div
                          onContextMenu={(e) => {
                            // 传递原始value给事件处理函数，确保selectedCellValue是对象
                            handleContextMenu(e, value, record, column)
                          }}
                          onTouchStart={(e) => {
                            // 传递原始value给事件处理函数，确保selectedCellValue是对象
                            handleLongPressStart(e, value, record, column)
                          }}
                          onTouchEnd={handleLongPressEnd}
                          onTouchCancel={handleLongPressEnd}
                          style={{ 
                            cursor: typeof finalContent === 'object' && finalContent?._link ? 'pointer' : 'default',
                            userSelect: 'none'
                          }}
                        >
                          {finalContent}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>
    );
  };
  
  // 格式化日期，只显示年月日
  const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    // 匹配 YYYY-MM-DD 格式
    const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : dateString;
  };

  // 合并列配置，确保至少有选择列
  const mergedColumns = [
    selectionColumn, 
    ...(() => {
      const resultColumns = []
      // 获取当前表格ID
      const tableId = dataSource.length > 0 ? dataSource[0].table_id : 'default'
      // 获取当前表格的字符长度显示配置
      const tableConfig = showCharacterLengthColumns[tableId] || {}
      
      // 遍历所有列
      columns.forEach(column => {
        const columnKey = column.key || column.dataIndex
        const calculatedWidth = columnWidths[columnKey]
        
        // 创建副本以避免修改原配置
        let newColumn = { 
          ...column,
          // 添加列宽拖动功能
          resizable: true,
          // 应用保存的列宽
          width: calculatedWidth || column.width
        }
        
        // 检查是否为创建时间列，只显示日期
        const isCreateTimeColumn = [
          '创建时间', 'createTime', 'created_at', 'create_at', '创建日期', 'date'
        ].includes(columnKey) || 
        [
          '创建时间', '创建日期', '日期'
        ].includes(column.title)
      
      // 保存原始render函数
      const originalRender = column.render
      
      // 为表头添加右键菜单
      newColumn.title = (
        <div
          onContextMenu={(e) => handleHeaderContextMenu(e, newColumn)}
          style={{
            cursor: 'context-menu',
            padding: '4px',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {newColumn.title}
        </div>
      )
      
      // 重写render函数，添加右键菜单和长按功能
      newColumn.render = (text, record) => {
        let displayContent = text
        let value = text
        
        // 获取实际值
        let actualValue = text
        if (Array.isArray(column.dataIndex) && column.dataIndex.length > 1) {
          // 对于嵌套数据索引，如['data', 'column_name']，获取具体列值
          let tempValue = record
          for (const key of column.dataIndex) {
            if (tempValue === null || tempValue === undefined) break
            tempValue = tempValue[key]
          }
          actualValue = tempValue
        } else if (column.dataIndex) {
          // 对于直接数据索引，直接获取值
          actualValue = record[column.dataIndex]
        }
        
        // 保存用于事件处理的实际值
        let valueForEvent = actualValue
        // 如果是链接对象，只使用文本部分
        if (typeof actualValue === 'object' && actualValue !== null && actualValue._text) {
          valueForEvent = actualValue._text
        }
        
        // 如果有原始render函数，先调用它
        if (originalRender) {
          const rendered = originalRender(text, record)
          if (rendered && typeof rendered === 'string') {
            displayContent = rendered
            valueForEvent = rendered
          } else if (rendered && React.isValidElement(rendered)) {
            // 如果是React元素，将其作为子元素
            displayContent = rendered
          } else if (typeof rendered === 'object' && rendered !== null) {
            // 如果是对象，可能是链接对象，直接使用
            displayContent = rendered
            // 更新valueForEvent，确保是文本
            if (rendered._text) {
              valueForEvent = rendered._text
            } else {
              valueForEvent = String(rendered)
            }
          }
        } else {
          // 如果没有原始render函数，处理actualValue
          if (typeof actualValue === 'object' && actualValue !== null) {
            // 如果是链接对象，直接使用整个对象，以便后续处理
            if (actualValue._text && actualValue._link) {
              displayContent = actualValue
              valueForEvent = actualValue._text
            } else {
              // 如果是普通对象，转换为字符串
              displayContent = String(actualValue)
              valueForEvent = String(actualValue)
            }
          } else {
            // 如果是基本类型，直接使用
            displayContent = actualValue
            valueForEvent = String(actualValue)
          }
        }
        
        // 格式化日期，只显示年月日
        if (isCreateTimeColumn) {
          if (typeof displayContent === 'string') {
            displayContent = formatDateOnly(displayContent)
          } else if (typeof displayContent === 'object' && displayContent?._text) {
            displayContent = {
              ...displayContent,
              _text: formatDateOnly(displayContent._text)
            }
          }
        }
        
        // 检查数据是否包含链接信息
        let finalContent = displayContent
        
        // 处理链接信息
        if (typeof displayContent === 'object' && displayContent !== null) {
          // 如果是React元素，直接使用
          if (React.isValidElement(displayContent)) {
            finalContent = displayContent
          } else if (displayContent._text && displayContent._link) {
            // 如果数据是包含链接信息的对象 { _text: '原始文本', _link: '链接URL' }
            valueForEvent = displayContent._text
            
            // 检查链接是否为表格链接
            const isTableLink = displayContent._link.startsWith('table:');
            
            if (isTableLink) {
              // 处理表格链接，格式：table:{targetTableId}:{targetRowId}
              finalContent = (
                <a
                  href="#"
                    onClick={(e) => {
                      e.preventDefault(); // 阻止默认的href跳转
                      const [, targetTableId, targetRowId] = displayContent._link.split(':');
                      if (targetTableId && targetRowId) {
                        // 跳转到目标表格
                        localStorage.setItem('selectedTableId', targetTableId);
                        // 保存需要展开的行ID和目标表格ID
                        localStorage.setItem('autoExpandInfo', JSON.stringify({
                          tableId: parseInt(targetTableId),
                          rowId: parseInt(targetRowId)
                        }));
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
                    overflow: 'hidden',
                    whiteSpace: 'normal',
                    lineHeight: '1.4'
                  }}
                >
                  {displayContent._text}
                </a>
              );
            } else {
              // 处理普通网页链接
              finalContent = (
                <a
                  href={displayContent._link}
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
                    overflow: 'hidden',
                    whiteSpace: 'normal',
                    lineHeight: '1.4'
                  }}
                >
                  {displayContent._text}
                </a>
              );
            }
          } else {
            // 如果是普通对象，转换为字符串
            valueForEvent = String(displayContent)
            finalContent = String(displayContent)
          }
        } else if (displayContent === null || displayContent === undefined) {
          // 如果是null或undefined，显示空字符串
          valueForEvent = '-'
          finalContent = '-'
        }
        
        // 添加右键菜单和长按功能
        return (
          <div
            onContextMenu={(e) => {
              // 传递原始actualValue给事件处理函数，确保selectedCellValue是对象
              handleContextMenu(e, actualValue, record, column)
            }}
            onTouchStart={(e) => {
              // 传递原始actualValue给事件处理函数，确保selectedCellValue是对象
              handleLongPressStart(e, actualValue, record, column)
            }}
            onTouchEnd={handleLongPressEnd}
            onTouchCancel={handleLongPressEnd}
            style={{ 
              cursor: typeof displayContent === 'object' && displayContent?._link ? 'pointer' : 'default',
              userSelect: 'none',
              // 确保整个单元格都能响应事件
              width: '100%',
              height: '100%',
              display: 'inline-block',
              // 确保内容居中
              textAlign: 'left',
              // 确保内容能正确换行
              wordBreak: 'break-word'
            }}
          >
            {finalContent}
          </div>
        )
      }
      
      if (isCreateTimeColumn) {
        // 应用动态计算的宽度，不再固定
        if (calculatedWidth) {
          newColumn.width = calculatedWidth
          newColumn.minWidth = Math.max(calculatedWidth, 80) // 最小宽度80px
          newColumn.maxWidth = Math.min(calculatedWidth * 1.2, 150) // 最大宽度150px
        }
      } else if (columnKey === 'action' || column.title === '操作') {
        // 处理操作列，保留传入的宽度设置，不覆盖
        newColumn.className = 'action-column' // 添加action-column类名，方便CSS选择器定位
      }
      
      // 应用动态计算的宽度，但不覆盖操作列的设置
      if (calculatedWidth && !(columnKey === 'action' || column.title === '操作')) {
        newColumn.width = calculatedWidth
        newColumn.minWidth = calculatedWidth
        newColumn.maxWidth = calculatedWidth * 1.2 // 允许一定的扩展空间
      }
      
      // 检查是否需要在当前列前添加字符长度列
      if (tableConfig[columnKey]) {
        // 添加字符长度列
        const lengthColumn = {
          title: '长度→',
          key: `${columnKey}_length`,
          width: 60,
          minWidth: 50,
          maxWidth: 70,
          align: 'center',
          // 添加样式，使背景色为浅蓝色
          className: 'character-length-column',
          render: (text, record) => {
            // 获取对应列的值
            let actualValue = text
            if (Array.isArray(column.dataIndex) && column.dataIndex.length > 1) {
              let tempValue = record
              for (const key of column.dataIndex) {
                if (tempValue === null || tempValue === undefined) break
                tempValue = tempValue[key]
              }
              actualValue = tempValue
            } else if (column.dataIndex) {
              actualValue = record[column.dataIndex]
            }
            
            // 计算trim后的长度
            let textValue = ''
            if (typeof actualValue === 'object' && actualValue !== null) {
              // 如果是链接对象，使用文本部分
              if (actualValue._text) {
                textValue = actualValue._text
              } else {
                textValue = JSON.stringify(actualValue)
              }
            } else if (actualValue !== null && actualValue !== undefined) {
              textValue = String(actualValue)
            }
            
            return textValue.trim().length
          }
        }
        resultColumns.push(lengthColumn)
      }
      
      // 添加当前列到结果数组
      resultColumns.push(newColumn)
    })
    
    return resultColumns
  })()
  ]
  
  return (
    <>
      {/* 删除提示区域 */}
      {selectedRowKeys.length > 0 && (
        <div style={{
          backgroundColor: '#fff3f3',
          border: '1px solid #ffccc7',
          borderRadius: '8px 8px 0 0',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            color: '#cf1322',
            fontWeight: '500'
          }}>
            <DeleteOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
            已选中 {selectedRowKeys.length} 项，确定要删除吗？
          </div>
          <Space>
            <Button onClick={handleCancel} style={{ marginRight: '8px' }}>
              取消
            </Button>
            <Button 
              type="primary" 
              danger 
              onClick={handleDelete}
              loading={deleteLoading}
            >
              确认删除
            </Button>
          </Space>
        </div>
      )}
      
      {/* 右键菜单 */}
      <Dropdown
        menu={{ items: contextMenuItems }}
        open={contextMenuVisible}
        onOpenChange={setContextMenuVisible}
        trigger={['contextMenu']}
        placement="bottomLeft"
        getPopupContainer={() => document.body}
        style={{
          position: 'fixed',
          left: contextMenuPosition.x,
          top: contextMenuPosition.y,
          zIndex: 10000
        }}
      >
        {/* 透明的触发元素，用于定位 */}
        <div
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            width: 1,
            height: 1,
            opacity: 0,
            zIndex: 9999
          }}
        />
      </Dropdown>
      
      {/* 移动端长按菜单 */}
      {isMobileLongPress && (
        <Dropdown
          menu={{ items: contextMenuItems }}
          open={isMobileLongPress}
          onOpenChange={setIsMobileLongPress}
          trigger={['click']}
          placement="bottom"
          getPopupContainer={() => document.body}
        >
          <div
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 1,
              height: 1,
              opacity: 0,
              zIndex: 9999
            }}
          />
        </Dropdown>
      )}
      
      {/* 表头右键菜单 */}
      <Dropdown
        menu={{ items: headerContextMenuItems }}
        open={headerContextMenuVisible}
        onOpenChange={setHeaderContextMenuVisible}
        getPopupContainer={() => document.body}
      >
        <div
          style={{
            position: 'fixed',
            left: headerContextMenuPosition.x,
            top: headerContextMenuPosition.y,
            width: 1,
            height: 1,
            opacity: 0,
            zIndex: 9999
          }}
        />
      </Dropdown>
      
      {/* 链接输入模态框 */}
      <Modal
        title="链接到网页"
        open={linkModalVisible}
        onOk={handleLinkSave}
        onCancel={handleLinkCancel}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            请输入要链接的网址：
          </p>
          <Input
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            prefix={<LinkOutlined />}
            style={{ fontSize: 14 }}
            autoFocus
          />
        </div>
        <div style={{ fontSize: 12, color: '#999' }}>
          <p>提示：</p>
          <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>支持HTTP和HTTPS协议</li>
            <li>如果不输入协议，默认添加https://前缀</li>
            <li>点击确定后，单元格文字将变为可点击链接</li>
          </ul>
        </div>
      </Modal>
      

      

      
      {/* 链接到表格模态框 */}
      <Modal
        title="链接到表格"
        open={linkToTableModalVisible}
        onOk={handleLinkToTableSave}
        onCancel={handleLinkToTableCancel}
        okText="确定"
        cancelText="取消"
        width={800}
        // 只有选中了目标行才能确定
        okButtonProps={{
          disabled: !selectedTargetRow
        }}
      >
        {/* 表格选择下拉菜单 */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            请选择要链接的表格：
          </p>
          <Select
            placeholder="选择表格"
            value={selectedTargetTable}
            onChange={(value) => {
              setSelectedTargetTable(value)
              // 清空之前的选择
              setSelectedTargetRow(null)
              // 加载目标表格数据
              if (value) {
                fetchTargetTableData(value)
              } else {
                setTargetTableData([])
              }
            }}
            style={{ width: '100%', marginBottom: 16 }}
            loading={tablesLoading}
            showSearch
            optionFilterProp="children"
          >
            {tablesList.map(table => (
              <Select.Option key={table.id} value={table.id}>
                {table.table_name} ({table.description || '无描述'})
              </Select.Option>
            ))}
          </Select>
          
          {/* 目标表格数据展示 */}
          {selectedTargetTable && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                请选择要链接的行：
              </p>
              <Spin spinning={targetTableLoading}>
                <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #e8e8e8', borderRadius: 4 }}>
                  {targetTableData.length > 0 ? (
                    <Table
                      dataSource={targetTableData}
                      rowKey="id"
                      bordered
                      style={{ width: '100%' }}
                      pagination={{
                        current: targetTableCurrentPage,
                        pageSize: targetTablePageSize,
                        total: targetTableTotal,
                        onChange: (page, size) => {
                          fetchTargetTableData(selectedTargetTable, page, size)
                        },
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100']
                      }}
                      // 生成列配置，使用目标表格的列顺序
                      columns={[
                        // 选择列
                        {
                          title: '选择',
                          dataIndex: 'select',
                          width: 60,
                          render: (_, record) => (
                            <Checkbox
                              checked={selectedTargetRow === record.id}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTargetRow(record.id)
                                } else {
                                  setSelectedTargetRow(null)
                                }
                              }}
                            />
                          )
                        },
                        // ID列
                        {
                          title: 'ID',
                          dataIndex: 'id',
                          width: 80,
                          sorter: (a, b) => a.id - b.id
                        },
                        // 创建时间列
                        {
                          title: '创建时间',
                          dataIndex: 'created_at',
                          width: 150,
                          render: (text) => {
                            if (text) {
                              return new Date(text).toLocaleString()
                            }
                            return '-'
                          }
                        },
                        // 数据列，使用目标表格的列配置
                        ...(() => {
                          const dataColumns = []
                          targetTableColumns.forEach(column => {
                            dataColumns.push({
                              title: column.column_name,
                              dataIndex: ['data', column.column_name],
                              render: (text) => {
                              if (text === null || text === undefined) {
                                return '-'
                              }
                              // 如果是链接对象（包含_text和_link属性），只显示_text值
                              if (typeof text === 'object' && text._text && text._link) {
                                return text._text
                              }
                              return typeof text === 'object' ? JSON.stringify(text) : String(text)
                            }
                            })
                          })
                          return dataColumns
                        })()
                      ]}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                      {targetTableLoading ? '加载中...' : '暂无数据'}
                    </div>
                  )}
                </div>
              </Spin>
            </div>
          )}
        </div>
        
        <div style={{ fontSize: 12, color: '#999', marginTop: 16 }}>
          <p>提示：</p>
          <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>选择表格后将显示该表格的前20条数据</li>
            <li>只能选择一行数据进行链接</li>
            <li>点击确定后，单元格文字将变为可点击链接</li>
            <li>点击链接后将跳转到对应表格并展开该行</li>
          </ul>
        </div>
      </Modal>
      
      {/* 数据列表 - 添加空数据处理 */}
      {dataSource.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 0',
          backgroundColor: '#fff',
          borderRadius: selectedRowKeys.length > 0 ? '0 0 8px 8px' : '8px',
          border: '1px solid #e8e8e8',
          borderTop: selectedRowKeys.length > 0 ? 'none' : '1px solid #e8e8e8'
        }}>
          <div style={{ fontSize: 16, color: '#666' }}>
            {loading ? '数据加载中...' : '暂无数据'}
          </div>
        </div>
      ) : (
        <div 
          ref={tableContainerRef} 
          style={{ overflowX: 'auto', cursor: 'grab', scrollBehavior: 'smooth' }}
        >
          <Table
            ref={tableRef}
            rowKey={rowKey}
            columns={mergedColumns}
            dataSource={dataSource}
            loading={loading}
            pagination={pagination}
            // 自定义行样式
            rowClassName={(record) => {
              let className = ''
              if (selectedRowKeys.includes(record[rowKey])) {
                className += 'selected-row '
              }
              if (highlightedRowId === record[rowKey]) {
                console.log('[高亮调试] 应用highlighted-row类名到行ID:', record[rowKey])
                className += 'highlighted-row '
              }
              return className.trim()
            }}
            // 添加CSS样式
            style={{
              borderRadius: selectedRowKeys.length > 0 ? '0 0 8px 8px' : '8px',
              width: 'auto',
              minWidth: '100%'
            }}
            // 自适应宽度配置
            scroll={{
              x: 'max-content' // 让表格根据内容自动调整宽度
            }}
            // 列宽拖动事件处理
            onColumnResize={(resizeInfo) => {
              const { width, columnKey } = resizeInfo
              if (columnKey) {
                setColumnWidths(prev => ({
                  ...prev,
                  [columnKey]: width
                }))
              }
            }}
            // 展开行配置
            expandable={hiddenColumns.length > 0 ? {
              ...expandable,
              expandedRowRender: expandedRowRender,
              rowExpandable: (record) => hiddenColumns.length > 0
            } : expandable}
          />
        </div>
      )}
      
      {/* 全局样式 - 优化布局和视觉效果 */}
      <style>{`
        /* 表格容器样式 */
        .ant-table {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #f0f0f0;
          width: auto !important;
          min-width: 100%;
        }
        
        /* 字符长度列样式 - 确保整列统一颜色 */
        /* 使用更具体的选择器，确保覆盖Ant Design默认样式 */
        .ant-table .ant-table-thead > tr > th.ant-table-cell.character-length-column,
        .ant-table .ant-table-tbody > tr > td.ant-table-cell.character-length-column {
          background-color: #e6f7ff !important;
          font-weight: 500;
        }
        
        /* 确保行奇偶性不会影响字符长度列的背景色 */
        /* 处理Ant Design的行奇偶样式 */
        .ant-table .ant-table-tbody > tr.ant-table-row:nth-child(even) > td.ant-table-cell.character-length-column,
        .ant-table .ant-table-tbody > tr.ant-table-row.ant-table-row-even > td.ant-table-cell.character-length-column {
          background-color: #e6f7ff !important;
        }
        
        /* 删除table-wrapper样式 */
        .table-wrapper {
          all: unset;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          display: block !important;
        }
        
        /* 确保table-wrapper不会影响内部表格 */
        .table-wrapper > * {
          all: unset;
          width: auto !important;
          min-width: 100%;
          box-sizing: border-box !important;
        }
        
        /* 表格内容容器样式 */
        .ant-table-content {
          width: auto !important;
          overflow: visible !important;
        }
        
        /* 表格元素样式 */
        .ant-table table {
          width: auto !important;
          min-width: 100%;
          table-layout: auto !important;
        }
        
        /* 确保表格容器可以横向拖动平移 */
        .ant-table-container {
          width: auto !important;
          min-width: 100%;
          overflow-x: auto !important;
          /* 允许PC端鼠标拖动平移 */
          scroll-behavior: smooth;
          /* 添加PC端拖动支持 */
          -webkit-overflow-scrolling: touch;
          /* 隐藏滚动条但保留滚动功能 */
          scrollbar-width: thin;
          scrollbar-color: rgba(24, 144, 255, 0.5) transparent;
        }
        
        /* 为PC端添加鼠标拖动平移样式 */
        .ant-table-container::-webkit-scrollbar {
          height: 6px;
        }
        
        .ant-table-container::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .ant-table-container::-webkit-scrollbar-thumb {
          background-color: rgba(24, 144, 255, 0.5);
          border-radius: 3px;
        }
        
        /* 确保表格内容区域可以拖动 */
        .ant-table-content {
          overflow: visible !important;
        }
        
        /* 表格响应式样式 */
        @media (max-width: 768px) {
          .ant-table {
            font-size: 12px;
            width: 100%;
            table-layout: fixed;
          }
          
          /* 确保表格容器可以横向滚动 */
          .ant-table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            margin: 0;
            padding: 0;
            width: 100%;
            box-sizing: border-box;
          }
          
          /* 优化表格列样式，不显示省略号 */
          .ant-table-thead > tr > th,
          .ant-table-tbody > tr > td {
            padding: 8px 8px;
            white-space: nowrap;
            overflow: visible;
            text-overflow: clip;
          }
          
          /* 选择列（checkbox列）特殊处理 */
          .ant-table-thead > tr > th:first-child,
          .ant-table-tbody > tr > td:first-child {
            /* 继承JavaScript设置的宽度，不固定 */
            width: inherit !important;
            min-width: inherit !important;
            max-width: inherit !important;
            text-align: center;
            padding: 0;
          }
          
          /* 为时间列设置合适宽度 - 允许自适应 */
          .ant-table-thead > tr > th:nth-child(2),
          .ant-table-tbody > tr > td:nth-child(2) {
            /* 时间列 - 继承JavaScript设置的宽度 */
            width: inherit !important;
            min-width: inherit !important;
            max-width: inherit !important;
          }
          
          /* 操作列特殊处理 */
          .ant-table-thead > tr > th:last-child,
          .ant-table-tbody > tr > td:last-child {
            /* 操作列 */
            min-width: 180px;
            width: 200px;
          }
          
          /* 数据列设置合适宽度 */
          .ant-table-thead > tr > th:not(:first-child):not(:nth-child(2)):not(:last-child),
          .ant-table-tbody > tr > td:not(:first-child):not(:nth-child(2)):not(:last-child) {
            width: 200px;
            min-width: 120px;
            max-width: 300px;
          }
          
          /* 操作按钮适配 */
          .ant-btn {
            padding: 4px 8px;
            font-size: 11px;
            min-width: 50px;
          }
        }
        
        /* 表格头部样式 */
        .ant-table-thead > tr > th {
          background-color: #fafafa;
          border-bottom: 2px solid #e8e8e8;
          font-weight: 600;
          font-size: 14px;
          color: #333;
          padding: 12px 16px;
          transition: all 0.2s ease;
        }
        
        /* checkbox列特殊处理 - 非媒体查询 */
        .ant-table-thead > tr > th:first-child,
        .ant-table-tbody > tr > td:first-child {
          /* checkbox列 - 只显示checkbox本身宽度 */
          width: 28px !important;
          min-width: 28px !important;
          max-width: 30px !important;
          padding: 8px 4px !important;
          text-align: center;
        }
        
        /* 全选checkbox调整 */
        .ant-table-thead > tr > th:first-child .ant-checkbox {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* 表格行样式 - 行高变为原来的3/4 */
        .ant-table .ant-table-tbody > tr > td {
          padding: 9px 12px !important;
          font-size: 11px !important;
          color: #666 !important;
          border-bottom: 1px solid #f0f0f0 !important;
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
          line-height: 1.3 !important;
          height: auto !important;
          min-height: unset !important;
        }
        
        /* 为操作列添加特殊样式，避免省略号显示 */
        .ant-table .ant-table-tbody > tr > td:last-child,
        .ant-table .ant-table-tbody > tr > td.action-column {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        /* 移除所有展开图标相关的自定义样式，让Ant Design默认样式生效 */
        
        /* 表格头部样式 - 行高变为原来的3/4 */
        .ant-table .ant-table-thead > tr > th {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
          padding: 10px 12px !important;
          font-size: 12px !important;
          line-height: 1.3 !important;
          height: auto !important;
          min-height: unset !important;
        }
        
        /* 高亮行动画效果 */
        @keyframes highlightFlash {
          0% {
            background-color: transparent;
          }
          50% {
            background-color: rgba(24, 144, 255, 0.6) !important;
            box-shadow: 0 0 10px rgba(24, 144, 255, 0.4) !important;
          }
          100% {
            background-color: transparent;
          }
        }
        
        /* 高亮行样式 - 简化为蓝色边框框住整行 */
        .ant-table-tbody > tr.highlighted-row {
          animation: highlightFlash 2s ease-in-out 3 !important;
          animation-fill-mode: both !important;
        }
        
        /* 高亮行单元格样式 - 只保留蓝色边框，去掉背景色和内阴影 */
        .ant-table-tbody > tr.highlighted-row > td {
          border-color: #1890ff !important;
          border-width: 2px !important;
          background-color: transparent !important;
        }
        
        /* 第一个单元格添加左边框 */
        .ant-table-tbody > tr.highlighted-row > td:first-child {
          border-left: 2px solid #1890ff !important;
          border-radius: 4px 0 0 4px !important;
        }
        
        /* 最后一个单元格添加右边框 */
        .ant-table-tbody > tr.highlighted-row > td:last-child {
          border-right: 2px solid #1890ff !important;
          border-radius: 0 4px 4px 0 !important;
        }
        
        /* 所有中间单元格确保有上下边框 */
        .ant-table-tbody > tr.highlighted-row > td {
          border-top: 2px solid #1890ff !important;
          border-bottom: 2px solid #1890ff !important;
        }
        
        /* 为操作列表头添加特殊样式，避免省略号显示 */
        .ant-table .ant-table-thead > tr > th:last-child,
        .ant-table .ant-table-thead > tr > th.action-column {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        /* 为展开按钮列添加特殊样式，避免省略号显示 */
        .ant-table .ant-table-tbody > tr > td.ant-table-row-expand-icon-cell {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        /* 为展开按钮列表头添加特殊样式，避免省略号显示 */
        .ant-table .ant-table-thead > tr > th.ant-table-row-expand-icon-cell {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        /* 确保行高应用到所有表格行 */
        .ant-table tr {
          height: auto !important;
        }
        
        /* 确保行高应用到所有表格单元格 */
        .ant-table td,
        .ant-table th {
          padding-top: 9px !important;
          padding-bottom: 9px !important;
          line-height: 1.3 !important;
        }
        
        /* 表格行悬停效果 - 统一悬停样式 */
        .ant-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f7fa !important;
        }
        
        /* 表格交替行颜色 - 高级浅色调 */
        /* 重要：交替行颜色是常态，应用到所有未选中的数据行 */
        /* 使用直接的选择器，确保能覆盖默认样式 */
        .ant-table .ant-table-tbody > tr:not(.selected-row):nth-child(even) > td {
          background-color: #fafbfc !important;
          transition: background-color 0.2s ease;
        }
        
        /* 确保悬停效果正常 */
        .ant-table .ant-table-tbody > tr:not(.selected-row):nth-child(even):hover > td {
          background-color: #f5f7fa !important;
        }
        
        /* 确保展开行不影响交替颜色序列 */
        .ant-table .ant-table-tbody > tr.ant-table-row-expandable + tr:not(.selected-row):nth-child(odd) > td {
          background-color: #fafbfc !important;
        }
        
        /* 选中行样式优化 */
        /* 重要：选中行背景色与红色警告区域一致 */
        .ant-table .ant-table-tbody .selected-row > td {
          background-color: #fff3f3 !important; /* 与红色警告区域背景色一致 */
          border-left: none !important; /* 移除所有单元格的左边框 */
          transition: all 0.2s ease;
        }
        
        /* 只给选中行的第一列添加左边框 */
        .ant-table .ant-table-tbody .selected-row > td:first-child {
          border-left: 4px solid #ff4d4f !important; /* 只在第一列添加红色边框 */
        }
        
        /* 确保选中行悬停效果正常 */
        .ant-table .ant-table-tbody .selected-row:hover > td {
          background-color: #ffe6e6 !important;
        }
        
        /* 复选框样式优化 */
        .ant-checkbox {
          margin: 0;
        }
        
        .ant-checkbox-inner {
          width: 16px;
          height: 16px;
        }
        
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #1890ff;
          border-color: #1890ff;
        }
        
        .ant-checkbox:hover .ant-checkbox-inner {
          border-color: #1890ff;
        }
        
        /* 移动端复选框特殊优化 */
        @media (max-width: 768px) {
          .ant-checkbox {
            transform: scale(0.9);
          }
          
          .ant-checkbox-inner {
            width: 14px;
            height: 14px;
          }
        }
        
        /* 删除按钮样式优化 */
        .ant-btn-primary.ant-btn-danger {
          background-color: #ff4d4f;
          border-color: #ff4d4f;
          transition: all 0.3s ease;
        }
        
        .ant-btn-primary.ant-btn-danger:hover {
          background-color: #ff7875;
          border-color: #ff7875;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
        }
        
        /* 操作按钮统一样式 - 缩小到原来的2/3 */
        .action-button {
          border-radius: 4px;
          font-weight: 500;
          transition: all 0.3s ease;
          font-size: 11px; /* 缩小到原来的2/3 */
          padding: 3px 6px; /* 缩小到原来的2/3 */
          margin: 0 1px; /* 间距缩小到原来的1/3 */
          min-width: 47px; /* 缩小到原来的2/3 */
        }
        
        /* 编辑按钮hover效果 */
        .action-button.ant-btn-primary:hover {
          background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
          border-color: #1890ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
        }
        
        /* 删除按钮hover效果 */
        .action-button.ant-btn-danger:hover {
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
          border-color: #ff4d4f;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
        }
        
        /* 展开/收起按钮hover效果 */
        .action-button.ant-btn-default:hover {
          background: linear-gradient(135deg, #f0f0f0 0%, #d9d9d9 100%);
          border-color: #d9d9d9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        /* 操作列响应式设计 - 确保始终能容纳操作按钮 */
        @media (max-width: 1200px) {
          .ant-table .ant-table-column-has-filters.action-column {
            width: 280px !important;
            white-space: nowrap;
            overflow: visible;
          }
        }
        
        @media (max-width: 992px) {
          .ant-table .ant-table-column-has-filters.action-column {
            width: 260px !important;
          }
          
          .action-button {
            font-size: 12px;
            padding: 4px 10px;
            margin: 0 2px;
          }
        }
        
        @media (max-width: 768px) {
          /* 操作列适配移动端 */
          .ant-table .ant-table-column-has-filters.action-column {
            width: 220px !important;
            min-width: 220px;
          }
          
          /* 按钮适配移动端 */
          .action-button {
            font-size: 10px;
            padding: 2px 6px;
            margin: 0 2px;
            width: auto;
            min-width: 60px;
            max-width: 80px;
          }
          
          /* Space容器适配移动端 */
          .ant-space {
            flex-wrap: nowrap !important;
            justify-content: center;
            align-items: center;
          }
          
          /* 确保表格可以横向滚动 */
          .ant-table-container {
            overflow-x: auto;
          }
          
          /* 表格行高适配移动端 */
          .ant-table-tbody > tr > td {
            padding: 6px 4px;
          }
          
          /* 选择框大小适配移动端 */
          .ant-checkbox {
            transform: scale(0.8);
          }
        }
        
        @media (max-width: 576px) {
          .ant-table .ant-table-column-has-filters.action-column {
            width: 200px !important;
            min-width: 200px;
          }
          
          .action-button {
            font-size: 9px;
            padding: 2px 4px;
            min-width: 50px;
            max-width: 65px;
            margin: 0 1px;
          }
        }
        
        /* 确保操作列空间充足 */
        .ant-table .ant-table-column-has-filters.action-column {
          white-space: nowrap;
          overflow: hidden;
        }
        
        /* 展开行过渡动画 */
        .ant-table-tbody > tr.expandable-row > td {
          padding: 0;
          border-bottom: 0;
        }
        
        .ant-table-tbody > tr.expandable-row + tr > td {
          border-top: 0;
        }
        
        /* 平滑过渡效果 */
        .expandable-row-enter {
          max-height: 0;
          opacity: 0;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
          overflow: hidden;
        }
        
        .expandable-row-enter-active {
          max-height: 600px;
          opacity: 1;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
          overflow: hidden;
        }
        
        .expandable-row-leave {
          max-height: 600px;
          opacity: 1;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
          overflow: hidden;
        }
        
        .expandable-row-leave-active {
          max-height: 0;
          opacity: 0;
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
          overflow: hidden;
        }
        
        /* 展开内容样式优化 */
        .expanded-row {
          background-color: #fafafa;
        }
        
        .expanded-hidden-columns {
          animation: fadeIn 0.3s ease;
          padding: 20px;
          background-color: #fafafa;
          border-top: 1px dashed #e8e8e8;
        }
        
        .expanded-hidden-columns h4 {
          margin-bottom: 16px;
          color: #333;
          font-size: 14px;
          font-weight: 600;
        }
        
        /* 隐藏列网格布局优化 */
        .expanded-hidden-columns > div {
          /* 使用flex布局替代grid，避免影响表格宽度 */
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          /* 确保不会超出表格容器宽度 */
          width: 100%;
          box-sizing: border-box;
        }
        
        /* 隐藏列项样式优化 */
        .expanded-hidden-columns > div > div {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 12px 16px;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
        }
        
        .expanded-hidden-columns > div > div:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        
        .expanded-hidden-columns > div > div > span:first-child {
          font-weight: 600;
          color: #333;
          font-size: 13px;
          margin-bottom: 4px;
        }
        
        .expanded-hidden-columns > div > div > span:last-child {
          color: #666;
          font-size: 13px;
          word-break: break-all;
        }
        
        /* 淡入动画 */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* 分页样式优化 */
        .ant-pagination {
          margin-top: 20px;
          padding: 16px;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        /* 操作列按钮样式 - 缩小到原来的2/3 */
        .action-button {
          border-radius: 4px;
          font-weight: 500;
          transition: all 0.3s ease;
          margin: 0 1px; /* 间距缩小到原来的1/3 */
          min-width: 47px; /* 缩小到原来的2/3 */
          text-align: center;
          font-size: 11px; /* 缩小到原来的2/3 */
          padding: 3px 6px; /* 缩小到原来的2/3 */
        }
        
        /* 操作按钮容器Space间距缩小到原来的1/3 */
        .ant-table .ant-space {
          gap: 2px !important; /* 缩小到原来的1/3 */
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* 编辑按钮hover效果 */
        .ant-btn-primary.action-button:hover {
          background-color: #40a9ff;
          border-color: #40a9ff;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
        }
        
        /* 删除按钮hover效果 */
        .ant-btn-danger.action-button:hover {
          background-color: #ff7875;
          border-color: #ff7875;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
        }
        
        /* 展开/收起按钮hover效果 */
        .ant-btn-default.action-button:hover {
          background-color: #f0f0f0;
          border-color: #d9d9d9;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) {
          .ant-table {
            font-size: 12px;
          }
          
          .ant-table-thead > tr > th,
          .ant-table-tbody > tr > td {
            padding: 8px 12px;
          }
          
          .expanded-hidden-columns > div {
            grid-template-columns: 1fr;
          }
          
          /* 响应式操作列 - 缩小到原来的1/2高度 */
          .action-button {
            min-width: 35px; /* 缩小到原来的1/2 */
            font-size: 8px; /* 缩小到原来的1/2 */
            padding: 1.5px 4px !important; /* 缩小到原来的1/2 */
            margin: 0 1px !important; /* 间距缩小到原来的1/3 */
            height: auto !important;
            line-height: 1.1 !important;
          }
          
          /* 响应式操作列Space */
          .ant-space {
            justify-content: center;
            gap: 2px !important; /* 间距缩小到原来的1/3 */
          }
        }
        
        /* 超小屏幕响应式 - 缩小到原来的1/2高度 */
        @media (max-width: 480px) {
          .action-button {
            min-width: 30px; /* 缩小到原来的1/2 */
            font-size: 7px; /* 缩小到原来的1/2 */
            padding: 1px 3px !important; /* 缩小到原来的1/2 */
            margin: 0 0.5px !important; /* 间距缩小到原来的1/3 */
            height: auto !important;
            line-height: 1 !important;
          }
        }
        
        /* 最后添加，确保具有最高优先级 - 进一步减小高度 */
        .ant-table .action-button {
          font-size: 8px !important;
          padding: 1px 4px !important;
          margin: 0 1px !important;
          min-width: 28px !important;
          max-width: 32px !important;
          border-radius: 2px !important;
          height: 18px !important;
          line-height: 1 !important;
          border-width: 1px !important;
          min-height: unset !important;
          width: 28px !important;
        }
        
        /* 使用通用选择器匹配所有操作按钮 */
        /* 定位表格中的Space组件 */
        .ant-table .ant-space {
          display: flex !important;
          align-items: center !important;
          gap: 2px !important;
        }
        
        /* 定位Space组件中的按钮 */
        .ant-table .ant-space > .ant-space-item > button {
          min-width: 32px !important;
          width: 32px !important;
          height: 32px !important;
          padding: 4px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 1px !important;
        }
        
        /* 确保按钮内的图标容器可见 */
        .ant-table .ant-space > .ant-space-item > button > span.ant-btn-icon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* 确保图标可见 */
        .ant-table .ant-space > .ant-space-item > button > span.ant-btn-icon > span.anticon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        /* 确保SVG图标可见 */
        .ant-table .ant-space > .ant-space-item > button > span.ant-btn-icon > span.anticon > svg {
          display: block !important;
          width: 18px !important;
          height: 18px !important;
          fill: currentColor !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* 隐藏按钮文字，但保留直接作为按钮内容的符号 */
        .ant-table .ant-space > .ant-space-item > button > span:not(.ant-btn-icon):not(.expand-icon-symbol) {
          display: none !important;
          visibility: hidden !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
          position: absolute !important;
          left: -9999px !important;
        }
        
        /* 确保展开按钮符号可见 */
        .expand-icon-symbol {
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: auto !important;
          height: auto !important;
          position: static !important;
          left: auto !important;
        }
        
        /* 重置可能影响图标的样式 */
        .ant-table .ant-space > .ant-space-item > button * {
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* 确保只有文字被隐藏 */
        .ant-table .ant-space > .ant-space-item > button > span:not(.ant-btn-icon):not(.expand-icon-symbol) * {
          display: none !important;
        }
        
        /* 最后添加，确保具有最高优先级 - 所有表格单元格都不显示省略号 */
        .ant-table-cell {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        /* 彻底去除点击触发的高亮，同时保留正常样式 */
        /* 使用更精确的选择器和更高优先级 */
        
        /* 1. 去除所有按钮点击状态的高亮 */
        .ant-table button:focus,
        .ant-table button:active,
        .ant-table button:focus-visible,
        .ant-table .ant-btn:focus,
        .ant-table .ant-btn:active,
        .ant-table .ant-btn:focus-visible,
        .ant-table .action-button:focus,
        .ant-table .action-button:active,
        .ant-table .action-button:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* 2. 特别处理Ant Design按钮的点击状态 */
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn:focus-visible,
        .ant-btn:focus:not(.ant-btn-disabled),
        .ant-btn:active:not(.ant-btn-disabled),
        .ant-btn:focus-visible:not(.ant-btn-disabled) {
          outline: none !important;
          box-shadow: none !important;
          border-color: inherit !important;
        }
        
        /* 3. 去除移动端点击高亮 */
        * {
          -webkit-tap-highlight-color: transparent !important;
        }
        
        /* 4. 确保正常样式不受影响 */
        button,
        .ant-btn,
        .action-button {
          /* 保留所有正常样式 */
        }
        
        /* 5. 保留hover效果，只去除高亮 */
        button:hover,
        .ant-btn:hover,
        .action-button:hover {
          outline: none !important;
          box-shadow: none !important;
          /* 其他hover样式由Ant Design默认处理 */
        }
        
        /* 6. 确保Ant Design按钮的默认样式正常 */
        .ant-btn-default,
        .ant-btn-primary,
        .ant-btn-danger {
          border-color: transparent !important;
        }
        
        /* 7. 确保图标按钮样式正常 */
        .ant-btn-icon-only {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  )
}

export default MultiSelectDelete