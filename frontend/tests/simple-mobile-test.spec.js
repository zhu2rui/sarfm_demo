import { test, expect, devices } from '@playwright/test';

// 测试账号信息
const testAccounts = {
  admin: { username: 'admin', password: 'admin123' },
  leader: { username: 'leader', password: 'leader123' },
  member: { username: 'member', password: 'member123' }
};

// 登录函数
async function login(page, username, password) {
  await page.goto('http://localhost:3001/login');
  console.log('当前URL:', page.url());
  
  // 等待登录页面加载完成
  await page.waitForLoadState('networkidle');
  
  // 使用 placeholder 定位输入框
  await page.fill('input[placeholder="用户名"]', username);
  await page.fill('input[placeholder="密码"]', password);
  await page.click('button[type="submit"]');
  
  // 等待页面跳转
  await page.waitForNavigation({
    waitUntil: 'networkidle',
    timeout: 10000
  });
  
  console.log('登录后URL:', page.url());
  await expect(page).toHaveURL(/.*table-definition/);
}

// 简单的移动端兼容性测试
test.describe('移动端兼容性测试', () => {
  test('移动端侧边栏交互测试', async ({ page }) => {
    // 设置手机设备
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, testAccounts.admin.username, testAccounts.admin.password);

    // 验证移动端菜单按钮可见
    const mobileMenuBtn = page.locator('.mobile-menu-btn');
    await expect(mobileMenuBtn).toBeVisible();

    // 点击菜单按钮呼出侧边栏
    await mobileMenuBtn.click();
    
    // 验证侧边栏可见
    const mobileSider = page.locator('.mobile-sider');
    await expect(mobileSider).toBeVisible();
    await page.waitForTimeout(500); // 等待侧边栏动画完成

    // 查找移动端侧边栏中的菜单项
    const menuItem = page.locator('.mobile-sider .ant-menu-item:has-text("已定义表格")');
    await expect(menuItem).toBeVisible();
    
    // 点击菜单项，验证页面跳转
    await menuItem.click();
    await expect(page).toHaveURL(/.*defined-tables/);
  });

  test('平板端布局测试', async ({ page }) => {
    // 设置平板设备
    await page.setViewportSize({ width: 1024, height: 768 });
    await login(page, testAccounts.admin.username, testAccounts.admin.password);

    // 验证桌面端侧边栏可见
    const desktopSider = page.locator('.desktop-sider');
    await expect(desktopSider).toBeVisible();

    // 验证内容区域可见
    const content = page.locator('.ant-layout-content');
    await expect(content).toBeVisible();
  });

  test('核心功能页面访问测试', async ({ page }) => {
    // 设置手机设备
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, testAccounts.admin.username, testAccounts.admin.password);

    // 测试访问不同页面
    const pages = [
      { url: '/defined-tables', title: '已定义表格' },
      { url: '/reports', title: '报表统计' }
    ];

    for (const { url, title } of pages) {
      console.log('访问页面:', url);
      await page.goto(`http://localhost:3001${url}`);
      await page.waitForLoadState('networkidle');
      console.log('当前页面URL:', page.url());
      
      // 验证页面跳转成功
      await expect(page).toHaveURL(new RegExp(url));
      
      // 验证页面标题可见
      const titleElement = page.locator(`h1:has-text("${title}")`);
      await expect(titleElement).toBeVisible();
    }
  });

  test('响应式表格测试', async ({ page }) => {
    // 设置手机设备
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, testAccounts.admin.username, testAccounts.admin.password);

    // 进入已定义表格页面
    await page.goto('http://localhost:3001/defined-tables');
    await page.waitForLoadState('networkidle');
    
    // 打印当前页面内容，用于调试
    console.log('当前页面标题:', await page.title());
    
    // 验证表格容器存在且可以横向滚动
    const tableContainer = page.locator('.ant-table-container');
    await expect(tableContainer).toBeVisible();
    await expect(tableContainer).toHaveCSS('overflow-x', 'auto');
  });
});
