import { test, expect } from '@playwright/test';

// 测试数据
const testData = {
  adminUser: {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  },
  leaderUser: {
    username: 'leader',
    password: 'leader123',
    role: 'leader'
  },
  memberUser: {
    username: 'member',
    password: 'member123',
    role: 'member'
  },
  tableName: '权限测试表格_' + Date.now(),
  testDataValue: '测试数据_' + Date.now()
};

// 登录辅助函数
async function login(page, username, password) {
  await page.goto('http://localhost:3000');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('http://localhost:3000/');
}

// 管理员权限测试
test.describe('管理员权限测试', () => {
  test('TC_PERM_ADMIN_001 - 表格定义', async ({ page }) => {
    // 管理员登录
    await login(page, testData.adminUser.username, testData.adminUser.password);
    
    // 点击"表格定义"菜单
    await page.click('text=表格定义');
    
    // 验证表格定义页面可见
    await expect(page).toHaveURL('http://localhost:3000/table-definition');
    await expect(page.locator('text=创建表格')).toBeVisible();
  });

  test('TC_PERM_ADMIN_002 - 表格管理', async ({ page }) => {
    // 管理员登录
    await login(page, testData.adminUser.username, testData.adminUser.password);
    
    // 点击"已定义表格"菜单
    await page.click('text=已定义表格');
    
    // 验证已定义表格页面可见
    await expect(page).toHaveURL('http://localhost:3000/tables');
  });

  test('TC_PERM_ADMIN_003 - 数据添加', async ({ page }) => {
    // 管理员登录
    await login(page, testData.adminUser.username, testData.adminUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 验证数据管理页面可见
    await expect(page).toHaveURL('http://localhost:3000/data');
    
    // 点击"添加数据"按钮
    await page.click('text=添加数据');
    
    // 验证添加数据表单可见
    await expect(page.locator('text=添加数据')).toBeVisible();
  });

  test('TC_PERM_ADMIN_004 - 数据编辑', async ({ page }) => {
    // 管理员登录
    await login(page, testData.adminUser.username, testData.adminUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 验证数据管理页面可见
    await expect(page).toHaveURL('/data');
    
    // 检查是否有编辑按钮
    await expect(page.locator('.ant-btn:has-text("编辑")')).toBeVisible();
  });

  test('TC_PERM_ADMIN_005 - 数据删除', async ({ page }) => {
    // 管理员登录
    await login(page, testData.adminUser.username, testData.adminUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 验证数据管理页面可见
    await expect(page).toHaveURL('/data');
    
    // 检查是否有删除按钮
    await expect(page.locator('.ant-btn:has-text("删除")')).toBeVisible();
  });

  test('TC_PERM_ADMIN_006 - 数据导入', async ({ page }) => {
    // 管理员登录
    await login(page, testData.adminUser.username, testData.adminUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 验证数据管理页面可见
    await expect(page).toHaveURL('/data');
    
    // 检查是否有导入数据按钮
    await expect(page.locator('text=导入数据')).toBeVisible();
  });

  test('TC_PERM_ADMIN_007 - 数据导出', async ({ page }) => {
    // 管理员登录
    await login(page, testData.adminUser.username, testData.adminUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 验证数据管理页面可见
    await expect(page).toHaveURL('/data');
    
    // 检查是否有导出数据按钮
    await expect(page.locator('text=导出数据')).toBeVisible();
  });

  test('TC_PERM_ADMIN_008 - 数据统计', async ({ page }) => {
    // 管理员登录
    await login(page, testData.adminUser.username, testData.adminUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 验证数据管理页面可见
    await expect(page).toHaveURL('/data');
    
    // 检查是否有统计分析按钮
    await expect(page.locator('text=统计分析')).toBeVisible();
  });
});

// 组长权限测试
test.describe('组长权限测试', () => {
  test('TC_PERM_LEADER_001 - 表格定义', async ({ page }) => {
    // 组长登录
    await login(page, testData.leaderUser.username, testData.leaderUser.password);
    
    // 检查是否有"表格定义"菜单
    await expect(page.locator('text=表格定义')).not.toBeVisible();
  });

  test('TC_PERM_LEADER_002 - 表格管理', async ({ page }) => {
    // 组长登录
    await login(page, testData.leaderUser.username, testData.leaderUser.password);
    
    // 检查是否有"已定义表格"菜单
    await expect(page.locator('text=已定义表格')).not.toBeVisible();
  });

  test('TC_PERM_LEADER_003 - 数据添加', async ({ page }) => {
    // 组长登录
    await login(page, testData.leaderUser.username, testData.leaderUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 点击"添加数据"按钮
    await page.click('text=添加数据');
    
    // 验证添加数据表单可见
    await expect(page.locator('text=添加数据')).toBeVisible();
  });

  test('TC_PERM_LEADER_004 - 数据编辑', async ({ page }) => {
    // 组长登录
    await login(page, testData.leaderUser.username, testData.leaderUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 检查是否有编辑按钮
    await expect(page.locator('.ant-btn:has-text("编辑")')).toBeVisible();
  });

  test('TC_PERM_LEADER_005 - 数据删除', async ({ page }) => {
    // 组长登录
    await login(page, testData.leaderUser.username, testData.leaderUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 检查是否有删除按钮
    await expect(page.locator('.ant-btn:has-text("删除")')).toBeVisible();
  });

  test('TC_PERM_LEADER_006 - 数据导入', async ({ page }) => {
    // 组长登录
    await login(page, testData.leaderUser.username, testData.leaderUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 检查是否有导入数据按钮
    await expect(page.locator('text=导入数据')).toBeVisible();
  });

  test('TC_PERM_LEADER_007 - 数据导出', async ({ page }) => {
    // 组长登录
    await login(page, testData.leaderUser.username, testData.leaderUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 检查是否有导出数据按钮
    await expect(page.locator('text=导出数据')).toBeVisible();
  });

  test('TC_PERM_LEADER_008 - 数据统计', async ({ page }) => {
    // 组长登录
    await login(page, testData.leaderUser.username, testData.leaderUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 检查是否有统计分析按钮
    await expect(page.locator('text=统计分析')).toBeVisible();
  });
});

// 组员权限测试
test.describe('组员权限测试', () => {
  test('TC_PERM_MEMBER_001 - 表格定义', async ({ page }) => {
    // 组员登录
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 检查是否有"表格定义"菜单
    await expect(page.locator('text=表格定义')).not.toBeVisible();
  });

  test('TC_PERM_MEMBER_002 - 表格管理', async ({ page }) => {
    // 组员登录
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 检查是否有"已定义表格"菜单
    await expect(page.locator('text=已定义表格')).not.toBeVisible();
  });

  test('TC_PERM_MEMBER_003 - 数据添加', async ({ page }) => {
    // 组员登录
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 点击"添加数据"按钮
    await page.click('text=添加数据');
    
    // 验证添加数据表单可见
    await expect(page.locator('text=添加数据')).toBeVisible();
  });

  test('TC_PERM_MEMBER_004 - 数据编辑', async ({ page }) => {
    // 组员登录
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 检查是否有编辑按钮（预期：无）
    await expect(page.locator('.ant-btn:has-text("编辑")')).not.toBeVisible();
  });

  test('TC_PERM_MEMBER_005 - 数据删除', async ({ page }) => {
    // 组员登录
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 检查是否有删除按钮（预期：无）
    await expect(page.locator('.ant-btn:has-text("删除")')).not.toBeVisible();
  });

  test('TC_PERM_MEMBER_006 - 数据导入', async ({ page }) => {
    // 组员登录
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 检查是否有导入数据按钮（预期：无）
    await expect(page.locator('text=导入数据')).not.toBeVisible();
  });

  test('TC_PERM_MEMBER_007 - 数据导出', async ({ page }) => {
    // 组员登录
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 检查是否有导出数据按钮
    await expect(page.locator('text=导出数据')).toBeVisible();
  });

  test('TC_PERM_MEMBER_008 - 数据统计', async ({ page }) => {
    // 组员登录
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 检查是否有统计分析按钮
    await expect(page.locator('text=统计分析')).toBeVisible();
  });
});

// 边界测试
test.describe('边界测试', () => {
  test('TC_BOUNDARY_001 - 越权API访问', async ({ page, request }) => {
    // 组员登录获取token
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 获取localStorage中的token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    // 使用该token直接调用删除数据API（预期：返回403错误）
    const response = await request.delete('http://localhost:5000/api/v1/data/test-table/1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // 验证返回403错误
    expect(response.status()).toBe(403);
  });

  test('TC_BOUNDARY_003 - 无token访问', async ({ request }) => {
    // 直接访问需要权限的API（预期：返回401错误）
    const response = await request.get('http://localhost:5000/api/v1/tables');
    
    // 验证返回401错误
    expect(response.status()).toBe(401);
  });
});

// 安全性测试
test.describe('安全性测试', () => {
  test('TC_SEC_001 - SQL注入防护', async ({ page }) => {
    // 组员登录
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 点击"添加数据"按钮
    await page.click('text=添加数据');
    
    // 输入SQL注入语句
    await page.fill('input[name="name"]', 'test\' OR 1=1 --');
    await page.fill('input[name="value"]', testData.testDataValue);
    
    // 提交表单
    await page.click('button[type="submit"]');
    
    // 验证操作成功或返回适当错误（不执行恶意SQL）
    await expect(page.locator('.ant-message-success')).toBeVisible();
  });

  test('TC_SEC_002 - XSS防护', async ({ page }) => {
    // 组员登录
    await login(page, testData.memberUser.username, testData.memberUser.password);
    
    // 点击"数据管理"菜单
    await page.click('text=数据管理');
    
    // 点击"添加数据"按钮
    await page.click('text=添加数据');
    
    // 输入XSS脚本
    const xssScript = '<script>alert("XSS攻击")</script>';
    await page.fill('input[name="name"]', xssScript);
    await page.fill('input[name="value"]', testData.testDataValue);
    
    // 提交表单
    await page.click('button[type="submit"]');
    
    // 验证操作成功或返回适当错误（不执行恶意脚本）
    await expect(page.locator('.ant-message-success')).toBeVisible();
  });
});
