import { test, expect } from '@playwright/test';

// 测试数据
const testData = {
  tableName: '测试表格_' + Date.now(),
  updatedTableName: '更新后的测试表格_' + Date.now(),
  columnName: '测试列',
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
  await expect(page.locator('text=表格定义')).toBeVisible();
});

test('TC_TB_CREATE_001 - 创建新表格', async ({ page }) => {
  // 进入表格定义页面
  await page.click('text=表格定义');
  await expect(page.locator('h3:has-text("表格定义")')).toBeVisible();
  
  // 填写表格信息
  await page.fill('input[placeholder="请输入总表名"]', testData.tableName);
  
  // 添加列
  await page.fill('input[placeholder="列名"]', testData.columnName);
  
  // 保存表格
  await page.click('button:has-text("保存表格")');
  
  // 验证表格创建成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  
  // 检查新表格是否显示在已定义表格列表中
  await page.click('text=已定义表格');
  await expect(page.locator(`text=${testData.tableName}`)).toBeVisible();
});

test('TC_TB_QUERY_001 - 查询表格', async ({ page }) => {
  // 进入已定义表格页面
  await page.click('text=已定义表格');
  await expect(page.locator('h3:has-text("已定义表格")')).toBeVisible();
  
  // 使用搜索功能
  await page.fill('input[placeholder="搜索表格名称"]', testData.tableName);
  await page.press('input[placeholder="搜索表格名称"]', 'Enter');
  
  // 验证搜索结果
  await expect(page.locator(`text=${testData.tableName}`)).toBeVisible();
  await expect(page.locator('.ant-card')).toHaveCount(1);
});

test('TC_TB_UPDATE_001 - 更新表格', async ({ page }) => {
  // 进入已定义表格页面
  await page.click('text=已定义表格');
  
  // 找到要更新的表格并点击编辑
  await page.locator(`.ant-card:has-text("${testData.tableName}")`).getByText('编辑').click();
  
  // 填写更新信息
  await page.fill('input[placeholder="请输入总表名"]', testData.updatedTableName);
  
  // 保存更新
  await page.click('button:has-text("保存修改")');
  
  // 验证更新成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  await expect(page.locator(`text=${testData.updatedTableName}`)).toBeVisible();
});

test('TC_TB_DELETE_001 - 删除表格', async ({ page }) => {
  // 进入已定义表格页面
  await page.click('text=已定义表格');
  
  // 找到要删除的表格并点击删除
  const tableCard = page.locator(`.ant-card:has-text("${testData.updatedTableName}")`);
  await tableCard.getByText('删除').click();
  
  // 确认删除
  await page.click('.ant-popconfirm-confirm');
  
  // 验证删除成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  await expect(page.locator(`text=${testData.updatedTableName}`)).not.toBeVisible();
});
