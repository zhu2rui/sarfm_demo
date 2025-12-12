import React, { useState, useEffect, useRef } from 'react'
import { Table, Checkbox, Button, message, Modal, Space, Tag, Spin } from 'antd'
import { DeleteOutlined, LoadingOutlined } from '@ant-design/icons'

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
  expandable = {}
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
  
  // 更新数据索引映射
  useEffect(() => {
    const map = new Map()
    dataSource.forEach((item, index) => {
      map.set(item[rowKey], index)
    })
    dataIndexMap.current = map
  }, [dataSource, rowKey])
  
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
      text = JSON.stringify(value)
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
      if (!column.dataIndex) return
      
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
                        {value !== null && value !== undefined ? value : '-'} 
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
    ...columns.map(column => {
      const columnKey = column.key || column.dataIndex
      const calculatedWidth = columnWidths[columnKey]
      
      // 创建副本以避免修改原配置
      let newColumn = { ...column }
      
      // 检查是否为创建时间列，只显示日期
      const isCreateTimeColumn = [
        '创建时间', 'createTime', 'created_at', 'create_at', '创建日期', 'date'
      ].includes(columnKey) || 
      [
        '创建时间', '创建日期', '日期'
      ].includes(column.title)
      
      if (isCreateTimeColumn) {
        // 保存原始render函数
        const originalRender = column.render
        
        // 重写render函数，格式化日期
        newColumn.render = (text, record) => {
          let displayText = text
          
          // 如果有原始render函数，先调用它
          if (originalRender) {
            const rendered = originalRender(text, record)
            if (rendered && typeof rendered === 'string') {
              displayText = rendered
            }
          }
          
          // 格式化日期，只显示年月日
          return formatDateOnly(displayText)
        }
        
        // 应用动态计算的宽度，不再固定
        if (calculatedWidth) {
          newColumn.width = calculatedWidth
          newColumn.minWidth = Math.max(calculatedWidth, 80) // 最小宽度80px
          newColumn.maxWidth = Math.min(calculatedWidth * 1.2, 150) // 最大宽度150px
        }
      } else if (columnKey === 'action' || column.title === '操作') {
        // 处理操作列，设置合适的最小宽度，不限制最大宽度
        newColumn.width = 'auto' // 使用自适应宽度
        newColumn.minWidth = 120 // 增加最小宽度，确保有足够空间显示所有按钮
        newColumn.className = 'action-column' // 添加action-column类名，方便CSS选择器定位
      }
      
      // 应用动态计算的宽度，但不覆盖操作列的设置
      if (calculatedWidth && !(columnKey === 'action' || column.title === '操作')) {
        newColumn.width = calculatedWidth
        newColumn.minWidth = calculatedWidth
        newColumn.maxWidth = calculatedWidth * 1.2 // 允许一定的扩展空间
      }
      
      return newColumn
    })
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
        <Table
          ref={tableRef}
          rowKey={rowKey}
          columns={mergedColumns}
          dataSource={dataSource}
          loading={loading}
          pagination={pagination}
          // 自定义行样式
          rowClassName={(record) => {
            return selectedRowKeys.includes(record[rowKey]) ? 'selected-row' : ''
          }}
          // 添加CSS样式
          style={{
            borderRadius: selectedRowKeys.length > 0 ? '0 0 8px 8px' : '8px'
          }}
          // 自适应宽度配置
          scroll={{
            x: 'max-content' // 让表格根据内容自动调整宽度
          }}
          // 展开行配置
          expandable={hiddenColumns.length > 0 ? {
            ...expandable,
            expandedRowRender: expandedRowRender,
            rowExpandable: (record) => hiddenColumns.length > 0
          } : expandable}
        />
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
        
        /* 确保表格只占用实际内容宽度 */
        .ant-table-container {
          width: auto !important;
          min-width: 100%;
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