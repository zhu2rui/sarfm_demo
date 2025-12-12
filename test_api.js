const axios = require('axios');

// 测试后端API连接
async function testBackendAPI() {
    console.log('测试后端API连接...');
    
    try {
        // 测试健康检查接口
        const healthResponse = await axios.get('http://localhost:5000/health');
        console.log('健康检查接口:', healthResponse.status, healthResponse.data);
        
        // 测试登录接口
        const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        console.log('登录接口:', loginResponse.status, loginResponse.data);
        
        // 如果登录成功，测试获取表格列表
        if (loginResponse.data.code === 200) {
            const token = loginResponse.data.data.token;
            const tablesResponse = await axios.get('http://localhost:5000/api/v1/tables', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('表格列表接口:', tablesResponse.status, tablesResponse.data);
        }
        
        console.log('所有API测试完成！');
    } catch (error) {
        console.error('API测试失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    }
}

// 测试前端页面访问
async function testFrontendAccess() {
    console.log('\n测试前端页面访问...');
    
    try {
        const response = await axios.get('http://localhost:3000');
        console.log('前端页面状态:', response.status);
        console.log('前端页面内容长度:', response.data.length, '字节');
        console.log('前端页面访问成功！');
    } catch (error) {
        console.error('前端页面访问失败:', error.message);
    }
}

// 运行测试
testBackendAPI().then(() => testFrontendAccess());