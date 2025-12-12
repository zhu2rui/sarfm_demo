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
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*table-definition/);
}

// 侧边栏交互测试
test.describe('侧边栏交互测试', () => {
  // 测试不同设备下的侧边栏表现
  const testDevices = [
    { name: 'Mobile', device: devices['iPhone 13'], viewport: { width: 375, height: 667 } },
    { name: 'Tablet', device: devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } }
  ];

  testDevices.forEach(({ name, device, viewport }) => {
    test(`[${name}] 验证侧边栏交互功能`, async ({ page }) => {
      // 设置设备
      await page.setViewportSize(viewport);
      await login(page, testAccounts.admin.username, testAccounts.admin.password);

      if (name === 'Mobile') {
        // 手机端：默认隐藏侧边栏，点击菜单按钮呼出
        // 验证移动端菜单按钮可见
        const mobileMenuBtn = page.locator('.mobile-menu-btn');
        await expect(mobileMenuBtn).toBeVisible();

        // 验证移动端侧边栏默认隐藏
        const mobileSider = page.locator('.mobile-sider');
        await expect(mobileSider).toHaveCSS('display', 'block');
        await expect(mobileSider).not.toBeVisible();

        // 点击菜单按钮呼出侧边栏
        await mobileMenuBtn.click();
        await expect(mobileSider).toBeVisible();

        // 点击菜单项，验证侧边栏关闭
        await page.click('.ant-menu-item:has-text("已定义表格")');
        await expect(page).toHaveURL(/.*defined-tables/);
        await expect(mobileSider).not.toBeVisible();
      } else {
        // 平板端：侧边栏默认显示
        const desktopSider = page.locator('.desktop-sider');
        await expect(desktopSider).toBeVisible();
      }
    });
  });
});

// 响应式布局测试
test.describe('响应式布局测试', () => {
  // 测试不同屏幕尺寸下的布局
  const screenSizes = [
    { name: 'Phone (≤768px)', width: 375, height: 667 },
    { name: 'Tablet (769px-1024px)', width: 1024, height: 768 },
    { name: 'Desktop (≥1025px)', width: 1280, height: 800 }
  ];

  screenSizes.forEach(({ name, width, height }) => {
    test(`[${name}] 验证响应式布局和核心功能`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await login(page, testAccounts.admin.username, testAccounts.admin.password);

      // 1. 表格定义功能测试
      await page.goto('http://localhost:3001/table-definition');
      
      // 验证页面元素可见
      await expect(page.locator('h1:has-text("表格定义")')).toBeVisible();
      await expect(page.locator('input[name="table_name"]')).toBeVisible();
      await expect(page.locator('button:has-text("添加列")')).toBeVisible();
      await expect(page.locator('button:has-text("创建表格")')).toBeVisible();

      // 2. 已定义表格功能测试
      await page.goto('http://localhost:3001/defined-tables');
      await expect(page.locator('h1:has-text("已定义表格")')).toBeVisible();
      await expect(page.locator('.ant-table')).toBeVisible();

      // 3. 报表统计功能测试
      await page.goto('http://localhost:3001/reports');
      await expect(page.locator('h1:has-text("报表统计")')).toBeVisible();

      // 4. 确保表格可以横向滚动（手机和平板）
      if (width <= 1024) {
        const tableContainer = page.locator('.ant-table-container');
        await expect(tableContainer).toBeVisible();
        // 验证表格容器具有横向滚动能力
        await expect(tableContainer).toHaveCSS('overflow-x', 'auto');
      }

      // 5. 验证UI元素可读性
      const textElements = page.locator('.ant-typography, .ant-table-cell, .ant-menu-title-content');
      await expect(textElements).toBeVisible();
      
      // 6. 验证操作按钮正常
      const buttons = page.locator('.ant-btn');
      await expect(buttons).toHaveCount(n => n > 0);
    });
  });
});

// 核心功能测试
test.describe('核心功能测试', () => {
  // 使用手机设备进行核心功能测试
  const mobileViewport = { width: 375, height: 667 };

  test('验证数据管理功能', async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await login(page, testAccounts.admin.username, testAccounts.admin.password);

    // 1. 先创建一个测试表格
    await page.goto('http://localhost:3001/table-definition');
    
    // 填写表格名称
    await page.fill('input[name="table_name"]', 'test_mobile_table');
    
    // 添加列
    await page.click('button:has-text("添加列")');
    await page.fill('input[name="columns[0][name]"]', 'name');
    await page.selectOption('select[name="columns[0][type]"]', 'string');
    
    await page.click('button:has-text("添加列")');
    await page.fill('input[name="columns[1][name]"]', 'value');
    await page.selectOption('select[name="columns[1][type]"]', 'number');
    
    // 创建表格
    await page.click('button:has-text("创建表格")');
    await page.waitForTimeout(1000);
    
    // 2. 查看已定义表格
    await page.goto('http://localhost:3001/defined-tables');
    await expect(page.locator('.ant-table-row:has-text("test_mobile_table")')).toBeVisible();
    
    // 3. 进入数据管理页面
    await page.click('.ant-table-row:has-text("test_mobile_table")');
    await expect(page).toHaveURL(/.*data-management/);
    
    // 4. 验证数据管理页面功能
    await expect(page.locator('button:has-text("添加数据")')).toBeVisible();
    await expect(page.locator('button:has-text("导入数据")')).toBeVisible();
    await expect(page.locator('button:has-text("导出数据")')).toBeVisible();
    
    // 5. 测试添加数据
    await page.click('button:has-text("添加数据")');
    await page.fill('.ant-modal input[name="name"]', 'test_item');
    await page.fill('.ant-modal input[name="value"]', '123');
    await page.click('.ant-modal button:has-text("确定")');
    await page.waitForTimeout(1000);
    
    // 验证数据添加成功
    await expect(page.locator('.ant-table-row:has-text("test_item")')).toBeVisible();
    
    // 6. 测试删除数据
    await page.locator('.ant-table-row:has-text("test_item") .ant-btn-dangerous').click();
    await page.click('.ant-modal-confirm-btns .ant-btn-dangerous');
    await page.waitForTimeout(1000);
    
    // 验证数据删除成功
    await expect(page.locator('.ant-table-row:has-text("test_item")')).not.toBeVisible();
  });

  test('验证权限控制功能', async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    
    // 测试管理员权限
    await login(page, testAccounts.admin.username, testAccounts.admin.password);
    await page.goto('http://localhost:3001/table-definition');
    await expect(page.locator('button:has-text("创建表格")')).toBeVisible();
    
    // 退出登录
    await page.click('button:has-text("退出登录")');
    await expect(page).toHaveURL(/.*login/);
    
    // 测试组员权限
    await login(page, testAccounts.member.username, testAccounts.member.password);
    await page.goto('http://localhost:3001/table-definition');
    // 组员应该没有创建表格的权限（根据实际实现调整）
  });
});

// 设备兼容性测试
test.describe('设备兼容性测试', () => {
  // 测试不同设备型号
  const testDevices = [
    { name: 'iPhone 13', device: devices['iPhone 13'] },
    { name: 'iPad (gen 7)', device: devices['iPad (gen 7)'] },
    { name: 'Samsung Galaxy S21', device: devices['Galaxy S21'] },
    { name: 'Google Pixel 5', device: devices['Pixel 5'] }
  ];

  testDevices.forEach(({ name, device }) => {
    test(`[${name}] 设备兼容性测试`, async ({ page }) => {
      // 设置设备
      await page.emulate(device);
      await login(page, testAccounts.admin.username, testAccounts.admin.password);

      // 基本功能验证
      const pagesToTest = [
        { url: '/table-definition', title: '表格定义' },
        { url: '/defined-tables', title: '已定义表格' },
        { url: '/reports', title: '报表统计' }
      ];

      for (const { url, title } of pagesToTest) {
        await page.goto(`http://localhost:3001${url}`);
        await expect(page).toHaveURL(new RegExp(url));
        await expect(page.locator(`h1:has-text("${title}")`)).toBeVisible();
      }

      // 验证触摸交互流畅性（通过点击操作验证）
      await page.click('.ant-menu-item:has-text("已定义表格")');
      await expect(page).toHaveURL(/.*defined-tables/);
      
      // 截取当前页面作为测试证据
      await page.screenshot({ path: `test-results/${name}-screenshot.png` });
    });
  });
});
