const http = require('http');

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(data);
        }
        req.end();
    });
}

async function testRepair() {
    console.log('🔧 Testing Cycle-Bees Repair Functionality\n');

    try {
        // First, get admin token
        console.log('1. Getting admin token...');
        const adminData = JSON.stringify({ username: 'admin', password: 'admin123' });
        const adminResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(adminData)
            }
        }, adminData);
        
        const adminToken = adminResponse.data.data.token;
        console.log('✅ Admin token obtained');

        // Test 2: Get repair services (public)
        console.log('\n2. Testing Get Repair Services (public)...');
        const servicesResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/services',
            method: 'GET'
        });
        console.log('✅ Repair Services:', servicesResponse.data.data.length, 'services found');

        // Test 3: Get time slots (public)
        console.log('\n3. Testing Get Time Slots (public)...');
        const timeSlotsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/time-slots',
            method: 'GET'
        });
        console.log('✅ Time Slots:', timeSlotsResponse.data.data.length, 'slots found');

        // Test 4: Get mechanic charge (public)
        console.log('\n4. Testing Get Mechanic Charge (public)...');
        const mechanicChargeResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/mechanic-charge',
            method: 'GET'
        });
        console.log('✅ Mechanic Charge:', '₹' + mechanicChargeResponse.data.data.amount);

        // Test 5: Admin - Get all repair requests
        console.log('\n5. Testing Admin - Get All Repair Requests...');
        const adminRequestsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/admin/requests',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        console.log('✅ Admin Requests:', adminRequestsResponse.data.data.requests.length, 'requests found');

        // Test 6: Admin - Get repair services
        console.log('\n6. Testing Admin - Get Repair Services...');
        const adminServicesResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/admin/services',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        console.log('✅ Admin Services:', adminServicesResponse.data.data.length, 'services found');

        // Test 7: Admin - Get mechanic charge
        console.log('\n7. Testing Admin - Get Mechanic Charge...');
        const adminMechanicChargeResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/admin/mechanic-charge',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        console.log('✅ Admin Mechanic Charge:', '₹' + adminMechanicChargeResponse.data.data.amount);

        // Test 8: Admin - Create new repair service
        console.log('\n8. Testing Admin - Create Repair Service...');
        const newServiceData = JSON.stringify({
            name: 'Test Service',
            description: 'Test service description',
            special_instructions: 'Test instructions',
            price: 150.00
        });
        const createServiceResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/admin/services',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(newServiceData),
                'Authorization': `Bearer ${adminToken}`
            }
        }, newServiceData);
        console.log('✅ Create Service:', createServiceResponse.data.message);

        console.log('\n🎉 Repair functionality is working correctly!');
        console.log('\n📋 Available Repair Endpoints:');
        console.log('Public:');
        console.log('- GET /api/repair/services');
        console.log('- GET /api/repair/time-slots');
        console.log('- GET /api/repair/mechanic-charge');
        console.log('\nUser (requires auth):');
        console.log('- POST /api/repair/requests');
        console.log('- GET /api/repair/requests');
        console.log('- GET /api/repair/requests/:id');
        console.log('\nAdmin (requires auth):');
        console.log('- GET /api/repair/admin/requests');
        console.log('- PATCH /api/repair/admin/requests/:id/status');
        console.log('- GET /api/repair/admin/services');
        console.log('- POST /api/repair/admin/services');
        console.log('- PUT /api/repair/admin/services/:id');
        console.log('- DELETE /api/repair/admin/services/:id');
        console.log('- GET /api/repair/admin/mechanic-charge');
        console.log('- PUT /api/repair/admin/mechanic-charge');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testRepair(); 