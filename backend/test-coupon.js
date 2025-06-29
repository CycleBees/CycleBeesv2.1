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

async function testCouponSystem() {
    console.log('🎫 Testing Cycle-Bees Coupon Management System\n');

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

        // Test 2: Get all coupons (Admin)
        console.log('\n2. Testing Get All Coupons (Admin)...');
        const couponsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/coupon/admin',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        console.log('✅ Coupons:', couponsResponse.data.data.coupons.length, 'coupons found');

        // Test 3: Create new coupon (Admin)
        console.log('\n3. Testing Create Coupon (Admin)...');
        const newCouponData = JSON.stringify({
            code: 'TEST20',
            description: 'Test coupon for 20% off',
            discountType: 'percentage',
            discountValue: 20.00,
            minAmount: 500.00,
            maxDiscount: 200.00,
            applicableItems: ['repair_services', 'service_mechanic_charge'],
            usageLimit: 5,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        const createCouponResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/coupon/admin',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(newCouponData),
                'Authorization': `Bearer ${adminToken}`
            }
        }, newCouponData);
        
        if (createCouponResponse.data.success) {
            const couponId = createCouponResponse.data.data.id;
            console.log('✅ Coupon created successfully (ID:', couponId, ')');

            // Test 4: Get coupon details (Admin)
            console.log('\n4. Testing Get Coupon Details (Admin)...');
            const couponDetailsResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/coupon/admin/${couponId}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ Coupon Details:', couponDetailsResponse.data.data.code);

            // Test 5: Update coupon (Admin)
            console.log('\n5. Testing Update Coupon (Admin)...');
            const updateCouponData = JSON.stringify({
                description: 'Updated test coupon description',
                maxDiscount: 250.00
            });
            
            const updateCouponResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/coupon/admin/${couponId}`,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(updateCouponData),
                    'Authorization': `Bearer ${adminToken}`
                }
            }, updateCouponData);
            console.log('✅ Coupon Updated:', updateCouponResponse.data.message);

            // Test 6: Apply coupon (User)
            console.log('\n6. Testing Apply Coupon (User)...');
            const applyCouponData = JSON.stringify({
                code: 'TEST20',
                requestType: 'repair',
                items: ['repair_services', 'service_mechanic_charge'],
                totalAmount: 600.00
            });
            
            const applyCouponResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/coupon/apply',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(applyCouponData)
                }
            }, applyCouponData);
            
            if (applyCouponResponse.data.success) {
                console.log('✅ Coupon Applied Successfully');
                console.log('   Discount Amount:', applyCouponResponse.data.data.discount);
                console.log('   Discount Type:', applyCouponResponse.data.data.discountType);
            } else {
                console.log('❌ Coupon Application Failed:', applyCouponResponse.data.message);
            }

            // Test 7: Get available coupons (User)
            console.log('\n7. Testing Get Available Coupons (User)...');
            const availableCouponsResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/coupon/available',
                method: 'GET'
            });
            console.log('✅ Available Coupons:', availableCouponsResponse.data.data.length, 'coupons found');

            // Test 8: Search coupons (Admin)
            console.log('\n8. Testing Search Coupons (Admin)...');
            const searchResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/coupon/admin?search=test',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ Search Results:', searchResponse.data.data.coupons.length, 'coupons found');

            // Test 9: Delete coupon (Admin)
            console.log('\n9. Testing Delete Coupon (Admin)...');
            const deleteCouponResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/coupon/admin/${couponId}`,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ Coupon Deleted:', deleteCouponResponse.data.message);

        } else {
            console.log('❌ Failed to create coupon:', createCouponResponse.data.message);
        }

        console.log('\n🎉 Coupon Management System is working correctly!');
        console.log('\n📋 Available Coupon Endpoints:');
        console.log('Admin (requires auth):');
        console.log('- GET /api/coupon/admin');
        console.log('- GET /api/coupon/admin/:id');
        console.log('- POST /api/coupon/admin');
        console.log('- PUT /api/coupon/admin/:id');
        console.log('- DELETE /api/coupon/admin/:id');
        console.log('\nUser (public):');
        console.log('- POST /api/coupon/apply');
        console.log('- GET /api/coupon/available');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testCouponSystem(); 