import { test, expect } from '@playwright/test';

// 测试设备列表
const mobileDevices = [
  'iPhone 12',
  'iPhone 13',
  'iPhone 14',
  'Samsung Galaxy S21',
  'Samsung Galaxy S22',
  'Samsung Galaxy S23',
  'iPad',
  'iPad Pro 11',
  'Pixel 5',
  'Pixel 6'
];

// 测试账号
const testAccounts = {
  admin: { username: 'admin', password: 'admin123' },
  leader: { username: 'leader', password: 'leader123' },
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

// 遍历所有设备进行测试
for (const device of mobileDevices) {
  for (const [role, account] of Object.entries(testAccounts)) {
    test.describe(`${device} - ${role} 用户测试`, () => {
      test.use({
        viewport: { width: 375, height: 667 },
        userAgent: device,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      });

      test.beforeEach(async ({ page }) => {
        await login(page, account.username, account.password);
      });

      test(`[${device}] 登录测试 - ${role}`, async ({ page }) => {
        await expect(page).toHaveURL(/dashboard/);
        await expect(page.locator('.ant-avatar')).toBeVisible();
      });

      test(`[${device}] 导航菜单测试 - ${role}`, async ({ page }) => {
        // 测试侧边栏菜单的可访问性
        await page.click('button.ant-menu-trigger');
        await expect(page.locator('.ant-menu')).toBeVisible();
        
        // 测试导航项
        const menuItems = page.locator('.ant-menu-item');
        const menuItemCount = await menuItems.count();
        expect(menuItemCount).toBeGreaterThanOrEqual(4);
      });

      // 测试核心功能
      test(`[${device}] 测试表格定义功能 - ${role}`, async ({ page }) => {
        await page.click('text=表格定义');
        await expect(page).toHaveURL(/table-definition/);
        // 验证表格定义页面元素
        await expect(page.locator('h1')).toContainText('表格定义');
        await expect(page.locator('button:has-text("添加表格")')).toBeVisible();
      });

      test(`[${device}] 测试数据管理功能 - ${role}`, async ({ page }) => {
        await page.click('text=数据管理');
        await expect(page).toHaveURL(/data-management/);
        // 验证数据管理页面元素
        await expect(page.locator('h1')).toContainText('数据管理');
        await expect(page.locator('input[placeholder="搜索"]')).toBeVisible();
      });

      test(`[${device}] 测试报表统计功能 - ${role}`, async ({ page }) => {
        await page.click('text=报表统计');
        await expect(page).toHaveURL(/reports/);
        // 验证报表统计页面元素
        await expect(page.locator('h1')).toContainText('报表统计');
        await expect(page.locator('.ant-card')).toBeVisible();
      });

      test(`[${device}] 测试权限控制功能 - ${role}`, async ({ page }) => {
        await page.click('text=用户管理');
        if (page.url().includes('user-management')) {
          await expect(page.locator('h1')).toContainText('用户管理');
        } else {
          // 无权限时应返回或显示错误
          await expect(page.locator('.ant-alert-error')).toBeVisible();
        }
      });
      
      // 测试响应式布局
      test(`[${device}] 测试响应式布局 - 竖屏 - ${role}`, async ({ page }) => {
        // 检查关键UI元素的可见性和布局
        await expect(page.locator('.ant-layout-header')).toBeVisible();
        await expect(page.locator('.ant-menu')).toBeVisible();
        await expect(page.locator('.ant-layout-content')).toBeVisible();
        
        // 检查触摸友好的元素大小
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        for (let i = 0; i < buttonCount && i < 10; i++) {
          const button = buttons.nth(i);
          const boundingBox = await button.boundingBox();
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        }
      });

      test(`[${device}] 测试响应式布局 - 横屏 - ${role}`, async ({ page }) => {
        // 切换到横屏
        await page.setViewportSize({
          width: 1024,
          height: 768
        });
        
        // 检查横屏布局
        await expect(page.locator('.ant-layout-header')).toBeVisible();
        await expect(page.locator('.ant-menu')).toBeVisible();
        await expect(page.locator('.ant-layout-content')).toBeVisible();
        
        // 恢复竖屏
        await page.setViewportSize({
          width: 375,
          height: 667
        });
      });
      
      // 测试性能
      test(`[${device}] 测试页面加载性能 - ${role}`, async ({ page }) => {
        const navigationPromise = page.waitForNavigation();
        await page.goto('http://localhost:3002/');
        await navigationPromise;
        
        // 测量页面加载时间
        const metrics = await page.evaluate(() => ({
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domContentLoadedTime: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
        }));
        
        // 验证加载时间在合理范围内
        expect(metrics.loadTime).toBeLessThan(5000);
        expect(metrics.domContentLoadedTime).toBeLessThan(3000);
      });
    });
  }
}

// 特殊测试：网络条件测试
test.describe('网络条件测试', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true
  });
  
  test('弱网络环境测试', async ({ page }) => {
    // 模拟慢网络
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000);
    });
    
    await login(page, testAccounts.admin.username, testAccounts.admin.password);
    await expect(page).toHaveURL(/dashboard/);
    
    // 测试数据加载
    await page.click('text=数据管理');
    await expect(page.locator('.ant-spin')).toBeVisible();
    await expect(page.locator('.ant-spin')).not.toBeVisible({ timeout: 10000 });
  });
});
