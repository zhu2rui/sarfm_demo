const { chromium } = require('playwright');

async function testMobileSidebar() {
  console.log('开始测试修复后的移动端侧边栏功能...');
  console.log('='.repeat(50));

  // 启动浏览器
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 测试账号信息
  const testAccount = {
    username: 'admin',
    password: 'admin123'
  };

  try {
    // 1. 访问登录页面
    console.log('1. 访问登录页面');
    await page.goto('http://localhost:3005/login');
    await page.waitForLoadState('networkidle');
    console.log('   ✓ 登录页面加载成功');

    // 2. 登录系统
    console.log('2. 登录系统');
    await page.fill('input[name="username"]', testAccount.username);
    await page.fill('input[name="password"]', testAccount.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('   ✓ 登录成功');

    // 测试不同屏幕尺寸
    const screenSizes = [
      { name: '手机端', width: 375, height: 667 },
      { name: '平板端', width: 820, height: 1180 },
      { name: '桌面端', width: 1280, height: 800 }
    ];

    for (const { name, width, height } of screenSizes) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`3. 测试${name} (${width}x${height})`);
      await page.setViewportSize({ width, height });
      await page.waitForLoadState('networkidle');

      // 查找元素
      const mobileMenuBtn = page.locator('.mobile-menu-btn');
      const desktopSider = page.locator('.desktop-sider');
      const mobileSider = page.locator('.mobile-sider');
      const overlay = page.locator('div[style*="backgroundColor: rgba(0, 0, 0, 0.3)"]');

      // 检查菜单按钮是否可见
      const isMobileMenuVisible = await mobileMenuBtn.isVisible();
      const isDesktopSiderVisible = await desktopSider.isVisible();
      const isMobileSiderVisible = await mobileSider.isVisible();

      console.log(`   - 菜单按钮可见: ${isMobileMenuVisible}`);
      console.log(`   - 桌面端侧边栏可见: ${isDesktopSiderVisible}`);
      console.log(`   - 移动端侧边栏可见: ${isMobileSiderVisible}`);

      // 只有在移动端（菜单按钮可见）才测试侧边栏交互
      if (isMobileMenuVisible) {
        // 测试1：菜单按钮点击交互
        console.log('\n4. 测试菜单按钮点击交互');
        
        // 点击菜单按钮呼出侧边栏
        await mobileMenuBtn.click();
        await page.waitForTimeout(500);
        const siderVisibleAfterOpen = await mobileSider.isVisible();
        console.log(`   - 点击菜单按钮呼出侧边栏: ${siderVisibleAfterOpen ? '成功' : '失败'}`);
        
        // 测试2：遮罩层交互
        console.log('\n5. 测试遮罩层交互');
        const isOverlayVisible = await overlay.isVisible();
        console.log(`   - 遮罩层可见: ${isOverlayVisible}`);
        
        if (isOverlayVisible) {
          await overlay.click();
          await page.waitForTimeout(500);
          const siderHiddenAfterOverlayClick = !(await mobileSider.isVisible());
          console.log(`   - 点击遮罩层关闭侧边栏: ${siderHiddenAfterOverlayClick ? '成功' : '失败'}`);
          
          // 重新打开侧边栏进行后续测试
          await mobileMenuBtn.click();
          await page.waitForTimeout(500);
        }
        
        // 测试3：侧边栏内部交互
        console.log('\n6. 测试侧边栏内部交互');
        const firstMenuItem = mobileSider.locator('.ant-menu-item').nth(0);
        const menuItemText = await firstMenuItem.textContent();
        
        if (menuItemText) {
          console.log(`   - 准备点击菜单项: ${menuItemText}`);
          await firstMenuItem.click();
          await page.waitForTimeout(500);
          const siderHiddenAfterItemClick = !(await mobileSider.isVisible());
          console.log(`   - 点击菜单项后侧边栏关闭: ${siderHiddenAfterItemClick ? '成功' : '失败'}`);
          
          // 等待页面导航完成
          await page.waitForLoadState('networkidle');
          console.log(`   - 页面导航成功: ${page.url()}`);
        }
        
        // 测试4：再次点击菜单按钮关闭侧边栏
        console.log('\n7. 测试菜单按钮关闭侧边栏');
        
        // 确保侧边栏已打开
        if (!(await mobileSider.isVisible())) {
          await mobileMenuBtn.click();
          await page.waitForTimeout(500);
        }
        
        // 点击菜单按钮关闭侧边栏
        await mobileMenuBtn.click();
        await page.waitForTimeout(500);
        const siderHiddenAfterClose = !(await mobileSider.isVisible());
        console.log(`   - 再次点击菜单按钮关闭侧边栏: ${siderHiddenAfterClose ? '成功' : '失败'}`);
      } else {
        console.log(`\n   - ${name}不显示菜单按钮，跳过移动端侧边栏交互测试`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('移动端侧边栏功能测试完成！');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('测试过程中出现错误:', error.message);
  } finally {
    // 关闭浏览器
    await browser.close();
  }
}

// 运行测试
testMobileSidebar();
