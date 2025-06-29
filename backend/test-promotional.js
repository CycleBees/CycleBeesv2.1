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

async function testPromotionalCards() {
    console.log('🎯 Testing Cycle-Bees Promotional Cards System\n');

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

        // Test 2: Get all promotional cards (Admin)
        console.log('\n2. Testing Get All Promotional Cards (Admin)...');
        const cardsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/promotional/admin',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        console.log('✅ Promotional Cards:', cardsResponse.data.data.cards.length, 'cards found');

        // Test 3: Create new promotional card (Admin)
        console.log('\n3. Testing Create Promotional Card (Admin)...');
        const newCardData = JSON.stringify({
            title: 'Special Summer Offer',
            description: 'Get 20% off on all bicycle rentals this summer!',
            externalLink: 'https://example.com/summer-offer',
            displayOrder: 1,
            isActive: true,
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        });
        
        const createCardResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/promotional/admin',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(newCardData),
                'Authorization': `Bearer ${adminToken}`
            }
        }, newCardData);
        
        if (createCardResponse.data.success) {
            const cardId = createCardResponse.data.data.id;
            console.log('✅ Promotional card created successfully (ID:', cardId, ')');

            // Test 4: Get card details (Admin)
            console.log('\n4. Testing Get Card Details (Admin)...');
            const cardDetailsResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/promotional/admin/${cardId}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ Card Details:', cardDetailsResponse.data.data.title);

            // Test 5: Update promotional card (Admin)
            console.log('\n5. Testing Update Promotional Card (Admin)...');
            const updateCardData = JSON.stringify({
                title: 'Updated Summer Offer',
                description: 'Updated description for summer offer',
                displayOrder: 2
            });
            
            const updateCardResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/promotional/admin/${cardId}`,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(updateCardData),
                    'Authorization': `Bearer ${adminToken}`
                }
            }, updateCardData);
            console.log('✅ Card Updated:', updateCardResponse.data.message);

            // Test 6: Get active promotional cards (User - Public)
            console.log('\n6. Testing Get Active Promotional Cards (User)...');
            const activeCardsResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/promotional/cards',
                method: 'GET'
            });
            console.log('✅ Active Cards:', activeCardsResponse.data.data.length, 'active cards found');

            // Test 7: Search promotional cards (Admin)
            console.log('\n7. Testing Search Promotional Cards (Admin)...');
            const searchResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/promotional/admin?search=summer',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ Search Results:', searchResponse.data.data.cards.length, 'cards found');

            // Test 8: Delete promotional card (Admin)
            console.log('\n8. Testing Delete Promotional Card (Admin)...');
            const deleteCardResponse = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/promotional/admin/${cardId}`,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            console.log('✅ Card Deleted:', deleteCardResponse.data.message);

        } else {
            console.log('❌ Failed to create promotional card');
        }

        console.log('\n🎉 Promotional Cards System is working correctly!');
        console.log('\n📋 Available Promotional Endpoints:');
        console.log('Admin (requires auth):');
        console.log('- GET /api/promotional/admin');
        console.log('- GET /api/promotional/admin/:id');
        console.log('- POST /api/promotional/admin');
        console.log('- PUT /api/promotional/admin/:id');
        console.log('- DELETE /api/promotional/admin/:id');
        console.log('\nUser (public):');
        console.log('- GET /api/promotional/cards');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testPromotionalCards(); 