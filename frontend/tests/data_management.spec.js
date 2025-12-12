import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// 测试数据
const testData = {
  tableName: '数据管理测试表格_' + Date.now(),
  columnName: '测试数据列',
  dataValue: '测试数据值',
  updatedDataValue: '更新后的测试数据值',
  adminUser: {
    username: 'admin',
    password: 'admin123'
  }
};

// 创建测试用的CSV文件
const createTestCSV = (filePath) => {
  const csvContent = `${testData.columnName}\n测试数据1\n测试数据2\n测试数据3`;
  fs.writeFileSync(filePath, csvContent, 'utf8');
};

test.beforeEach(async ({ page }) => {
  // 登录系统
  await page.goto('/');
  await page.fill('input[name="username"]', testData.adminUser.username);
  await page.fill('input[name="password"]', testData.adminUser.password);
  await page.click('button[type="submit"]');
  
  // 验证登录成功
  await expect(page).toHaveURL('/');
  
  // 创建测试表格（如果不存在）
  await page.click('text=表格定义');
  await page.fill('input[placeholder="请输入总表名"]', testData.tableName);
  await page.fill('input[placeholder="列名"]', testData.columnName);
  await page.click('button:has-text("保存表格")');
  
  // 等待表格创建成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  
  // 进入数据管理页面
  await page.click('text=数据管理');
  
  // 选择刚创建的表格
  await page.click('.ant-select-selector');
  await page.click(`text=${testData.tableName}`);
});

test('TC_DM_ADD_001 - 添加数据', async ({ page }) => {
  // 点击添加数据按钮
  await page.click('button:has-text("添加数据")');
  
  // 填写数据
  await page.fill(`input[placeholder="请输入${testData.columnName}"]`, testData.dataValue);
  
  // 保存数据
  await page.click('button:has-text("保存")');
  
  // 验证数据添加成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  await expect(page.locator(`text=${testData.dataValue}`)).toBeVisible();
});

test('TC_DM_EDIT_001 - 编辑数据', async ({ page }) => {
  // 添加测试数据
  await page.click('button:has-text("添加数据")');
  await page.fill(`input[placeholder="请输入${testData.columnName}"]`, testData.dataValue);
  await page.click('button:has-text("保存")');
  await expect(page.locator('.ant-message-success')).toBeVisible();
  
  // 编辑数据
  await page.click('button:has-icon("EditOutlined")');
  await page.fill(`input[placeholder="请输入${testData.columnName}"]`, testData.updatedDataValue);
  await page.click('button:has-text("保存")');
  
  // 验证数据更新成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  await expect(page.locator(`text=${testData.updatedDataValue}`)).toBeVisible();
  await expect(page.locator(`text=${testData.dataValue}`)).not.toBeVisible();
});

test('TC_DM_DELETE_001 - 删除数据', async ({ page }) => {
  // 添加测试数据
  await page.click('button:has-text("添加数据")');
  await page.fill(`input[placeholder="请输入${testData.columnName}"]`, testData.dataValue);
  await page.click('button:has-text("保存")');
  await expect(page.locator('.ant-message-success')).toBeVisible();
  
  // 删除数据
  await page.click('button:has-icon("DeleteOutlined")');
  await page.click('.ant-popconfirm-confirm');
  
  // 验证数据删除成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  await expect(page.locator(`text=${testData.dataValue}`)).not.toBeVisible();
});

test('TC_DM_BATCH_DELETE_001 - 批量删除数据', async ({ page }) => {
  // 添加多条测试数据
  for (let i = 0; i < 3; i++) {
    await page.click('button:has-text("添加数据")');
    await page.fill(`input[placeholder="请输入${testData.columnName}"]`, `测试数据${i+1}`);
    await page.click('button:has-text("保存")');
    await expect(page.locator('.ant-message-success')).toBeVisible();
  }
  
  // 选择所有数据
  await page.click('.ant-table-thead .ant-checkbox-input');
  
  // 批量删除
  await page.click('button:has-text("批量删除")');
  await page.click('.ant-popconfirm-confirm');
  
  // 验证数据删除成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  await expect(page.locator('text=测试数据1')).not.toBeVisible();
  await expect(page.locator('text=测试数据2')).not.toBeVisible();
  await expect(page.locator('text=测试数据3')).not.toBeVisible();
});

test('TC_IMP_001 - 导入数据', async ({ page }) => {
  // 创建测试CSV文件
  const csvPath = path.join(__dirname, 'test_data.csv');
  createTestCSV(csvPath);
  
  // 点击导入数据按钮
  await page.click('button:has-icon("UploadOutlined")');
  
  // 上传CSV文件
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(csvPath);
  
  // 选择编码
  await page.click('.ant-select-selector');
  await page.click('text=UTF-8');
  
  // 确认导入
  await page.click('button:has-text("确认导入")');
  
  // 验证导入成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
  await expect(page.locator('text=测试数据1')).toBeVisible();
  await expect(page.locator('text=测试数据2')).toBeVisible();
  await expect(page.locator('text=测试数据3')).toBeVisible();
  
  // 删除测试文件
  fs.unlinkSync(csvPath);
});

test('TC_EXP_001 - 导出数据', async ({ page }) => {
  // 添加测试数据
  await page.click('button:has-text("添加数据")');
  await page.fill(`input[placeholder="请输入${testData.columnName}"]`, testData.dataValue);
  await page.click('button:has-text("保存")');
  await expect(page.locator('.ant-message-success')).toBeVisible();
  
  // 设置下载路径
  const downloadPromise = page.waitForEvent('download');
  
  // 点击导出数据按钮
  await page.click('button:has-text("导出数据")');
  
  // 选择编码
  await page.click('.ant-select-selector');
  await page.click('text=UTF-8');
  
  // 确认导出
  await page.click('button:has-text("确认导出")');
  
  // 获取下载文件
  const download = await downloadPromise;
  const filePath = path.join(__dirname, download.suggestedFilename());
  await download.saveAs(filePath);
  
  // 验证文件内容
  const fileContent = fs.readFileSync(filePath, 'utf8');
  expect(fileContent).toContain(testData.columnName);
  expect(fileContent).toContain(testData.dataValue);
  
  // 删除测试文件
  fs.unlinkSync(filePath);
});

test('TC_IMP_SAMPLE_001 - 下载示例CSV', async ({ page }) => {
  // 设置下载路径
  const downloadPromise = page.waitForEvent('download');
  
  // 点击下载示例CSV按钮
  await page.click('button:has-text("下载示例CSV")');
  
  // 获取下载文件
  const download = await downloadPromise;
  const filePath = path.join(__dirname, download.suggestedFilename());
  await download.saveAs(filePath);
  
  // 验证文件存在
  expect(fs.existsSync(filePath)).toBeTruthy();
  
  // 删除测试文件
  fs.unlinkSync(filePath);
});

test.afterEach(async ({ page }) => {
  // 删除测试表格
  await page.click('text=已定义表格');
  await page.locator(`.ant-card:has-text("${testData.tableName}")`).getByText('删除').click();
  await page.click('.ant-popconfirm-confirm');
  
  // 验证表格删除成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
});
