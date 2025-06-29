const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let adminToken = '';

// Test data
const testUser = {
    phone: '9876543210',
    full_name: 'Test User',
    email: 'test@example.com',
    age: 25,
    pincode: '123456',
    address: 'Test Address'
};

// Helper function to make authenticated requests
const makeAuthRequest = async (method, url, data = null) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${url}`,
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Error in ${method} ${url}:`, error.response?.data || error.message);
        return null;
    }
};

// Test functions
const testAdminLogin = async () => {
    console.log('\n🔐 Testing Admin Login...');
    
    try {
        const response = await axios.post(`${BASE_URL}/auth/admin/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        if (response.data.success && response.data.data && response.data.data.token) {
            adminToken = response.data.data.token;
            console.log('✅ Admin login successful');
            console.log('Token:', adminToken.substring(0, 20) + '...');
            return true;
        } else {
            console.log('❌ Admin login failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Admin login error:', error.response?.data?.message || error.message);
        return false;
    }
};

const testDashboardOverview = async () => {
    console.log('\n📊 Testing Dashboard Overview...');
    
    const result = await makeAuthRequest('GET', '/dashboard/overview');
    
    if (result && result.success) {
        console.log('✅ Dashboard overview successful');
        console.log('Data:', JSON.stringify(result.data, null, 2));
        return true;
    } else {
        console.log('❌ Dashboard overview failed');
        return false;
    }
};

const testUserManagement = async () => {
    console.log('\n👥 Testing User Management...');
    
    // Test getting users list
    const usersResult = await makeAuthRequest('GET', '/dashboard/users?page=1&limit=5');
    
    if (usersResult && usersResult.success) {
        console.log('✅ User list successful');
        console.log('Users found:', usersResult.data.users.length);
        console.log('Pagination:', usersResult.data.pagination);
        
        // Test getting specific user details if users exist
        if (usersResult.data.users.length > 0) {
            const userId = usersResult.data.users[0].id;
            const userDetailsResult = await makeAuthRequest('GET', `/dashboard/users/${userId}`);
            
            if (userDetailsResult && userDetailsResult.success) {
                console.log('✅ User details successful');
                console.log('User:', userDetailsResult.data.user.full_name);
                console.log('Activity stats:', userDetailsResult.data.activity.statistics);
            } else {
                console.log('❌ User details failed');
            }
        }
        
        return true;
    } else {
        console.log('❌ User list failed');
        return false;
    }
};

const testRepairAnalytics = async () => {
    console.log('\n🔧 Testing Repair Analytics...');
    
    const result = await makeAuthRequest('GET', '/dashboard/analytics/repair?period=30');
    
    if (result && result.success) {
        console.log('✅ Repair analytics successful');
        console.log('Period:', result.data.period, 'days');
        console.log('Status stats:', result.data.statusStats);
        console.log('Daily stats count:', result.data.dailyStats.length);
        console.log('Top services count:', result.data.topServices.length);
        return true;
    } else {
        console.log('❌ Repair analytics failed');
        return false;
    }
};

const testRentalAnalytics = async () => {
    console.log('\n🚲 Testing Rental Analytics...');
    
    const result = await makeAuthRequest('GET', '/dashboard/analytics/rental?period=30');
    
    if (result && result.success) {
        console.log('✅ Rental analytics successful');
        console.log('Period:', result.data.period, 'days');
        console.log('Status stats:', result.data.statusStats);
        console.log('Daily stats count:', result.data.dailyStats.length);
        console.log('Top bicycles count:', result.data.topBicycles.length);
        return true;
    } else {
        console.log('❌ Rental analytics failed');
        return false;
    }
};

const testRecentActivity = async () => {
    console.log('\n📈 Testing Recent Activity...');
    
    const result = await makeAuthRequest('GET', '/dashboard/recent-activity?limit=5');
    
    if (result && result.success) {
        console.log('✅ Recent activity successful');
        console.log('Activities found:', result.data.length);
        result.data.forEach((activity, index) => {
            console.log(`${index + 1}. ${activity.type} - ${activity.user_name} - ${activity.status}`);
        });
        return true;
    } else {
        console.log('❌ Recent activity failed');
        return false;
    }
};

const testUserSearch = async () => {
    console.log('\n🔍 Testing User Search...');
    
    const result = await makeAuthRequest('GET', '/dashboard/users?search=test');
    
    if (result && result.success) {
        console.log('✅ User search successful');
        console.log('Search results:', result.data.users.length);
        return true;
    } else {
        console.log('❌ User search failed');
        return false;
    }
};

// Main test function
const runDashboardTests = async () => {
    console.log('🚀 Starting Dashboard Functionality Tests...\n');
    
    // Test admin login first
    const loginSuccess = await testAdminLogin();
    if (!loginSuccess) {
        console.log('❌ Cannot proceed without admin login');
        return;
    }
    
    // Run all dashboard tests
    const tests = [
        testDashboardOverview,
        testUserManagement,
        testRepairAnalytics,
        testRentalAnalytics,
        testRecentActivity,
        testUserSearch
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        const result = await test();
        if (result) passedTests++;
    }
    
    console.log('\n📋 Test Summary:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All dashboard tests passed! Dashboard functionality is working correctly.');
    } else {
        console.log('\n⚠️ Some dashboard tests failed. Please check the implementation.');
    }
};

// Run tests if this file is executed directly
if (require.main === module) {
    runDashboardTests().catch(console.error);
}

module.exports = {
    runDashboardTests,
    testAdminLogin,
    testDashboardOverview,
    testUserManagement,
    testRepairAnalytics,
    testRentalAnalytics,
    testRecentActivity,
    testUserSearch
}; 