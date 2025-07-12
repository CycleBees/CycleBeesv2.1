const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Complete Repair Workflow');
console.log('=====================================\n');

// Test 1: Check if uploads directory exists and is accessible
console.log('1. Checking uploads directory...');
const uploadsDir = path.join(__dirname, 'uploads', 'repair-requests');
if (fs.existsSync(uploadsDir)) {
    console.log('✅ Uploads directory exists:', uploadsDir);
    const files = fs.readdirSync(uploadsDir);
    console.log(`   Found ${files.length} files in uploads directory`);
    if (files.length > 0) {
        console.log('   Sample files:', files.slice(0, 3));
    }
} else {
    console.log('❌ Uploads directory does not exist');
}

// Test 2: Check if test files exist
console.log('\n2. Checking test files...');
const testImagePath = path.join(__dirname, 'test-image.jpg');
const testVideoPath = path.join(__dirname, 'temp_video.mp4');

if (fs.existsSync(testImagePath)) {
    const stats = fs.statSync(testImagePath);
    console.log(`✅ Test image exists: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} else {
    console.log('❌ Test image not found');
}

if (fs.existsSync(testVideoPath)) {
    const stats = fs.statSync(testVideoPath);
    console.log(`✅ Test video exists: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
} else {
    console.log('❌ Test video not found');
}

// Test 3: Check database schema for repair_request_files table
console.log('\n3. Checking database schema...');
const sqlite3 = require('sqlite3').verbose();
const dbPath = './database/cyclebees.db';
const db = new sqlite3.Database(dbPath);

db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='repair_request_files'", (err, row) => {
    if (err) {
        console.log('❌ Database error:', err.message);
    } else if (row) {
        console.log('✅ repair_request_files table exists');
        
        // Check table structure
        db.all("PRAGMA table_info(repair_request_files)", (err, columns) => {
            if (err) {
                console.log('❌ Error getting table structure:', err.message);
            } else {
                console.log('   Table columns:');
                columns.forEach(col => {
                    console.log(`     - ${col.name} (${col.type})`);
                });
            }
            
            // Check if there are any files in the database
            db.get("SELECT COUNT(*) as count FROM repair_request_files", (err, result) => {
                if (err) {
                    console.log('❌ Error counting files:', err.message);
                } else {
                    console.log(`   Total files in database: ${result.count}`);
                }
                
                // Check sample file records
                db.all("SELECT * FROM repair_request_files LIMIT 3", (err, files) => {
                    if (err) {
                        console.log('❌ Error fetching sample files:', err.message);
                    } else if (files.length > 0) {
                        console.log('   Sample file records:');
                        files.forEach(file => {
                            console.log(`     - ID: ${file.id}, Type: ${file.file_type}, URL: ${file.file_url}`);
                        });
                    } else {
                        console.log('   No files found in database');
                    }
                    
                    // Test 4: Check if files are accessible via HTTP
                    console.log('\n4. Testing file accessibility...');
                    if (files.length > 0) {
                        const testFile = files[0];
                        const filePath = path.join(__dirname, testFile.file_url.replace('/uploads/', 'uploads/'));
                        if (fs.existsSync(filePath)) {
                            console.log(`✅ File exists on disk: ${testFile.file_url}`);
                            const stats = fs.statSync(filePath);
                            console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
                        } else {
                            console.log(`❌ File missing on disk: ${testFile.file_url}`);
                        }
                    }
                    
                    db.close();
                    console.log('\n✅ Complete workflow test finished');
                });
            });
        });
    } else {
        console.log('❌ repair_request_files table does not exist');
        db.close();
    }
}); 