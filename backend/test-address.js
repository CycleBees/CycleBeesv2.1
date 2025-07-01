const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:3000';

async function testAddressField() {
    console.log('🧪 Testing Address Field in Repair Requests\n');

    try {
        // 1. Admin Login
        console.log('1. Testing Admin Login...');
        const loginResponse = await fetch(`${BASE_URL}/api/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginResponse.json();
        if (!loginData.success) {
            throw new Error('Admin login failed');
        }

        const adminToken = loginData.data.token;
        console.log('✅ Admin login successful');

        // 2. Test Repair Requests API
        console.log('\n2. Testing Repair Requests API for address field...');
        const requestsResponse = await fetch(`${BASE_URL}/api/repair/admin/requests`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const requestsData = await requestsResponse.json();
        if (requestsData.success) {
            console.log(`✅ Found ${requestsData.data.requests.length} repair requests`);
            
            if (requestsData.data.requests.length > 0) {
                const firstRequest = requestsData.data.requests[0];
                console.log('\n📋 First Request Fields:');
                console.log(`   - ID: ${firstRequest.id}`);
                console.log(`   - Customer: ${firstRequest.user_name}`);
                console.log(`   - Address: ${firstRequest.address || 'NULL/Not provided'}`);
                console.log(`   - Contact Number: ${firstRequest.contact_number || 'NULL'}`);
                console.log(`   - Alternate Number: ${firstRequest.alternate_number || 'NULL'}`);
                console.log(`   - Email: ${firstRequest.email || 'NULL'}`);
                console.log(`   - Notes: ${firstRequest.notes || 'NULL'}`);
                
                // Check if address exists in the response
                if (firstRequest.address) {
                    console.log('✅ Address field is present in the response');
                } else {
                    console.log('⚠️  Address field is NULL or not present');
                }
            }
        } else {
            throw new Error('Failed to fetch repair requests');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAddressField(); 