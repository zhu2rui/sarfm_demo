import { test, expect } from '@playwright/test';

// 测试数据
const testData = {
  tableName: '列控制测试表格_' + Date.now(),
  column1: '可见列',
  column2: '隐藏列',
  adminUser: {
    username: 'admin',
    password: 'admin123'
  }
};

test.beforeEach(async ({ page }) => {
  // 登录系统
  await page.goto('/');
  await page.fill('input[name="username"]', testData.adminUser.username);
  await page.fill('input[name="password"]', testData.adminUser.password);
  await page.click('button[type="submit"]');
  
  // 验证登录成功
  await expect(page).toHaveURL('/');
  
  // 创建测试表格
  await page.click('text=表格定义');
  await page.fill('input[placeholder="请输入总表名"]', testData.tableName);
  
  // 添加第一列（默认可见）
  await page.fill('input[placeholder="列名"]', testData.column1);
  
  // 添加第二列
  await page.click('button:has-text("+ 添加列")');
  await page.fill('input[placeholder="列名"]:nth-of-type(2)', testData.column2);
  
  // 保存表格
  await page.click('button:has-text("保存表格")');
  
  // 等待表格创建成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  
  // 进入数据管理页面
  await page.click('text=数据管理');
  
  // 选择刚创建的表格
  await page.click('.ant-select-selector');
  await page.click(`text=${testData.tableName}`);
  
  // 添加测试数据
  await page.click('button:has-text("添加数据")');
  await page.fill(`input[placeholder="请输入${testData.column1}"]`, '测试数据1');
  await page.fill(`input[placeholder="请输入${testData.column2}"]`, '测试数据2');
  await page.click('button:has-text("保存")');
  
  // 验证数据添加成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
});

test('TC_COL_HIDE_001 - 隐藏列', async ({ page }) => {
  // 点击列选择按钮
  await page.click('button:has-text("隐藏列")');
  
  // 取消选择要隐藏的列
  const checkbox = page.locator(`.ant-checkbox-wrapper:has-text("${testData.column2}") input`);
  await checkbox.uncheck();
  
  // 确认更改
  await page.click('button:has-text("确认")');
  
  // 验证列已隐藏
  await expect(page.locator(`th:has-text("${testData.column2}")`)).not.toBeVisible();
  await expect(page.locator(`td:has-text("测试数据2")`)).not.toBeVisible();
});

test('TC_COL_SHOW_001 - 显示列', async ({ page }) => {
  // 先隐藏列
  await page.click('button:has-text("隐藏列")');
  const checkbox = page.locator(`.ant-checkbox-wrapper:has-text("${testData.column2}") input`);
  await checkbox.uncheck();
  await page.click('button:has-text("确认")');
  
  // 验证列已隐藏
  await expect(page.locator(`th:has-text("${testData.column2}")`)).not.toBeVisible();
  
  // 再次点击列选择按钮
  await page.click('button:has-text("隐藏列")');
  
  // 选择要显示的列
  await checkbox.check();
  
  // 确认更改
  await page.click('button:has-text("确认")');
  
  // 验证列已显示
  await expect(page.locator(`th:has-text("${testData.column2}")`)).toBeVisible();
  await expect(page.locator(`td:has-text("测试数据2")`)).toBeVisible();
});

test.afterEach(async ({ page }) => {
  // 删除测试表格
  await page.click('text=已定义表格');
  await page.locator(`.ant-card:has-text("${testData.tableName}")`).getByText('删除').click();
  await page.click('.ant-popconfirm-confirm');
  
  // 验证表格删除成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
});
