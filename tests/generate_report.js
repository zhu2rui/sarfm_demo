const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 测试报告生成函数
async function generateTestReport() {
  console.log('=== 开始生成测试报告 ===');
  
  try {
    // 创建报告目录
    const reportDir = path.join(__dirname, 'playwright-report');
    const screenshotsDir = path.join(reportDir, 'screenshots');
    const videosDir = path.join(reportDir, 'videos');
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // 执行Playwright测试并生成测试结果
    console.log('执行Playwright测试...');
    
    try {
      await execAsync('npx playwright test --output tests/playwright-report', {
        cwd: path.join(__dirname, '..')
      });
    } catch (error) {
      // 测试可能失败，但我们仍然需要生成报告
      console.log('测试执行完成，部分测试可能失败');
    }
    
    // 读取测试结果
    console.log('读取测试结果...');
    
    // 复制截图和视频到报告目录
    if (fs.existsSync(screenshotsDir)) {
      const screenshots = fs.readdirSync(screenshotsDir);
      console.log(`共生成 ${screenshots.length} 个错误截图`);
    }
    
    if (fs.existsSync(videosDir)) {
      const videos = fs.readdirSync(videosDir);
      console.log(`共生成 ${videos.length} 个错误视频`);
    }
    
    // 生成HTML报告
    console.log('生成HTML报告...');
    await execAsync('npx playwright show-report tests/playwright-report', {
      cwd: path.join(__dirname, '..')
    });
    
    console.log('=== 测试报告生成完成 ===');
    console.log(`HTML报告已生成，请在浏览器中打开: file://${path.join(__dirname, 'playwright-report', 'index.html')}`);
    
    return true;
  } catch (error) {
    console.error('生成测试报告时出错:', error);
    return false;
  }
}

// 执行测试报告生成
if (require.main === module) {
  generateTestReport().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = generateTestReport;
