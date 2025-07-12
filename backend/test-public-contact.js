const axios = require('axios');

async function testPublicContactSettings() {
  try {
    console.log('Testing public contact settings endpoint...');
    
    // Test the public GET endpoint (no authentication required)
    console.log('\n1. Testing GET /api/contact/settings (public)...');
    try {
      const response = await axios.get('http://localhost:3000/api/contact/settings');
      console.log('✅ Public GET Response:', response.data);
      
      if (response.data.success && response.data.data) {
        console.log('✅ Contact settings found:');
        console.log('   Type:', response.data.data.type);
        console.log('   Value:', response.data.data.value);
        console.log('   Active:', response.data.data.is_active);
      } else {
        console.log('ℹ️ No contact settings configured');
      }
    } catch (error) {
      console.log('❌ Public GET Error Status:', error.response?.status);
      console.log('❌ Public GET Error Data:', error.response?.data);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testPublicContactSettings(); 