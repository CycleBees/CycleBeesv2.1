const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test the fixed file upload functionality
async function testFixedFileUpload() {
  console.log('🧪 Testing Fixed File Upload Functionality...\n');

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

      // Test 1: Create repair request with 3 photos (should work)
      console.log('\n📸 Test 1: Creating repair request with 3 photos...');
      
      const formData = new FormData();
      formData.append('contactNumber', '9876543210');
      formData.append('alternateNumber', '9876543211');
      formData.append('email', 'test@example.com');
      formData.append('notes', 'Test repair with media files - FIXED');
      formData.append('address', '123 Test Street, Test City');
      formData.append('preferredDate', '2024-12-25');
      formData.append('timeSlotId', '1');
      formData.append('paymentMethod', 'online');
      formData.append('totalAmount', '500');
      formData.append('services', JSON.stringify([
        { serviceId: 1, price: 300, discountAmount: 0 },
        { serviceId: 2, price: 200, discountAmount: 0 }
      ]));

      // Add test photos (create dummy files)
      const testPhotos = [
        { name: 'photo1.jpg', content: 'dummy photo 1 content' },
        { name: 'photo2.png', content: 'dummy photo 2 content' },
        { name: 'photo3.gif', content: 'dummy photo 3 content' }
      ];

      testPhotos.forEach((photo, index) => {
        const tempPath = path.join(__dirname, `temp_photo_${index}.${photo.name.split('.').pop()}`);
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
          console.log('   Request ID:', repairData.data.requestId);
        } else {
          console.log('❌ Failed to create repair request:', repairData.message);
        }

        // Clean up temp files
        testPhotos.forEach((_, index) => {
          const tempPath = path.join(__dirname, `temp_photo_${index}.${testPhotos[index].name.split('.').pop()}`);
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        });

      } catch (error) {
        console.log('❌ Error creating repair request:', error.message);
      }

      // Test 2: Try to upload 6 photos (should fail)
      console.log('\n📸 Test 2: Testing file count validation (6 photos should fail)...');
      
      const formData2 = new FormData();
      formData2.append('contactNumber', '9876543210');
      formData2.append('alternateNumber', '9876543211');
      formData2.append('email', 'test@example.com');
      formData2.append('notes', 'Test repair with too many photos');
      formData2.append('address', '123 Test Street, Test City');
      formData2.append('preferredDate', '2024-12-25');
      formData2.append('timeSlotId', '1');
      formData2.append('paymentMethod', 'online');
      formData2.append('totalAmount', '300');
      formData2.append('services', JSON.stringify([
        { serviceId: 1, price: 300, discountAmount: 0 }
      ]));

      // Add 6 test photos (should fail validation)
      for (let i = 0; i < 6; i++) {
        const tempPath = path.join(__dirname, `temp_photo_excess_${i}.jpg`);
        fs.writeFileSync(tempPath, `dummy photo ${i} content`);
        formData2.append('files', fs.createReadStream(tempPath), `photo${i}.jpg`);
      }

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
        
        if (!repairData2.success) {
          console.log('✅ File count validation working correctly');
          console.log('   Error message:', repairData2.message);
        } else {
          console.log('❌ File count validation failed - request was accepted');
        }

        // Clean up temp files
        for (let i = 0; i < 6; i++) {
          const tempPath = path.join(__dirname, `temp_photo_excess_${i}.jpg`);
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }

      } catch (error) {
        console.log('❌ Error testing file count validation:', error.message);
      }

      // Test 3: Test video upload
      console.log('\n🎥 Test 3: Creating repair request with video...');
      
      const formData3 = new FormData();
      formData3.append('contactNumber', '9876543210');
      formData3.append('alternateNumber', '9876543211');
      formData3.append('email', 'test@example.com');
      formData3.append('notes', 'Test repair with video file');
      formData3.append('address', '123 Test Street, Test City');
      formData3.append('preferredDate', '2024-12-25');
      formData3.append('timeSlotId', '1');
      formData3.append('paymentMethod', 'offline');
      formData3.append('totalAmount', '400');
      formData3.append('services', JSON.stringify([
        { serviceId: 3, price: 400, discountAmount: 0 }
      ]));

      // Add test video
      const testVideo = { name: 'test_video.mp4', content: 'dummy video content' };
      const tempVideoPath = path.join(__dirname, 'temp_video.mp4');
      fs.writeFileSync(tempVideoPath, testVideo.content);
      formData3.append('files', fs.createReadStream(tempVideoPath), testVideo.name);

      try {
        const repairResponse3 = await fetch('http://localhost:3000/api/repair/requests', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            ...formData3.getHeaders()
          },
          body: formData3
        });

        const repairData3 = await repairResponse3.json();
        
        if (repairData3.success) {
          console.log('✅ Repair request with video created successfully');
          console.log('   Request ID:', repairData3.data.requestId);
        } else {
          console.log('❌ Failed to create repair request:', repairData3.message);
        }

        // Clean up temp video file
        if (fs.existsSync(tempVideoPath)) {
          fs.unlinkSync(tempVideoPath);
        }

      } catch (error) {
        console.log('❌ Error creating repair request with video:', error.message);
      }

      // Test 4: Test mixed files (photos + video)
      console.log('\n📸🎥 Test 4: Creating repair request with mixed files...');
      
      const formData4 = new FormData();
      formData4.append('contactNumber', '9876543210');
      formData4.append('alternateNumber', '9876543211');
      formData4.append('email', 'test@example.com');
      formData4.append('notes', 'Test repair with mixed files');
      formData4.append('address', '123 Test Street, Test City');
      formData4.append('preferredDate', '2024-12-25');
      formData4.append('timeSlotId', '1');
      formData4.append('paymentMethod', 'online');
      formData4.append('totalAmount', '600');
      formData4.append('services', JSON.stringify([
        { serviceId: 1, price: 300, discountAmount: 0 },
        { serviceId: 2, price: 300, discountAmount: 0 }
      ]));

      // Add 2 photos and 1 video
      for (let i = 0; i < 2; i++) {
        const tempPath = path.join(__dirname, `temp_mixed_photo_${i}.jpg`);
        fs.writeFileSync(tempPath, `dummy mixed photo ${i} content`);
        formData4.append('files', fs.createReadStream(tempPath), `mixed_photo${i}.jpg`);
      }

      const tempMixedVideoPath = path.join(__dirname, 'temp_mixed_video.mp4');
      fs.writeFileSync(tempMixedVideoPath, 'dummy mixed video content');
      formData4.append('files', fs.createReadStream(tempMixedVideoPath), 'mixed_video.mp4');

      try {
        const repairResponse4 = await fetch('http://localhost:3000/api/repair/requests', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            ...formData4.getHeaders()
          },
          body: formData4
        });

        const repairData4 = await repairResponse4.json();
        
        if (repairData4.success) {
          console.log('✅ Repair request with mixed files created successfully');
          console.log('   Request ID:', repairData4.data.requestId);
        } else {
          console.log('❌ Failed to create repair request:', repairData4.message);
        }

        // Clean up temp files
        for (let i = 0; i < 2; i++) {
          const tempPath = path.join(__dirname, `temp_mixed_photo_${i}.jpg`);
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }
        if (fs.existsSync(tempMixedVideoPath)) {
          fs.unlinkSync(tempMixedVideoPath);
        }

      } catch (error) {
        console.log('❌ Error creating repair request with mixed files:', error.message);
      }

      console.log('\n✅ All file upload tests completed!');
      db.close();
    }
  );
}

// Run the test
testFixedFileUpload().catch(console.error); 