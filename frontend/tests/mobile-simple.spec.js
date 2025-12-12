import { test, expect } from '@playwright/test';

// 简化测试设备列表
const mobileDevices = [
  'iPhone 12',
  'Samsung Galaxy S21',
  'iPad'
];

// 测试账号
const testAccounts = {
  admin: { username: 'admin', password: 'admin123' },
  member: { username: 'member', password: 'member123' }
};

// 登录函数
async function login(page, username, password) {
  await page.goto('http://localhost:3002/');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);
}

// 遍历关键设备进行测试
for (const device of mobileDevices) {
  for (const [role, account] of Object.entries(testAccounts)) {
    test.describe(`${device} - ${role} 用户测试`, () => {
      test.use({
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      });

      test.beforeEach(async ({ page }) => {
        await login(page, account.username, account.password);
      });

      test(`[${device}] 登录和基本布局测试 - ${role}`, async ({ page }) => {
        await expect(page).toHaveURL(/dashboard/);
        await expect(page.locator('.ant-layout-header')).toBeVisible();
        await expect(page.locator('.ant-menu')).toBeVisible();
        await expect(page.locator('.ant-layout-content')).toBeVisible();
      });

      test(`[${device}] 核心功能访问测试 - ${role}`, async ({ page }) => {
        // 测试表格定义功能
        await page.click('text=表格定义');
        await expect(page).toHaveURL(/table-definition/);
        await expect(page.locator('h1')).toContainText('表格定义');
        
        // 测试数据管理功能
        await page.click('text=数据管理');
        await expect(page).toHaveURL(/data-management/);
        await expect(page.locator('h1')).toContainText('数据管理');
        
        // 测试报表统计功能
        await page.click('text=报表统计');
        await expect(page).toHaveURL(/reports/);
        await expect(page.locator('h1')).toContainText('报表统计');
      });

      test(`[${device}] 响应式布局测试 - ${role}`, async ({ page }) => {
        // 竖屏测试 - 检查触摸友好的元素大小
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        if (buttonCount > 0) {
          const firstButton = buttons.nth(0);
          const boundingBox = await firstButton.boundingBox();
          expect(boundingBox.width).toBeGreaterThanOrEqual(40);
          expect(boundingBox.height).toBeGreaterThanOrEqual(40);
        }
        
        // 横屏测试
        await page.setViewportSize({
          width: 1024,
          height: 768
        });
        
        await expect(page.locator('.ant-layout-header')).toBeVisible();
        await expect(page.locator('.ant-menu')).toBeVisible();
        
        // 恢复竖屏
        await page.setViewportSize({
          width: 375,
          height: 667
        });
      });

      test(`[${device}] 导航菜单测试 - ${role}`, async ({ page }) => {
        // 测试导航菜单的可访问性
        const menuItems = page.locator('.ant-menu-item');
        const menuItemCount = await menuItems.count();
        expect(menuItemCount).toBeGreaterThanOrEqual(4);
      });
    });
  }
}

// 性能测试
test.describe('移动端性能测试', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true
  });
  
  test('页面加载性能测试', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3002/');
    const endTime = Date.now();
    
    // 验证页面加载时间
    const loadTime = endTime - startTime;
    console.log(`页面加载时间: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });
  
  test('登录性能测试', async ({ page }) => {
    const startTime = Date.now();
    await login(page, testAccounts.admin.username, testAccounts.admin.password);
    const endTime = Date.now();
    
    // 验证登录时间
    const loginTime = endTime - startTime;
    console.log(`登录时间: ${loginTime}ms`);
    expect(loginTime).toBeLessThan(3000);
  });
});
