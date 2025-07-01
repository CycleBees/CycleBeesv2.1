console.log('🧪 Testing Admin Repair Requests with Services\n');

async function testAdminServices() {
  try {
    // 1. Admin login to get token
    console.log('1. Getting admin token...');
    const adminResponse = await fetch('http://localhost:3000/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const adminData = await adminResponse.json();
    if (!adminData.success) {
      throw new Error('Admin login failed');
    }
    
    const adminToken = adminData.data.token;
    console.log('✅ Admin token obtained');

    // 2. Get repair requests with services
    console.log('\n2. Getting repair requests with services...');
    const requestsResponse = await fetch('http://localhost:3000/api/repair/admin/requests', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const requestsData = await requestsResponse.json();
    console.log('Response status:', requestsResponse.status);
    
    if (requestsResponse.ok && requestsData.success) {
      console.log(`✅ Found ${requestsData.data.requests.length} repair requests`);
      
      if (requestsData.data.requests.length > 0) {
        const request = requestsData.data.requests[0];
        console.log('\n📋 First Request Details:');
        console.log(`   - ID: ${request.id}`);
        console.log(`   - Customer: ${request.user_name}`);
        console.log(`   - Status: ${request.status}`);
        console.log(`   - Address: ${request.address || 'NULL'}`);
        console.log(`   - Services: ${Array.isArray(request.services) ? request.services.length : 'Not an array'}`);
        
        if (Array.isArray(request.services) && request.services.length > 0) {
          console.log('\n🔧 Services:');
          request.services.forEach((service, index) => {
            console.log(`   ${index + 1}. ${service.name} - ₹${service.price}`);
          });
        } else {
          console.log('   ❌ No services found or services not in correct format');
        }
      }
    } else {
      console.log('❌ Failed to fetch repair requests:', requestsData.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminServices(); 