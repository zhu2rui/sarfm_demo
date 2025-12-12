const { chromium } = require('playwright');

async function testMobileSidebar() {
  // 启动浏览器
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 导航到前端地址
  await page.goto('http://localhost:3005/');

  // 测试1：手机端（≤768px）
  console.log('=== 测试手机端（≤768px） ===');
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE尺寸
  await testSidebarFunctionality(page);

  // 测试2：平板端（769px-1024px）
  console.log('\n=== 测试平板端（769px-1024px） ===');
  await page.setViewportSize({ width: 820, height: 1180 }); // iPad Air尺寸
  await testSidebarFunctionality(page);

  // 测试3：桌面端（≥1025px）
  console.log('\n=== 测试桌面端（≥1025px） ===');
  await page.setViewportSize({ width: 1280, height: 800 }); // 桌面尺寸
  await testSidebarFunctionality(page);

  // 关闭浏览器
  await browser.close();
}

async function testSidebarFunctionality(page) {
  // 等待页面加载完成
  await page.waitForLoadState('networkidle');

  // 测试菜单按钮点击交互
  console.log('1. 测试菜单按钮点击交互');
  
  // 查找菜单按钮
  const menuButton = page.locator('button.menu-btn, button[aria-label="Menu"], .navbar-toggler');
  const sidebar = page.locator('.sidebar, .mobile-sidebar, #sidebar');
  const overlay = page.locator('.overlay, .sidebar-overlay, #sidebar-overlay');

  // 检查菜单按钮是否存在
  const menuButtonExists = await menuButton.isVisible();
  if (!menuButtonExists) {
    console.log('   - 菜单按钮不可见，跳过移动端测试');
    return;
  }

  // 点击菜单按钮呼出侧边栏
  await menuButton.click();
  await page.waitForTimeout(500);
  
  // 检查侧边栏是否显示
  const sidebarVisible = await sidebar.isVisible();
  console.log(`   - 点击菜单按钮呼出侧边栏: ${sidebarVisible ? '成功' : '失败'}`);

  // 点击遮罩层关闭侧边栏
  console.log('2. 测试遮罩层交互');
  if (await overlay.isVisible()) {
    await overlay.click();
    await page.waitForTimeout(500);
    const sidebarHidden = !(await sidebar.isVisible());
    console.log(`   - 点击遮罩层关闭侧边栏: ${sidebarHidden ? '成功' : '失败'}`);
    
    // 重新打开侧边栏
    await menuButton.click();
    await page.waitForTimeout(500);
  }

  // 测试侧边栏内部交互
  console.log('3. 测试侧边栏内部交互');
  
  // 获取侧边栏菜单项
  const menuItems = sidebar.locator('nav a, ul li a, .nav-link');
  const itemCount = await menuItems.count();
  
  if (itemCount > 0) {
    // 点击第一个菜单项
    const firstItem = menuItems.nth(0);
    const itemText = await firstItem.textContent();
    
    // 监听导航事件
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(() => {});
    
    await firstItem.click();
    await page.waitForTimeout(500);
    
    // 检查侧边栏是否关闭
    const sidebarHiddenAfterClick = !(await sidebar.isVisible());
    console.log(`   - 点击菜单项 "${itemText}" 后侧边栏关闭: ${sidebarHiddenAfterClick ? '成功' : '失败'}`);
    
    // 等待导航完成或超时
    await navigationPromise;
    
    // 返回首页继续测试
    await page.goto('http://localhost:3005/');
    await page.waitForLoadState('networkidle');
  }

  // 再次测试菜单按钮点击关闭侧边栏
  console.log('4. 再次测试菜单按钮点击关闭侧边栏');
  
  // 打开侧边栏
  await menuButton.click();
  await page.waitForTimeout(500);
  
  // 再次点击菜单按钮关闭侧边栏
  await menuButton.click();
  await page.waitForTimeout(500);
  
  const sidebarHidden = !(await sidebar.isVisible());
  console.log(`   - 再次点击菜单按钮关闭侧边栏: ${sidebarHidden ? '成功' : '失败'}`);
}

// 运行测试
testMobileSidebar().catch(err => {
  console.error('测试过程中出现错误:', err);
  process.exit(1);
});
