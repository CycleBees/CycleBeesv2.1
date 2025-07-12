const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

console.log('🧪 Testing Authenticated File Upload');
console.log('=====================================\n');

// Create a simple test image
const testImagePath = path.join(__dirname, 'test-image.jpg');
if (!fs.existsSync(testImagePath)) {
    // Create a simple test image (1x1 pixel JPEG)
    const testImageData = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
        0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
        0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0x00,
        0x07, 0xFF, 0xD9
    ]);
    fs.writeFileSync(testImagePath, testImageData);
    console.log('✅ Created test image');
}

// HTTP request helper
const makeRequest = (options, data = null) => {
    return new Promise((resolve, reject) => {
        const http = require('http');
        
        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => reject(new Error('Request timeout')));
        
        if (data) {
            req.write(data);
        }
        req.end();
    });
};

// Step 1: Send OTP
const sendOTP = async (phone) => {
    console.log('📱 Step 1: Sending OTP...');
    
    const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/send-otp',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }, JSON.stringify({ phone }));
    
    console.log('OTP Response:', response);
    return response;
};

// Step 2: Verify OTP
const verifyOTP = async (phone, otp) => {
    console.log('🔐 Step 2: Verifying OTP...');
    
    const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/verify-otp',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }, JSON.stringify({ phone, otp }));
    
    console.log('Verify Response:', response);
    return response;
};

// Step 3: Test file upload with authentication
const testFileUpload = async (token) => {
    console.log('📤 Step 3: Testing file upload...');
    
    const formData = new FormData();
    
    // Add form fields
    formData.append('contactNumber', '9876543210');
    formData.append('alternateNumber', '8765432109');
    formData.append('email', 'test@example.com');
    formData.append('notes', 'Test repair request with file upload');
    formData.append('address', '123 Test Street, Test City');
    formData.append('preferredDate', '2024-01-15');
    formData.append('timeSlotId', '1');
    formData.append('paymentMethod', 'offline');
    formData.append('totalAmount', '500');
    formData.append('services', JSON.stringify([
        { serviceId: 1, price: 500, discountAmount: 0 }
    ]));
    
    // Add file
    formData.append('files', fs.createReadStream(testImagePath), {
        filename: 'test-image.jpg',
        contentType: 'image/jpeg'
    });
    
    const boundary = formData.getBoundary();
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formData.getLengthSync()
    };
    
    console.log('Upload headers:', headers);
    
    return new Promise((resolve, reject) => {
        const http = require('http');
        
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/requests',
            method: 'POST',
            headers: headers
        }, (res) => {
            console.log('Upload Response Status:', res.statusCode);
            console.log('Upload Response Headers:', res.headers);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    console.log('Raw response:', data);
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(15000, () => reject(new Error('Upload timeout')));
        
        formData.pipe(req);
    });
};

// Main test function
const runTest = async () => {
    try {
        const phone = '9876543210'; // Valid Indian mobile number
        
        // Step 1: Send OTP
        const otpResponse = await sendOTP(phone);
        if (otpResponse.status !== 200) {
            throw new Error(`OTP send failed: ${otpResponse.data.message || 'Unknown error'}`);
        }
        
        // Step 2: Verify OTP (using a test OTP - in real scenario, user would enter this)
        const verifyResponse = await verifyOTP(phone, '123456');
        if (verifyResponse.status !== 200) {
            throw new Error(`OTP verification failed: ${verifyResponse.data.message || 'Unknown error'}`);
        }
        
        const token = verifyResponse.data.token;
        console.log('✅ Authentication successful, token received');
        
        // Step 3: Test file upload
        const uploadResponse = await testFileUpload(token);
        console.log('Upload Response:', uploadResponse);
        
        if (uploadResponse.status === 201) {
            console.log('✅ File upload successful!');
            console.log('Request ID:', uploadResponse.data.data?.requestId);
        } else {
            console.log('❌ File upload failed:', uploadResponse.data);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        // Cleanup
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
            console.log('🧹 Test image cleaned up');
        }
    }
};

// Run the test
runTest(); 