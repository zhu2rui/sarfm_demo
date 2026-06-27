import React, { useState, useEffect, useRef } from 'react'
import { Card, Button, Modal, Input, message, Popconfirm, Space, Breadcrumb, Tag, Tooltip, Select, Empty, Dropdown } from 'antd'
import { HomeOutlined } from '@ant-design/icons'
import { useNavigate, useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { useI18n } from '../i18n/I18nContext'

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

const CryoGrid = () => {
  const [gridData, setGridData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState('member')
  const [boxes, setBoxes] = useState([]) // for the switcher dropdown
  const [hoveredCell, setHoveredCell] = useState(null)
  const [highlightedCells, setHighlightedCells] = useState(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragSelected, setDragSelected] = useState(new Set()) // Set of "row,col"
  const dragSelectedRef = useRef(dragSelected)
  dragSelectedRef.current = dragSelected
  const [batchLoading, setBatchLoading] = useState(false)
  const [tables, setTables] = useState([])
  const [selectedEntryTableId, setSelectedEntryTableId] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cell: null })
  const navigate = useNavigate()
  const { boxId } = useParams()
  const { t } = useI18n()

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'))
    if (user) setUserRole(user.role)
    if (boxId) fetchGrid()
    fetchTables()

    // Read highlight from localStorage
    const highlight = localStorage.getItem('cryoHighlight')
    if (highlight) {
      const keys = highlight.split('|')
      const highlightSet = new Set(keys)
      setHighlightedCells(highlightSet)
      setTimeout(() => {
        setHighlightedCells(new Set())
        localStorage.removeItem('cryoHighlight')
      }, 5000)
    }

    // Global mouseup to stop dragging
    const globalMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', globalMouseUp)

    // Click on blank area (outside grid) clears selection
    const globalClick = (e) => {
      const gridEl = document.getElementById('cryo-grid-container')
      const batchBar = document.getElementById('cryo-batch-bar')
      const selectPopup = e.target?.closest?.('.ant-select-dropdown')
      if (
        dragSelectedRef.current.size > 0 &&
        !gridEl?.contains(e.target) &&
        !batchBar?.contains(e.target) &&
        !selectPopup
      ) {
        setDragSelected(new Set())
        setSelectedEntryTableId(null)
      }
    }
    document.addEventListener('click', globalClick)

    return () => {
      window.removeEventListener('mouseup', globalMouseUp)
      document.removeEventListener('click', globalClick)
    }
  }, [boxId])

  const fetchGrid = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/v1/cryo-boxes/${boxId}/grid`)
      if (response.data.code === 200) {
        setGridData(response.data.data)
        // Also fetch boxes for the switcher
        if (response.data.data.box.tank_id) {
          fetchBoxes(response.data.data.box.tank_id)
        }
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      message.error('获取网格数据失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchBoxes = async (tankId) => {
    try {
      const response = await axios.get(`/api/v1/cryo-tanks/${tankId}/boxes`)
      if (response.data.code === 200) {
        setBoxes(response.data.data.boxes)
      }
    } catch (error) {
      // silent fail - boxes dropdown is secondary
    }
  }

  const fetchTables = async () => {
    try {
      const response = await axios.get('/api/v1/tables')
      if (response.data.code === 200) {
        setTables(response.data.data.items || [])
      }
    } catch {
      // entry dropdown is optional
    }
  }

  // Check if a cell matches search text
  const cellMatchesSearch = (cell) => {
    if (!searchText.trim() || !cell) return false
    const lower = searchText.toLowerCase()
    const data = cell.data || {}
    // Search in manual reason
    if (data._reason && data._reason.toLowerCase().includes(lower)) return true
    // Search in linked table data
    if (data._row_data) {
      for (const val of Object.values(data._row_data)) {
        if (String(val).toLowerCase().includes(lower)) return true
      }
    }
    // Search in linked table name
    if (cell.linked_table_name && cell.linked_table_name.toLowerCase().includes(lower)) return true
    // Search in raw cell data (for legacy/manual cells)
    for (const val of Object.values(data)) {
      if (typeof val === 'string' && val.toLowerCase().includes(lower)) return true
    }
    return false
  }

  // Right-click context menu
  const handleCellContextMenu = (e, row, col) => {
    e.preventDefault()
    const cell = gridData?.grid?.[row - 1]?.[col - 1]
    if (!cell) { setContextMenu({ visible: false, x: 0, y: 0, cell: null }); return }
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, cell })
  }

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, cell: null })
  }

  const goToLinkedData = () => {
    const cell = contextMenu.cell
    if (!cell?.linked_table_id || !cell?.linked_data_id) return
    localStorage.setItem('selectedTableId', cell.linked_table_id)
    localStorage.setItem('autoExpandInfo', JSON.stringify({
      tableId: cell.linked_table_id,
      rowId: cell.linked_data_id,
      highlight: true
    }))
    closeContextMenu()
    navigate('/data-management')
  }

  const getSelectedPositions = () => {
    const positions = []
    dragSelected.forEach(key => {
      const [r, c] = key.split(',').map(Number)
      const cell = gridData?.grid?.[r - 1]?.[c - 1]
      if (!cell) {
        positions.push({
          box_id: box?.id,
          box_name: box?.box_name || '',
          tank_id: box?.tank_id,
          tank_name: box?.tank_name || '',
          row: r,
          col: c,
          label: `${ROW_LABELS[r - 1]}${c}`
        })
      }
    })
    return positions
  }

  const openDataEntry = () => {
    const positions = getSelectedPositions()
    if (positions.length === 0) {
      message.warning('请先选择空格子')
      return
    }

    if (!selectedEntryTableId) {
      message.warning('请先选择要录入的表格')
      return
    }

    const chosenTable = tables.find(t => String(t.id) === String(selectedEntryTableId))
    if (!chosenTable) {
      message.warning('表格不存在')
      return
    }
    const hasStorage = Array.isArray(chosenTable.columns) && chosenTable.columns.some(col => col.is_storage)
    if (!hasStorage) {
      message.warning('请选择带有储存列的表格')
      return
    }

    localStorage.setItem('selectedTableId', String(chosenTable.id))
    localStorage.setItem('cryoEntryDraft', JSON.stringify({
      positions,
      tableId: chosenTable.id,
      sourceBoxId: box?.id,
      sourceBoxName: box?.box_name || '',
      sourceTankId: box?.tank_id,
      sourceTankName: box?.tank_name || ''
    }))
    navigate('/data-management')
  }

  // Single click handled by mousedown → toggle in handleCellMouseDown

  // Drag-select handlers
  const handleCellMouseDown = (row, col, e) => {
    e.preventDefault()
    const key = `${row},${col}`
    setIsDragging(true)
    // Toggle: if already selected, deselect; otherwise select
    setDragSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleCellMouseEnter = (row, col) => {
    if (!isDragging) return
    const key = `${row},${col}`
    setDragSelected(prev => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Batch clear selected cells
  const handleBatchClear = async () => {
    if (dragSelected.size === 0) return

    const cellsToClear = []
    const linkedRows = new Map() // key: "tableId,dataId" → {table_id, data_id, positions: [...]}
    dragSelected.forEach(key => {
      const [r, c] = key.split(',').map(Number)
      const cell = gridData?.grid?.[r - 1]?.[c - 1]
      if (cell) {
        cellsToClear.push({ row: r, col: c, cell })
        if (cell.linked_table_id && cell.linked_data_id) {
          const lk = `${cell.linked_table_id},${cell.linked_data_id}`
          if (!linkedRows.has(lk)) {
            linkedRows.set(lk, { table_id: cell.linked_table_id, data_id: cell.linked_data_id })
          }
        }
      }
    })

    if (cellsToClear.length === 0) {
      message.warning('选中的格子都已经是空的')
      return
    }

    // Check linked rows for last-position warnings
    const solePositionWarnings = []
    for (const [, info] of linkedRows) {
      try {
        const resp = await axios.get(`/api/v1/tables/${info.table_id}/data/${info.data_id}`)
        if (resp.data.code === 200) {
          const rowData = resp.data.data.data
          // Find storage columns and count remaining positions
          for (const [colName, val] of Object.entries(rowData)) {
            if (typeof val === 'object' && val._storage && val._positions) {
              // Count how many of these positions are being cleared
              const remainingAfterClear = val._positions.filter(p => {
                const key = `${p.row},${p.col}`
                return !dragSelected.has(key)
              })
              if (val._positions.length > 0 && remainingAfterClear.length === 0) {
                solePositionWarnings.push({
                  table_name: resp.data.data.table_name || `Table ${info.table_id}`,
                  col_name: colName,
                  positions: val._positions,
                  data_id: info.data_id,
                  table_id: info.table_id
                })
              }
            }
          }
        }
      } catch {
        // If fetch fails, still proceed
      }
    }

    // If there are sole-position warnings, ask user
    if (solePositionWarnings.length > 0) {
      const warningText = solePositionWarnings.map(w =>
        `"${w.table_name}" 的第 ${w.data_id} 行，存储列 "${w.col_name}" 的所有位置都将被清空`
      ).join('\n')
      Modal.confirm({
        title: '警告：以下数据的存储位置将被全部清空',
        content: (
          <div style={{ whiteSpace: 'pre-line' }}>
            {warningText}
            <div style={{ marginTop: 8, color: '#ff4d4f' }}>确定继续吗？</div>
          </div>
        ),
        okText: '确定清空',
        cancelText: '取消',
        okType: 'danger',
        onOk: () => doBatchClear(cellsToClear)
      })
      return
    }

    doBatchClear(cellsToClear)
  }

  const doBatchClear = async (cellsToClear) => {
    setBatchLoading(true)
    let success = 0
    let fail = 0
    for (const { row, col } of cellsToClear) {
      try {
        const resp = await axios.delete(
          `/api/v1/cryo-boxes/${boxId}/cells/${row}/${col}`
        )
        if (resp.data.code === 200) success++
        else fail++
      } catch {
        fail++
      }
    }
    setBatchLoading(false)

    if (success > 0) message.success(`成功清空 ${success} 个格子` + (fail > 0 ? `，${fail} 个失败` : ''))
    else message.error('清空失败')

    clearDragSelection()
    fetchGrid()
  }

  // Clear drag selection
  const clearDragSelection = () => {
    setDragSelected(new Set())
    setSelectedEntryTableId(null)
  }

  const handleBoxSwitch = (newBoxId) => {
    navigate(`/cryo-box/${newBoxId}/grid`)
  }

  // Subtle blue shades for linked, yellow shades for manual
  const LINK_BLUES = [
    { bg: '#91caff', border: '#69b1ff' },
    { bg: '#a3d0ff', border: '#7dbfff' },
    { bg: '#85a5ff', border: '#597ef7' },
    { bg: '#b3d4ff', border: '#8fc4ff' },
    { bg: '#9ec5ff', border: '#74b3ff' },
    { bg: '#7ec8ff', border: '#4fa8f7' },
  ]
  const MANUAL_YELLOWS = [
    { bg: '#fadb14', border: '#e8b339' },
    { bg: '#fce484', border: '#e8c930' },
    { bg: '#ffe58f', border: '#f0d060' },
    { bg: '#fddc6c', border: '#e8c040' },
    { bg: '#ffec9e', border: '#f0d870' },
  ]

  // Hash a string to a palette index
  const stringToIdx = (str, len) => {
    if (!str) return 0
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash) % len
  }

  // Get cell display text
  const getCellDisplayText = (cell) => {
    if (!cell || !cell.data) return ''
    // For linked cells, show first table column value
    if (cell.data._linked && cell.data._row_data) {
      const rowData = cell.data._row_data
      const tableCols = cell.data._table_columns || []
      for (const col of tableCols) {
        if (!col.is_storage && rowData[col.column_name]) {
          return rowData[col.column_name]
        }
      }
      const vals = Object.values(rowData).filter(v => v && typeof v === 'string')
      return vals[0] || cell.data._table_name || ''
    }
    // For manual cells, show reason
    if (cell.data._manual && cell.data._reason) {
      return cell.data._reason
    }
    return ''
  }

  // Build tooltip content
  const getCellTooltipContent = (cell) => {
    if (!cell || !cell.data) return t('cryo.empty')
    // For linked cells, show table column fields
    if (cell.data._linked && cell.data._row_data) {
      const rowData = cell.data._row_data
      const tableCols = cell.data._table_columns || []
      const lines = tableCols.map(col => {
        const val = rowData[col.column_name] || '-'
        return `${col.column_name}: ${val}`
      })
      return lines.join('\n')
    }
    // For regular cells, show box column fields
    const columns = gridData?.columns || []
    const lines = columns.map(col => {
      const val = cell.data[col.column_name] || '-'
      return `${col.column_name}: ${val}`
    })
    return lines.join('\n')
  }

  const box = gridData?.box

  // Inject highlight animation CSS
  useEffect(() => {
    const styleId = 'cryo-highlight-style'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        @keyframes cryoHighlightPulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(250, 84, 28, 0.6); }
          50% { box-shadow: 0 0 0 4px rgba(250, 84, 28, 0.9); }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/cryo-management"><HomeOutlined /> {t('cryo.title')}</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to={`/cryo-tank/${box?.tank_id}/boxes`}>{box?.tank_name || t('cryo.boxManagement')}</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{box?.box_name || t('cryo.gridView')}</Breadcrumb.Item>
      </Breadcrumb>

      <Card
        title={
          <Space>
            <span>{box?.box_name || t('cryo.gridView')}</span>
            {gridData && (
              <Tag color="blue">
                {t('cryo.occupied')}: {gridData.occupied}/{gridData.total}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            {boxes.length > 0 && (
              <Select
                value={parseInt(boxId)}
                onChange={handleBoxSwitch}
                style={{ width: 200 }}
                options={boxes.map(b => ({
                  value: b.id,
                  label: `${b.box_name} (${b.occupied}/${b.total})`
                }))}
                placeholder={t('cryo.selectBox')}
              />
            )}
            <Button onClick={() => navigate(`/cryo-tank/${box?.tank_id}/boxes`)}>
              {t('cryo.backToBoxes')}
            </Button>
          </Space>
        }
        loading={loading}
      >
        {/* Search bar */}
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <Input
            placeholder="搜索格子内容..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            prefix={<span style={{ color: '#999' }}>🔍</span>}
            style={{ maxWidth: 360 }}
          />
        </div>

        {!gridData ? (
          <Empty description="加载中..." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {/* 9x9 Grid */}
            <div
              id="cryo-grid-container"
              style={{
                display: 'grid',
                gridTemplateColumns: '40px repeat(9, 1fr)',
                gridTemplateRows: '30px repeat(9, 1fr)',
                gap: '3px',
                maxWidth: 700,
                minWidth: 340,
                margin: '0 auto'
              }}
            >
              {/* Top-left corner (empty) */}
              <div />

              {/* Column headers (1-9) */}
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={`col-header-${i + 1}`}
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#666',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {i + 1}
                </div>
              ))}

              {/* Rows with labels */}
              {gridData.grid.map((rowData, rowIdx) => (
                <React.Fragment key={`row-${rowIdx}`}>
                  {/* Row header (A-I) */}
                  <div
                    style={{
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#666',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {ROW_LABELS[rowIdx]}
                  </div>

                  {/* Cells in this row */}
                  {rowData.map((cell, colIdx) => {
                    const isOccupied = cell !== null
                    const isHovered = hoveredCell?.row === rowIdx + 1 && hoveredCell?.col === colIdx + 1
                    const cellKey = `${rowIdx + 1},${colIdx + 1}`
                    const isHighlighted = highlightedCells.has(cellKey)
                    const isDragSelected = dragSelected.has(cellKey)
                    const isLinked = cell?.linked_table_id && cell?.linked_data_id
                    const isManual = isOccupied && !isLinked && cell?.data?._manual
                    const isSearchMatch = cellMatchesSearch(cell)

                    // Determine colors based on cell type
                    let bgColor, borderColor, textColor
                    if (isDragSelected) {
                      bgColor = '#85d9ff'
                      borderColor = '#1677ff'
                      textColor = '#0050b3'
                    } else if (isLinked) {
                      const colorIdx = stringToIdx(String(cell?.linked_data_id || 0), LINK_BLUES.length)
                      const c = LINK_BLUES[colorIdx]
                      bgColor = isHovered ? c.border : c.bg
                      borderColor = c.border
                      textColor = '#fff'
                    } else if (isManual) {
                      const mIdx = stringToIdx(cell?.data?._reason || '', MANUAL_YELLOWS.length)
                      const mc = MANUAL_YELLOWS[mIdx]
                      bgColor = isHovered ? mc.border : mc.bg
                      borderColor = mc.border
                      textColor = '#613400'
                    } else {
                      bgColor = isHovered ? '#e8e8e8' : '#f5f5f5'
                      borderColor = isHovered ? '#bbb' : '#e0e0e0'
                      textColor = '#bbb'
                    }

                    return (
                      <Tooltip
                        key={`cell-${rowIdx}-${colIdx}`}
                        title={
                          <div style={{ whiteSpace: 'pre-line', fontSize: 12 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                              {ROW_LABELS[rowIdx]}{colIdx + 1}
                              {isLinked ? ' (关联)' : isManual ? ' (手动)' : isOccupied ? ` (${t('cryo.occupied')})` : ` (${t('cryo.empty')})`}
                            </div>
                            {isLinked && cell.data._row_data && cell.data._table_columns
                              ? cell.data._table_columns
                                  .filter(col => !col.is_storage)
                                  .map(col => {
                                    const val = cell.data._row_data[col.column_name] || '-'
                                    return <div key={col.column_name}>{col.column_name}: {val}</div>
                                  })
                              : isManual && cell.data._reason
                                ? <div>原因: {cell.data._reason}</div>
                                : isOccupied && <div>占位原因: {getCellDisplayText(cell)}</div>
                            }
                            {isLinked && (
                              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                                <div>{t('cryo.linkedFrom')}: {cell.linked_table_name || cell.linked_table_id}</div>
                                <div style={{ color: '#91d5ff' }}>{t('cryo.viewData')}</div>
                              </div>
                            )}
                          </div>
                        }
                        mouseEnterDelay={0.3}
                      >
                        <div
                          onMouseDown={(e) => handleCellMouseDown(rowIdx + 1, colIdx + 1, e)}
                          onContextMenu={(e) => handleCellContextMenu(e, rowIdx + 1, colIdx + 1)}
                          onMouseEnter={() => {
                            setHoveredCell({ row: rowIdx + 1, col: colIdx + 1 })
                            handleCellMouseEnter(rowIdx + 1, colIdx + 1)
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{
                            userSelect: 'none',
                            aspectRatio: '1',
                            backgroundColor: bgColor,
                            border: isSearchMatch ? '3px solid #52c41a' : `2px solid ${borderColor}`,
                            borderRadius: 4,
                            boxShadow: isSearchMatch ? '0 0 6px 1px rgba(82,196,26,0.5)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: isOccupied ? 500 : 400,
                            color: textColor,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            padding: '2px',
                            transition: 'all 0.15s ease',
                            minWidth: 30,
                            minHeight: 30,
                            animation: isHighlighted ? 'cryoHighlightPulse 0.5s ease-in-out 3' : 'none'
                          }}
                          title={getCellDisplayText(cell)}
                        >
                          {isOccupied ? getCellDisplayText(cell) : ROW_LABELS[rowIdx] + (colIdx + 1)}
                        </div>
                      </Tooltip>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
              <Space size="small">
                <div style={{ width: 16, height: 16, backgroundColor: '#f5f5f5', border: '2px solid #e0e0e0', borderRadius: 3 }} />
                <span style={{ fontSize: 12, color: '#999' }}>{t('cryo.empty')}</span>
              </Space>
              <Space size="small">
                <div style={{ width: 16, height: 16, backgroundColor: '#fadb14', border: '2px solid #e8b339', borderRadius: 3 }} />
                <span style={{ fontSize: 12, color: '#999' }}>手动占用</span>
              </Space>
              <Space size="small">
                <div style={{ width: 16, height: 16, backgroundColor: '#91caff', border: '2px solid #69b1ff', borderRadius: 3 }} />
                <span style={{ fontSize: 12, color: '#999' }}>表格关联</span>
              </Space>
            </div>
          </div>
        )}
      </Card>

      {/* Right-click context menu */}
      {contextMenu.visible && (
        <div onClick={closeContextMenu} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998
        }}>
          <div style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y,
            zIndex: 999, background: '#fff', border: '1px solid #e8e8e8',
            borderRadius: 6, boxShadow: '0 3px 12px rgba(0,0,0,0.12)',
            padding: '4px 0', minWidth: 140
          }}>
            {contextMenu.cell?.linked_table_id && contextMenu.cell?.linked_data_id && (
              <div
                onClick={goToLinkedData}
                style={{
                  padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                  color: '#1890ff', whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f5ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                返回关联列 →
              </div>
            )}
            {contextMenu.cell?.data?._reason && (
              <div style={{ padding: '8px 16px', fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>
                原因: {contextMenu.cell.data._reason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entry floating bar */}
      {dragSelected.size > 0 && (
        <div id="cryo-batch-bar" style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#fff', border: '2px solid #1677ff', borderRadius: 8,
          padding: '12px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          zIndex: 999, display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            已选 <span style={{ color: '#1677ff' }}>{dragSelected.size}</span> 格
          </span>
          <Select
            value={selectedEntryTableId}
            onChange={setSelectedEntryTableId}
            placeholder="选择要录入的表格"
            style={{ width: 260 }}
            getPopupContainer={(triggerNode) => triggerNode.parentElement}
            options={tables.map(table => {
              const hasStorage = Array.isArray(table.columns) && table.columns.some(col => col.is_storage)
              return {
                value: table.id,
                label: hasStorage ? table.table_name : `${table.table_name}（无储存列）`,
                disabled: !hasStorage
              }
            })}
          />
          <Button type="primary" onClick={openDataEntry} loading={batchLoading}>
            录入
          </Button>
          <Popconfirm
            title={`确定清空选中的 ${dragSelected.size} 个格子吗？`}
            onConfirm={handleBatchClear}
            okText="确定"
            cancelText="取消"
          >
            <Button danger loading={batchLoading}>清空</Button>
          </Popconfirm>
          <Button onClick={clearDragSelection}>取消</Button>
        </div>
      )}

    </div>
  )
}

export default CryoGrid


