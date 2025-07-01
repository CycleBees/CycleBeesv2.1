const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function testRepairRequest() {
    console.log('🔧 Testing Repair Request Submission\n');

    try {
        // First, get a user token (we'll use admin for testing)
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

        // Get repair services to use in the request
        console.log('\n2. Getting repair services...');
        const servicesResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/services',
            method: 'GET'
        });
        
        const services = servicesResponse.data.data;
        if (services.length === 0) {
            console.log('❌ No repair services found');
            return;
        }
        
        const selectedService = services[0];
        console.log('✅ Using service:', selectedService.name);

        // Get time slots
        console.log('\n3. Getting time slots...');
        const timeSlotsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/time-slots',
            method: 'GET'
        });
        
        const timeSlots = timeSlotsResponse.data.data;
        if (timeSlots.length === 0) {
            console.log('❌ No time slots found');
            return;
        }
        
        const selectedTimeSlot = timeSlots[0];
        console.log('✅ Using time slot:', selectedTimeSlot.start_time, '-', selectedTimeSlot.end_time);

        // Get mechanic charge
        console.log('\n4. Getting mechanic charge...');
        const mechanicChargeResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/mechanic-charge',
            method: 'GET'
        });
        
        const mechanicCharge = mechanicChargeResponse.data.data.amount;
        console.log('✅ Mechanic charge:', '₹' + mechanicCharge);

        // Calculate total
        const totalAmount = selectedService.price + mechanicCharge;
        console.log('✅ Total amount:', '₹' + totalAmount);

        // Create FormData for repair request
        console.log('\n5. Creating repair request...');
        const formData = new FormData();
        
        // Add basic form fields
        formData.append('contactNumber', '9876543210');
        formData.append('alternateNumber', '9876543211');
        formData.append('email', 'test@example.com');
        formData.append('notes', 'Test repair request');
        formData.append('preferredDate', new Date().toISOString().split('T')[0]);
        formData.append('timeSlotId', selectedTimeSlot.id.toString());
        formData.append('paymentMethod', 'online');
        formData.append('totalAmount', totalAmount.toString());
        
        // Add services as JSON string
        formData.append('services', JSON.stringify([
          { serviceId: selectedService.id, price: selectedService.price, discountAmount: 0 }
        ]));

        // Create a test image file
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
        }

        // Add test image
        formData.append('files', fs.createReadStream(testImagePath), {
            filename: 'test-image.jpg',
            contentType: 'image/jpeg'
        });

        // Use provided user token for repair request
        const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInBob25lIjoiNzAwNTE5MjY1MCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzUxMjEzNDYzLCJleHAiOjE3NTE4MTgyNjN9.M0SRxgiAukeQ6jrjxFjlfEWT49QZmm5BGHDQqrCz1rI';
        // Submit the request
        const requestOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/repair/requests',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                ...formData.getHeaders()
            }
        };

        const repairResponse = await makeFormDataRequest(requestOptions, formData);
        
        if (repairResponse.status === 201) {
            console.log('✅ Repair request created successfully!');
            console.log('Request ID:', repairResponse.data.data.requestId);
        } else {
            console.log('❌ Failed to create repair request');
            console.log('Status:', repairResponse.status);
            console.log('Response:', repairResponse.data);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

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

function makeFormDataRequest(options, formData) {
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

        formData.pipe(req);
    });
}

testRepairRequest(); 