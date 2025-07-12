const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testStatusUpdateNotifications() {
  try {
    console.log('Testing status update notification system...\n');

    // Test 1: Get current requests
    console.log('1. Getting current requests...');
    const repairResponse = await axios.get(`${BASE_URL}/repair`);
    const rentalResponse = await axios.get(`${BASE_URL}/rental`);
    
    console.log(`Found ${repairResponse.data.length} repair requests`);
    console.log(`Found ${rentalResponse.data.length} rental requests`);

    // Test 2: Update a repair request status to approved
    if (repairResponse.data.length > 0) {
      const repairRequest = repairResponse.data[0];
      console.log(`\n2. Updating repair request #${repairRequest.id} status to 'approved'...`);
      
      const updateResponse = await axios.patch(`${BASE_URL}/repair/admin/requests/${repairRequest.id}/status`, {
        status: 'approved'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Repair request status updated successfully');
      console.log('Response:', updateResponse.data);
    }

    // Test 3: Update a rental request status to approved
    if (rentalResponse.data.length > 0) {
      const rentalRequest = rentalResponse.data[0];
      console.log(`\n3. Updating rental request #${rentalRequest.id} status to 'approved'...`);
      
      const updateResponse = await axios.patch(`${BASE_URL}/rental/admin/requests/${rentalRequest.id}/status`, {
        status: 'approved'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Rental request status updated successfully');
      console.log('Response:', updateResponse.data);
    }

    // Test 4: Update a repair request status to rejected with note
    if (repairResponse.data.length > 1) {
      const repairRequest = repairResponse.data[1];
      console.log(`\n4. Updating repair request #${repairRequest.id} status to 'rejected' with note...`);
      
      const updateResponse = await axios.patch(`${BASE_URL}/repair/admin/requests/${repairRequest.id}/status`, {
        status: 'rejected',
        rejectionNote: 'Test rejection - service not available at this time'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Repair request rejected successfully');
      console.log('Response:', updateResponse.data);
    }

    // Test 5: Update a rental request status to active
    if (rentalResponse.data.length > 1) {
      const rentalRequest = rentalResponse.data[1];
      console.log(`\n5. Updating rental request #${rentalRequest.id} status to 'active_rental'...`);
      
      const updateResponse = await axios.patch(`${BASE_URL}/rental/admin/requests/${rentalRequest.id}/status`, {
        status: 'active_rental'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Rental request activated successfully');
      console.log('Response:', updateResponse.data);
    }

    console.log('\n🎉 Status update notification tests completed!');
    console.log('\n📱 Check the mobile app to see the notification modals appear when status changes are detected.');

  } catch (error) {
    console.error('❌ Error testing status updates:', error.response?.data || error.message);
  }
}

testStatusUpdateNotifications(); 