import { test, expect } from '@playwright/test';

// 测试账号
const testAccounts = {
  admin: { username: 'admin', password: 'admin123' }
};

// 登录函数
async function login(page, username, password) {
  await page.goto('http://localhost:3001/');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // 等待登录成功，跳转到主页面
  await expect(page).toHaveURL(/table-definition|dashboard/);
}

test.describe('移动端侧边栏功能测试', () => {
  // 手机端测试
  test.use({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  test.beforeEach(async ({ page }) => {
    await login(page, testAccounts.admin.username, testAccounts.admin.password);
  });

  test('1. 侧边栏默认状态 - 手机端默认隐藏', async ({ page }) => {
    // 检查桌面端侧边栏是否隐藏
    await expect(page.locator('.desktop-sider')).not.toBeVisible();
    
    // 检查移动端侧边栏是否默认隐藏
    await expect(page.locator('.mobile-sider')).not.toBeVisible();
    
    // 检查移动端菜单按钮是否显示
    await expect(page.locator('.mobile-menu-btn')).toBeVisible();
  });

  test('2. 菜单按钮功能 - 点击呼出/隐藏侧边栏', async ({ page }) => {
    // 点击菜单按钮呼出侧边栏
    await page.click('.mobile-menu-btn');
    await expect(page.locator('.mobile-sider')).toBeVisible();
    
    // 再次点击菜单按钮隐藏侧边栏
    await page.click('.mobile-menu-btn');
    await expect(page.locator('.mobile-sider')).not.toBeVisible();
  });

  test('3. 侧边栏交互 - 点击菜单项导航', async ({ page }) => {
    // 点击菜单按钮呼出侧边栏
    await page.click('.mobile-menu-btn');
    await expect(page.locator('.mobile-sider')).toBeVisible();
    
    // 点击表格定义菜单项
    await page.click('text=表格定义');
    await expect(page).toHaveURL(/table-definition/);
    await expect(page.locator('.mobile-sider')).not.toBeVisible();
    
    // 再次呼出侧边栏，点击已定义表格菜单项
    await page.click('.mobile-menu-btn');
    await page.click('text=已定义表格');
    await expect(page).toHaveURL(/defined-tables/);
    await expect(page.locator('.mobile-sider')).not.toBeVisible();
    
    // 再次呼出侧边栏，点击报表统计菜单项
    await page.click('.mobile-menu-btn');
    await page.click('text=报表统计');
    await expect(page).toHaveURL(/reports/);
    await expect(page.locator('.mobile-sider')).not.toBeVisible();
  });

  test('4. 侧边栏交互 - 点击外部区域隐藏侧边栏', async ({ page }) => {
    // 点击菜单按钮呼出侧边栏
    await page.click('.mobile-menu-btn');
    await expect(page.locator('.mobile-sider')).toBeVisible();
    
    // 点击侧边栏外部区域（内容区域）
    await page.click('.ant-layout-content');
    // 验证侧边栏是否隐藏
    await expect(page.locator('.mobile-sider')).not.toBeVisible();
  });

  test('5. 不同屏幕尺寸测试 - 手机端(≤768px)', async ({ page }) => {
    // 当前已设置为手机端尺寸，测试核心功能
    await page.click('.mobile-menu-btn');
    await expect(page.locator('.mobile-sider')).toBeVisible();
    await expect(page.locator('.ant-menu-item')).toBeVisible();
    await page.click('.mobile-menu-btn');
  });

  test('6. 不同屏幕尺寸测试 - 平板端(769px-1024px)', async ({ page }) => {
    // 切换到平板端尺寸
    await page.setViewportSize({ width: 800, height: 600 });
    
    // 检查桌面端侧边栏是否显示
    await expect(page.locator('.desktop-sider')).toBeVisible();
    
    // 检查移动端菜单按钮是否隐藏
    await expect(page.locator('.mobile-menu-btn')).not.toBeVisible();
    
    // 检查移动端侧边栏是否隐藏
    await expect(page.locator('.mobile-sider')).not.toBeVisible();
    
    // 测试侧边栏菜单项点击
    await page.click('text=表格定义');
    await expect(page).toHaveURL(/table-definition/);
    
    // 恢复手机端尺寸
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('7. 核心功能验证 - 移动端正常工作', async ({ page }) => {
    // 测试表格定义功能
    await page.click('.mobile-menu-btn');
    await page.click('text=表格定义');
    await expect(page).toHaveURL(/table-definition/);
    await expect(page.locator('.ant-card')).toBeVisible();
    
    // 测试已定义表格功能
    await page.click('.mobile-menu-btn');
    await page.click('text=已定义表格');
    await expect(page).toHaveURL(/defined-tables/);
    await expect(page.locator('.ant-table')).toBeVisible();
    
    // 测试报表统计功能
    await page.click('.mobile-menu-btn');
    await page.click('text=报表统计');
    await expect(page).toHaveURL(/reports/);
    await expect(page.locator('.ant-card')).toBeVisible();
  });
});

// 平板端独立测试
test.describe('平板端侧边栏功能测试', () => {
  test.use({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  });

  test.beforeEach(async ({ page }) => {
    await login(page, testAccounts.admin.username, testAccounts.admin.password);
  });

  test('平板端(769px-1024px) - 侧边栏显示和交互', async ({ page }) => {
    // 检查桌面端侧边栏是否显示
    await expect(page.locator('.desktop-sider')).toBeVisible();
    
    // 检查移动端菜单按钮是否隐藏
    await expect(page.locator('.mobile-menu-btn')).not.toBeVisible();
    
    // 检查移动端侧边栏是否隐藏
    await expect(page.locator('.mobile-sider')).not.toBeVisible();
    
    // 测试侧边栏菜单项点击
    await page.click('text=表格定义');
    await expect(page).toHaveURL(/table-definition/);
    
    await page.click('text=已定义表格');
    await expect(page).toHaveURL(/defined-tables/);
    
    await page.click('text=报表统计');
    await expect(page).toHaveURL(/reports/);
  });
});

// 桌面端测试 - 作为对比
test.describe('桌面端侧边栏功能测试', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  });

  test.beforeEach(async ({ page }) => {
    await login(page, testAccounts.admin.username, testAccounts.admin.password);
  });

  test('桌面端(≥1025px) - 侧边栏显示和交互', async ({ page }) => {
    // 检查桌面端侧边栏是否显示
    await expect(page.locator('.desktop-sider')).toBeVisible();
    
    // 检查移动端菜单按钮是否隐藏
    await expect(page.locator('.mobile-menu-btn')).not.toBeVisible();
    
    // 检查移动端侧边栏是否隐藏
    await expect(page.locator('.mobile-sider')).not.toBeVisible();
    
    // 测试侧边栏菜单项点击
    await page.click('text=表格定义');
    await expect(page).toHaveURL(/table-definition/);
  });
});