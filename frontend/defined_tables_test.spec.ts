import { test, expect } from '@playwright/test';

test('第一次点击已定义表格时不应出现三条错误日志', async ({ page }) => {
  // 导航到登录页面
  await page.goto('http://localhost:3000/login');

  // 登录系统
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button:has-text("登 录")');

  // 等待页面加载完成
  await page.waitForURL('http://localhost:3000/table-definition');

  // 监听控制台错误
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // 点击菜单按钮展开侧边栏
  await page.click('button:has-text("menu")');

  // 点击已定义表格菜单项
  await page.click('a[href="/defined-tables"]');

  // 等待页面加载完成
  await page.waitForURL('http://localhost:3000/defined-tables');

  // 等待一段时间，确保所有控制台错误都已捕获
  await page.waitForTimeout(1000);

  // 验证控制台中没有出现那三条错误日志
  const hasScrollbarErrors = errors.some(error => 
    error.includes('Unsupported style property') && 
    (error.includes('::-webkit-scrollbar') || 
     error.includes('::-webkit-scrollbar-track') || 
     error.includes('::-webkit-scrollbar-thumb'))
  );

  expect(hasScrollbarErrors).toBe(false);
  console.log('测试通过：第一次点击已定义表格时没有出现三条错误日志');
});