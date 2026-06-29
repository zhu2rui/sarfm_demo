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

  // Load tanks on mount
  useEffect(() => {
    if (visible) {
      fetchTanks()
      // Initialize pre-selected if editing
      if (preSelected && preSelected.length > 0) {
        const initialKeys = new Set(preSelected.map(p => `${p.row},${p.col}`))
        setSelectedCells(initialKeys)
        const initialMap = {}
        preSelected.forEach(pos => {
          initialMap[`${pos.row},${pos.col}`] = pos
        })
        setSelectedPositionMap(initialMap)
        if (preSelected[0].box_id) {
          setSelectedBoxId(preSelected[0].box_id)
          // We need to find the tank for this box
          // Will be handled when loading boxes
        }
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
        const tks = response.data.data.items
        setTanks(tks)
        // If pre-selected, find the right tank
        if (preSelected && preSelected.length > 0 && preSelected[0].box_id) {
          // Load boxes for all tanks to find the right one
          for (const tk of tks) {
            const boxResp = await axios.get(`/api/v1/cryo-tanks/${tk.id}/boxes`)
            if (boxResp.data.code === 200) {
              const bxs = boxResp.data.data.boxes
              if (bxs.find(b => b.id === preSelected[0].box_id)) {
                setSelectedTankId(tk.id)
                setBoxes(bxs)
                await loadGridByBoxId(preSelected[0].box_id)
                break
              }
            }
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
        setBoxes(response.data.data.boxes)
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
    const key = `${row},${col}`
    const cell = grid?.grid?.[row - 1]?.[col - 1]

    const isPreSelected = preSelected?.some(p => p.row === row && p.col === col)
    const isAlreadySelected = selectedCells.has(key)

    // Allow toggling already-selected cells and allow adding empty cells.
    // Only block cells that are occupied by other records.
    if (cell && !isPreSelected && !isAlreadySelected) {
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

  const handleConfirm = () => {
    if (!grid || selectedCells.size === 0) {
      message.warning('请至少选择一个空位置')
      return
    }

    const positions = []
    selectedCells.forEach(key => {
      if (selectedPositionMap[key]) {
        positions.push(selectedPositionMap[key])
        return
      }
      const [row, col] = key.split(',').map(Number)
      const positionMeta = buildPositionMeta(row, col, grid)
      if (positionMeta) {
        positions.push(positionMeta)
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
          label: meta.label,
          boxInfo: meta.box_name
        })
        return
      }
      const [row, col] = key.split(',').map(Number)
      const label = `${ROW_LABELS[row - 1]}${col}`
      const boxInfo = grid?.box?.box_name || ''
      tags.push({ key, label, boxInfo })
    })
    return tags
  }

  return (
    <Modal
      title={t('cryo.selectStoragePosition')}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={650}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="液氮罐"
            value={selectedTankId}
            onChange={handleTankChange}
            style={{ width: 180 }}
            loading={loading}
            options={tanks.map(tk => ({ value: tk.id, label: tk.name }))}
            allowClear
          />
          <Select
            placeholder="冻存盒"
            value={selectedBoxId}
            onChange={handleBoxChange}
            style={{ width: 200 }}
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
          {getSelectedTags().map(({ key, label, boxInfo }) => (
            <Tag
              key={key}
              closable
              onClose={() => {
                setSelectedCells(prev => {
                  const next = new Set(prev)
                  next.delete(key)
                  return next
                })
              }}
              color="blue"
            >
              {grid?.box?.box_name !== boxInfo ? `${boxInfo} > ` : ''}{label}
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
                  const key = `${row},${col}`
                  const isOccupied = cell !== null
                  const isSelected = selectedCells.has(key)
                  const isPreSelected = preSelected?.some(p => p.row === row && p.col === col)

                  let bgColor = '#f5f5f5'
                  let borderColor = '#e0e0e0'
                  let cursor = 'pointer'

                  if (isPreSelected) {
                    bgColor = '#ffd591'
                    borderColor = '#fa8c16'
                  } else if (isSelected) {
                    bgColor = '#91caff'
                    borderColor = '#1677ff'
                  } else if (isOccupied) {
                    bgColor = '#d9d9d9'
                    borderColor = '#bfbfbf'
                    cursor = 'not-allowed'
                  }

                  return (
                    <Tooltip
                      key={key}
                      title={
                        isOccupied && !isPreSelected
                          ? t('cryo.positionOccupied')
                          : `${ROW_LABELS[rowIdx]}${colIdx + 1}${isSelected ? ' (已选中)' : ''}`
                      }
                    >
                      <div
                        onClick={() => handleCellClick(row, col)}
                        style={{
                          aspectRatio: '1',
                          backgroundColor: bgColor,
                          border: `2px solid ${borderColor}`,
                          borderRadius: 3,
                          cursor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? '#1677ff' : (isOccupied ? '#999' : '#bbb'),
                          transition: 'all 0.15s ease',
                          minWidth: 22,
                          minHeight: 22
                        }}
                      >
                        {isSelected ? '✓' : (isOccupied ? '●' : ROW_LABELS[rowIdx] + col)}
                      </div>
                    </Tooltip>
                  )
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
            <Space size="small">
              <div style={{ width: 14, height: 14, backgroundColor: '#f5f5f5', border: '2px solid #e0e0e0', borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: '#999' }}>空</span>
            </Space>
            <Space size="small">
              <div style={{ width: 14, height: 14, backgroundColor: '#d9d9d9', border: '2px solid #bfbfbf', borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: '#999' }}>已占用</span>
            </Space>
            <Space size="small">
              <div style={{ width: 14, height: 14, backgroundColor: '#91caff', border: '2px solid #1677ff', borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: '#999' }}>已选中</span>
            </Space>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleConfirm} disabled={selectedCells.size === 0}>
            {t('cryo.confirmSelection')} ({selectedCells.size})
          </Button>
        </Space>
      </div>
    </Modal>
  )
}

export default StoragePositionPicker
