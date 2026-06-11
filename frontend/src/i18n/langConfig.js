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
      noTables: '暂无已定义表格',
      storageColumn: '存储列'
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
      importFailed: '数据导入失败',
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
    },
    // 冻存管理
    cryo: {
      title: '冻存管理',
      tankManagement: '液氮罐管理',
      tankName: '液氮罐名称',
      tankDescription: '液氮罐描述',
      addTank: '添加液氮罐',
      editTank: '编辑液氮罐',
      deleteTank: '删除液氮罐',
      tankNameRequired: '液氮罐名称不能为空',
      tankAddSuccess: '液氮罐添加成功',
      tankUpdateSuccess: '液氮罐更新成功',
      tankDeleteSuccess: '液氮罐删除成功',
      confirmDeleteTank: '确定要删除此液氮罐吗？这将同时删除其下所有盒子和数据！',
      noTanks: '暂无液氮罐',
      boxManagement: '冻存盒管理',
      boxName: '盒子名称',
      boxDescription: '盒子描述',
      addBox: '添加冻存盒',
      editBox: '编辑冻存盒',
      deleteBox: '删除冻存盒',
      boxNameRequired: '盒子名称不能为空',
      boxAddSuccess: '冻存盒添加成功',
      boxUpdateSuccess: '冻存盒更新成功',
      boxDeleteSuccess: '冻存盒删除成功',
      confirmDeleteBox: '确定要删除此冻存盒吗？这将同时删除其下所有格子数据！',
      noBoxes: '暂无冻存盒，请先添加一个盒子',
      columns: '字段定义',
      addColumn: '添加字段',
      columnName: '字段名称',
      columnNameRequired: '字段名称不能为空',
      gridView: '网格视图',
      backToBoxes: '返回盒子列表',
      occupied: '已占用',
      empty: '空',
      fillCell: '填写/编辑格子数据',
      clearCell: '清空格子',
      confirmClearCell: '确定要清空此格子的数据吗？',
      cellCleared: '格子已清空',
      cellSaved: '格子数据已保存',
      selectBox: '选择盒子',
      boxOverview: '盒子概览',
      gridLabel: '网格',
      rows: '行',
      cols: '列',
      selectStoragePosition: '选择存储位置',
      selectedPositions: '已选位置',
      confirmSelection: '确认选择',
      positionOccupied: '该位置已被占用',
      viewData: '查看关联数据',
      linkedFrom: '关联自'
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
      noTables: 'No tables defined yet',
      storageColumn: 'Storage Column'
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
      importFailed: 'Data import failed',
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
    },
    // Cryo Management
    cryo: {
      title: 'Cryo Management',
      tankManagement: 'Tank Management',
      tankName: 'Tank Name',
      tankDescription: 'Tank Description',
      addTank: 'Add Tank',
      editTank: 'Edit Tank',
      deleteTank: 'Delete Tank',
      tankNameRequired: 'Tank name is required',
      tankAddSuccess: 'Tank added successfully',
      tankUpdateSuccess: 'Tank updated successfully',
      tankDeleteSuccess: 'Tank deleted successfully',
      confirmDeleteTank: 'Delete this tank and all its boxes and data?',
      noTanks: 'No tanks yet',
      boxManagement: 'Box Management',
      boxName: 'Box Name',
      boxDescription: 'Box Description',
      addBox: 'Add Box',
      editBox: 'Edit Box',
      deleteBox: 'Delete Box',
      boxNameRequired: 'Box name is required',
      boxAddSuccess: 'Box added successfully',
      boxUpdateSuccess: 'Box updated successfully',
      boxDeleteSuccess: 'Box deleted successfully',
      confirmDeleteBox: 'Delete this box and all its cell data?',
      noBoxes: 'No boxes yet, please add a box first',
      columns: 'Column Definitions',
      addColumn: 'Add Column',
      columnName: 'Column Name',
      columnNameRequired: 'Column name is required',
      gridView: 'Grid View',
      backToBoxes: 'Back to Boxes',
      occupied: 'Occupied',
      empty: 'Empty',
      fillCell: 'Fill/Edit Cell Data',
      clearCell: 'Clear Cell',
      confirmClearCell: 'Clear this cell data?',
      cellCleared: 'Cell cleared',
      cellSaved: 'Cell data saved',
      selectBox: 'Select Box',
      boxOverview: 'Box Overview',
      gridLabel: 'Grid',
      rows: 'Rows',
      cols: 'Cols',
      selectStoragePosition: 'Select Storage Position',
      selectedPositions: 'Selected Positions',
      confirmSelection: 'Confirm Selection',
      positionOccupied: 'Position is occupied',
      viewData: 'View Linked Data',
      linkedFrom: 'Linked from'
    }
  }
};

export default langConfig;
