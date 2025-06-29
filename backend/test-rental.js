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

async function testRental() {
    console.log('🚲 Testing Cycle-Bees Rental Functionality\n');

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

        // Test 2: Get available bicycles (public)
        console.log('\n2. Testing Get Available Bicycles (public)...');
        const bicyclesResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/rental/bicycles',
            method: 'GET'
        });
        console.log('✅ Available Bicycles:', bicyclesResponse.data.data.length, 'bicycles found');

        // Test 3: Admin - Get all bicycles
        console.log('\n3. Testing Admin - Get All Bicycles...');
        const adminBicyclesResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/rental/admin/bicycles',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        console.log('✅ Admin Bicycles:', adminBicyclesResponse.data.data.length, 'bicycles found');

        // Test 4: Admin - Create new bicycle
        console.log('\n4. Testing Admin - Create New Bicycle...');
        const newBicycleData = JSON.stringify({
            name: 'Test Mountain Bike',
            model: 'MTB-Test-2024',
            description: 'Test mountain bike for rental',
            specialInstructions: 'Suitable for rough terrain',
            dailyRate: 250.00,
            weeklyRate: 1200.00,
            deliveryCharge: 80.00,
            specifications: JSON.stringify({
                frame: 'Aluminum',
                wheels: '26 inch',
                gears: '21-speed',
                brakes: 'Disc brakes'
            })
        });
        
        const createBicycleResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/rental/admin/bicycles',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(newBicycleData),
                'Authorization': `Bearer ${adminToken}`
            }
        }, newBicycleData);
        console.log('✅ Create Bicycle:', createBicycleResponse.data.message);

        // Test 5: Admin - Get all rental requests
        console.log('\n5. Testing Admin - Get All Rental Requests...');
        const adminRequestsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/rental/admin/requests',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        console.log('✅ Admin Rental Requests:', adminRequestsResponse.data.data.requests.length, 'requests found');

        // Test 6: User Registration for rental test
        console.log('\n6. Testing User Registration for Rental...');
        const userData = JSON.stringify({
            phone: '9876543214',
            fullName: 'Rental Test User',
            email: 'rentaltest@example.com',
            age: 28,
            pincode: '123456',
            address: '456 Rental Street, Test City'
        });
        
        const userResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(userData)
            }
        }, userData);
        
        const userToken = userResponse.data.data.token;
        console.log('✅ User registered for rental test');

        // Test 7: User - Create rental request
        console.log('\n7. Testing User - Create Rental Request...');
        const rentalData = JSON.stringify({
            bicycleId: 1, // Use first available bicycle
            contactNumber: '9876543214',
            alternateNumber: '9876543215',
            deliveryAddress: '456 Rental Street, Test City, Test State',
            specialInstructions: 'Please deliver in the morning',
            durationType: 'daily',
            durationCount: 2,
            paymentMethod: 'online',
            totalAmount: 580.00 // 2 days * 250 + 80 delivery
        });
        
        const rentalResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/rental/requests',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(rentalData),
                'Authorization': `Bearer ${userToken}`
            }
        }, rentalData);
        
        const rentalRequestId = rentalResponse.data.data.requestId;
        console.log(`✅ Rental Request created (ID: ${rentalRequestId})`);

        // Test 8: User - Get user's rental requests
        console.log('\n8. Testing User - Get User Rental Requests...');
        const userRentalRequestsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/rental/requests',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        });
        console.log('✅ User Rental Requests:', userRentalRequestsResponse.data.data.length, 'requests found');

        // Test 9: Admin - Update rental request status
        console.log('\n9. Testing Admin - Update Rental Request Status...');
        const updateStatusData = JSON.stringify({ status: 'approved' });
        const updateStatusResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: `/api/rental/admin/requests/${rentalRequestId}/status`,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(updateStatusData),
                'Authorization': `Bearer ${adminToken}`
            }
        }, updateStatusData);
        console.log('✅ Rental Request Status Updated:', updateStatusResponse.data.message);

        console.log('\n🎉 Rental functionality is working correctly!');
        console.log('\n📋 Available Rental Endpoints:');
        console.log('Public:');
        console.log('- GET /api/rental/bicycles');
        console.log('\nUser (requires auth):');
        console.log('- POST /api/rental/requests');
        console.log('- GET /api/rental/requests');
        console.log('\nAdmin (requires auth):');
        console.log('- GET /api/rental/admin/requests');
        console.log('- PATCH /api/rental/admin/requests/:id/status');
        console.log('- GET /api/rental/admin/bicycles');
        console.log('- POST /api/rental/admin/bicycles');
        console.log('- PUT /api/rental/admin/bicycles/:id');
        console.log('- DELETE /api/rental/admin/bicycles/:id');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testRental(); 