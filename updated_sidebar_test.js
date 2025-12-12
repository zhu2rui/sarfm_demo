const { chromium } = require('playwright');

async function testMobileSidebar() {
  console.log('开始测试修复后的移动端侧边栏功能...');
  console.log('='.repeat(60));

  // 启动浏览器
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 测试账号信息
  const testAccount = {
    username: 'admin',
    password: 'admin123'
  };

  // 前端服务地址（更新为正确的端口）
  const baseUrl = 'http://localhost:3001';

  try {
    // 1. 访问登录页面
    console.log('1. 访问登录页面');
    await page.goto(`${baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    console.log('   ✓ 登录页面加载成功');

    // 2. 登录系统
    console.log('2. 登录系统');
    // 使用Ant Design表单字段的选择器
    await page.fill('input[placeholder="用户名"]', testAccount.username);
    await page.fill('input[placeholder="密码"]', testAccount.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('   ✓ 登录成功');

    // 测试不同屏幕尺寸
    const screenSizes = [
      { name: '手机端', width: 375, height: 667 },
      { name: '平板端', width: 820, height: 1180 },
      { name: '桌面端', width: 1280, height: 800 }
    ];

    // 测试结果汇总
    const testResults = [];

    for (const { name, width, height } of screenSizes) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`3. 测试${name} (${width}x${height})`);
      
      // 设置屏幕尺寸
      await page.setViewportSize({ width, height });
      await page.waitForLoadState('networkidle');

      // 查找元素
      const mobileMenuBtn = page.locator('.menu-btn');
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
        const sizeResults = {
          screenSize: name,
          tests: []
        };

        // 测试1：菜单按钮点击交互 - 呼出侧边栏
        console.log('\n4. 测试菜单按钮点击交互');
        await mobileMenuBtn.click();
        await page.waitForTimeout(500);
        const siderVisibleAfterOpen = await mobileSider.isVisible();
        console.log(`   - 点击菜单按钮呼出侧边栏: ${siderVisibleAfterOpen ? '✓ 成功' : '✗ 失败'}`);
        sizeResults.tests.push({
          testName: '菜单按钮呼出侧边栏',
          result: siderVisibleAfterOpen ? '通过' : '失败'
        });
        
        // 测试2：遮罩层交互
        console.log('\n5. 测试遮罩层交互');
        const isOverlayVisible = await overlay.isVisible();
        console.log(`   - 遮罩层可见: ${isOverlayVisible}`);
        
        if (isOverlayVisible) {
          await overlay.click();
          await page.waitForTimeout(500);
          const siderHiddenAfterOverlayClick = !(await mobileSider.isVisible());
          console.log(`   - 点击遮罩层关闭侧边栏: ${siderHiddenAfterOverlayClick ? '✓ 成功' : '✗ 失败'}`);
          sizeResults.tests.push({
            testName: '遮罩层关闭侧边栏',
            result: siderHiddenAfterOverlayClick ? '通过' : '失败'
          });
          
          // 重新打开侧边栏进行后续测试
          await mobileMenuBtn.click();
          await page.waitForTimeout(500);
        } else {
          sizeResults.tests.push({
            testName: '遮罩层关闭侧边栏',
            result: '未执行（遮罩层不可见）'
          });
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
          console.log(`   - 点击菜单项后侧边栏关闭: ${siderHiddenAfterItemClick ? '✓ 成功' : '✗ 失败'}`);
          sizeResults.tests.push({
            testName: '点击菜单项关闭侧边栏',
            result: siderHiddenAfterItemClick ? '通过' : '失败'
          });
          
          // 等待页面导航完成
          await page.waitForLoadState('networkidle');
          console.log(`   - 页面导航成功: ${page.url()}`);
        } else {
          sizeResults.tests.push({
            testName: '点击菜单项关闭侧边栏',
            result: '未执行（无菜单项）'
          });
        }
        
        // 测试4：菜单按钮点击交互 - 隐藏侧边栏
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
        console.log(`   - 再次点击菜单按钮关闭侧边栏: ${siderHiddenAfterClose ? '✓ 成功' : '✗ 失败'}`);
        sizeResults.tests.push({
          testName: '菜单按钮关闭侧边栏',
          result: siderHiddenAfterClose ? '通过' : '失败'
        });

        // 将该尺寸的测试结果添加到汇总中
        testResults.push(sizeResults);
      } else {
        console.log(`\n   - ${name}不显示菜单按钮，跳过移动端侧边栏交互测试`);
        testResults.push({
          screenSize: name,
          tests: [{
            testName: '移动端侧边栏测试',
            result: '未执行（非移动端视图）'
          }]
        });
      }
    }

    // 输出测试报告
    console.log('\n' + '='.repeat(60));
    console.log('移动端侧边栏功能测试报告');
    console.log('='.repeat(60));
    console.log('\n测试结果汇总:');
    
    for (const sizeResult of testResults) {
      console.log(`\n${sizeResult.screenSize}:`);
      for (const test of sizeResult.tests) {
        console.log(`   - ${test.testName}: ${test.result}`);
      }
    }
    
    // 计算通过率
    let totalTests = 0;
    let passedTests = 0;
    
    for (const sizeResult of testResults) {
      for (const test of sizeResult.tests) {
        totalTests++;
        if (test.result === '通过') {
          passedTests++;
        }
      }
    }
    
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    console.log(`\n测试通过率: ${passRate}% (${passedTests}/${totalTests})`);
    
    if (passRate === '100.0') {
      console.log('\n🎉 所有测试通过！移动端侧边栏功能修复成功！');
    } else {
      console.log('\n⚠️  部分测试未通过，请检查修复情况。');
    }

    console.log('\n' + '='.repeat(60));
    console.log('移动端侧边栏功能测试完成！');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n测试过程中出现错误:', error.message);
    console.error('错误详情:', error);
  } finally {
    // 关闭浏览器
    await browser.close();
  }
}

// 运行测试
testMobileSidebar();
