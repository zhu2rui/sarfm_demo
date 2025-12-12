import { test, expect } from '@playwright/test';

// 测试数据
const testData = {
  tableName: '操作列测试表格_' + Date.now(),
  columnName: '测试数据列',
  dataValue: '测试数据值',
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
  
  // 添加一条测试数据
  await page.click('button:has-text("添加数据")');
  await page.fill(`input[placeholder="请输入${testData.columnName}"]`, testData.dataValue);
  await page.click('button:has-text("保存")');
  await expect(page.locator('.ant-message-success')).toBeVisible();
});

test('TC_ACTION_COL_001 - 操作列按钮布局检查', async ({ page }) => {
  // 检查操作列是否存在
  await expect(page.locator('th:has-text("操作")')).toBeVisible();
  
  // 检查操作列中的按钮
  const actionButtons = page.locator('.ant-table-tbody .ant-btn');
  await expect(actionButtons).toHaveCount(3); // 编辑、删除、展开按钮
  
  // 检查按钮是否在同一行
  const firstButton = actionButtons.nth(0);
  const secondButton = actionButtons.nth(1);
  const thirdButton = actionButtons.nth(2);
  
  const firstButtonBox = await firstButton.boundingBox();
  const secondButtonBox = await secondButton.boundingBox();
  const thirdButtonBox = await thirdButton.boundingBox();
  
  // 验证按钮在同一行（Y坐标和高度相近）
  expect(firstButtonBox.y).toBeCloseTo(secondButtonBox.y, 0);
  expect(secondButtonBox.y).toBeCloseTo(thirdButtonBox.y, 0);
  expect(firstButtonBox.height).toBeCloseTo(secondButtonBox.height, 0);
  expect(secondButtonBox.height).toBeCloseTo(thirdButtonBox.height, 0);
  
  // 验证按钮没有重叠
  expect(secondButtonBox.x).toBeGreaterThan(firstButtonBox.x + firstButtonBox.width);
  expect(thirdButtonBox.x).toBeGreaterThan(secondButtonBox.x + secondButtonBox.width);
});

test('TC_ACTION_COL_002 - 操作列按钮样式一致性检查', async ({ page }) => {
  // 检查所有按钮的尺寸和样式
  const actionButtons = page.locator('.ant-table-tbody .ant-btn');
  
  // 获取第一个按钮的样式作为基准
  const firstButton = actionButtons.nth(0);
  const firstButtonStyle = await firstButton.evaluate(el => {
    const computed = window.getComputedStyle(el);
    return {
      fontSize: computed.fontSize,
      padding: computed.padding,
      borderRadius: computed.borderRadius,
      height: computed.height
    };
  });
  
  // 验证所有按钮样式一致
  for (let i = 1; i < 3; i++) {
    const button = actionButtons.nth(i);
    const buttonStyle = await button.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        fontSize: computed.fontSize,
        padding: computed.padding,
        borderRadius: computed.borderRadius,
        height: computed.height
      };
    });
    
    expect(buttonStyle).toEqual(firstButtonStyle);
  }
});

test('TC_ACTION_COL_003 - 展开/收起功能测试', async ({ page }) => {
  // 找到展开按钮
  const expandButton = page.locator('.ant-table-tbody .ant-btn:has-text("展开")');
  await expect(expandButton).toBeVisible();
  
  // 点击展开按钮
  await expandButton.click();
  
  // 验证行已展开，展开按钮变为收起按钮
  await expect(page.locator('.ant-table-tbody .ant-btn:has-text("收起")')).toBeVisible();
  
  // 验证展开内容可见
  await expect(page.locator('.expanded-hidden-columns')).toBeVisible();
  
  // 点击收起按钮
  const collapseButton = page.locator('.ant-table-tbody .ant-btn:has-text("收起")');
  await collapseButton.click();
  
  // 验证行已收起，收起按钮变为展开按钮
  await expect(page.locator('.ant-table-tbody .ant-btn:has-text("展开")')).toBeVisible();
  
  // 验证展开内容不可见
  await expect(page.locator('.expanded-hidden-columns')).not.toBeVisible();
});

test('TC_ACTION_COL_004 - 按钮hover效果测试', async ({ page }) => {
  // 测试编辑按钮hover效果
  const editButton = page.locator('.ant-table-tbody .ant-btn-primary:has-text("编辑")');
  await editButton.hover();
  
  // 检查hover状态下的样式变化（这里可以根据实际样式调整检查内容）
  const editButtonStyle = await editButton.evaluate(el => {
    const computed = window.getComputedStyle(el);
    return {
      transform: computed.transform,
      boxShadow: computed.boxShadow
    };
  });
  
  // 验证hover时有效果（这里假设hover时有transform和box-shadow变化）
  expect(editButtonStyle.transform).not.toBe('none');
  
  // 测试删除按钮hover效果
  const deleteButton = page.locator('.ant-table-tbody .ant-btn-danger:has-text("删除")');
  await deleteButton.hover();
  
  const deleteButtonStyle = await deleteButton.evaluate(el => {
    const computed = window.getComputedStyle(el);
    return {
      backgroundColor: computed.backgroundColor
    };
  });
  
  // 验证删除按钮hover时颜色变化
  expect(deleteButtonStyle.backgroundColor).not.toBe('rgb(255, 77, 79)'); // 默认红色
  
  // 测试展开按钮hover效果
  const expandButton = page.locator('.ant-table-tbody .ant-btn-default:has-text("展开")');
  await expandButton.hover();
  
  const expandButtonStyle = await expandButton.evaluate(el => {
    const computed = window.getComputedStyle(el);
    return {
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor
    };
  });
  
  // 验证展开按钮hover时样式变化
  expect(expandButtonStyle.backgroundColor).not.toBe('rgb(255, 255, 255)'); // 默认背景色
});

test('TC_ACTION_COL_005 - 响应式布局测试', async ({ page }) => {
  // 测试桌面端布局（默认尺寸）
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // 检查操作列按钮是否正常显示
  await expect(page.locator('.ant-table-tbody .ant-btn')).toHaveCount(3);
  
  // 测试平板端布局
  await page.setViewportSize({ width: 768, height: 1024 });
  
  // 检查操作列按钮是否正常显示，没有重叠
  const actionButtons = page.locator('.ant-table-tbody .ant-btn');
  await expect(actionButtons).toHaveCount(3);
  
  // 验证按钮在平板端没有重叠
  const firstButtonBox = await actionButtons.nth(0).boundingBox();
  const secondButtonBox = await actionButtons.nth(1).boundingBox();
  const thirdButtonBox = await actionButtons.nth(2).boundingBox();
  
  expect(secondButtonBox.x).toBeGreaterThan(firstButtonBox.x + firstButtonBox.width);
  expect(thirdButtonBox.x).toBeGreaterThan(secondButtonBox.x + secondButtonBox.width);
  
  // 测试移动端布局
  await page.setViewportSize({ width: 480, height: 800 });
  
  // 检查操作列按钮是否正常显示，可能会换行但不应该重叠
  await expect(actionButtons).toHaveCount(3);
  
  // 验证按钮在移动端可以点击
  await expect(actionButtons.nth(0)).toBeEnabled();
  await expect(actionButtons.nth(1)).toBeEnabled();
  await expect(actionButtons.nth(2)).toBeEnabled();
  
  // 恢复默认视口
  await page.setViewportSize({ width: 1280, height: 720 });
});

test.afterEach(async ({ page }) => {
  // 删除测试表格
  await page.click('text=已定义表格');
  await page.locator(`.ant-card:has-text("${testData.tableName}")`).getByText('删除').click();
  await page.click('.ant-popconfirm-confirm');
  
  // 验证表格删除成功
  await expect(page.locator('.ant-message-success')).toBeVisible();
});
