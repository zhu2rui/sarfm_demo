import { test, expect } from '@playwright/test';

// 测试数据
const testData = {
  adminUser: {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  },
  memberUser: {
    username: 'test_member_' + Date.now(),
    password: 'member123',
    role: 'member'
  },
  tableName: '权限测试表格_' + Date.now(),
  columnName: '测试列'
};

test.beforeAll(async ({ request }) => {
  // 创建普通用户
  await request.post('http://localhost:5000/api/v1/users', {
    data: {
      username: testData.memberUser.username,
      password: testData.memberUser.password,
      role: testData.memberUser.role
    }
  });
});

test.afterAll(async ({ request }) => {
  // 删除测试用户
  await request.delete(`http://localhost:5000/api/v1/users/${testData.memberUser.username}`);
});

test('TC_AUTH_ADMIN_001 - 管理员登录', async ({ page }) => {
  // 访问登录页面
  await page.goto('/');
  
  // 填写登录信息
  await page.fill('input[name="username"]', testData.adminUser.username);
  await page.fill('input[name="password"]', testData.adminUser.password);
  
  // 点击登录按钮
  await page.click('button[type="submit"]');
  
  // 验证登录成功
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=表格定义')).toBeVisible();
  await expect(page.locator('text=已定义表格')).toBeVisible();
  await expect(page.locator('text=数据管理')).toBeVisible();
});

test('TC_AUTH_MEMBER_001 - 普通用户登录', async ({ page }) => {
  // 访问登录页面
  await page.goto('/');
  
  // 填写登录信息
  await page.fill('input[name="username"]', testData.memberUser.username);
  await page.fill('input[name="password"]', testData.memberUser.password);
  
  // 点击登录按钮
  await page.click('button[type="submit"]');
  
  // 验证登录成功
  await expect(page).toHaveURL('/');
  
  // 验证普通用户可以看到的数据管理功能
  await expect(page.locator('text=数据管理')).toBeVisible();
});

test('TC_AUTH_PERM_001 - 权限边界测试（普通用户不能创建表格）', async ({ page }) => {
  // 普通用户登录
  await page.goto('/');
  await page.fill('input[name="username"]', testData.memberUser.username);
  await page.fill('input[name="password"]', testData.memberUser.password);
  await page.click('button[type="submit"]');
  
  // 验证登录成功
  await expect(page).toHaveURL('/');
  
  // 检查普通用户是否能看到表格定义功能（预期：不能）
  await expect(page.locator('text=表格定义')).not.toBeVisible();
  
  // 检查普通用户是否能看到已定义表格功能（预期：不能）
  await expect(page.locator('text=已定义表格')).not.toBeVisible();
});

test('TC_AUTH_LOGIN_FAILURE_001 - 登录失败（用户名错误）', async ({ page }) => {
  // 访问登录页面
  await page.goto('/');
  
  // 填写错误的用户名
  await page.fill('input[name="username"]', 'invalid_user');
  await page.fill('input[name="password"]', testData.adminUser.password);
  
  // 点击登录按钮
  await page.click('button[type="submit"]');
  
  // 验证登录失败
  await expect(page.locator('.ant-message-error')).toBeVisible();
  await expect(page.locator('text=用户名或密码错误')).toBeVisible();
});

test('TC_AUTH_LOGIN_FAILURE_002 - 登录失败（密码错误）', async ({ page }) => {
  // 访问登录页面
  await page.goto('/');
  
  // 填写错误的密码
  await page.fill('input[name="username"]', testData.adminUser.username);
  await page.fill('input[name="password"]', 'invalid_password');
  
  // 点击登录按钮
  await page.click('button[type="submit"]');
  
  // 验证登录失败
  await expect(page.locator('.ant-message-error')).toBeVisible();
  await expect(page.locator('text=用户名或密码错误')).toBeVisible();
});
