const axios = require('axios');

async function testContactSettings() {
  try {
    console.log('Testing contact settings endpoint...');
    
    // First, login as admin to get a proper token
    console.log('\n1. Logging in as admin...');
    let adminToken;
    try {
      const loginResponse = await axios.post('http://localhost:3000/api/auth/admin/login', {
        username: 'admin',
        password: 'admin123'
      });
      
      adminToken = loginResponse.data.data.token;
      console.log('✅ Admin login successful');
      console.log('Token:', adminToken.substring(0, 20) + '...');
    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.data || error.message);
      return;
    }
    
    // Test the GET endpoint
    console.log('\n2. Testing GET /api/contact/admin/contact-settings...');
    try {
      const getResponse = await axios.get('http://localhost:3000/api/contact/admin/contact-settings', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      console.log('✅ GET Response:', getResponse.data);
    } catch (error) {
      console.log('❌ GET Error Status:', error.response?.status);
      console.log('❌ GET Error Data:', error.response?.data);
    }
    
    // Test the POST endpoint
    console.log('\n3. Testing POST /api/contact/admin/contact-settings...');
    try {
      const postResponse = await axios.post('http://localhost:3000/api/contact/admin/contact-settings', {
        type: 'phone',
        value: '+1234567890'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });
      console.log('✅ POST Response:', postResponse.data);
    } catch (error) {
      console.log('❌ POST Error Status:', error.response?.status);
      console.log('❌ POST Error Data:', error.response?.data);
      console.log('❌ POST Error Message:', error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testContactSettings(); 