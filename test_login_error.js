// Test script to verify login error handling
const axios = require('axios');

// Test cases for login error handling
const testCases = [
  {
    name: 'Invalid password',
    username: 'admin',
    password: 'wrongpassword',
    expectedError: '用户名或密码错误'
  },
  {
    name: 'Invalid username',
    username: 'nonexistent',
    password: 'admin123',
    expectedError: '用户名或密码错误'
  },
  {
    name: 'Empty password',
    username: 'admin',
    password: '',
    expectedError: '用户名或密码错误'
  }
];

async function testLogin() {
  console.log('Testing login error handling...');
  console.log('=' * 50);
  
  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log(`Username: ${testCase.username}`);
    console.log(`Password: ${testCase.password}`);
    
    try {
      const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
        username: testCase.username,
        password: testCase.password
      });
      
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(response.data)}`);
      console.log('Result: FAILED - Expected error but got success');
    } catch (error) {
      console.log(`Status: ${error.response ? error.response.status : 'Network Error'}`);
      const errorMessage = error.response ? error.response.data.message : error.message;
      console.log(`Error Message: ${errorMessage}`);
      
      if (errorMessage === testCase.expectedError) {
        console.log('Result: PASSED - Correct error message');
      } else {
        console.log(`Result: FAILED - Expected: "${testCase.expectedError}", Got: "${errorMessage}"`);
      }
    }
    
    console.log('-'.repeat(50));
  }
}

testLogin();
