import { test, expect } from '@playwright/test';

// 测试PC端侧边栏是否正常显示（只有一个侧边栏）
test('PC端侧边栏显示正常', async ({ page }) => {
  await page.goto('http://localhost:3002/login');
  
  // 登录
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');
  
  // 等待页面加载完成
  await page.waitForSelector('.desktop-sider');
  
  // 检查PC端显示时，只有桌面端侧边栏可见，移动端侧边栏隐藏
  const desktopSider = await page.isVisible('.desktop-sider');
  const mobileSider = await page.isVisible('.mobile-sider');
  const mobileMenuBtn = await page.isVisible('.mobile-menu-btn');
  
  expect(desktopSider).toBeTruthy();
  expect(mobileSider).toBeFalsy();
  expect(mobileMenuBtn).toBeFalsy();
});

// 测试移动端布局适配
test('移动端布局适配', async ({ page }) => {
  // 设置为移动端视口
  await page.setViewportSize({ width: 375, height: 667 });
  
  await page.goto('http://localhost:3002/login');
  
  // 登录
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');
  
  // 等待页面加载完成
  await page.waitForTimeout(1000);
  
  // 检查移动端显示时，桌面端侧边栏隐藏，移动端菜单按钮可见
  const desktopSider = await page.isVisible('.desktop-sider');
  const mobileMenuBtn = await page.isVisible('.mobile-menu-btn');
  
  expect(desktopSider).toBeFalsy();
  expect(mobileMenuBtn).toBeTruthy();
});

// 测试移动端侧边栏功能
test('移动端侧边栏功能', async ({ page }) => {
  // 设置为移动端视口
  await page.setViewportSize({ width: 375, height: 667 });
  
  await page.goto('http://localhost:3002/login');
  
  // 登录
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');
  
  // 等待页面加载完成
  await page.waitForTimeout(1000);
  
  // 点击移动端菜单按钮
  await page.click('.mobile-menu-btn');
  
  // 检查侧边栏是否可见
  await page.waitForSelector('.mobile-sider');
  const mobileSider = await page.isVisible('.mobile-sider');
  
  expect(mobileSider).toBeTruthy();
  
  // 点击侧边栏菜单，应该关闭侧边栏
  await page.click('.mobile-sider .ant-menu-item');
  await page.waitForTimeout(1000);
  
  // 检查侧边栏是否隐藏
  const mobileSiderVisible = await page.isVisible('.mobile-sider');
  expect(mobileSiderVisible).toBeFalsy();
});

// 测试表格在移动端的适配
test('表格移动端适配', async ({ page }) => {
  // 设置为移动端视口
  await page.setViewportSize({ width: 375, height: 667 });
  
  await page.goto('http://localhost:3002/login');
  
  // 登录
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');
  
  // 等待页面加载完成
  await page.waitForTimeout(1000);
  
  // 导航到表格定义页面创建一个测试表格
  await page.click('text=表格定义');
  await page.waitForTimeout(1000);
  
  // 创建一个简单的表格
  await page.fill('input[name="table_name"]', 'test_table');
  await page.fill('input[name="description"]', 'Test Table');
  
  // 添加一个列
  await page.click('button:has-text("添加列")');
  await page.fill('input[name="columns[0].column_name"]', 'test_column');
  await page.selectOption('select[name="columns[0].data_type"]', 'TEXT');
  
  // 保存表格
  await page.click('button:has-text("保存表格")');
  await page.waitForTimeout(1000);
  
  // 导航到数据管理页面
  await page.click('text=数据管理');
  await page.waitForTimeout(1000);
  
  // 检查数据表格容器是否存在且有水平滚动
  const tableContainer = await page.$('.data-table-container');
  expect(tableContainer).toBeTruthy();
  
  // 检查表格是否可见且不溢出
  const table = await page.$('.ant-table');
  expect(table).toBeTruthy();
  
  // 检查表格内容是否溢出容器
  const tableRect = await table.boundingBox();
  const containerRect = await tableContainer.boundingBox();
  
  // 表格宽度应该大于或等于容器宽度
  expect(tableRect.width).toBeGreaterThanOrEqual(containerRect.width);
});