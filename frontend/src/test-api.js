// 测试API连接和登录功能
import axios from 'axios';

console.log('=== 开始测试API连接 ===');

// 测试健康检查接口
console.log('\n1. 测试健康检查接口...');
axios.get('http://localhost:5000/health')
  .then(response => {
    console.log('   ✓ 成功！状态码:', response.status);
    console.log('   响应:', response.data);
  })
  .catch(error => {
    console.error('   ✗ 失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  });

// 测试登录接口
console.log('\n2. 测试登录接口...');
axios.post('http://localhost:5000/api/v1/auth/login', {
  username: 'admin',
  password: 'admin123'
})
  .then(response => {
    console.log('   ✓ 成功！状态码:', response.status);
    console.log('   响应:', response.data);
    
    // 如果登录成功，测试获取表格列表
    if (response.data.code === 200) {
      const token = response.data.data.token;
      console.log('\n3. 测试获取表格列表...');
      axios.get('http://localhost:5000/api/v1/tables', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        console.log('   ✓ 成功！状态码:', response.status);
        console.log('   响应:', response.data);
      })
      .catch(error => {
        console.error('   ✗ 失败:', error.message);
        if (error.response) {
          console.error('   响应状态:', error.response.status);
          console.error('   响应数据:', error.response.data);
        }
      });
    }
  })
  .catch(error => {
    console.error('   ✗ 失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  });

console.log('=== 测试完成 ===');