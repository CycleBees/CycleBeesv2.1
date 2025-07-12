const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

console.log('🧪 Testing Mobile App Upload Simulation');
console.log('========================================\n');

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

// Simulate mobile app FormData
const simulateMobileUpload = async () => {
    console.log('📱 Simulating mobile app upload...');
    
    const formData = new FormData();
    
    // Add form fields (like mobile app does)
    formData.append('contactNumber', '1234567890');
    formData.append('alternateNumber', '0987654321');
    formData.append('email', 'test@example.com');
    formData.append('notes', 'Test repair request');
    formData.append('address', '123 Test Street, Test City');
    formData.append('preferredDate', '2024-01-15');
    formData.append('timeSlotId', '1');
    formData.append('paymentMethod', 'offline');
    formData.append('totalAmount', '500');
    formData.append('services', JSON.stringify([
        { serviceId: 1, price: 500, discountAmount: 0 }
    ]));
    
    // Add files (like mobile app does)
    formData.append('files', fs.createReadStream(testImagePath), {
        filename: 'test-image.jpg',
        contentType: 'image/jpeg'
    });
    
    console.log('FormData created with fields:', {
        contactNumber: '1234567890',
        alternateNumber: '0987654321',
        email: 'test@example.com',
        notes: 'Test repair request',
        address: '123 Test Street, Test City',
        preferredDate: '2024-01-15',
        timeSlotId: '1',
        paymentMethod: 'offline',
        totalAmount: '500',
        services: '[{"serviceId":1,"price":500,"discountAmount":0}]',
        files: 'test-image.jpg'
    });
    
    return formData;
};

// Test the upload
const testUpload = async () => {
    try {
        const formData = await simulateMobileUpload();
        
        console.log('\n🚀 Testing upload to server...');
        
        const http = require('http');
        
        return new Promise((resolve, reject) => {
            const boundary = formData.getBoundary();
            const headers = {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': formData.getLengthSync()
            };
            
            console.log('Request headers:', headers);
            
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/repair/requests',
                method: 'POST',
                headers: headers
            }, (res) => {
                console.log('Response status:', res.statusCode);
                console.log('Response headers:', res.headers);
                
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        console.log('Raw response:', data);
                        const result = JSON.parse(data);
                        resolve(result);
                    } catch (e) {
                        console.log('Response is not JSON:', data);
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Request timeout')));
            
            formData.pipe(req);
        });
    } catch (error) {
        console.error('Upload test failed:', error);
        throw error;
    }
};

// Run the test
testUpload()
    .then(result => {
        console.log('\n✅ Upload test completed successfully!');
        console.log('Result:', result);
    })
    .catch(error => {
        console.log('\n❌ Upload test failed:', error.message);
    })
    .finally(() => {
        console.log('\n🧹 Cleaning up...');
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
            console.log('Test image cleaned up');
        }
    }); 