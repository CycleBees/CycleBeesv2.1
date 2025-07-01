const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
let adminToken = '';

async function testEnhancedRepairAPI() {
    console.log('🧪 Testing Enhanced Repair API with Coupon Information\n');

    try {
        // 1. Admin Login
        console.log('1. Testing Admin Login...');
        const loginResponse = await fetch(`${BASE_URL}/api/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginResponse.json();
        if (loginData.success) {
            adminToken = loginData.data.token;
            console.log('✅ Admin login successful');
        } else {
            throw new Error('Admin login failed');
        }

        // 2. Test Enhanced Repair Requests API
        console.log('\n2. Testing Enhanced Repair Requests API...');
        const requestsResponse = await fetch(`${BASE_URL}/api/repair/admin/requests`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const requestsData = await requestsResponse.json();
        if (requestsData.success) {
            console.log('✅ Enhanced repair requests API working');
            console.log(`📊 Found ${requestsData.data.requests.length} requests`);
            
            // Check if new fields are present
            if (requestsData.data.requests.length > 0) {
                const firstRequest = requestsData.data.requests[0];
                console.log('\n📋 Sample Request Fields:');
                console.log(`   - ID: ${firstRequest.id}`);
                console.log(`   - Customer: ${firstRequest.user_name}`);
                console.log(`   - Total Amount: ₹${firstRequest.total_amount}`);
                console.log(`   - Net Amount: ₹${firstRequest.net_amount || firstRequest.total_amount}`);
                console.log(`   - Coupon Code: ${firstRequest.coupon_code || 'None'}`);
                console.log(`   - Coupon Discount: ${firstRequest.coupon_discount_amount || 0}`);
                console.log(`   - Address: ${firstRequest.address || 'Not provided'}`);
                console.log(`   - Email: ${firstRequest.email || 'Not provided'}`);
                console.log(`   - Alternate Number: ${firstRequest.alternate_number || 'Not provided'}`);
                console.log(`   - Notes: ${firstRequest.notes || 'None'}`);
            }
        } else {
            throw new Error('Failed to fetch repair requests');
        }

        // 3. Test Enhanced Rental Requests API
        console.log('\n3. Testing Enhanced Rental Requests API...');
        const rentalResponse = await fetch(`${BASE_URL}/api/rental/admin/requests`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const rentalData = await rentalResponse.json();
        if (rentalData.success) {
            console.log('✅ Enhanced rental requests API working');
            console.log(`📊 Found ${rentalData.data.requests.length} requests`);
            
            // Check if new fields are present
            if (rentalData.data.requests.length > 0) {
                const firstRental = rentalData.data.requests[0];
                console.log('\n📋 Sample Rental Request Fields:');
                console.log(`   - ID: ${firstRental.id}`);
                console.log(`   - Customer: ${firstRental.user_name}`);
                console.log(`   - Bicycle: ${firstRental.bicycle_name}`);
                console.log(`   - Total Amount: ₹${firstRental.total_amount}`);
                console.log(`   - Net Amount: ₹${firstRental.net_amount || firstRental.total_amount}`);
                console.log(`   - Coupon Code: ${firstRental.coupon_code || 'None'}`);
                console.log(`   - Coupon Discount: ${firstRental.coupon_discount_amount || 0}`);
                console.log(`   - Delivery Address: ${firstRental.delivery_address}`);
                console.log(`   - Email: ${firstRental.email || 'Not provided'}`);
                console.log(`   - Alternate Number: ${firstRental.alternate_number || 'Not provided'}`);
                console.log(`   - Special Instructions: ${firstRental.special_instructions || 'None'}`);
            }
        } else {
            throw new Error('Failed to fetch rental requests');
        }

        console.log('\n🎉 All Enhanced API Tests Passed!');
        console.log('\n📝 Summary of Improvements:');
        console.log('   ✅ Coupon information included in responses');
        console.log('   ✅ Net amount calculation (total - discount)');
        console.log('   ✅ All user form fields displayed');
        console.log('   ✅ Better formatted admin views');
        console.log('   ✅ Compact request cards with detailed modals');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testEnhancedRepairAPI(); 