import React, { useState, useEffect } from 'react'
import { Layout, Menu, Button, Form, Input, Card, Typography, message, Checkbox, Select, Modal, Table, Dropdown } from 'antd'
import { UserOutlined, LockOutlined, DatabaseOutlined, BarChartOutlined, MenuOutlined, BugOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import TableDefinition from './pages/TableDefinition'
import DefinedTables from './pages/DefinedTables'
import DataManagement from './pages/DataManagement'
import Reports from './pages/Reports'
import UserManagement from './pages/UserManagement'
import ResetPassword from './pages/ResetPassword'
import ChangePassword from './pages/ChangePassword'
import { I18nProvider, useI18n } from './i18n/I18nContext'

// 配置axios拦截器
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 配置axios响应拦截器
axios.interceptors.response.use(
  response => response,
  error => {
    // 检查是否是登录API的401错误，如果是则不处理，让登录组件自己处理
    if (error.response && error.response.status === 401) {
      // 检查请求URL是否是登录API
      const isLoginRequest = error.config.url === '/api/v1/auth/login'
      
      if (!isLoginRequest) {
        // 非登录请求的401错误，处理为登录过期
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        message.error('登录已过期，请重新登录')
      }
    }
    return Promise.reject(error)
  }
)

const { Header, Sider, Content } = Layout
const { Title } = Typography

// 登录页面组件
const Login = ({ setIsLoggedIn, t }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const location = useLocation()

  // 从URL参数中获取用户名并填充到表单
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const usernameFromUrl = searchParams.get('username')
    if (usernameFromUrl) {
      setUsername(usernameFromUrl)
      form.setFieldsValue({ username: usernameFromUrl })
    }
  }, [location.search, form])

  const handleLogin = async (values) => {
    try {
      console.log('=== 登录流程开始 ===')
      console.log('登录参数:', values)
      console.log('准备发送请求到:', '/api/v1/auth/login')
      
      const response = await axios.post('/api/v1/auth/login', values)
      
      console.log('登录响应:', response)
      console.log('响应状态码:', response.status)
      console.log('响应数据:', response.data)
      console.log('响应数据code:', response.data.code)
      console.log('响应数据message:', response.data.message)
      
      if (response.data.code === 200) {
        // 检查是否需要重置密码
        console.log('是否需要重置密码:', response.data.data.need_reset_password)
        
        if (response.data.data.need_reset_password) {
          console.log('=== 首次登录流程 ===')
          // 保存用户名到localStorage，用于密码重置页面
          localStorage.setItem('reset_username', response.data.data.username)
          console.log('用户名已保存到localStorage:', response.data.data.username)
          // 重定向到密码重置页面
          console.log('准备显示信息提示:', response.data.message)
          message.info(response.data.message)
          console.log('准备跳转到密码重置页面...')
          navigate('/reset-password')
          console.log('跳转指令已执行')
        } else {
          console.log('=== 正常登录流程 ===')
          // 正常登录流程
          localStorage.setItem('token', response.data.data.token)
          localStorage.setItem('user', JSON.stringify(response.data.data.user))
          setIsLoggedIn(true)
          console.log('准备显示成功提示: 登录成功')
          message.success(t('login.loginBtn'))
          console.log('准备跳转到主页面...')
          navigate('/table-definition')
        }
      } else {
        console.log('登录失败分支，准备显示错误信息:', response.data.message)
        message.error(response.data.message || t('login.loginBtn'))
        console.log('登录失败:', response.data.message)
      }
    } catch (error) {
      console.error('Login error - 完整错误:', error)
      console.error('Login error - 错误类型:', typeof error)
      console.error('Login error - 错误响应:', error.response)
      
      if (error.response) {
        console.error('Login error - 响应状态:', error.response.status)
        console.error('Login error - 响应数据:', error.response.data)
        
        let errorMessage = t('login.loginBtn')
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message
        }
        console.log('从响应数据中获取到错误信息:', errorMessage)
        message.error(errorMessage)
        console.log('登录失败:', errorMessage)
      } else if (error.request) {
        console.error('Login error - 请求已发送但没有收到响应:', error.request)
        message.error(t('login.loginBtn'))
      } else {
        console.error('Login error - 请求配置错误:', error.message)
        message.error(t('login.loginBtn'))
      }
    } finally {
      console.log('=== 登录流程结束 ===')
    }
  }

  return (
    <div className="login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card title={t('login.title')} className="login-card" style={{ width: 400 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleLogin}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('login.username') + '!' }]}
            label={t('login.username')}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={t('login.username')}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: t('login.password') + '!' }]}
            label={t('login.password')}
          >
            <Input
              prefix={<LockOutlined />}
              type="password"
              placeholder={t('login.password')}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Item>
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox>{t('login.remember')}</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {t('login.loginBtn')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

// 数据管理上下文
import { createContext, useContext } from 'react'

export const TableContext = createContext()

// 主布局组件
const MainLayout = ({ isLoggedIn, setIsLoggedIn, t, lang, changeLang }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [tables, setTables] = useState([])
  const [selectedTableId, setSelectedTableId] = useState(null)
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)
  const [bugModalVisible, setBugModalVisible] = useState(false)
  const [bugForm] = Form.useForm()
  const [bugs, setBugs] = useState([])
  const [bugListVisible, setBugListVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  
  // 监听路由变化，重置 selectedTableId
  React.useEffect(() => {
    const handleRouteChange = () => {
      // 只有在非数据管理页面时，重置 selectedTableId
      if (window.location.pathname !== '/data-management') {
        setSelectedTableId(null)
      }
    }
    
    // 监听路由变化
    window.addEventListener('popstate', handleRouteChange)
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  // 使用useCallback缓存fetchTables函数，避免每次渲染都重新创建
  const fetchTables = React.useCallback(async () => {
    try {
      const response = await axios.get('/api/v1/tables')
      if (response.data.code === 200) {
        // 为每个表格的列添加默认值，确保dropDown、autoIncrement和prefix属性存在
        const tablesWithDefaults = response.data.data.items.map(table => ({
          ...table,
          columns: table.columns.map(column => ({
            ...column,
            dropDown: column.dropDown || false,
            autoIncrement: column.autoIncrement || false,
            prefix: column.prefix || ''
          }))
        }))
        setTables(tablesWithDefaults)
      } else {
        message.error(response.data.message)
        setTables([])
      }
    } catch (error) {
      console.error('Fetch tables error:', error)
      message.error('获取表格列表失败')
      setTables([])
    }
  }, [])

  // 组件挂载时获取表格列表
  React.useEffect(() => {
    fetchTables()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    navigate('/login')
    message.success('退出登录成功')
  }

  // Bug反馈 - 显示反馈模态框
  const showBugModal = () => {
    setBugModalVisible(true)
    setMobileMenuVisible(false)
  }

  // Bug反馈 - 关闭反馈模态框
  const handleBugModalCancel = () => {
    setBugModalVisible(false)
    bugForm.resetFields()
  }

  // Bug反馈 - 提交反馈
  const handleBugSubmit = async (values) => {
    try {
      setLoading(true)
      const response = await axios.post('/api/v1/bugs', values)
      if (response.data.code === 200) {
        message.success('Bug反馈提交成功')
        setBugModalVisible(false)
        bugForm.resetFields()
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('提交Bug反馈失败:', error)
      message.error('提交Bug反馈失败')
    } finally {
      setLoading(false)
    }
  }

  // Bug列表 - 显示Bug列表
  const showBugList = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/v1/bugs')
      if (response.data.code === 200) {
        setBugs(response.data.data.items)
        setBugListVisible(true)
        setMobileMenuVisible(false)
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('获取Bug列表失败:', error)
      message.error('获取Bug列表失败')
    } finally {
      setLoading(false)
    }
  }

  // Bug列表 - 关闭Bug列表
  const handleBugListCancel = () => {
    setBugListVisible(false)
  }

  // Bug列表 - 更新Bug状态
  const handleBugStatusChange = async (bugId) => {
    try {
      const response = await axios.put(`/api/v1/bugs/${bugId}`)
      if (response.data.code === 200) {
        message.success('Bug状态更新成功')
        // 重新获取Bug列表
        const refreshResponse = await axios.get('/api/v1/bugs')
        if (refreshResponse.data.code === 200) {
          setBugs(refreshResponse.data.data.items)
        }
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('更新Bug状态失败:', error)
      message.error('更新Bug状态失败')
    }
  }

  // Bug列表 - 删除Bug
  const handleBugDelete = async (bugId) => {
    try {
      const response = await axios.delete(`/api/v1/bugs/${bugId}`)
      if (response.data.code === 200) {
        message.success('Bug删除成功')
        // 重新获取Bug列表
        const refreshResponse = await axios.get('/api/v1/bugs')
        if (refreshResponse.data.code === 200) {
          setBugs(refreshResponse.data.data.items)
        }
      } else {
        message.error(response.data.message)
      }
    } catch (error) {
      console.error('删除Bug失败:', error)
      message.error('删除Bug失败')
    }
  }

  // Bug列表 - 表格列配置
  const bugColumns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <span style={{ textDecoration: record.is_resolved ? 'line-through' : 'none' }}>{text}</span>
      )
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (text, record) => (
        <span style={{ textDecoration: record.is_resolved ? 'line-through' : 'none' }}>{text}</span>
      )
    },
    {
      title: '反馈人',
      dataIndex: 'reporter_username',
      key: 'reporter_username',
      render: (text, record) => (
        <span style={{ textDecoration: record.is_resolved ? 'line-through' : 'none' }}>{text}</span>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text, record) => (
        <span style={{ textDecoration: record.is_resolved ? 'line-through' : 'none' }}>{text}</span>
      )
    },
    {
      title: '状态',
      key: 'is_resolved',
      render: (_, record) => (
        <span style={{ textDecoration: record.is_resolved ? 'line-through' : 'none' }}>
          {record.is_resolved ? '已解决' : '未解决'}
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const user = JSON.parse(localStorage.getItem('user'));
        return user && user.username === 'admin' ? (
          <Checkbox
            checked={record.is_resolved}
            onChange={() => handleBugStatusChange(record.id)}
            icon={<CheckCircleOutlined />}
          />
        ) : null;
      }
    },
    {
      title: '删除',
      key: 'delete',
      render: (_, record) => {
        const user = JSON.parse(localStorage.getItem('user'));
        return user && user.username === 'admin' ? (
          <Button
            type="text"
            danger
            size="small"
            onClick={() => handleBugDelete(record.id)}
          >
            删除
          </Button>
        ) : null;
      }
    }
  ]

  // 处理表格点击
  const handleTableClick = (tableId) => {
    setSelectedTableId(tableId)
    setMobileMenuVisible(false)
    navigate('/data-management')
  }

  // 移动端菜单点击处理
  const handleMenuClick = (e) => {
    e.stopPropagation() // 阻止事件冒泡，防止触发Content的点击事件
    setMobileMenuVisible(!mobileMenuVisible)
  }
  
  // 点击外部区域关闭侧边栏
  const handleClickOutside = () => {
    setMobileMenuVisible(false)
  }

  return (
    <TableContext.Provider value={{ tables, selectedTableId, setSelectedTableId, fetchTables }}>
      <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="app-layout">
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#001529', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* 通用菜单按钮，控制桌面端折叠和移动端显示 */}
            <Button 
              type="text" 
              icon={<MenuOutlined />} 
              style={{ color: 'white', fontSize: '18px', marginRight: '16px' }}
              className="menu-btn mobile-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                // 桌面端折叠/展开，移动端显示/隐藏
                if (window.innerWidth > 768) {
                  setCollapsed(!collapsed);
                } else {
                  setMobileMenuVisible(!mobileMenuVisible);
                }
              }}
            />
            <Title level={4} style={{ color: 'white', margin: 0, fontSize: '18px' }}>{t('header.systemTitle')}</Title>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 语言切换 */}
            <Select
              value={lang}
              onChange={changeLang}
              style={{ width: '100px' }}
              options={[
                { value: 'zh', label: '中文' },
                { value: 'en', label: 'English' }
              ]}
              className="language-select"
            />
            <Button 
              type="primary" 
              onClick={handleLogout}
              size="small"
              style={{ minWidth: '80px' }}
            >
              {t('header.logout')}
            </Button>
          </div>
        </Header>
        <Layout style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* 桌面端侧边栏 */}
          <Sider 
            collapsible 
            collapsed={collapsed} 
            onCollapse={setCollapsed}
            className="desktop-sider"
            breakpoint="lg"
            collapsedWidth="64"
            width={200}
            trigger={null} // 移除默认触发器，我们将在sidebar内部自定义
            style={{ 
              height: 'auto', // 让侧边栏自动适应父容器高度
              display: 'flex',
              flexDirection: 'column',
              alignSelf: 'stretch' // 让侧边栏在交叉轴方向（垂直方向）拉伸
            }}
          >
            <div className="logo" />
            {/* 侧边栏菜单容器，使用flex-grow: 1确保它能占据所有剩余空间 */}
            <div style={{ flex: '1', overflowY: 'auto' }}>
              <Menu theme="dark" mode="inline" items={[
                {
                  key: '1',
                  icon: <DatabaseOutlined />,
                  label: <Link to="/table-definition">{t('menu.tableDefinition')}</Link>
                },
                {
                  key: '2',
                  icon: <DatabaseOutlined />,
                  label: <Link to="/defined-tables">{t('menu.definedTables')}</Link>
                },
                {
                  key: '3',
                  icon: <DatabaseOutlined />,
                  label: t('menu.dataManagement'),
                  children: tables.length === 0 ? [
                    {
                      key: '3-1',
                      disabled: true,
                      label: t('tableDefinition.noTables')
                    }
                  ] : tables.map(table => ({
                    key: `table-${table.id}`,
                    icon: <DatabaseOutlined />,
                    label: table.table_name,
                    onClick: () => handleTableClick(table.id)
                  }))
                },
                {
                  key: '4',
                  icon: <BarChartOutlined />,
                  label: <Link to="/reports">{t('menu.reports')}</Link>
                },
                ...(() => {
                  const user = JSON.parse(localStorage.getItem('user'));
                  if (user && user.role === 'admin') {
                    return [{
                      key: '5',
                      icon: <UserOutlined />,
                      label: <Link to="/user-management">{t('menu.userManagement')}</Link>
                    }];
                  }
                  return [];
                })(),
                {
                  key: '6',
                  icon: <UserOutlined />,
                  label: t('menu.settings'),
                  children: [
                    {
                      key: '6-0',
                      label: <Link to="/change-password">{t('menu.changePassword')}</Link>
                    },
                    ...(() => {
                      const user = JSON.parse(localStorage.getItem('user'));
                      if (user && user.role === 'admin') {
                        return [
                          {
                            key: '6-1',
                            label: t('menu.exportAllData'),
                            onClick: () => {
                              // 导出所有数据
                              axios.get('/api/v1/export-all-data', { responseType: 'blob' })
                                .then(response => {
                                  // 检查响应状态码
                                  if (response.status === 200) {
                                    // 是Excel文件，正常处理下载
                                    const url = window.URL.createObjectURL(response.data);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', 'all_data.xlsx');
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                    message.success('所有数据导出成功');
                                  } else {
                                    // 处理非200状态码
                                    message.error(`导出失败，错误码: ${response.status}`);
                                  }
                                })
                                .catch(error => {
                                  console.error('Export error:', error);
                                  // 处理不同类型的错误
                                  if (error.response) {
                                    // 服务器返回错误状态码
                                    if (error.response.status === 403) {
                                      message.error('权限不足，只有管理员可以执行此操作');
                                    } else if (error.response.status === 500) {
                                      message.error('服务器内部错误，请联系管理员');
                                    } else {
                                      message.error(`导出失败，错误码: ${error.response.status}`);
                                    }
                                  } else if (error.request) {
                                    // 请求已发送但没有收到响应
                                    message.error('网络异常，服务器没有响应，请检查网络连接');
                                  } else {
                                    // 请求配置错误
                                    message.error(`导出失败: ${error.message}`);
                                  }
                                });
                            }
                          },
                          {
                            key: '6-2',
                            label: t('menu.importData'),
                            onClick: () => {
                              // 导入数据
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = '.xlsx, .xls';
                              input.onchange = (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const formData = new FormData();
                                  formData.append('file', file);
                                     
                                  axios.post('/api/v1/import-data', formData, {
                                    headers: {
                                      'Content-Type': 'multipart/form-data'
                                    }
                                  })
                                  .then(response => {
                                    if (response.data.code === 200) {
                                      message.success(t('dataManagement.successAdd'));
                                      // 刷新表格列表
                                      fetchTables();
                                    } else {
                                      message.error(response.data.message);
                                    }
                                  })
                                  .catch(error => {
                                    console.error('Import error:', error);
                                    message.error(t('dataManagement.importFailed'));
                                  });
                                }
                              };
                              input.click();
                            }
                          }
                        ];
                      }
                      return [];
                    })(),
                    {
                      key: '6-3',
                      icon: <BugOutlined />,
                      label: (
                        <span
                          style={{ cursor: 'pointer' }}
                          onClick={showBugModal}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            showBugList();
                          }}
                        >
                          Bug反馈
                        </span>
                      )
                    }
                  ]
                }
              ]} />
            </div>
            
            {/* 侧边栏内部的折叠按钮 - 移除绝对定位，让它成为内容的一部分 */}
            <div 
              className="sidebar-collapse-trigger"
              onClick={() => setCollapsed(!collapsed)}
              style={{
                height: '48px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <MenuOutlined 
                style={{
                  color: 'white',
                  fontSize: '16px',
                  transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                  transition: 'transform 0.3s'
                }}
              />
            </div>
          </Sider>
          
          <Layout style={{ padding: '0' }}>
            {/* 移动端侧边栏 - 使用条件渲染代替visible属性 */}
            {mobileMenuVisible && (
              <Sider 
                theme="dark"
                width="250px"
                className="mobile-sider"
                trigger={null}
                style={{
                  position: 'fixed',
                  top: 64,
                  left: 0,
                  height: 'calc(100vh - 64px)',
                  zIndex: 1001,
                  animation: 'antSlideLeftIn 0.3s ease-out'
                }}
              >
                <div className="logo" />
                <Menu theme="dark" mode="inline" items={[
                  {
                    key: 'm1',
                    icon: <DatabaseOutlined />,
                    label: <Link to="/table-definition" onClick={() => setMobileMenuVisible(false)}>{t('menu.tableDefinition')}</Link>
                  },
                  {
                    key: 'm2',
                    icon: <DatabaseOutlined />,
                    label: <Link to="/defined-tables" onClick={() => setMobileMenuVisible(false)}>{t('menu.definedTables')}</Link>
                  },
                  {
                    key: 'm3',
                    icon: <DatabaseOutlined />,
                    label: t('menu.dataManagement'),
                    children: tables.length === 0 ? [
                      {
                        key: 'm3-1',
                        disabled: true,
                        label: t('tableDefinition.noTables')
                      }
                    ] : tables.map(table => ({
                      key: `m-table-${table.id}`,
                      icon: <DatabaseOutlined />,
                      label: table.table_name,
                      onClick: () => handleTableClick(table.id)
                    }))
                  },
                  {
                    key: 'm4',
                    icon: <BarChartOutlined />,
                    label: <Link to="/reports" onClick={() => setMobileMenuVisible(false)}>{t('menu.reports')}</Link>
                  },
                  ...(() => {
                    const user = JSON.parse(localStorage.getItem('user'));
                    if (user && user.role === 'admin') {
                      return [{
                        key: 'm5',
                        icon: <UserOutlined />,
                        label: <Link to="/user-management" onClick={() => setMobileMenuVisible(false)}>{t('menu.userManagement')}</Link>
                      }];
                    }
                    return [];
                  })(),
                  {
                    key: 'm6',
                    icon: <UserOutlined />,
                    label: t('menu.settings'),
                    style: { marginTop: 'auto' },
                    children: [
                      {
                        key: 'm6-0',
                        label: <Link to="/change-password" onClick={() => setMobileMenuVisible(false)}>{t('menu.changePassword')}</Link>
                      },
                      ...(() => {
                        const user = JSON.parse(localStorage.getItem('user'));
                        if (user && user.role === 'admin') {
                          return [
                            {
                              key: 'm6-1',
                              label: t('menu.exportAllData'),
                              onClick: () => {
                                // 导出所有数据
                                setMobileMenuVisible(false);
                                axios.get('/api/v1/export-all-data', { responseType: 'blob' })
                                  .then(response => {
                                    // 检查响应状态码
                                    if (response.status === 200) {
                                      // 是Excel文件，正常处理下载
                                      const url = window.URL.createObjectURL(response.data);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.setAttribute('download', 'all_data.xlsx');
                                      document.body.appendChild(link);
                                      link.click();
                                      link.remove();
                                      message.success('所有数据导出成功');
                                    } else {
                                      // 处理非200状态码
                                      message.error(`导出失败，错误码: ${response.status}`);
                                    }
                                  })
                                  .catch(error => {
                                    console.error('Export error:', error);
                                    // 处理不同类型的错误
                                    if (error.response) {
                                      // 服务器返回错误状态码
                                      if (error.response.status === 403) {
                                        message.error('权限不足，只有管理员可以执行此操作');
                                      } else if (error.response.status === 500) {
                                        message.error('服务器内部错误，请联系管理员');
                                      } else {
                                        message.error(`导出失败，错误码: ${error.response.status}`);
                                      }
                                    } else if (error.request) {
                                      // 请求已发送但没有收到响应
                                      message.error('网络异常，服务器没有响应，请检查网络连接');
                                    } else {
                                      // 请求配置错误
                                      message.error(`导出失败: ${error.message}`);
                                    }
                                  });
                              }
                            },
                            {
                              key: 'm6-2',
                              label: t('menu.importData'),
                              onClick: () => {
                                // 导入数据
                                setMobileMenuVisible(false);
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.xlsx, .xls';
                                input.onchange = (e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                       
                                    axios.post('/api/v1/import-data', formData, {
                                      headers: {
                                        'Content-Type': 'multipart/form-data'
                                      }
                                    })
                                    .then(response => {
                                      if (response.data.code === 200) {
                                        message.success(t('dataManagement.successAdd'));
                                        // 刷新表格列表
                                        fetchTables();
                                      } else {
                                        message.error(response.data.message);
                                      }
                                    })
                                    .catch(error => {
                                      console.error('Import error:', error);
                                      message.error(t('dataManagement.importFailed'));
                                    });
                                  }
                                };
                                input.click();
                              }
                            }
                          ];
                        }
                        return [];
                      })(),
                      {
                        key: 'm6-3',
                        icon: <BugOutlined />,
                        label: (
                          <span
                            style={{ cursor: 'pointer' }}
                            onClick={showBugModal}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              showBugList();
                            }}
                          >
                            Bug反馈
                          </span>
                        )
                      }
                    ]
                  }
                ]} />
              </Sider>
            )}
            
            <Content
              style={{
                background: '#fff',
                padding: 16,
                margin: 0,
                minHeight: 280,
                borderRadius: 0,
                boxShadow: 'none',
                flex: 1,
                minWidth: 0
              }}
            >
              <Routes>
                <Route path="/table-definition" element={<TableDefinition />} />
                <Route path="/defined-tables" element={<DefinedTables />} />
                <Route path="/data-management" element={<DataManagement />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/user-management" element={<UserManagement />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="*" element={<Navigate to="/table-definition" replace />} />
              </Routes>
            </Content>
          </Layout>
          {/* 点击遮罩层关闭侧边栏 */}
          {mobileMenuVisible && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                zIndex: 1000,
                pointerEvents: 'auto',
                animation: 'antFadeIn 0.3s ease-out'
              }}
              onClick={() => setMobileMenuVisible(false)}
            />
          )}
        </Layout>

        {/* Bug反馈模态框 */}
        <Modal
          title="Bug反馈"
          open={bugModalVisible}
          onCancel={handleBugModalCancel}
          footer={null}
          destroyOnHidden
        >
          <Form
            form={bugForm}
            layout="vertical"
            onFinish={handleBugSubmit}
          >
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: '请输入Bug标题' }]}
            >
              <Input placeholder="请输入Bug标题" />
            </Form.Item>

            <Form.Item
              name="content"
              label="内容"
              rules={[{ required: true, message: '请输入Bug详细描述' }]}
            >
              <Input.TextArea
                placeholder="请详细描述您遇到的Bug，包括操作步骤、预期结果和实际结果"
                rows={6}
              />
            </Form.Item>

            <Form.Item style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleBugModalCancel} style={{ marginRight: 8 }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交反馈
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Bug列表模态框 */}
        <Modal
          title="Bug列表"
          open={bugListVisible}
          onCancel={handleBugListCancel}
          footer={null}
          width={800}
          destroyOnHidden
        >
          <Table
            columns={bugColumns}
            dataSource={bugs}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
        </Modal>
      </Layout>
    </TableContext.Provider>
  )
}

// 导出上下文
const useTableContext = () => useContext(TableContext)

// 创建一个使用useI18n的Login组件包装器
const LoginWithI18n = (props) => {
  const { t } = useI18n();
  return <Login {...props} t={t} />;
};

// 创建一个使用useI18n的MainLayout组件包装器
const MainLayoutWithI18n = (props) => {
  const { t, lang, changeLang } = useI18n();
  return <MainLayout {...props} t={t} lang={lang} changeLang={changeLang} />;
};

function App() {
  // 初始状态从localStorage中读取，避免刷新时短暂显示登录页
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('token')
    return !!token
  })

  // 监听token变化，更新登录状态
  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token')
      setIsLoggedIn(!!token)
    }
    
    // 监听localStorage变化（例如在其他标签页注销登录）
    window.addEventListener('storage', checkLoginStatus)
    
    return () => {
      window.removeEventListener('storage', checkLoginStatus)
    }
  }, [])

  return (
    <I18nProvider>
      <div className="App">
        <Router>
          <Routes>
            <Route path="/login" element={<LoginWithI18n setIsLoggedIn={setIsLoggedIn} />} />
            {/* 密码重置页面，允许未登录状态访问 */}
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* 只有非登录页面才需要重定向检查 */}
            <Route path="/*" element={
              <>
                {isLoggedIn ? (
                  <MainLayoutWithI18n isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
                ) : (
                  <Navigate to="/login" replace />
                )}
              </>
            } />
          </Routes>
        </Router>
      </div>
    </I18nProvider>
  )
}

export default App