import React, { useState, useEffect, useRef, useContext } from 'react'
import { Table, Checkbox, Button, message, Modal, Space, Tag, Spin, Dropdown, Menu, Input, Select } from 'antd'
import { DeleteOutlined, LoadingOutlined, LinkOutlined, EditOutlined, SearchOutlined, CopyOutlined } from '@ant-design/icons'
import axios from 'axios'
import { TableContext } from '../App'

const { confirm } = Modal

const MultiSelectDelete = ({ 
  dataSource, 
  columns, 
  hiddenColumns = [], // 涓嬫媺鍒楀垪琛?
  onDelete, 
  rowKey = 'id',
  loading = false,
  deleteLoading = false,
  showIndex = true,
  showSelectionColumn = true,
  pagination = {},
  // 灞曞紑琛岄厤缃?
  expandable = {},
  // 楂樹寒琛孖D锛岀敤浜庡姩鐢绘晥鏋?
  highlightedRowId = null
}) => {
  // 閫変腑鐨勮ID闆嗗悎
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  // 鏈€杩戜竴娆＄偣鍑荤殑琛岀储寮?
  const lastClickIndex = useRef(-1)
  // 鏁版嵁绱㈠紩鏄犲皠
  const dataIndexMap = useRef(new Map())
  // 鍔ㄦ€佸垪瀹芥槧灏?
  const [columnWidths, setColumnWidths] = useState({})
  // 琛ㄦ牸瀹瑰櫒寮曠敤
  const tableRef = useRef(null)
  // 琛ㄦ牸婊氬姩瀹瑰櫒寮曠敤
  const tableContainerRef = useRef(null)
  // 榧犳爣鎷栧姩鐩稿叧鐘舵€?
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  // 鍙抽敭鑿滃崟鐩稿叧鐘舵€?
  const [contextMenuVisible, setContextMenuVisible] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedCellValue, setSelectedCellValue] = useState('')
  const [selectedCellInfo, setSelectedCellInfo] = useState({ record: null, column: null })
  const [isMobileLongPress, setIsMobileLongPress] = useState(false)
  const longPressTimer = useRef(null)
  // 琛ㄥご鍙抽敭鑿滃崟鐩稿叧鐘舵€?
  const [headerContextMenuVisible, setHeaderContextMenuVisible] = useState(false)
  const [headerContextMenuPosition, setHeaderContextMenuPosition] = useState({ x: 0, y: 0 })
  const [selectedHeaderColumn, setSelectedHeaderColumn] = useState(null)
  // 瀛樺偍鍝簺鍒楅渶瑕佹樉绀哄瓧绗﹂暱搴﹀垪锛屾牸寮忥細{ tableId: { columnKey: true/false } }
  const [showCharacterLengthColumns, setShowCharacterLengthColumns] = useState(() => {
    // 浠巐ocalStorage鎭㈠鐘舵€?
    const saved = localStorage.getItem('showCharacterLengthColumns')
    return saved ? JSON.parse(saved) : {}
  })
  // 閾炬帴缃戦〉鍔熻兘鐩稿叧鐘舵€?
  const [linkModalVisible, setLinkModalVisible] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  // 淇濆瓨褰撳墠姝ｅ湪缂栬緫閾炬帴鐨勫崟鍏冩牸淇℃伅
  const [currentEditingLink, setCurrentEditingLink] = useState({ record: null, column: null })
  
  // 閾炬帴鍒拌〃鏍煎姛鑳界浉鍏崇姸鎬?
  const [linkToTableModalVisible, setLinkToTableModalVisible] = useState(false)
  const [tablesList, setTablesList] = useState([])
  const [selectedTargetTable, setSelectedTargetTable] = useState(null)
  const [targetTableData, setTargetTableData] = useState([])
  const [targetTableColumns, setTargetTableColumns] = useState([])
  const [selectedTargetRow, setSelectedTargetRow] = useState(null)
  const [tablesLoading, setTablesLoading] = useState(false)
  const [targetTableLoading, setTargetTableLoading] = useState(false)
  // 鍒嗛〉鐩稿叧鐘舵€?
  const [targetTableCurrentPage, setTargetTableCurrentPage] = useState(1)
  const [targetTablePageSize, setTargetTablePageSize] = useState(20)
  const [targetTableTotal, setTargetTableTotal] = useState(0)
  
  // 浣跨敤TableContext鑾峰彇琛ㄦ牸鏁版嵁
  const tableContext = useContext(TableContext)
  const tables = tableContext?.tables || []
  const fetchTables = tableContext?.fetchTables || (() => {})
  
  // 鏇存柊鏁版嵁绱㈠紩鏄犲皠
  useEffect(() => {
    const map = new Map()
    dataSource.forEach((item, index) => {
      map.set(item[rowKey], index)
    })
    dataIndexMap.current = map
  }, [dataSource, rowKey])
  
  // 鑾峰彇琛ㄦ牸鍒楄〃
  const fetchTablesList = async () => {
    try {
      setTablesLoading(true)
      // 濡傛灉涓婁笅鏂囦腑娌℃湁琛ㄦ牸鏁版嵁锛岀洿鎺ヤ粠API鑾峰彇
      if (tables.length === 0) {
        const response = await axios.get('/api/v1/tables')
        if (response.data.code === 200) {
          setTablesList(response.data.data)
        } else {
          message.error(response.data.message)
          setTablesList([])
        }
      } else {
        // 浣跨敤涓婁笅鏂囦腑鐨勮〃鏍兼暟鎹?
        setTablesList(tables)
      }
    } catch (error) {
      console.error('鑾峰彇琛ㄦ牸鍒楄〃澶辫触:', error)
      message.error('鑾峰彇琛ㄦ牸鍒楄〃澶辫触锛岃閲嶈瘯')
      setTablesList([])
    } finally {
      setTablesLoading(false)
    }
  }
  
  // 鑾峰彇鐩爣琛ㄦ牸鏁版嵁
  const fetchTargetTableData = async (tableId, page = 1, pageSize = 20) => {
    try {
      setTargetTableLoading(true)
      
      // 鑾峰彇鐩爣琛ㄦ牸璇︽儏锛屽寘鎷垪閰嶇疆
      const tableDetailResponse = await axios.get(`/api/v1/tables/${tableId}`)
      let tableColumns = []
      if (tableDetailResponse.data.code === 200) {
        tableColumns = tableDetailResponse.data.data.columns || []
        setTargetTableColumns(tableColumns)
      }
      
      // 鑾峰彇鐩爣琛ㄦ牸鏁版嵁
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
      console.error('鑾峰彇鐩爣琛ㄦ牸鏁版嵁澶辫触:', error)
      message.error('鑾峰彇鐩爣琛ㄦ牸鏁版嵁澶辫触锛岃閲嶈瘯')
      setTargetTableData([])
      setTargetTableTotal(0)
    } finally {
      setTargetTableLoading(false)
    }
  }
  
  // 娓呴櫎闀挎寜瀹氭椂鍣?
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])
  
  // 娣诲姞PC绔紶鏍囨嫋鍔ㄥ钩绉昏〃鏍煎姛鑳?
  useEffect(() => {
    const handleMouseDown = (e) => {
      // 鍙湪PC绔笖鎷栧姩瀹瑰櫒瀛樺湪鏃跺惎鐢ㄦ嫋鍔?
      if (tableContainerRef.current && e.button === 0) { // 鍙搷搴斿乏閿?
        // 妫€鏌ヨ〃鏍兼槸鍚﹀彲婊氬姩
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
      const walk = (x - startX.current) * 1.5 // 鎷栧姩閫熷害
      tableContainerRef.current.scrollLeft = scrollLeft.current - walk
    }
    
    const handleMouseUp = () => {
      isDragging.current = false
      if (tableContainerRef.current) {
        tableContainerRef.current.style.cursor = 'grab'
      }
    }
    
    // 娣诲姞鍏ㄥ眬浜嬩欢鐩戝惉锛岀‘淇濋紶鏍囩Щ鍔ㄦ椂鍗充娇鍏夋爣绂诲紑瀹瑰櫒涔熻兘缁х画鎷栧姩
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
      const walk = (x - startX.current) * 1.5 // 鎷栧姩閫熷害
      container.scrollLeft = scrollLeft.current - walk
    }
    
    // 娣诲姞浜嬩欢鐩戝惉
    if (tableContainerRef.current) {
      const container = tableContainerRef.current
      // 璁剧疆鍒濆榧犳爣鏍峰紡
      container.style.cursor = 'grab'
      
      // 娣诲姞鏈湴浜嬩欢鐩戝惉
      container.addEventListener('mousedown', handleMouseDown)
      container.addEventListener('mousemove', handleMouseMove)
      container.addEventListener('mouseup', handleMouseUp)
      
      // 娣诲姞鍏ㄥ眬浜嬩欢鐩戝惉
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.addEventListener('mousemove', handleGlobalMouseMove)
    }
    
    // 娓呯悊浜嬩欢鐩戝惉
    return () => {
      if (tableContainerRef.current) {
        const container = tableContainerRef.current
        // 绉婚櫎鏈湴浜嬩欢鐩戝惉
        container.removeEventListener('mousedown', handleMouseDown)
        container.removeEventListener('mousemove', handleMouseMove)
        container.removeEventListener('mouseup', handleMouseUp)
      }
      
      // 绉婚櫎鍏ㄥ眬浜嬩欢鐩戝惉
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [tableContainerRef])
  
  // 澶勭悊閾炬帴鍒拌〃鏍?
  const handleLinkToTable = () => {
    // 淇濆瓨褰撳墠缂栬緫鐨勫崟鍏冩牸淇℃伅
    const { record, column } = selectedCellInfo
    setCurrentEditingLink({ record, column })
    
    // 娓呯┖涔嬪墠鐨勯€夋嫨
    setSelectedTargetTable(null)
    setTargetTableData([])
    setSelectedTargetRow(null)
    
    // 鍏抽棴鍙抽敭鑿滃崟
    setContextMenuVisible(false)
    setIsMobileLongPress(false)
    
    // 鎵撳紑閾炬帴鍒拌〃鏍肩殑妯℃€佹
    setLinkToTableModalVisible(true)
    
    // 鍔犺浇琛ㄦ牸鍒楄〃
    fetchTablesList()
  }
  
  // 澶勭悊閾炬帴鍒扮綉椤?
  const handleLinkToWeb = () => {
    // 鍙繚瀛樺繀瑕佺殑淇℃伅锛岄伩鍏嶅惊鐜紩鐢?
    const { record, column } = selectedCellInfo
    const safeRecord = {
      [rowKey]: record[rowKey],
      table_id: record.table_id,
      data: record.data
    }
    setCurrentEditingLink({ record: safeRecord, column })
    setLinkModalVisible(true)
    setLinkUrl('') // 閲嶇疆杈撳叆妗?
    setContextMenuVisible(false)
    setIsMobileLongPress(false)
  }
  
  // 澶勭悊閾炬帴淇濆瓨
  const handleLinkSave = async () => {
    if (!linkUrl.trim()) {
      message.error('璇疯緭鍏ユ湁鏁堢殑缃戝潃')
      return
    }
    
    // 楠岃瘉缃戝潃鏍煎紡
    let finalUrl = linkUrl
    try {
      new URL(finalUrl)
    } catch (e) {
      // 濡傛灉涓嶆槸瀹屾暣URL锛屽皾璇曟坊鍔爃ttps://鍓嶇紑
      try {
        new URL(`https://${linkUrl}`)
        finalUrl = `https://${linkUrl}`
      } catch (e) {
        message.error('璇疯緭鍏ユ湁鏁堢殑缃戝潃鏍煎紡')
        return
      }
    }
    
    // 鑾峰彇褰撳墠姝ｅ湪缂栬緫鐨勮褰曞拰鍒椾俊鎭?
    const { record, column } = currentEditingLink
    if (!record || !column) {
      message.error('无效的编辑状态')
      return
    }
    
    try {
      // 鑾峰彇蹇呰鐨処D淇℃伅锛岀‘淇濅娇鐢ㄥ熀鏈被鍨?
      const recordId = String(record[rowKey])
      const tableId = String(record.table_id)
      
      // 鐩存帴浣跨敤selectedCellInfo涓殑column锛岄伩鍏嶄娇鐢ㄥ彲鑳芥湁寰幆寮曠敤鐨刢olumn瀵硅薄
      const originalColumn = selectedCellInfo.column
      if (!originalColumn) {
        message.error('鏃犳晥鐨勫垪淇℃伅')
        return
      }
      
      // 鑾峰彇鍒楀悕锛氱‘淇濆彧浣跨敤瀛楃涓?
      let columnKey = originalColumn.key || ''
      if (!columnKey && originalColumn.dataIndex) {
        if (Array.isArray(originalColumn.dataIndex) && originalColumn.dataIndex.length > 1) {
          // 瀵逛簬宓屽鏁版嵁绱㈠紩锛屽['data', 'column_name']锛屽彇绗簩涓厓绱?
          columnKey = originalColumn.dataIndex[1]
        } else if (typeof originalColumn.dataIndex === 'string') {
          // 瀵逛簬鐩存帴瀛楃涓茬储寮曪紝鐩存帴浣跨敤
          columnKey = originalColumn.dataIndex
        } else {
          // 瀵逛簬鍏朵粬鎯呭喌锛屼娇鐢ㄥ垪鏍囬浣滀负澶囬€?
          columnKey = originalColumn.title
        }
      }
      
      // 纭繚columnKey鏄瓧绗︿覆
      columnKey = String(columnKey)
      
      // 鍒涘缓涓€涓叏鏂扮殑鏁版嵁瀵硅薄锛岄伩鍏嶇户鎵夸换浣曞惊鐜紩鐢?
      const newData = {}
      
      // 澶嶅埗鐜版湁鏁版嵁锛岀‘淇濆彧澶嶅埗鍩烘湰绫诲瀷
      if (typeof record.data === 'object' && record.data !== null) {
        for (const [key, value] of Object.entries(record.data)) {
          // 鍙鍒跺熀鏈被鍨嬫垨绠€鍗曞璞?
          if (value === null || typeof value !== 'object') {
            newData[key] = value
          } else if (typeof value === 'object' && ('_text' in value && '_link' in value)) {
            // 濡傛灉宸茬粡鏄摼鎺ユ暟鎹紝淇濈暀
            newData[key] = { ...value }
          } else {
            // 瀵逛簬鍏朵粬瀵硅薄锛岃浆鎹负瀛楃涓?
            newData[key] = String(value)
          }
        }
      }
      
      // 浣跨敤鐗规畩鏍煎紡淇濆瓨閾炬帴淇℃伅锛氬彧浣跨敤鍩烘湰绫诲瀷
      newData[columnKey] = {
        _text: String(selectedCellValue),
        _link: String(finalUrl)
      }
      
      // 鏋勫缓API URL
      const apiUrl = `/api/v1/tables/${tableId}/data/${recordId}`
      
      // 鏋勫缓璇锋眰澶?
      const headers = {
        'Content-Type': 'application/json'
      }
      
      // 娣诲姞璁よ瘉token
      const token = localStorage.getItem('token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // 鏋勫缓璇锋眰浣擄紝纭繚鍙寘鍚熀鏈被鍨?
      const requestBody = {
        data: newData
      }
      
      // 浣跨敤fetch API鍙戦€佽姹?
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(requestBody)
      })
      
      // 妫€鏌ュ搷搴旂姸鎬?
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // 瑙ｆ瀽鍝嶅簲鏁版嵁
      const result = await response.json()
      
      if (result.code === 200) {
        message.success('閾炬帴璁剧疆鎴愬姛')
        setLinkModalVisible(false)
        
        // 鍒锋柊椤甸潰鑾峰彇鏈€鏂版暟鎹?
        window.location.reload()
      } else {
        message.error(result.message || '閾炬帴璁剧疆澶辫触')
      }
    } catch (error) {
      console.error('Error saving link:', error)
      message.error('链接设置失败，请检查网络连接')
    }
  }
  
  // 澶勭悊閾炬帴鍙栨秷
  const handleLinkCancel = () => {
    setLinkModalVisible(false)
  }
  
  // 澶勭悊鍙栨秷閾炬帴
  const handleUnlink = async () => {
    // 鑾峰彇褰撳墠姝ｅ湪缂栬緫鐨勮褰曞拰鍒椾俊鎭?
    const { record, column } = selectedCellInfo
    if (!record || !column) {
      message.error('无效的编辑状态')
      return
    }
    
    try {
      // 鑾峰彇蹇呰鐨処D淇℃伅锛岀‘淇濅娇鐢ㄥ熀鏈被鍨?
      const recordId = String(record[rowKey])
      const tableId = String(record.table_id)
      
      // 鐩存帴浣跨敤selectedCellInfo涓殑column锛岄伩鍏嶄娇鐢ㄥ彲鑳芥湁寰幆寮曠敤鐨刢olumn瀵硅薄
      const originalColumn = selectedCellInfo.column
      if (!originalColumn) {
        message.error('鏃犳晥鐨勫垪淇℃伅')
        return
      }
      
      // 鑾峰彇鍒楀悕锛氱‘淇濆彧浣跨敤瀛楃涓?
      let columnKey = originalColumn.key || ''
      if (!columnKey && originalColumn.dataIndex) {
        if (Array.isArray(originalColumn.dataIndex) && originalColumn.dataIndex.length > 1) {
          // 瀵逛簬宓屽鏁版嵁绱㈠紩锛屽['data', 'column_name']锛屽彇绗簩涓厓绱?
          columnKey = originalColumn.dataIndex[1]
        } else if (typeof originalColumn.dataIndex === 'string') {
          // 瀵逛簬鐩存帴瀛楃涓茬储寮曪紝鐩存帴浣跨敤
          columnKey = originalColumn.dataIndex
        } else {
          // 瀵逛簬鍏朵粬鎯呭喌锛屼娇鐢ㄥ垪鏍囬浣滀负澶囬€?
          columnKey = originalColumn.title
        }
      }
      
      // 纭繚columnKey鏄瓧绗︿覆
      columnKey = String(columnKey)
      
      // 鍒涘缓涓€涓叏鏂扮殑鏁版嵁瀵硅薄锛岄伩鍏嶇户鎵夸换浣曞惊鐜紩鐢?
      const newData = { ...record.data }
      
      // 瀵逛簬閾炬帴瀵硅薄锛屽彧淇濈暀鏂囨湰閮ㄥ垎锛岀Щ闄ら摼鎺ヤ俊鎭?
      if (typeof newData[columnKey] === 'object' && newData[columnKey] !== null && newData[columnKey]._text) {
        newData[columnKey] = newData[columnKey]._text
      }
      
      // 鏋勫缓API URL
      const apiUrl = `/api/v1/tables/${tableId}/data/${recordId}`
      
      // 鏋勫缓璇锋眰澶?
      const headers = {
        'Content-Type': 'application/json'
      }
      
      // 娣诲姞璁よ瘉token
      const token = localStorage.getItem('token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // 鏋勫缓璇锋眰浣擄紝纭繚鍙寘鍚熀鏈被鍨?
      const requestBody = {
        data: newData
      }
      
      // 浣跨敤fetch API鍙戦€佽姹?
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(requestBody)
      })
      
      // 妫€鏌ュ搷搴旂姸鎬?
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // 瑙ｆ瀽鍝嶅簲鏁版嵁
      const result = await response.json()
      
      if (result.code === 200) {
        message.success('鍙栨秷閾炬帴鎴愬姛')
        setContextMenuVisible(false)
        setIsMobileLongPress(false)
        
        // 鍒锋柊椤甸潰鑾峰彇鏈€鏂版暟鎹?
        window.location.reload()
      } else {
        message.error(result.message || '鍙栨秷閾炬帴澶辫触')
      }
    } catch (error) {
      console.error('Error unlinking:', error)
      message.error('取消链接失败，请检查网络连接')
    }
  }
  
  // 澶勭悊閾炬帴鍒拌〃鏍间繚瀛?
  const handleLinkToTableSave = async () => {
    // 鑾峰彇褰撳墠姝ｅ湪缂栬緫鐨勮褰曞拰鍒椾俊鎭?
    const { record, column } = currentEditingLink
    if (!record || !column) {
      message.error('无效的编辑状态')
      return
    }
    
    try {
      // 鑾峰彇蹇呰鐨処D淇℃伅锛岀‘淇濅娇鐢ㄥ熀鏈被鍨?
      const recordId = String(record[rowKey])
      const tableId = String(record.table_id)
      
      // 鑾峰彇鍒楀悕锛氱‘淇濆彧浣跨敤瀛楃涓?
      let columnKey = column.key || ''
      if (!columnKey && column.dataIndex) {
        if (Array.isArray(column.dataIndex) && column.dataIndex.length > 1) {
          // 瀵逛簬宓屽鏁版嵁绱㈠紩锛屽['data', 'column_name']锛屽彇绗簩涓厓绱?
          columnKey = column.dataIndex[1]
        } else if (typeof column.dataIndex === 'string') {
          // 瀵逛簬鐩存帴瀛楃涓茬储寮曪紝鐩存帴浣跨敤
          columnKey = column.dataIndex
        } else {
          // 瀵逛簬鍏朵粬鎯呭喌锛屼娇鐢ㄥ垪鏍囬浣滀负澶囬€?
          columnKey = column.title
        }
      }
      
      // 纭繚columnKey鏄瓧绗︿覆
      columnKey = String(columnKey)
      
      // 鑾峰彇褰撳墠鍗曞厓鏍肩殑鍊?
      let currentValue = record.data[columnKey]
      
      // 鑾峰彇褰撳墠鏄剧ず鏂囨湰
      let displayText
      if (typeof currentValue === 'object' && currentValue !== null && currentValue._text) {
        displayText = currentValue._text
      } else {
        displayText = String(currentValue)
      }
      
      // 鍒涘缓閾炬帴瀵硅薄锛屾牸寮忎负 { _text: '鏄剧ず鏂囨湰', _link: '閾炬帴淇℃伅' }
      // 閾炬帴淇℃伅鏍煎紡锛歵able:{targetTableId}:{targetRowId}
      const linkObject = {
        _text: displayText,
        _link: `table:${selectedTargetTable}:${selectedTargetRow}`
      }
      
      // 鍒涘缓涓€涓叏鏂扮殑鏁版嵁瀵硅薄锛岄伩鍏嶇户鎵夸换浣曞惊鐜紩鐢?
      const newData = { ...record.data }
      newData[columnKey] = linkObject
      
      // 鏋勫缓API URL
      const apiUrl = `/api/v1/tables/${tableId}/data/${recordId}`
      
      // 鏋勫缓璇锋眰澶?
      const headers = {
        'Content-Type': 'application/json'
      }
      
      // 娣诲姞璁よ瘉token
      const token = localStorage.getItem('token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // 鏋勫缓璇锋眰浣擄紝纭繚鍙寘鍚熀鏈被鍨?
      const requestBody = {
        data: newData
      }
      
      // 浣跨敤fetch API鍙戦€佽姹?
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(requestBody)
      })
      
      // 妫€鏌ュ搷搴旂姸鎬?
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // 瑙ｆ瀽鍝嶅簲鏁版嵁
      const result = await response.json()
      
      if (result.code === 200) {
        message.success('链接到表格成功')
        // 鍏抽棴妯℃€佹
        setLinkToTableModalVisible(false)
        // 鍒锋柊椤甸潰鑾峰彇鏈€鏂版暟鎹?
        window.location.reload()
      } else {
        message.error(result.message || '链接到表格失败')
      }
    } catch (error) {
      console.error('Error linking to table:', error)
      message.error('链接到表格失败，请检查网络连接')
    }
  }
  
  // 澶勭悊閾炬帴鍒拌〃鏍煎彇娑?
  const handleLinkToTableCancel = () => {
    setLinkToTableModalVisible(false)
  }
  
  // 澶勭悊澶嶅埗鍔熻兘
  const handleCopy = async () => {
    try {
      // 鑾峰彇褰撳墠閫変腑鐨勫崟鍏冩牸鍊?
      let copyText = '';
      
      // 澶勭悊涓嶅悓绫诲瀷鐨勫€?
      if (typeof selectedCellValue === 'object' && selectedCellValue !== null) {
        // 濡傛灉鏄摼鎺ュ璞★紝鍙鍒舵枃鏈儴鍒?
        if (selectedCellValue._text) {
          copyText = selectedCellValue._text;
        } else {
          // 鍏朵粬瀵硅薄绫诲瀷杞崲涓哄瓧绗︿覆
          copyText = JSON.stringify(selectedCellValue);
        }
      } else if (selectedCellValue !== null && selectedCellValue !== undefined) {
        // 鍩烘湰绫诲瀷鐩存帴杞崲涓哄瓧绗︿覆
        copyText = String(selectedCellValue);
      } else {
        // 绌哄€煎鐞?
        copyText = '';
      }
      
      // 浣跨敤Clipboard API澶嶅埗鏂囨湰
      await navigator.clipboard.writeText(copyText);
      
      // 鏄剧ず澶嶅埗鎴愬姛鎻愮ず
      message.success('已复制', 1); // 1秒后自动关闭
    } catch (err) {
      console.error('澶嶅埗澶辫触:', err);
      // 闄嶇骇鏂规锛氫娇鐢ㄤ紶缁熺殑document.execCommand('copy')
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
        console.error('澶嶅埗澶辫触锛堥檷绾ф柟妗堬級:', fallbackErr);
        message.error('复制失败，请手动选择并复制', 2);
      }
    }
    
    // 鍏抽棴鍙抽敭鑿滃崟
    setContextMenuVisible(false);
    setIsMobileLongPress(false);
  };
  
  // 鍙抽敭鑿滃崟鍐呭
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
      label: '解除链接',
      key: 'unlink',
      icon: <LinkOutlined />,
      onClick: handleUnlink,
      // 鍙湁褰搒electedCellValue鏄璞′笖鍖呭惈_link灞炴€ф椂鎵嶆樉绀?
      disabled: !(typeof selectedCellValue === 'object' && selectedCellValue !== null && selectedCellValue._link)
    }
  ]
  
  // 澶勭悊琛ㄥご鍙抽敭鐐瑰嚮浜嬩欢
  const handleHeaderContextMenu = (e, column) => {
    e.preventDefault()
    setSelectedHeaderColumn(column)
    setHeaderContextMenuPosition({ x: e.clientX, y: e.clientY })
    setHeaderContextMenuVisible(true)
  }
  
  // 澶勭悊琛ㄥご鑿滃崟鐐瑰嚮浜嬩欢
  const handleHeaderMenuClick = (e) => {
    const { key } = e
    if (key === 'show-character-length') {
      handleToggleCharacterLength()
    }
    setHeaderContextMenuVisible(false)
  }
  
  // 琛ㄥご鍙抽敭鑿滃崟鍐呭
  const headerContextMenuItems = [
    {
      label: '显示字符长度',
      key: 'show-character-length',
      onClick: handleHeaderMenuClick
    }
  ]
  
  // 澶勭悊鍙抽敭鐐瑰嚮浜嬩欢
  const handleContextMenu = (e, value, record, column) => {
    e.preventDefault()
    setSelectedCellValue(value)
    setSelectedCellInfo({ record, column })
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setContextMenuVisible(true)
  }
  
  // 澶勭悊闀挎寜寮€濮?
  const handleLongPressStart = (e, value, record, column) => {
    setSelectedCellValue(value)
    setSelectedCellInfo({ record, column })
    longPressTimer.current = setTimeout(() => {
      setIsMobileLongPress(true)
    }, 500) // 500ms 闀挎寜瑙﹀彂
  }
  
  // 澶勭悊闀挎寜缁撴潫
  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }
  
  // 澶勭悊鐐瑰嚮浜嬩欢锛屽叧闂彍鍗?
  const handleClick = () => {
    setContextMenuVisible(false)
    setHeaderContextMenuVisible(false)
    setIsMobileLongPress(false)
  }
  
  // 澶勭悊鏄剧ず/闅愯棌瀛楃闀垮害鍒?
  const handleToggleCharacterLength = () => {
    if (!selectedHeaderColumn) return
    
    // 鑾峰彇琛ㄦ牸ID
    const tableId = dataSource.length > 0 ? dataSource[0].table_id : 'default'
    // 鑾峰彇褰撳墠鍒楃殑key
    const columnKey = selectedHeaderColumn.key || selectedHeaderColumn.dataIndex
    
    // 鏇存柊鐘舵€?
    setShowCharacterLengthColumns(prev => {
      // 纭繚姣忎釜琛ㄦ牸閮芥湁鐙珛鐨勯厤缃?
      const tableConfig = prev[tableId] || {}
      // 鍒囨崲鐘舵€?
      const newConfig = {
        ...tableConfig,
        [columnKey]: !tableConfig[columnKey]
      }
      
      const newState = {
        ...prev,
        [tableId]: newConfig
      }
      
      // 淇濆瓨鍒發ocalStorage
      localStorage.setItem('showCharacterLengthColumns', JSON.stringify(newState))
      
      return newState
    })
  }
  
  // 娣诲姞鍏ㄥ眬鐐瑰嚮浜嬩欢鐩戝惉锛岀敤浜庡叧闂彍鍗?
  useEffect(() => {
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])
  
  // 璁＄畻鏂囨湰瀹藉害鐨勮緟鍔╁嚱鏁?
  const getTextWidth = (text) => {
    // 鍒涘缓涓€涓复鏃跺厓绱犳潵娴嬮噺鏂囨湰瀹藉害
    const tempElement = document.createElement('span')
    tempElement.style.visibility = 'hidden'
    tempElement.style.position = 'absolute'
    tempElement.style.whiteSpace = 'nowrap'
    tempElement.style.fontSize = '13px' // 涓庤〃鏍煎瓧浣撳ぇ灏忎竴鑷?
    tempElement.style.fontFamily = 'Arial, sans-serif'
    tempElement.textContent = text
    document.body.appendChild(tempElement)
    
    const width = tempElement.offsetWidth
    document.body.removeChild(tempElement)
    
    return width
  }
  
  // 璁＄畻鏁版嵁闀垮害锛岃€冭檻涓嶅悓鏁版嵁绫诲瀷
  const calculateDataLength = (value) => {
    if (value === null || value === undefined) {
      return 0
    }
    
    let text
    if (typeof value === 'object') {
      // 濡傛灉鏄寘鍚摼鎺ヤ俊鎭殑瀵硅薄 { _text: '鍘熷鏂囨湰', _link: '閾炬帴URL' }
      if (value._text && value._link) {
        text = String(value._text)
      } else {
        text = JSON.stringify(value)
      }
    } else {
      text = String(value)
    }
    
    // 璁＄畻鏂囨湰瀹藉害锛岃€冭檻涓枃瀛楃鍗犱袱鍊嶅搴?
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const otherChars = text.length - chineseChars
    
    // 涓枃瀛楃鍗?6px锛屽叾浠栧瓧绗﹀崰8px锛屽姞涓婁竴浜涢棿璺?
    return chineseChars * 16 + otherChars * 8 + 20
  }
  
  // 璁＄畻鏈€浣冲垪瀹?
  const calculateOptimalColumnWidths = () => {
    const newColumnWidths = {}
    
    // 璁＄畻姣忓垪鐨勫搴?
    columns.forEach(column => {
      // 璺宠繃鎿嶄綔鍒楀拰娌℃湁dataIndex鐨勫垪
      if (!column.dataIndex || column.key === 'action' || column.title === '鎿嶄綔') return
      
      const columnKey = column.key || column.dataIndex
      
      // 璁＄畻鏍囬瀹藉害
      const titleWidth = getTextWidth(column.title) + 40 // 鍔犱笂涓€浜涢棿璺?
      
      // 妫€鏌ユ槸鍚︿负鍒涘缓鏃堕棿鍒?
      const isCreateTimeColumn = [
        '鍒涘缓鏃堕棿', 'createTime', 'created_at', 'create_at', '鍒涘缓鏃ユ湡', 'date'
      ].includes(columnKey) || 
      [
        '鍒涘缓鏃堕棿', '鍒涘缓鏃ユ湡', '鏃ユ湡'
      ].includes(column.title)
      
      // 璁＄畻鏁版嵁瀹藉害
      let maxDataWidth = 0
      dataSource.forEach(record => {
        let value = record
        const dataIndex = Array.isArray(column.dataIndex) ? column.dataIndex : [column.dataIndex]
        
        // 澶勭悊宓屽璺緞
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
          
          // 濡傛灉鏄垱寤烘椂闂村垪锛屾牸寮忓寲鍚庡啀璁＄畻瀹藉害
          if (isCreateTimeColumn) {
            displayValue = formatDateOnly(String(value))
          }
          
          const dataWidth = calculateDataLength(displayValue)
          if (dataWidth > maxDataWidth) {
            maxDataWidth = dataWidth
          }
        }
      })
      
      // 鏈€浣冲搴﹀彇鏍囬瀹藉害鍜屾暟鎹搴︾殑鏈€澶у€?
      let optimalWidth = Math.max(titleWidth, maxDataWidth)
      
      // 璁剧疆鏈€灏忓拰鏈€澶у搴﹂檺鍒?
      optimalWidth = Math.max(optimalWidth, 100) // 鏈€灏忓搴﹁皟鏁翠负100px锛岀‘淇濇椂闂村垪鏈夎冻澶熷搴?
      optimalWidth = Math.min(optimalWidth, 500) // 鏈€澶у搴?
      
      newColumnWidths[columnKey] = optimalWidth
    })
    
    setColumnWidths(newColumnWidths)
  }
  
  // 鐩戝惉鏁版嵁鍙樺寲锛岄噸鏂拌绠楀垪瀹?
  useEffect(() => {
    // 娣诲姞涓€涓皬寤惰繜锛岀‘淇滵OM宸叉覆鏌?
    const timer = setTimeout(() => {
      if (dataSource.length > 0) {
        calculateOptimalColumnWidths()
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [dataSource, columns])
  
  // 鐩戝惉绐楀彛澶у皬鍙樺寲锛岄噸鏂拌绠楀垪瀹?
  useEffect(() => {
    const handleResize = () => {
      if (dataSource.length > 0) {
        calculateOptimalColumnWidths()
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [dataSource, columns])
  
  // 澶勭悊鍗曚釜閫夋嫨
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
  
  // 澶勭悊杩炵画閫夋嫨锛圫hift閿級
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
  
  // 澶勭悊闈炶繛缁€夋嫨锛圕trl/Cmd閿級
  const handleNonContinuousSelect = (record, checked, e) => {
    if (e.ctrlKey || e.metaKey) {
      handleSingleSelect(record, checked)
    } else {
      handleRangeSelect(record, checked, e)
    }
  }
  
  // 澶勭悊琛岄€夋嫨鍙樺寲
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys)
  }
  
  // 澶勭悊鍒犻櫎鎿嶄綔
  const handleDelete = () => {
    if (selectedRowKeys.length === 0) return
    
    // 浜屾纭瀵硅瘽妗?
    confirm({
      title: '纭鍒犻櫎',
      content: '删除操作不可逆转，确定要删除选中的项目吗？',
      okText: '纭鍒犻櫎',
      okType: 'danger',
      cancelText: '鍙栨秷',
      onOk() {
        return new Promise((resolve, reject) => {
          // 璋冪敤澶栭儴鍒犻櫎鍑芥暟
          onDelete(selectedRowKeys)
            .then(() => {
              message.success('鍒犻櫎鎴愬姛')
              // 閲嶇疆閫夋嫨鐘舵€?
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
        console.log('鍙栨秷鍒犻櫎')
      },
    })
  }
  
  // 鍙栨秷閫夋嫨
  const handleCancel = () => {
    setSelectedRowKeys([])
  }
  
  // 鑷畾涔夐€夋嫨鍒?
  const selectionColumn = showSelectionColumn ? {
    title: showIndex ? <Checkbox
      checked={selectedRowKeys.length === dataSource.length}
      onChange={(e) => {
        if (e.target.checked) {
          // 鍏ㄩ€?          setSelectedRowKeys(dataSource.map(item => item[rowKey]))
        } else {
          // 鍙栨秷鍏ㄩ€?          setSelectedRowKeys([])
        }
      }}
      style={{ margin: 0 }}
    /> : '',
    key: 'selection',
    width: showIndex ? 32 : 24, // 鍥哄畾瀹藉害锛屾濂芥樉绀篶heckbox
    minWidth: showIndex ? 32 : 24,
    maxWidth: 36,
    align: 'center',
    // 閫夋嫨鍒椾笉闇€瑕佽皟鏁村搴?    resizable: false,
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
  } : null
  
  // 楠岃瘉锛氭鏌ユ槸鍚﹀凡鏈夊寘鍚玞heckbox鐨勫垪锛岀‘淇濇瘡琛屽彧鏈変竴涓閫夋
  useEffect(() => {
    // 妫€鏌ヤ紶鍏ョ殑columns涓槸鍚﹀凡鏈夊寘鍚玞heckbox鐨勫垪
    const hasCheckboxColumn = columns.some(column => {
      // 妫€鏌ュ垪鐨剅ender鍑芥暟鏄惁杩斿洖Checkbox缁勪欢
      if (column.render) {
        // 绠€鍗曟鏌ender鍑芥暟鐨勫瓧绗︿覆琛ㄧず涓槸鍚﹀寘鍚獵heckbox
        // 鏇村鏉傜殑妫€鏌ュ彲鑳介渶瑕佽繍琛屾椂妫€鏌ワ紝浣嗚繖浼氬奖鍝嶆€ц兘
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
  
  // 瀹炵幇灞曞紑琛屾覆鏌撳嚱鏁帮紝鐢ㄤ簬鏄剧ず涓嬫媺鍒楋紝浼樺寲绉诲姩绔綋楠?
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
            }}>璇︾粏淇℃伅</h4>
            
            {/* 浣跨敤琛ㄦ牸褰㈠紡灞曠ず閿€煎 */}
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
                  // 鑾峰彇鍒楁暟鎹紝鏀寔宓屽璺緞濡?['data', 'column_name']
                  let value = record;
                  const dataIndex = Array.isArray(column.dataIndex) ? column.dataIndex : [column.dataIndex];
                  
                  for (const key of dataIndex) {
                    if (value === null || value === undefined) break;
                    value = value[key];
                  }
                  
                  // 澶勭悊鍊煎拰閾炬帴淇℃伅
                  let displayValue = value !== null && value !== undefined ? value : '-';
                  let finalContent = displayValue;
                  let valueForEvent = displayValue;
                  
                  // 妫€鏌ユ暟鎹槸鍚﹀寘鍚摼鎺ヤ俊鎭?
                  if (typeof displayValue === 'object' && displayValue !== null) {
                    if (displayValue._storage) {
                      valueForEvent = displayValue._text || '点击查看位置'
                      const positions = displayValue._positions || []
                      if (positions.length > 0) {
                        const firstPos = positions[0]
                        const highlight = positions.map(p => `${p.row},${p.col}`).join('|')
                        finalContent = (
                          <a
                            href={`/cryo-box/${firstPos.box_id}/grid`}
                            onClick={(e) => {
                              e.preventDefault()
                              localStorage.setItem('cryoHighlight', highlight)
                              window.location.href = `/cryo-box/${firstPos.box_id}/grid`
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
                            {displayValue._text || '点击查看位置'}
                          </a>
                        )
                      } else {
                        finalContent = (
                          <span style={{
                            color: '#1890ff',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            display: 'inline-block',
                            width: '100%',
                            boxSizing: 'border-box',
                            wordBreak: 'break-word',
                            overflow: 'hidden'
                          }}>
                            {displayValue._text || '点击查看位置'}
                          </span>
                        )
                      }
                    } else
                    // 濡傛灉鏁版嵁鏄寘鍚摼鎺ヤ俊鎭殑瀵硅薄 { _text: '鍘熷鏂囨湰', _link: '閾炬帴URL' }
                    if (displayValue._text && displayValue._link) {
                      valueForEvent = displayValue._text;
                      
                      // 妫€鏌ラ摼鎺ユ槸鍚︿负琛ㄦ牸閾炬帴
                      const isTableLink = displayValue._link.startsWith('table:');
                      
                      if (isTableLink) {
                        // 澶勭悊琛ㄦ牸閾炬帴锛屾牸寮忥細table:{targetTableId}:{targetRowId}
                        finalContent = (
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault(); // 闃绘榛樿鐨刪ref璺宠浆
                              const [, targetTableId, targetRowId] = displayValue._link.split(':');
                              if (targetTableId && targetRowId) {
                                // 璺宠浆鍒扮洰鏍囪〃鏍?
                                localStorage.setItem('selectedTableId', targetTableId);
                                // 淇濆瓨闇€瑕佸睍寮€鐨勮ID鍜岀洰鏍囪〃鏍糏D
                                localStorage.setItem('autoExpandInfo', JSON.stringify({
                                  tableId: parseInt(targetTableId),
                                  rowId: parseInt(targetRowId)
                                }));
                                // 鍒锋柊椤甸潰
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
                        // 澶勭悊鏅€氱綉椤甸摼鎺?
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
                    // 濡傛灉鏄櫘閫氬瓧绗︿覆锛岀洿鎺ヤ娇鐢?
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
                            // 浼犻€掑師濮媣alue缁欎簨浠跺鐞嗗嚱鏁帮紝纭繚selectedCellValue鏄璞?
                            handleContextMenu(e, value, record, column)
                          }}
                          onTouchStart={(e) => {
                            // 浼犻€掑師濮媣alue缁欎簨浠跺鐞嗗嚱鏁帮紝纭繚selectedCellValue鏄璞?
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
  
  // 鏍煎紡鍖栨棩鏈燂紝鍙樉绀哄勾鏈堟棩
  const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    // 鍖归厤 YYYY-MM-DD 鏍煎紡
    const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : dateString;
  };

  // 鍚堝苟鍒楅厤缃紝纭繚鑷冲皯鏈夐€夋嫨鍒?
  const mergedColumns = [
    ...(selectionColumn ? [selectionColumn] : []),
    ...(() => {
      const resultColumns = []
      // 鑾峰彇褰撳墠琛ㄦ牸ID
      const tableId = dataSource.length > 0 ? dataSource[0].table_id : 'default'
      // 鑾峰彇褰撳墠琛ㄦ牸鐨勫瓧绗﹂暱搴︽樉绀洪厤缃?
      const tableConfig = showCharacterLengthColumns[tableId] || {}
      
      // 閬嶅巻鎵€鏈夊垪
      columns.forEach(column => {
        const columnKey = column.key || column.dataIndex
        const calculatedWidth = columnWidths[columnKey]
        
        // 鍒涘缓鍓湰浠ラ伩鍏嶄慨鏀瑰師閰嶇疆
        let newColumn = { 
          ...column,
          // 娣诲姞鍒楀鎷栧姩鍔熻兘
          resizable: true,
          // 搴旂敤淇濆瓨鐨勫垪瀹?
          width: calculatedWidth || column.width
        }
        
        // 妫€鏌ユ槸鍚︿负鍒涘缓鏃堕棿鍒楋紝鍙樉绀烘棩鏈?
        const isCreateTimeColumn = [
          '鍒涘缓鏃堕棿', 'createTime', 'created_at', 'create_at', '鍒涘缓鏃ユ湡', 'date'
        ].includes(columnKey) || 
        [
          '鍒涘缓鏃堕棿', '鍒涘缓鏃ユ湡', '鏃ユ湡'
        ].includes(column.title)
      
      // 淇濆瓨鍘熷render鍑芥暟
      const originalRender = column.render
      
      // 涓鸿〃澶存坊鍔犲彸閿彍鍗?
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
      
      // 閲嶅啓render鍑芥暟锛屾坊鍔犲彸閿彍鍗曞拰闀挎寜鍔熻兘
      newColumn.render = (text, record) => {
        let displayContent = text
        let value = text
        
        // 鑾峰彇瀹為檯鍊?
        let actualValue = text
        if (Array.isArray(column.dataIndex) && column.dataIndex.length > 1) {
          // 瀵逛簬宓屽鏁版嵁绱㈠紩锛屽['data', 'column_name']锛岃幏鍙栧叿浣撳垪鍊?
          let tempValue = record
          for (const key of column.dataIndex) {
            if (tempValue === null || tempValue === undefined) break
            tempValue = tempValue[key]
          }
          actualValue = tempValue
        } else if (column.dataIndex) {
          // 瀵逛簬鐩存帴鏁版嵁绱㈠紩锛岀洿鎺ヨ幏鍙栧€?
          actualValue = record[column.dataIndex]
        }
        
        // 淇濆瓨鐢ㄤ簬浜嬩欢澶勭悊鐨勫疄闄呭€?
        let valueForEvent = actualValue
        // 濡傛灉鏄摼鎺ュ璞★紝鍙娇鐢ㄦ枃鏈儴鍒?
        if (typeof actualValue === 'object' && actualValue !== null && actualValue._text) {
          valueForEvent = actualValue._text
        }
        
        // 濡傛灉鏈夊師濮媟ender鍑芥暟锛屽厛璋冪敤瀹?
        if (originalRender) {
          const rendered = originalRender(text, record)
          if (rendered && typeof rendered === 'string') {
            displayContent = rendered
            valueForEvent = rendered
          } else if (rendered && React.isValidElement(rendered)) {
            // 濡傛灉鏄疪eact鍏冪礌锛屽皢鍏朵綔涓哄瓙鍏冪礌
            displayContent = rendered
          } else if (typeof rendered === 'object' && rendered !== null) {
            // 濡傛灉鏄璞★紝鍙兘鏄摼鎺ュ璞★紝鐩存帴浣跨敤
            displayContent = rendered
            // 鏇存柊valueForEvent锛岀‘淇濇槸鏂囨湰
            if (rendered._text) {
              valueForEvent = rendered._text
            } else {
              valueForEvent = String(rendered)
            }
          }
        } else {
          // 濡傛灉娌℃湁鍘熷render鍑芥暟锛屽鐞哸ctualValue
          if (typeof actualValue === 'object' && actualValue !== null) {
            // 濡傛灉鏄摼鎺ュ璞★紝鐩存帴浣跨敤鏁翠釜瀵硅薄锛屼互渚垮悗缁鐞?
            if (actualValue._text && actualValue._link) {
              displayContent = actualValue
              valueForEvent = actualValue._text
            } else {
              // 濡傛灉鏄櫘閫氬璞★紝杞崲涓哄瓧绗︿覆
              displayContent = String(actualValue)
              valueForEvent = String(actualValue)
            }
          } else {
            // 濡傛灉鏄熀鏈被鍨嬶紝鐩存帴浣跨敤
            displayContent = actualValue
            valueForEvent = String(actualValue)
          }
        }
        
        // 鏍煎紡鍖栨棩鏈燂紝鍙樉绀哄勾鏈堟棩
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
        
        // 妫€鏌ユ暟鎹槸鍚﹀寘鍚摼鎺ヤ俊鎭?
        let finalContent = displayContent
        
        // 澶勭悊閾炬帴淇℃伅
        if (typeof displayContent === 'object' && displayContent !== null) {
          // 濡傛灉鏄疪eact鍏冪礌锛岀洿鎺ヤ娇鐢?
          if (React.isValidElement(displayContent)) {
            finalContent = displayContent
          } else if (displayContent._text && displayContent._link) {
            // 濡傛灉鏁版嵁鏄寘鍚摼鎺ヤ俊鎭殑瀵硅薄 { _text: '鍘熷鏂囨湰', _link: '閾炬帴URL' }
            valueForEvent = displayContent._text
            
            // 妫€鏌ラ摼鎺ユ槸鍚︿负琛ㄦ牸閾炬帴
            const isTableLink = displayContent._link.startsWith('table:');
            
            if (isTableLink) {
              // 澶勭悊琛ㄦ牸閾炬帴锛屾牸寮忥細table:{targetTableId}:{targetRowId}
              finalContent = (
                <a
                  href="#"
                    onClick={(e) => {
                      e.preventDefault(); // 闃绘榛樿鐨刪ref璺宠浆
                      const [, targetTableId, targetRowId] = displayContent._link.split(':');
                      if (targetTableId && targetRowId) {
                        // 璺宠浆鍒扮洰鏍囪〃鏍?
                        localStorage.setItem('selectedTableId', targetTableId);
                        // 淇濆瓨闇€瑕佸睍寮€鐨勮ID鍜岀洰鏍囪〃鏍糏D
                        localStorage.setItem('autoExpandInfo', JSON.stringify({
                          tableId: parseInt(targetTableId),
                          rowId: parseInt(targetRowId)
                        }));
                        // 鍒锋柊椤甸潰
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
              // 澶勭悊鏅€氱綉椤甸摼鎺?
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
            // 濡傛灉鏄櫘閫氬璞★紝杞崲涓哄瓧绗︿覆
            valueForEvent = String(displayContent)
            finalContent = String(displayContent)
          }
        } else if (displayContent === null || displayContent === undefined) {
          // 濡傛灉鏄痭ull鎴杣ndefined锛屾樉绀虹┖瀛楃涓?
          valueForEvent = '-'
          finalContent = '-'
        }
        
        // 娣诲姞鍙抽敭鑿滃崟鍜岄暱鎸夊姛鑳?
        return (
          <div
            onContextMenu={(e) => {
              // 浼犻€掑師濮媋ctualValue缁欎簨浠跺鐞嗗嚱鏁帮紝纭繚selectedCellValue鏄璞?
              handleContextMenu(e, actualValue, record, column)
            }}
            onTouchStart={(e) => {
              // 浼犻€掑師濮媋ctualValue缁欎簨浠跺鐞嗗嚱鏁帮紝纭繚selectedCellValue鏄璞?
              handleLongPressStart(e, actualValue, record, column)
            }}
            onTouchEnd={handleLongPressEnd}
            onTouchCancel={handleLongPressEnd}
            style={{ 
              cursor: typeof displayContent === 'object' && displayContent?._link ? 'pointer' : 'default',
              userSelect: 'none',
              // 纭繚鏁翠釜鍗曞厓鏍奸兘鑳藉搷搴斾簨浠?
              width: '100%',
              height: '100%',
              display: 'inline-block',
              // 纭繚鍐呭灞呬腑
              textAlign: 'left',
              // 纭繚鍐呭鑳芥纭崲琛?
              wordBreak: 'break-word'
            }}
          >
            {finalContent}
          </div>
        )
      }
      
      if (isCreateTimeColumn) {
        // 搴旂敤鍔ㄦ€佽绠楃殑瀹藉害锛屼笉鍐嶅浐瀹?
        if (calculatedWidth) {
          newColumn.width = calculatedWidth
          newColumn.minWidth = Math.max(calculatedWidth, 80) // 鏈€灏忓搴?0px
          newColumn.maxWidth = Math.min(calculatedWidth * 1.2, 150) // 鏈€澶у搴?50px
        }
      } else if (columnKey === 'action' || column.title === '鎿嶄綔') {
        // 澶勭悊鎿嶄綔鍒楋紝淇濈暀浼犲叆鐨勫搴﹁缃紝涓嶈鐩?
        newColumn.className = 'action-column' // 娣诲姞action-column绫诲悕锛屾柟渚緾SS閫夋嫨鍣ㄥ畾浣?
      }
      
      // 搴旂敤鍔ㄦ€佽绠楃殑瀹藉害锛屼絾涓嶈鐩栨搷浣滃垪鐨勮缃?
      if (calculatedWidth && !(columnKey === 'action' || column.title === '鎿嶄綔')) {
        newColumn.width = calculatedWidth
        newColumn.minWidth = calculatedWidth
        newColumn.maxWidth = calculatedWidth * 1.2 // 鍏佽涓€瀹氱殑鎵╁睍绌洪棿
      }
      
      // 妫€鏌ユ槸鍚﹂渶瑕佸湪褰撳墠鍒楀墠娣诲姞瀛楃闀垮害鍒?
      if (tableConfig[columnKey]) {
        // 娣诲姞瀛楃闀垮害鍒?
        const lengthColumn = {
          title: '长度',
          key: `${columnKey}_length`,
          width: 60,
          minWidth: 50,
          maxWidth: 70,
          align: 'center',
          // 娣诲姞鏍峰紡锛屼娇鑳屾櫙鑹蹭负娴呰摑鑹?
          className: 'character-length-column',
          render: (text, record) => {
            // 鑾峰彇瀵瑰簲鍒楃殑鍊?
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
            
            // 璁＄畻trim鍚庣殑闀垮害
            let textValue = ''
            if (typeof actualValue === 'object' && actualValue !== null) {
              // 濡傛灉鏄摼鎺ュ璞★紝浣跨敤鏂囨湰閮ㄥ垎
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
      
      // 娣诲姞褰撳墠鍒楀埌缁撴灉鏁扮粍
      resultColumns.push(newColumn)
    })
    
    return resultColumns
  })()
  ]
  
  return (
    <>
      {/* 鍒犻櫎鎻愮ず鍖哄煙 */}
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
            宸查€変腑 {selectedRowKeys.length} 椤癸紝纭畾瑕佸垹闄ゅ悧锛?
          </div>
          <Space>
            <Button onClick={handleCancel} style={{ marginRight: '8px' }}>
              鍙栨秷
            </Button>
            <Button 
              type="primary" 
              danger 
              onClick={handleDelete}
              loading={deleteLoading}
            >
              纭鍒犻櫎
            </Button>
          </Space>
        </div>
      )}
      
      {/* 鍙抽敭鑿滃崟 */}
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
        {/* 閫忔槑鐨勮Е鍙戝厓绱狅紝鐢ㄤ簬瀹氫綅 */}
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
      
      {/* 绉诲姩绔暱鎸夎彍鍗?*/}
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
      
      {/* 琛ㄥご鍙抽敭鑿滃崟 */}
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
      
      {/* 閾炬帴杈撳叆妯℃€佹 */}
      <Modal
        title="链接到网页"
        open={linkModalVisible}
        onOk={handleLinkSave}
        onCancel={handleLinkCancel}
        okText="纭畾"
        cancelText="鍙栨秷"
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
            <li>支持 HTTP 和 HTTPS 协议</li>
            <li>如果不输入协议，默认添加 https:// 前缀</li>
            <li>点击确定后，单元格文字将变为可点击链接</li>
          </ul>
        </div>
      </Modal>
      

      

      
      {/* 閾炬帴鍒拌〃鏍兼ā鎬佹 */}
      <Modal
        title="链接到表格"
        open={linkToTableModalVisible}
        onOk={handleLinkToTableSave}
        onCancel={handleLinkToTableCancel}
        okText="纭畾"
        cancelText="鍙栨秷"
        width={800}
        // 鍙湁閫変腑浜嗙洰鏍囪鎵嶈兘纭畾
        okButtonProps={{
          disabled: !selectedTargetRow
        }}
      >
        {/* 琛ㄦ牸閫夋嫨涓嬫媺鑿滃崟 */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            请选择要链接的表格：
          </p>
          <Select
            placeholder="选择表格"
            value={selectedTargetTable}
            onChange={(value) => {
              setSelectedTargetTable(value)
              // 娓呯┖涔嬪墠鐨勯€夋嫨
              setSelectedTargetRow(null)
              // 鍔犺浇鐩爣琛ㄦ牸鏁版嵁
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
          
          {/* 鐩爣琛ㄦ牸鏁版嵁灞曠ず */}
          {selectedTargetTable && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                璇烽€夋嫨瑕侀摼鎺ョ殑琛岋細
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
                      // 鐢熸垚鍒楅厤缃紝浣跨敤鐩爣琛ㄦ牸鐨勫垪椤哄簭
                      columns={[
                        // 閫夋嫨鍒?
                        {
                          title: '閫夋嫨',
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
                        // ID鍒?
                        {
                          title: 'ID',
                          dataIndex: 'id',
                          width: 80,
                          sorter: (a, b) => a.id - b.id
                        },
                        // 鍒涘缓鏃堕棿鍒?
                        {
                          title: '鍒涘缓鏃堕棿',
                          dataIndex: 'created_at',
                          width: 150,
                          render: (text) => {
                            if (text) {
                              return new Date(text).toLocaleString()
                            }
                            return '-'
                          }
                        },
                        // 鏁版嵁鍒楋紝浣跨敤鐩爣琛ㄦ牸鐨勫垪閰嶇疆
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
                              // 濡傛灉鏄摼鎺ュ璞★紙鍖呭惈_text鍜宊link灞炴€э級锛屽彧鏄剧ず_text鍊?
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
                      {targetTableLoading ? '鍔犺浇涓?..' : '鏆傛棤鏁版嵁'}
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
            <li>选择表格后将显示该表格的前 10 条数据</li>
            <li>只能够选择一行数据进行链接</li>
            <li>点击确定后，单元格文字将变为可点击链接</li>
            <li>点击链接后将跳转到对应表格并展开该行</li>
          </ul>
        </div>
      </Modal>
      
      {/* 鏁版嵁鍒楄〃 - 娣诲姞绌烘暟鎹鐞?*/}
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
            {loading ? '鏁版嵁鍔犺浇涓?..' : '鏆傛棤鏁版嵁'}
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
            // 鑷畾涔夎鏍峰紡
            rowClassName={(record) => {
              let className = ''
              if (selectedRowKeys.includes(record[rowKey])) {
                className += 'selected-row '
              }
              if (highlightedRowId === record[rowKey]) {
                console.log('[楂樹寒璋冭瘯] 搴旂敤highlighted-row绫诲悕鍒拌ID:', record[rowKey])
                className += 'highlighted-row '
              }
              return className.trim()
            }}
            // 娣诲姞CSS鏍峰紡
            style={{
              borderRadius: selectedRowKeys.length > 0 ? '0 0 8px 8px' : '8px',
              width: 'auto',
              minWidth: '100%'
            }}
            // 鑷€傚簲瀹藉害閰嶇疆
            scroll={{
              x: 'max-content' // 璁╄〃鏍兼牴鎹唴瀹硅嚜鍔ㄨ皟鏁村搴?
            }}
            // 鍒楀鎷栧姩浜嬩欢澶勭悊
            onColumnResize={(resizeInfo) => {
              const { width, columnKey } = resizeInfo
              if (columnKey) {
                setColumnWidths(prev => ({
                  ...prev,
                  [columnKey]: width
                }))
              }
            }}
            // 灞曞紑琛岄厤缃?
            expandable={{
              ...expandable,
              expandedRowRender: expandable.expandedRowRender || expandedRowRender,
              rowExpandable: expandable.rowExpandable || ((record) => hiddenColumns.length > 0),
              showExpandColumn: expandable.showExpandColumn !== undefined
                ? expandable.showExpandColumn
                : hiddenColumns.length > 0
            }}
          />
        </div>
      )}
      
      {/* 鍏ㄥ眬鏍峰紡 - 浼樺寲甯冨眬鍜岃瑙夋晥鏋?*/}
      <style>{`
        /* 琛ㄦ牸瀹瑰櫒鏍峰紡 */
        .ant-table {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #f0f0f0;
          width: auto !important;
          min-width: 100%;
        }
        
        /* 瀛楃闀垮害鍒楁牱寮?- 纭繚鏁村垪缁熶竴棰滆壊 */
        /* 浣跨敤鏇村叿浣撶殑閫夋嫨鍣紝纭繚瑕嗙洊Ant Design榛樿鏍峰紡 */
        .ant-table .ant-table-thead > tr > th.ant-table-cell.character-length-column,
        .ant-table .ant-table-tbody > tr > td.ant-table-cell.character-length-column {
          background-color: #e6f7ff !important;
          font-weight: 500;
        }
        
        /* 纭繚琛屽鍋舵€т笉浼氬奖鍝嶅瓧绗﹂暱搴﹀垪鐨勮儗鏅壊 */
        /* 澶勭悊Ant Design鐨勮濂囧伓鏍峰紡 */
        .ant-table .ant-table-tbody > tr.ant-table-row:nth-child(even) > td.ant-table-cell.character-length-column,
        .ant-table .ant-table-tbody > tr.ant-table-row.ant-table-row-even > td.ant-table-cell.character-length-column {
          background-color: #e6f7ff !important;
        }
        
        /* 鍒犻櫎table-wrapper鏍峰紡 */
        .table-wrapper {
          all: unset;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          display: block !important;
        }
        
        /* 纭繚table-wrapper涓嶄細褰卞搷鍐呴儴琛ㄦ牸 */
        .table-wrapper > * {
          all: unset;
          width: auto !important;
          min-width: 100%;
          box-sizing: border-box !important;
        }
        
        /* 琛ㄦ牸鍐呭瀹瑰櫒鏍峰紡 */
        .ant-table-content {
          width: auto !important;
          overflow: visible !important;
        }
        
        /* 琛ㄦ牸鍏冪礌鏍峰紡 */
        .ant-table table {
          width: auto !important;
          min-width: 100%;
          table-layout: auto !important;
        }
        
        /* 纭繚琛ㄦ牸瀹瑰櫒鍙互妯悜鎷栧姩骞崇Щ */
        .ant-table-container {
          width: auto !important;
          min-width: 100%;
          overflow-x: auto !important;
          /* 鍏佽PC绔紶鏍囨嫋鍔ㄥ钩绉?*/
          scroll-behavior: smooth;
          /* 娣诲姞PC绔嫋鍔ㄦ敮鎸?*/
          -webkit-overflow-scrolling: touch;
          /* 闅愯棌婊氬姩鏉′絾淇濈暀婊氬姩鍔熻兘 */
          scrollbar-width: thin;
          scrollbar-color: rgba(24, 144, 255, 0.5) transparent;
        }
        
        /* 涓篜C绔坊鍔犻紶鏍囨嫋鍔ㄥ钩绉绘牱寮?*/
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
        
        /* 纭繚琛ㄦ牸鍐呭鍖哄煙鍙互鎷栧姩 */
        .ant-table-content {
          overflow: visible !important;
        }
        
        /* 琛ㄦ牸鍝嶅簲寮忔牱寮?*/
        @media (max-width: 768px) {
          .ant-table {
            font-size: 12px;
            width: 100%;
            table-layout: fixed;
          }
          
          /* 纭繚琛ㄦ牸瀹瑰櫒鍙互妯悜婊氬姩 */
          .ant-table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            margin: 0;
            padding: 0;
            width: 100%;
            box-sizing: border-box;
          }
          
          /* 浼樺寲琛ㄦ牸鍒楁牱寮忥紝涓嶆樉绀虹渷鐣ュ彿 */
          .ant-table-thead > tr > th,
          .ant-table-tbody > tr > td {
            padding: 8px 8px;
            white-space: nowrap;
            overflow: visible;
            text-overflow: clip;
          }
          
          /* 閫夋嫨鍒楋紙checkbox鍒楋級鐗规畩澶勭悊 */
          .ant-table-thead > tr > th:first-child,
          .ant-table-tbody > tr > td:first-child {
            /* 缁ф壙JavaScript璁剧疆鐨勫搴︼紝涓嶅浐瀹?*/
            width: inherit !important;
            min-width: inherit !important;
            max-width: inherit !important;
            text-align: center;
            padding: 0;
          }
          
          /* 涓烘椂闂村垪璁剧疆鍚堥€傚搴?- 鍏佽鑷€傚簲 */
          .ant-table-thead > tr > th:nth-child(2),
          .ant-table-tbody > tr > td:nth-child(2) {
            /* 鏃堕棿鍒?- 缁ф壙JavaScript璁剧疆鐨勫搴?*/
            width: inherit !important;
            min-width: inherit !important;
            max-width: inherit !important;
          }
          
          /* 鎿嶄綔鍒楃壒娈婂鐞?*/
          .ant-table-thead > tr > th:last-child,
          .ant-table-tbody > tr > td:last-child {
            /* 鎿嶄綔鍒?*/
            min-width: 180px;
            width: 200px;
          }
          
          /* 鏁版嵁鍒楄缃悎閫傚搴?*/
          .ant-table-thead > tr > th:not(:first-child):not(:nth-child(2)):not(:last-child),
          .ant-table-tbody > tr > td:not(:first-child):not(:nth-child(2)):not(:last-child) {
            width: 200px;
            min-width: 120px;
            max-width: 300px;
          }
          
          /* 鎿嶄綔鎸夐挳閫傞厤 */
          .ant-btn {
            padding: 4px 8px;
            font-size: 11px;
            min-width: 50px;
          }
        }
        
        /* 琛ㄦ牸澶撮儴鏍峰紡 */
        .ant-table-thead > tr > th {
          background-color: #fafafa;
          border-bottom: 2px solid #e8e8e8;
          font-weight: 600;
          font-size: 14px;
          color: #333;
          padding: 12px 16px;
          transition: all 0.2s ease;
        }
        
        /* checkbox鍒楃壒娈婂鐞?- 闈炲獟浣撴煡璇?*/
        .ant-table-thead > tr > th:first-child,
        .ant-table-tbody > tr > td:first-child {
          /* checkbox鍒?- 鍙樉绀篶heckbox鏈韩瀹藉害 */
          width: 28px !important;
          min-width: 28px !important;
          max-width: 30px !important;
          padding: 8px 4px !important;
          text-align: center;
        }
        
        /* 鍏ㄩ€塩heckbox璋冩暣 */
        .ant-table-thead > tr > th:first-child .ant-checkbox {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* 琛ㄦ牸琛屾牱寮?- 琛岄珮鍙樹负鍘熸潵鐨?/4 */
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
        
        /* 涓烘搷浣滃垪娣诲姞鐗规畩鏍峰紡锛岄伩鍏嶇渷鐣ュ彿鏄剧ず */
        .ant-table .ant-table-tbody > tr > td:last-child,
        .ant-table .ant-table-tbody > tr > td.action-column {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        /* 绉婚櫎鎵€鏈夊睍寮€鍥炬爣鐩稿叧鐨勮嚜瀹氫箟鏍峰紡锛岃Ant Design榛樿鏍峰紡鐢熸晥 */
        
        /* 琛ㄦ牸澶撮儴鏍峰紡 - 琛岄珮鍙樹负鍘熸潵鐨?/4 */
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
        
        /* 楂樹寒琛屽姩鐢绘晥鏋?*/
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
        
        /* 楂樹寒琛屾牱寮?- 绠€鍖栦负钃濊壊杈规妗嗕綇鏁磋 */
        .ant-table-tbody > tr.highlighted-row {
          animation: highlightFlash 1s ease-in-out 2 !important;
          animation-fill-mode: both !important;
        }
        
        /* 楂樹寒琛屽崟鍏冩牸鏍峰紡 - 鍙繚鐣欒摑鑹茶竟妗嗭紝鍘绘帀鑳屾櫙鑹插拰鍐呴槾褰?*/
        .ant-table-tbody > tr.highlighted-row > td {
          border-color: #1890ff !important;
          border-width: 2px !important;
          background-color: transparent !important;
        }
        
        /* 绗竴涓崟鍏冩牸娣诲姞宸﹁竟妗?*/
        .ant-table-tbody > tr.highlighted-row > td:first-child {
          border-left: 2px solid #1890ff !important;
          border-radius: 4px 0 0 4px !important;
        }
        
        /* 鏈€鍚庝竴涓崟鍏冩牸娣诲姞鍙宠竟妗?*/
        .ant-table-tbody > tr.highlighted-row > td:last-child {
          border-right: 2px solid #1890ff !important;
          border-radius: 0 4px 4px 0 !important;
        }
        
        /* 鎵€鏈変腑闂村崟鍏冩牸纭繚鏈変笂涓嬭竟妗?*/
        .ant-table-tbody > tr.highlighted-row > td {
          border-top: 2px solid #1890ff !important;
          border-bottom: 2px solid #1890ff !important;
        }
        
        /* 涓烘搷浣滃垪琛ㄥご娣诲姞鐗规畩鏍峰紡锛岄伩鍏嶇渷鐣ュ彿鏄剧ず */
        .ant-table .ant-table-thead > tr > th:last-child,
        .ant-table .ant-table-thead > tr > th.action-column {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        /* 涓哄睍寮€鎸夐挳鍒楁坊鍔犵壒娈婃牱寮忥紝閬垮厤鐪佺暐鍙锋樉绀?*/
        .ant-table .ant-table-tbody > tr > td.ant-table-row-expand-icon-cell {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        /* 涓哄睍寮€鎸夐挳鍒楄〃澶存坊鍔犵壒娈婃牱寮忥紝閬垮厤鐪佺暐鍙锋樉绀?*/
        .ant-table .ant-table-thead > tr > th.ant-table-row-expand-icon-cell {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        /* 纭繚琛岄珮搴旂敤鍒版墍鏈夎〃鏍艰 */
        .ant-table tr {
          height: auto !important;
        }
        
        /* 纭繚琛岄珮搴旂敤鍒版墍鏈夎〃鏍煎崟鍏冩牸 */
        .ant-table td,
        .ant-table th {
          padding-top: 9px !important;
          padding-bottom: 9px !important;
          line-height: 1.3 !important;
        }
        
        /* 琛ㄦ牸琛屾偓鍋滄晥鏋?- 缁熶竴鎮仠鏍峰紡 */
        .ant-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f7fa !important;
        }
        
        /* 琛ㄦ牸浜ゆ浛琛岄鑹?- 楂樼骇娴呰壊璋?*/
        /* 閲嶈锛氫氦鏇胯棰滆壊鏄父鎬侊紝搴旂敤鍒版墍鏈夋湭閫変腑鐨勬暟鎹 */
        /* 浣跨敤鐩存帴鐨勯€夋嫨鍣紝纭繚鑳借鐩栭粯璁ゆ牱寮?*/
        .ant-table .ant-table-tbody > tr:not(.selected-row):nth-child(even) > td {
          background-color: #fafbfc !important;
          transition: background-color 0.2s ease;
        }
        
        /* 纭繚鎮仠鏁堟灉姝ｅ父 */
        .ant-table .ant-table-tbody > tr:not(.selected-row):nth-child(even):hover > td {
          background-color: #f5f7fa !important;
        }
        
        /* 纭繚灞曞紑琛屼笉褰卞搷浜ゆ浛棰滆壊搴忓垪 */
        .ant-table .ant-table-tbody > tr.ant-table-row-expandable + tr:not(.selected-row):nth-child(odd) > td {
          background-color: #fafbfc !important;
        }
        
        /* 閫変腑琛屾牱寮忎紭鍖?*/
        /* 閲嶈锛氶€変腑琛岃儗鏅壊涓庣孩鑹茶鍛婂尯鍩熶竴鑷?*/
        .ant-table .ant-table-tbody .selected-row > td {
          background-color: #fff3f3 !important; /* 涓庣孩鑹茶鍛婂尯鍩熻儗鏅壊涓€鑷?*/
          border-left: none !important; /* 绉婚櫎鎵€鏈夊崟鍏冩牸鐨勫乏杈规 */
          transition: all 0.2s ease;
        }
        
        /* 鍙粰閫変腑琛岀殑绗竴鍒楁坊鍔犲乏杈规 */
        .ant-table .ant-table-tbody .selected-row > td:first-child {
          border-left: 4px solid #ff4d4f !important; /* 鍙湪绗竴鍒楁坊鍔犵孩鑹茶竟妗?*/
        }
        
        /* 纭繚閫変腑琛屾偓鍋滄晥鏋滄甯?*/
        .ant-table .ant-table-tbody .selected-row:hover > td {
          background-color: #ffe6e6 !important;
        }
        
        /* 澶嶉€夋鏍峰紡浼樺寲 */
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
        
        /* 绉诲姩绔閫夋鐗规畩浼樺寲 */
        @media (max-width: 768px) {
          .ant-checkbox {
            transform: scale(0.9);
          }
          
          .ant-checkbox-inner {
            width: 14px;
            height: 14px;
          }
        }
        
        /* 鍒犻櫎鎸夐挳鏍峰紡浼樺寲 */
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
        
        /* 鎿嶄綔鎸夐挳缁熶竴鏍峰紡 - 缂╁皬鍒板師鏉ョ殑2/3 */
        .action-button {
          border-radius: 4px;
          font-weight: 500;
          transition: all 0.3s ease;
          font-size: 11px; /* 缂╁皬鍒板師鏉ョ殑2/3 */
          padding: 3px 6px; /* 缂╁皬鍒板師鏉ョ殑2/3 */
          margin: 0 1px; /* 闂磋窛缂╁皬鍒板師鏉ョ殑1/3 */
          min-width: 47px; /* 缂╁皬鍒板師鏉ョ殑2/3 */
        }
        
        /* 缂栬緫鎸夐挳hover鏁堟灉 */
        .action-button.ant-btn-primary:hover {
          background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
          border-color: #1890ff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
        }
        
        /* 鍒犻櫎鎸夐挳hover鏁堟灉 */
        .action-button.ant-btn-danger:hover {
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
          border-color: #ff4d4f;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
        }
        
        /* 灞曞紑/鏀惰捣鎸夐挳hover鏁堟灉 */
        .action-button.ant-btn-default:hover {
          background: linear-gradient(135deg, #f0f0f0 0%, #d9d9d9 100%);
          border-color: #d9d9d9;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        /* 鎿嶄綔鍒楀搷搴斿紡璁捐 - 纭繚濮嬬粓鑳藉绾虫搷浣滄寜閽?*/
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
          /* 鎿嶄綔鍒楅€傞厤绉诲姩绔?*/
          .ant-table .ant-table-column-has-filters.action-column {
            width: 220px !important;
            min-width: 220px;
          }
          
          /* 鎸夐挳閫傞厤绉诲姩绔?*/
          .action-button {
            font-size: 10px;
            padding: 2px 6px;
            margin: 0 2px;
            width: auto;
            min-width: 60px;
            max-width: 80px;
          }
          
          /* Space瀹瑰櫒閫傞厤绉诲姩绔?*/
          .ant-space {
            flex-wrap: nowrap !important;
            justify-content: center;
            align-items: center;
          }
          
          /* 纭繚琛ㄦ牸鍙互妯悜婊氬姩 */
          .ant-table-container {
            overflow-x: auto;
          }
          
          /* 琛ㄦ牸琛岄珮閫傞厤绉诲姩绔?*/
          .ant-table-tbody > tr > td {
            padding: 6px 4px;
          }
          
          /* 閫夋嫨妗嗗ぇ灏忛€傞厤绉诲姩绔?*/
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
        
        /* 纭繚鎿嶄綔鍒楃┖闂村厖瓒?*/
        .ant-table .ant-table-column-has-filters.action-column {
          white-space: nowrap;
          overflow: hidden;
        }
        
        /* 灞曞紑琛岃繃娓″姩鐢?*/
        .ant-table-tbody > tr.expandable-row > td {
          padding: 0;
          border-bottom: 0;
        }
        
        .ant-table-tbody > tr.expandable-row + tr > td {
          border-top: 0;
        }
        
        /* 骞虫粦杩囨浮鏁堟灉 */
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
        
        /* 灞曞紑鍐呭鏍峰紡浼樺寲 */
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
        
        /* 闅愯棌鍒楃綉鏍煎竷灞€浼樺寲 */
        .expanded-hidden-columns > div {
          /* 浣跨敤flex甯冨眬鏇夸唬grid锛岄伩鍏嶅奖鍝嶈〃鏍煎搴?*/
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          /* 纭繚涓嶄細瓒呭嚭琛ㄦ牸瀹瑰櫒瀹藉害 */
          width: 100%;
          box-sizing: border-box;
        }
        
        /* 闅愯棌鍒楅」鏍峰紡浼樺寲 */
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
        
        /* 娣″叆鍔ㄧ敾 */
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
        
        /* 鍒嗛〉鏍峰紡浼樺寲 */
        .ant-pagination {
          margin-top: 20px;
          padding: 16px;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        /* 鎿嶄綔鍒楁寜閽牱寮?- 缂╁皬鍒板師鏉ョ殑2/3 */
        .action-button {
          border-radius: 4px;
          font-weight: 500;
          transition: all 0.3s ease;
          margin: 0 1px; /* 闂磋窛缂╁皬鍒板師鏉ョ殑1/3 */
          min-width: 47px; /* 缂╁皬鍒板師鏉ョ殑2/3 */
          text-align: center;
          font-size: 11px; /* 缂╁皬鍒板師鏉ョ殑2/3 */
          padding: 3px 6px; /* 缂╁皬鍒板師鏉ョ殑2/3 */
        }
        
        /* 鎿嶄綔鎸夐挳瀹瑰櫒Space闂磋窛缂╁皬鍒板師鏉ョ殑1/3 */
        .ant-table .ant-space {
          gap: 2px !important; /* 缂╁皬鍒板師鏉ョ殑1/3 */
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* 缂栬緫鎸夐挳hover鏁堟灉 */
        .ant-btn-primary.action-button:hover {
          background-color: #40a9ff;
          border-color: #40a9ff;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
        }
        
        /* 鍒犻櫎鎸夐挳hover鏁堟灉 */
        .ant-btn-danger.action-button:hover {
          background-color: #ff7875;
          border-color: #ff7875;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
        }
        
        /* 灞曞紑/鏀惰捣鎸夐挳hover鏁堟灉 */
        .ant-btn-default.action-button:hover {
          background-color: #f0f0f0;
          border-color: #d9d9d9;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* 鍝嶅簲寮忚璁?*/
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
          
          /* 鍝嶅簲寮忔搷浣滃垪 - 缂╁皬鍒板師鏉ョ殑1/2楂樺害 */
          .action-button {
            min-width: 35px; /* 缂╁皬鍒板師鏉ョ殑1/2 */
            font-size: 8px; /* 缂╁皬鍒板師鏉ョ殑1/2 */
            padding: 1.5px 4px !important; /* 缂╁皬鍒板師鏉ョ殑1/2 */
            margin: 0 1px !important; /* 闂磋窛缂╁皬鍒板師鏉ョ殑1/3 */
            height: auto !important;
            line-height: 1.1 !important;
          }
          
          /* 鍝嶅簲寮忔搷浣滃垪Space */
          .ant-space {
            justify-content: center;
            gap: 2px !important; /* 闂磋窛缂╁皬鍒板師鏉ョ殑1/3 */
          }
        }
        
        /* 瓒呭皬灞忓箷鍝嶅簲寮?- 缂╁皬鍒板師鏉ョ殑1/2楂樺害 */
        @media (max-width: 480px) {
          .action-button {
            min-width: 30px; /* 缂╁皬鍒板師鏉ョ殑1/2 */
            font-size: 7px; /* 缂╁皬鍒板師鏉ョ殑1/2 */
            padding: 1px 3px !important; /* 缂╁皬鍒板師鏉ョ殑1/2 */
            margin: 0 0.5px !important; /* 闂磋窛缂╁皬鍒板師鏉ョ殑1/3 */
            height: auto !important;
            line-height: 1 !important;
          }
        }
        
        /* 鏈€鍚庢坊鍔狅紝纭繚鍏锋湁鏈€楂樹紭鍏堢骇 - 杩涗竴姝ュ噺灏忛珮搴?*/
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
        
        /* 浣跨敤閫氱敤閫夋嫨鍣ㄥ尮閰嶆墍鏈夋搷浣滄寜閽?*/
        /* 瀹氫綅琛ㄦ牸涓殑Space缁勪欢 */
        .ant-table .ant-space {
          display: flex !important;
          align-items: center !important;
          gap: 2px !important;
        }
        
        /* 瀹氫綅Space缁勪欢涓殑鎸夐挳 */
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
        
        /* 纭繚鎸夐挳鍐呯殑鍥炬爣瀹瑰櫒鍙 */
        .ant-table .ant-space > .ant-space-item > button > span.ant-btn-icon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* 纭繚鍥炬爣鍙 */
        .ant-table .ant-space > .ant-space-item > button > span.ant-btn-icon > span.anticon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        /* 纭繚SVG鍥炬爣鍙 */
        .ant-table .ant-space > .ant-space-item > button > span.ant-btn-icon > span.anticon > svg {
          display: block !important;
          width: 18px !important;
          height: 18px !important;
          fill: currentColor !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* 闅愯棌鎸夐挳鏂囧瓧锛屼絾淇濈暀鐩存帴浣滀负鎸夐挳鍐呭鐨勭鍙?*/
        .ant-table .ant-space > .ant-space-item > button > span:not(.ant-btn-icon):not(.expand-icon-symbol) {
          display: none !important;
          visibility: hidden !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
          position: absolute !important;
          left: -9999px !important;
        }
        
        /* 纭繚灞曞紑鎸夐挳绗﹀彿鍙 */
        .expand-icon-symbol {
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: auto !important;
          height: auto !important;
          position: static !important;
          left: auto !important;
        }
        
        /* 閲嶇疆鍙兘褰卞搷鍥炬爣鐨勬牱寮?*/
        .ant-table .ant-space > .ant-space-item > button * {
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* 纭繚鍙湁鏂囧瓧琚殣钘?*/
        .ant-table .ant-space > .ant-space-item > button > span:not(.ant-btn-icon):not(.expand-icon-symbol) * {
          display: none !important;
        }
        
        /* 鏈€鍚庢坊鍔狅紝纭繚鍏锋湁鏈€楂樹紭鍏堢骇 - 鎵€鏈夎〃鏍煎崟鍏冩牸閮戒笉鏄剧ず鐪佺暐鍙?*/
        .ant-table-cell {
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
        
        /* 褰诲簳鍘婚櫎鐐瑰嚮瑙﹀彂鐨勯珮浜紝鍚屾椂淇濈暀姝ｅ父鏍峰紡 */
        /* 浣跨敤鏇寸簿纭殑閫夋嫨鍣ㄥ拰鏇撮珮浼樺厛绾?*/
        
        /* 1. 鍘婚櫎鎵€鏈夋寜閽偣鍑荤姸鎬佺殑楂樹寒 */
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
        
        /* 2. 鐗瑰埆澶勭悊Ant Design鎸夐挳鐨勭偣鍑荤姸鎬?*/
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
        
        /* 3. 鍘婚櫎绉诲姩绔偣鍑婚珮浜?*/
        * {
          -webkit-tap-highlight-color: transparent !important;
        }
        
        /* 4. 纭繚姝ｅ父鏍峰紡涓嶅彈褰卞搷 */
        button,
        .ant-btn,
        .action-button {
          /* 淇濈暀鎵€鏈夋甯告牱寮?*/
        }
        
        /* 5. 淇濈暀hover鏁堟灉锛屽彧鍘婚櫎楂樹寒 */
        button:hover,
        .ant-btn:hover,
        .action-button:hover {
          outline: none !important;
          box-shadow: none !important;
          /* 鍏朵粬hover鏍峰紡鐢盇nt Design榛樿澶勭悊 */
        }
        
        /* 6. 纭繚Ant Design鎸夐挳鐨勯粯璁ゆ牱寮忔甯?*/
        .ant-btn-default,
        .ant-btn-primary,
        .ant-btn-danger {
          border-color: transparent !important;
        }
        
        /* 7. 纭繚鍥炬爣鎸夐挳鏍峰紡姝ｅ父 */
        .ant-btn-icon-only {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  )
}

export default MultiSelectDelete

