// 语言配置文件
const langConfig = {
  zh: {
    // 登录页面
    login: {
      title: '实验室库存管理系统',
      username: '用户名',
      password: '密码',
      remember: '30天内免登录',
      loginBtn: '登录',
      resetPassword: '重置密码'
    },
    // 主菜单
    menu: {
      tableDefinition: '表格定义',
      definedTables: '已定义表格',
      dataManagement: '数据管理',
      reports: '报表统计',
      userManagement: '用户管理',
      settings: '设置',
      changePassword: '修改密码',
      exportAllData: '导出所有数据',
      importData: '导入数据'
    },
    // 头部
    header: {
      logout: '退出登录',
      systemTitle: '实验室库存管理系统'
    },
    // 表格定义
    tableDefinition: {
      title: '表格定义',
      tableName: '表格名称',
      tableDescription: '表格描述',
      columnName: '字段名称',
      columnType: '字段类型',
      columnLength: '字段长度',
      required: '是否必填',
      addColumn: '添加字段',
      saveTable: '保存表格',
      tableNameRequired: '表格名称不能为空',
      columnNameRequired: '字段名称不能为空',
      success: '表格定义成功',
      noTables: '暂无已定义表格'
    },
    // 数据管理
    dataManagement: {
      title: '数据管理',
      addData: '添加数据',
      editData: '编辑数据',
      deleteData: '删除数据',
      exportData: '导出数据',
      importData: '导入数据',
      statisticalAnalysis: '统计分析',
      confirmDelete: '确定要删除这条数据吗？',
      successAdd: '数据添加成功',
      successEdit: '数据编辑成功',
      successDelete: '数据删除成功',
      noData: '暂无数据'
    },
    // 用户管理
    userManagement: {
      title: '用户管理',
      addUser: '添加用户',
      username: '用户名',
      password: '密码',
      role: '角色',
      admin: '管理员',
      leader: '组长',
      member: '组员',
      saveUser: '保存用户',
      confirmDelete: '确定要删除该用户吗？',
      successAdd: '用户添加成功',
      successDelete: '用户删除成功',
      noUsers: '暂无用户'
    },
    // 密码修改
    changePassword: {
      title: '修改密码',
      oldPassword: '旧密码',
      newPassword: '新密码',
      confirmPassword: '确认新密码',
      save: '保存',
      success: '密码修改成功'
    },
    // 权限相关
    permission: {
      noPermission: '无权限操作'
    }
  },
  en: {
    // 登录页面
    login: {
      title: 'Lab Inventory Management System',
      username: 'Username',
      password: 'Password',
      remember: 'Remember me for 30 days',
      loginBtn: 'Login',
      resetPassword: 'Reset Password'
    },
    // 主菜单
    menu: {
      tableDefinition: 'Table Definition',
      definedTables: 'Defined Tables',
      dataManagement: 'Data Management',
      reports: 'Reports',
      userManagement: 'User Management',
      settings: 'Settings',
      changePassword: 'Change Password',
      exportAllData: 'Export All Data',
      importData: 'Import Data'
    },
    // 头部
    header: {
      logout: 'Logout',
      systemTitle: 'Lab Inventory Management System'
    },
    // 表格定义
    tableDefinition: {
      title: 'Table Definition',
      tableName: 'Table Name',
      tableDescription: 'Table Description',
      columnName: 'Column Name',
      columnType: 'Column Type',
      columnLength: 'Column Length',
      required: 'Required',
      addColumn: 'Add Column',
      saveTable: 'Save Table',
      tableNameRequired: 'Table name is required',
      columnNameRequired: 'Column name is required',
      success: 'Table defined successfully',
      noTables: 'No tables defined yet'
    },
    // 数据管理
    dataManagement: {
      title: 'Data Management',
      addData: 'Add Data',
      editData: 'Edit Data',
      deleteData: 'Delete Data',
      exportData: 'Export Data',
      importData: 'Import Data',
      statisticalAnalysis: 'Statistical Analysis',
      confirmDelete: 'Are you sure you want to delete this data?',
      successAdd: 'Data added successfully',
      successEdit: 'Data edited successfully',
      successDelete: 'Data deleted successfully',
      noData: 'No data available'
    },
    // 用户管理
    userManagement: {
      title: 'User Management',
      addUser: 'Add User',
      username: 'Username',
      password: 'Password',
      role: 'Role',
      admin: 'Admin',
      leader: 'Leader',
      member: 'Member',
      saveUser: 'Save User',
      confirmDelete: 'Are you sure you want to delete this user?',
      successAdd: 'User added successfully',
      successDelete: 'User deleted successfully',
      noUsers: 'No users available'
    },
    // 密码修改
    changePassword: {
      title: 'Change Password',
      oldPassword: 'Old Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm New Password',
      save: 'Save',
      success: 'Password changed successfully'
    },
    // 权限相关
    permission: {
      noPermission: 'No permission to operate'
    }
  }
};

export default langConfig;
