import { test, expect } from '@playwright/test';

test.describe('下拉列功能测试', () => {
  test('1. 表格列定义界面中，每列配置项显示"下拉显示"复选框', async ({ page }) => {
    // 导航到应用首页
    await page.goto('http://localhost:3003');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 直接导航到表格定义页面（假设已经登录或无需登录）
    await page.goto('http://localhost:3003/table-definition');
    
    // 等待表格定义页面加载完成
    await page.waitForSelector('.ant-card-title', { timeout: 10000 });
    
    // 验证是否显示"下拉显示"复选框
    const dropDownCheckbox = page.locator('span:has-text("下拉显示")');
    await expect(dropDownCheckbox).toBeVisible();
    
    // 验证添加新列时也会显示"下拉显示"复选框
    await page.click('button:has-text("+ 添加列")');
    await page.waitForTimeout(500); // 等待列添加完成
    const checkboxes = await page.locator('span:has-text("下拉显示")').all();
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  test('2. 默认视图仅显示未勾选"下拉显示"的列', async ({ page }) => {
    // 导航到应用首页
    await page.goto('http://localhost:3003');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 直接导航到数据管理页面（假设已经有测试表格和数据）
    await page.goto('http://localhost:3003/data-management');
    
    // 等待数据管理页面加载完成
    await page.waitForSelector('.ant-card-title', { timeout: 10000 });
    
    // 等待表格加载
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    
    // 这里假设已经有一个测试表格，其中包含一列勾选了"下拉显示"，一列未勾选
    // 验证默认视图只显示未勾选"下拉显示"的列
    // 注意：实际列名需要根据应用中的实际数据进行调整
    await expect(page.locator('th:has-text("列1")')).toBeVisible(); // 假设列1未勾选"下拉显示"
    await expect(page.locator('th:has-text("列2")')).toBeHidden(); // 假设列2勾选了"下拉显示"
  });

  test('3. 点击"展开"按钮显示下拉列，点击"收起"按钮隐藏下拉列', async ({ page }) => {
    // 导航到应用首页
    await page.goto('http://localhost:3003');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 直接导航到数据管理页面
    await page.goto('http://localhost:3003/data-management');
    
    // 等待数据管理页面加载完成
    await page.waitForSelector('.ant-card-title', { timeout: 10000 });
    
    // 等待表格和展开按钮加载
    await page.waitForSelector('button:has-text("展开")', { timeout: 10000 });
    
    // 点击"展开"按钮
    await page.click('button:has-text("展开")');
    await page.waitForTimeout(500); // 等待展开完成
    
    // 验证下拉列显示
    await expect(page.locator('.expanded-hidden-columns')).toBeVisible();
    
    // 验证按钮文本变为"收起"
    await expect(page.locator('button:has-text("收起")')).toBeVisible();
    
    // 点击"收起"按钮
    await page.click('button:has-text("收起")');
    await page.waitForTimeout(500); // 等待收起完成
    
    // 验证下拉列隐藏
    await expect(page.locator('.expanded-hidden-columns')).toBeHidden();
    
    // 验证按钮文本变回"展开"
    await expect(page.locator('button:has-text("展开")')).toBeVisible();
  });

  test('4. 与现有编辑、删除等功能的兼容性', async ({ page }) => {
    // 导航到应用首页
    await page.goto('http://localhost:3003');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 直接导航到数据管理页面
    await page.goto('http://localhost:3003/data-management');
    
    // 等待数据管理页面加载完成
    await page.waitForSelector('.ant-card-title', { timeout: 10000 });
    
    // 等待表格加载
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    
    // 验证编辑功能可用
    const editButton = page.locator('button:has-text("编辑")');
    await expect(editButton).toBeVisible();
    
    // 验证删除功能可用
    const deleteButton = page.locator('button:has-text("删除")');
    await expect(deleteButton).toBeVisible();
    
    // 验证添加功能可用
    const addButton = page.locator('button:has-text("添加数据")');
    await expect(addButton).toBeVisible();
    
    // 点击展开按钮后，验证编辑和删除功能仍然可用
    await page.click('button:has-text("展开")');
    await page.waitForTimeout(500); // 等待展开完成
    await expect(editButton).toBeVisible();
    await expect(deleteButton).toBeVisible();
  });

  test('5. 响应式布局在不同屏幕尺寸下的表现', async ({ page }) => {
    // 导航到应用首页
    await page.goto('http://localhost:3003');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 直接导航到数据管理页面
    await page.goto('http://localhost:3003/data-management');
    
    // 等待数据管理页面加载完成
    await page.waitForSelector('.ant-card-title', { timeout: 10000 });
    
    // 等待表格加载
    await page.waitForSelector('.ant-table', { timeout: 10000 });
    
    // 测试桌面端布局（默认）
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    await expect(page.locator('.multi-select-delete-component .ant-table')).toBeVisible();
    
    // 测试平板布局
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page.locator('.multi-select-delete-component .ant-table')).toBeVisible();
    
    // 测试移动端布局
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page.locator('.multi-select-delete-component .ant-table')).toBeVisible();
    
    // 验证移动端操作按钮自适应
    const actionButtons = await page.locator('.action-button').all();
    await expect(actionButtons.length).toBeGreaterThan(0);
    
    // 恢复默认视图
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});
