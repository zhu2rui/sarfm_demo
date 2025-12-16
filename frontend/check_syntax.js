// 简单的语法检查脚本
const fs = require('fs');
const path = require('path');

// 要检查的文件路径
const filePaths = [
  './src/pages/DataManagement.jsx'
];

console.log('检查代码语法...');

filePaths.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // 简单的语法检查：尝试使用eval执行代码
    // 注意：这只是一个简单的语法检查，不能捕获所有错误
    eval(content);
    
    console.log(`✅ ${filePath} 语法检查通过`);
  } catch (error) {
    console.error(`❌ ${filePath} 语法检查失败:`);
    console.error(error.message);
    console.error(`错误位置: 行 ${error.lineNumber}, 列 ${error.columnNumber}`);
  }
});

console.log('语法检查完成');
