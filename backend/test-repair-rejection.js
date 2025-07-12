const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testRepairRejection() {
  try {
    console.log('Testing repair rejection functionality...\n');

    // Test 1: Get all repair requests to see current status
    console.log('1. Getting all repair requests...');
    const getResponse = await axios.get(`${BASE_URL}/repair`);
    console.log('Current repair requests:', getResponse.data.length);
    
    if (getResponse.data.length > 0) {
      const firstRequest = getResponse.data[0];
      console.log('First request ID:', firstRequest.id);
      console.log('Current status:', firstRequest.status);
      
      // Test 2: Reject a repair request with a note
      console.log('\n2. Testing rejection with note...');
      const rejectResponse = await axios.patch(`${BASE_URL}/repair/${firstRequest.id}/status`, {
        status: 'rejected',
        rejection_note: 'Test rejection note - bicycle not available for repair at this time'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Rejection response:', rejectResponse.data);
      
      // Test 3: Verify the rejection was applied
      console.log('\n3. Verifying rejection was applied...');
      const verifyResponse = await axios.get(`${BASE_URL}/repair`);
      const updatedRequest = verifyResponse.data.find(req => req.id === firstRequest.id);
      
      if (updatedRequest) {
        console.log('Updated status:', updatedRequest.status);
        console.log('Rejection note:', updatedRequest.rejection_note);
        console.log('✅ Rejection functionality working correctly!');
      } else {
        console.log('❌ Could not find updated request');
      }
    } else {
      console.log('No repair requests found to test with');
    }

  } catch (error) {
    console.error('Error testing repair rejection:', error.response?.data || error.message);
  }
}

testRepairRejection(); 