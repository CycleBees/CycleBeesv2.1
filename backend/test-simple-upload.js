const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

console.log('🧪 Testing Simple File Upload');
console.log('==============================\n');

// Test 1: Check if test files exist
console.log('1. Checking test files...');
const testImagePath = path.join(__dirname, 'test-image.jpg');
const testVideoPath = path.join(__dirname, 'temp_video.mp4');

if (fs.existsSync(testImagePath)) {
    const stats = fs.statSync(testImagePath);
    console.log(`✅ Test image exists: ${(stats.size / 1024).toFixed(2)} KB`);
} else {
    console.log('❌ Test image not found');
}

if (fs.existsSync(testVideoPath)) {
    const stats = fs.statSync(testVideoPath);
    console.log(`✅ Test video exists: ${(stats.size / 1024).toFixed(2)} KB`);
} else {
    console.log('❌ Test video not found');
}

// Test 2: Check server health
console.log('\n2. Checking server health...');
const http = require('http');

const healthCheck = () => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/health',
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Request timeout')));
        req.end();
    });
};

healthCheck()
    .then(result => {
        console.log('✅ Server is running:', result);
    })
    .catch(error => {
        console.log('❌ Server health check failed:', error.message);
        process.exit(1);
    });

// Test 3: Check uploads directory
console.log('\n3. Checking uploads directory...');
const uploadsDir = path.join(__dirname, 'uploads', 'repair-requests');
if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    console.log(`✅ Uploads directory exists with ${files.length} files`);
    if (files.length > 0) {
        console.log('   Recent files:', files.slice(-3));
    }
} else {
    console.log('❌ Uploads directory does not exist');
}

console.log('\n✅ Simple upload test completed!');
console.log('Now try uploading files from the mobile app and check the server logs.'); 