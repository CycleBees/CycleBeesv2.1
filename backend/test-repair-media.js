const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test media upload functionality
async function testMediaUpload() {
  console.log('🧪 Testing Media Upload Functionality...\n');

  // First, create a test user by sending OTP and then registering
  console.log('📱 Step 1: Creating test user...');
  
  const sendOtpResponse = await fetch('http://localhost:3000/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210' })
  });

  const sendOtpData = await sendOtpResponse.json();
  if (!sendOtpData.success) {
    console.log('❌ Failed to send OTP:', sendOtpData.message);
    return;
  }

  console.log('✅ OTP sent successfully');
  console.log('   Check console for OTP code...');

  // Wait a moment for OTP to be generated
  await new Promise(resolve => setTimeout(resolve, 1000));

  // For testing, we'll use a known OTP from the database
  // Let's check what OTP was stored
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('./database/cyclebees.db');
  
  db.get(
    'SELECT otp_code FROM otp_codes WHERE phone = ? ORDER BY created_at DESC LIMIT 1',
    ['9876543210'],
    async (err, row) => {
      if (err || !row) {
        console.log('❌ No OTP found in database');
        db.close();
        return;
      }

      const otp = row.otp_code;
      console.log(`   Using OTP: ${otp}`);

      // Verify OTP
      const verifyResponse = await fetch('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: '9876543210', 
          otp: otp
        })
      });

      const verifyData = await verifyResponse.json();
      if (!verifyData.success) {
        console.log('❌ Failed to verify OTP:', verifyData.message);
        db.close();
        return;
      }

      console.log('✅ OTP verified successfully');

      // If user doesn't exist, register them
      if (verifyData.data.isNewUser) {
        console.log('📝 Registering new user...');
        
        const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: '9876543210',
            full_name: 'Test User',
            email: 'test@example.com',
            age: 25,
            pincode: '123456',
            address: '123 Test Street, Test City'
          })
        });

        const registerData = await registerResponse.json();
        if (!registerData.success) {
          console.log('❌ Failed to register user:', registerData.message);
          db.close();
          return;
        }

        console.log('✅ User registered successfully');
      }

      const token = verifyData.data.token;
      console.log('✅ User authenticated successfully');

      // Test 1: Create repair request with photos (max 5)
      console.log('\n📸 Test 1: Creating repair request with photos...');
      
      const formData = new FormData();
      formData.append('services', JSON.stringify([1, 2])); // Tire Puncture, Brake Adjustment
      formData.append('preferred_date', '2024-12-25');
      formData.append('preferred_time_slot', '10-12pm');
      formData.append('notes', 'Test repair with media files');
      formData.append('payment_method', 'online');
      formData.append('address', '123 Test Street, Test City');
      formData.append('alternate_number', '9876543211');
      formData.append('email', 'test@example.com');

      // Add test photos (create dummy files)
      const testPhotos = [
        { name: 'photo1.jpg', content: 'dummy photo 1' },
        { name: 'photo2.jpg', content: 'dummy photo 2' },
        { name: 'photo3.jpg', content: 'dummy photo 3' },
        { name: 'photo4.jpg', content: 'dummy photo 4' },
        { name: 'photo5.jpg', content: 'dummy photo 5' }
      ];

      testPhotos.forEach((photo, index) => {
        const tempPath = path.join(__dirname, `temp_photo_${index}.jpg`);
        fs.writeFileSync(tempPath, photo.content);
        formData.append('files', fs.createReadStream(tempPath), photo.name);
      });

      try {
        const repairResponse = await fetch('http://localhost:3000/api/repair/requests', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            ...formData.getHeaders()
          },
          body: formData
        });

        const repairData = await repairResponse.json();
        
        if (repairData.success) {
          console.log('✅ Repair request with photos created successfully');
          console.log('   Request ID:', repairData.data.id);
          console.log('   Files uploaded:', repairData.data.files?.length || 0);
        } else {
          console.log('❌ Failed to create repair request:', repairData.message);
        }

        // Clean up temp files
        testPhotos.forEach((_, index) => {
          const tempPath = path.join(__dirname, `temp_photo_${index}.jpg`);
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        });

      } catch (error) {
        console.log('❌ Error creating repair request:', error.message);
      }

      // Test 2: Create repair request with video
      console.log('\n🎥 Test 2: Creating repair request with video...');
      
      const formData2 = new FormData();
      formData2.append('services', JSON.stringify([3])); // Chain Adjustment
      formData2.append('preferred_date', '2024-12-26');
      formData2.append('preferred_time_slot', '2-4pm');
      formData2.append('notes', 'Test repair with video file');
      formData2.append('payment_method', 'offline');
      formData2.append('address', '456 Test Avenue, Test City');

      // Add test video
      const testVideo = { name: 'test_video.mp4', content: 'dummy video content' };
      const tempVideoPath = path.join(__dirname, 'temp_video.mp4');
      fs.writeFileSync(tempVideoPath, testVideo.content);
      formData2.append('files', fs.createReadStream(tempVideoPath), testVideo.name);

      try {
        const repairResponse2 = await fetch('http://localhost:3000/api/repair/requests', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            ...formData2.getHeaders()
          },
          body: formData2
        });

        const repairData2 = await repairResponse2.json();
        
        if (repairData2.success) {
          console.log('✅ Repair request with video created successfully');
          console.log('   Request ID:', repairData2.data.id);
          console.log('   Files uploaded:', repairData2.data.files?.length || 0);
        } else {
          console.log('❌ Failed to create repair request:', repairData2.message);
        }

        // Clean up temp video file
        if (fs.existsSync(tempVideoPath)) {
          fs.unlinkSync(tempVideoPath);
        }

      } catch (error) {
        console.log('❌ Error creating repair request:', error.message);
      }

      // Test 3: Test admin endpoint to get requests with files
      console.log('\n👨‍💼 Test 3: Testing admin endpoint with files...');
      
      const adminLoginResponse = await fetch('http://localhost:3000/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });

      const adminLoginData = await adminLoginResponse.json();
      if (!adminLoginData.success) {
        console.log('❌ Failed to login as admin:', adminLoginData.message);
        db.close();
        return;
      }

      const adminToken = adminLoginData.data.token;
      console.log('✅ Admin authenticated successfully');

      try {
        const adminResponse = await fetch('http://localhost:3000/api/repair/admin/requests', {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });

        const adminData = await adminResponse.json();
        
        if (adminData.success) {
          console.log('✅ Admin requests retrieved successfully');
          console.log('   Total requests:', adminData.data.requests.length);
          
          // Check for requests with files
          const requestsWithFiles = adminData.data.requests.filter(req => req.files && req.files.length > 0);
          console.log('   Requests with files:', requestsWithFiles.length);
          
          requestsWithFiles.forEach((req, index) => {
            console.log(`   Request ${index + 1}: ${req.files.length} files`);
            req.files.forEach(file => {
              console.log(`     - ${file.file_type}: ${file.file_url}`);
            });
          });
        } else {
          console.log('❌ Failed to get admin requests:', adminData.message);
        }

      } catch (error) {
        console.log('❌ Error getting admin requests:', error.message);
      }

      console.log('\n🎉 Media upload testing completed!');
      db.close();
    }
  );
}

// Run the test
testMediaUpload().catch(console.error); 