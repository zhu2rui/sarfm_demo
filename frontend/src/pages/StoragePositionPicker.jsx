import React, { useState, useEffect } from 'react'
import { Modal, Select, Button, Space, Tag, Tooltip, message, Spin, Empty } from 'antd'
import axios from 'axios'
import { useI18n } from '../i18n/I18nContext'

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

const StoragePositionPicker = ({ visible, onCancel, onConfirm, preSelected }) => {
  const [tanks, setTanks] = useState([])
  const [boxes, setBoxes] = useState([])
  const [selectedTankId, setSelectedTankId] = useState(null)
  const [selectedBoxId, setSelectedBoxId] = useState(null)
  const [grid, setGrid] = useState(null)
  const [loading, setLoading] = useState(false)
  const [gridLoading, setGridLoading] = useState(false)
  const [selectedCells, setSelectedCells] = useState(new Set())
  const [selectedPositionMap, setSelectedPositionMap] = useState({})
  const { t } = useI18n()

  const getCellKey = (boxId, row, col) => `${boxId}_${row}_${col}`

  const buildPositionMeta = (row, col, sourceGrid) => {
    if (!sourceGrid?.box) return null
    return {
      tank_id: sourceGrid.box.tank_id,
      tank_name: sourceGrid.box.tank_name,
      box_id: sourceGrid.box.id,
      box_name: sourceGrid.box.box_name,
      row,
      col,
      label: `${ROW_LABELS[row - 1]}${col}`
    }
  }

  const loadGridByBoxId = async (boxId) => {
    if (!boxId) return null
    setGridLoading(true)
    try {
      const response = await axios.get(`/api/v1/cryo-boxes/${boxId}/grid`)
      if (response.data.code === 200) {
        setGrid(response.data.data)
        return response.data.data
      }
    } catch (error) {
      message.error('获取网格数据失败')
    } finally {
      setGridLoading(false)
    }
    return null
  }

  // Load tanks on mount / visibility change
  useEffect(() => {
    if (visible) {
      fetchTanks()
      // Initialize pre-selected if editing
      if (preSelected && preSelected.length > 0) {
        const initialKeys = new Set(
          preSelected
            .filter(p => p && p.box_id && p.row && p.col)
            .map(p => getCellKey(p.box_id, p.row, p.col))
        )
        setSelectedCells(initialKeys)
        const initialMap = {}
        preSelected.forEach(pos => {
          if (pos && pos.box_id && pos.row && pos.col) {
            initialMap[getCellKey(pos.box_id, pos.row, pos.col)] = { ...pos }
          }
        })
        setSelectedPositionMap(initialMap)
      } else {
        setSelectedCells(new Set())
        setSelectedPositionMap({})
        setSelectedBoxId(null)
        setSelectedTankId(null)
        setGrid(null)
      }
    }
  }, [visible, preSelected])

  const fetchTanks = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/v1/cryo-tanks')
      if (response.data.code === 200) {
        const tks = response.data.data.items || []
        setTanks(tks)

        // If pre-selected, locate the initial tank and box
        if (preSelected && preSelected.length > 0 && preSelected[0].box_id) {
          const firstPos = preSelected[0]
          let foundTankId = firstPos.tank_id
          let targetBoxes = []

          // If tank_id is directly available on firstPos
          if (foundTankId && tks.some(tk => tk.id === foundTankId)) {
            const boxResp = await axios.get(`/api/v1/cryo-tanks/${foundTankId}/boxes`)
            if (boxResp.data.code === 200) {
              targetBoxes = boxResp.data.data.boxes || []
            }
          }

          // Fallback search across tanks if needed
          if (!targetBoxes.some(b => b.id === firstPos.box_id)) {
            for (const tk of tks) {
              if (tk.id === foundTankId) continue
              const boxResp = await axios.get(`/api/v1/cryo-tanks/${tk.id}/boxes`)
              if (boxResp.data.code === 200) {
                const bxs = boxResp.data.data.boxes || []
                if (bxs.some(b => b.id === firstPos.box_id)) {
                  foundTankId = tk.id
                  targetBoxes = bxs
                  break
                }
              }
            }
          }

          if (foundTankId) {
            setSelectedTankId(foundTankId)
            setBoxes(targetBoxes)
            setSelectedBoxId(firstPos.box_id)
            await loadGridByBoxId(firstPos.box_id)
          }
        }
      }
    } catch (error) {
      message.error('获取液氮罐列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleTankChange = async (tankId) => {
    setSelectedTankId(tankId)
    setSelectedBoxId(null)
    setGrid(null)
    setBoxes([])
    if (!tankId) return

    setLoading(true)
    try {
      const response = await axios.get(`/api/v1/cryo-tanks/${tankId}/boxes`)
      if (response.data.code === 200) {
        setBoxes(response.data.data.boxes || [])
      }
    } catch (error) {
      message.error('获取盒子列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleBoxChange = async (boxId) => {
    setSelectedBoxId(boxId)
    setGrid(null)
    if (!boxId) return

    await loadGridByBoxId(boxId)
  }

  const handleCellClick = (row, col) => {
    if (!selectedBoxId || !grid) return
    const key = getCellKey(selectedBoxId, row, col)
    const cell = grid?.grid?.[row - 1]?.[col - 1]

    // Check if this position is one of the original pre-selected positions of THIS record in THIS box
    const isPreSelected = preSelected?.some(
      p => p.box_id === selectedBoxId && p.row === row && p.col === col
    )
    const isAlreadySelected = selectedCells.has(key)
    const hasCellData = cell !== null

    // If the cell is occupied by ANOTHER record (not belonging to current record being edited)
    if (hasCellData && !isPreSelected && !isAlreadySelected) {
      message.warning(t('cryo.positionOccupied'))
      return
    }

    setSelectedCells(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        setSelectedPositionMap(prevMap => {
          const nextMap = { ...prevMap }
          delete nextMap[key]
          return nextMap
        })
      } else {
        next.add(key)
        const positionMeta = buildPositionMeta(row, col, grid)
        if (positionMeta) {
          setSelectedPositionMap(prevMap => ({
            ...prevMap,
            [key]: positionMeta
          }))
        }
      }
      return next
    })
  }

  const handleRemoveTag = (key) => {
    setSelectedCells(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    setSelectedPositionMap(prevMap => {
      const nextMap = { ...prevMap }
      delete nextMap[key]
      return nextMap
    })
  }

  const handleConfirm = () => {
    if (selectedCells.size === 0) {
      if (!preSelected || preSelected.length === 0) {
        message.warning('请至少选择一个位置')
        return
      }
      // If user had preselected positions and deselected all of them, allow confirming clear
      onConfirm([])
      return
    }

    const positions = []
    selectedCells.forEach(key => {
      if (selectedPositionMap[key]) {
        positions.push(selectedPositionMap[key])
      } else {
        const [bId, r, c] = key.split('_').map(Number)
        if (grid?.box?.id === bId) {
          const meta = buildPositionMeta(r, c, grid)
          if (meta) positions.push(meta)
        }
      }
    })

    onConfirm(positions)
  }

  const getSelectedTags = () => {
    const tags = []
    selectedCells.forEach(key => {
      const meta = selectedPositionMap[key]
      if (meta) {
        tags.push({
          key,
          label: meta.label || `${ROW_LABELS[meta.row - 1]}${meta.col}`,
          boxInfo: meta.box_name || '',
          tankInfo: meta.tank_name || '',
          boxId: meta.box_id,
          isOriginal: preSelected?.some(
            p => p.box_id === meta.box_id && p.row === meta.row && p.col === meta.col
          )
        })
      }
    })
    return tags
  }

  return (
    <Modal
      title={t('cryo.selectStoragePosition')}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={680}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="液氮罐 / 冻存架"
            value={selectedTankId}
            onChange={handleTankChange}
            style={{ width: 180 }}
            loading={loading}
            options={tanks.map(tk => ({ value: tk.id, label: tk.name }))}
            allowClear
          />
          <Select
            placeholder="冻存盒 / 子容器"
            value={selectedBoxId}
            onChange={handleBoxChange}
            style={{ width: 220 }}
            loading={loading}
            options={boxes.map(b => ({
              value: b.id,
              label: `${b.box_name} (${b.occupied}/${b.total})`
            }))}
            disabled={!selectedTankId}
            allowClear
          />
        </Space>
      </div>

      {/* Selected positions tags */}
      {selectedCells.size > 0 && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ color: '#666', marginRight: 8 }}>{t('cryo.selectedPositions')}:</span>
          {getSelectedTags().map(({ key, label, boxInfo, tankInfo, isOriginal }) => (
            <Tag
              key={key}
              closable
              onClose={() => handleRemoveTag(key)}
              color={isOriginal ? 'orange' : 'blue'}
              style={{ marginBottom: 4 }}
            >
              {tankInfo ? `${tankInfo} > ` : ''}{boxInfo} &gt; {label}
            </Tag>
          ))}
        </div>
      )}

      {/* Grid */}
      {!selectedBoxId ? (
        <Empty description="请先选择液氮罐和冻存盒" />
      ) : gridLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : grid ? (
        <div style={{ overflowX: 'auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '30px repeat(9, 1fr)',
            gridTemplateRows: '24px repeat(9, 1fr)',
            gap: '2px',
            maxWidth: 450,
            margin: '0 auto'
          }}>
            <div />
            {Array.from({ length: 9 }, (_, i) => (
              <div key={`ch-${i}`} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: '#666' }}>
                {i + 1}
              </div>
            ))}
            {grid.grid.map((rowData, rowIdx) => (
              <React.Fragment key={`r-${rowIdx}`}>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ROW_LABELS[rowIdx]}
                </div>
                {rowData.map((cell, colIdx) => {
                  const row = rowIdx + 1
                  const col = colIdx + 1
                  const key = getCellKey(selectedBoxId, row, col)
                  const isSelected = selectedCells.has(key)
                  const isPreSelected = preSelected?.some(
                    p => p.box_id === selectedBoxId && p.row === row && p.col === col
                  )
                  const hasCellData = cell !== null
                  const isOccupiedByOther = hasCellData && !isPreSelected

                  let bgColor = '#f5f5f5'
                  let borderColor = '#e0e0e0'
                  let borderStyle = 'solid'
                  let cursor = 'pointer'
                  let textColor = '#bbb'
                  let displayText = ROW_LABELS[rowIdx] + col
                  let tooltipTitle = `${ROW_LABELS[rowIdx]}${col}`

                  if (isSelected) {
                    if (isPreSelected) {
                      bgColor = '#ffd591'
                      borderColor = '#fa8c16'
                      textColor = '#d46b08'
                      displayText = '✓'
                      tooltipTitle = `${ROW_LABELS[rowIdx]}${col} (已选中 - 原保存位置)`
                    } else {
                      bgColor = '#91caff'
                      borderColor = '#1677ff'
                      textColor = '#1677ff'
                      displayText = '✓'
                      tooltipTitle = `${ROW_LABELS[rowIdx]}${col} (已选中)`
                    }
                  } else if (isOccupiedByOther) {
                    bgColor = '#d9d9d9'
                    borderColor = '#bfbfbf'
                    textColor = '#999'
                    cursor = 'not-allowed'
                    displayText = '●'
                    const occupantDesc = cell?.linked_table_name
                      ? `[${cell.linked_table_name}]`
                      : (cell?.data?._row_data ? Object.values(cell.data._row_data).filter(Boolean).slice(0, 2).join(' ') : '')
                    tooltipTitle = `${ROW_LABELS[rowIdx]}${col} 已被占用 ${occupantDesc}`.trim()
                  } else if (isPreSelected && !isSelected) {
                    bgColor = '#fffbe6'
                    borderColor = '#faad14'
                    borderStyle = 'dashed'
                    textColor = '#faad14'
                    displayText = ROW_LABELS[rowIdx] + col
                    tooltipTitle = `${ROW_LABELS[rowIdx]}${col} (原保存位置，已取消勾选，保存后将释放)`
                    cursor = 'pointer'
                  } else {
                    bgColor = '#f5f5f5'
                    borderColor = '#e0e0e0'
                    textColor = '#bbb'
                    displayText = ROW_LABELS[rowIdx] + col
                    tooltipTitle = `${ROW_LABELS[rowIdx]}${col} (空闲)`
                    cursor = 'pointer'
                  }

                  return (
                    <Tooltip key={key} title={tooltipTitle}>
                      <div
                        onClick={() => handleCellClick(row, col)}
                        style={{
                          aspectRatio: '1',
                          backgroundColor: bgColor,
                          border: `2px ${borderStyle} ${borderColor}`,
                          borderRadius: 3,
                          cursor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: isSelected ? 600 : 400,
                          color: textColor,
                          transition: 'all 0.15s ease',
                          minWidth: 22,
                          minHeight: 22
                        }}
                      >
                        {displayText}
                      </div>
                    </Tooltip>
                  )
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <Space size="small">
              <div style={{ width: 14, height: 14, backgroundColor: '#f5f5f5', border: '2px solid #e0e0e0', borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: '#999' }}>空闲</span>
            </Space>
            <Space size="small">
              <div style={{ width: 14, height: 14, backgroundColor: '#d9d9d9', border: '2px solid #bfbfbf', borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: '#999' }}>已被占用</span>
            </Space>
            <Space size="small">
              <div style={{ width: 14, height: 14, backgroundColor: '#91caff', border: '2px solid #1677ff', borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: '#999' }}>新选中</span>
            </Space>
            {preSelected && preSelected.length > 0 && (
              <Space size="small">
                <div style={{ width: 14, height: 14, backgroundColor: '#ffd591', border: '2px solid #fa8c16', borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: '#999' }}>原位置</span>
              </Space>
            )}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        {preSelected && preSelected.length > 0 && selectedCells.size > 0 && (
          <Button
            danger
            type="link"
            size="small"
            onClick={() => {
              setSelectedCells(new Set())
              setSelectedPositionMap({})
            }}
          >
            清空所有位置
          </Button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button
              type="primary"
              onClick={handleConfirm}
            >
              {selectedCells.size === 0 && preSelected && preSelected.length > 0
                ? '确认清空位置'
                : `${t('cryo.confirmSelection')} (${selectedCells.size})`}
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  )
}

export default StoragePositionPicker
