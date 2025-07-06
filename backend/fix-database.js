const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/cyclebees.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing database schema...');
console.log('Database path:', dbPath);

// Check current table structure
db.all("PRAGMA table_info(rental_requests)", (err, columns) => {
    if (err) {
        console.error('❌ Error checking table structure:', err);
        db.close();
        return;
    }
    
    console.log('\n📋 Current rental_requests table structure:');
    columns.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} (${col.notnull ? 'NOT NULL' : 'NULL'})`);
    });
    
    // Check if email column exists
    const hasEmailColumn = columns.some(col => col.name === 'email');
    
    if (hasEmailColumn) {
        console.log('\n✅ Email column already exists! No action needed.');
        db.close();
        return;
    }
    
    console.log('\n➕ Adding email column to rental_requests table...');
    
    // Add email column
    db.run("ALTER TABLE rental_requests ADD COLUMN email VARCHAR(100)", (err) => {
        if (err) {
            console.error('❌ Error adding email column:', err);
            db.close();
            return;
        }
        
        console.log('✅ Email column added successfully!');
        
        // Verify the change
        db.all("PRAGMA table_info(rental_requests)", (err, newColumns) => {
            if (err) {
                console.error('❌ Error verifying table structure:', err);
                db.close();
                return;
            }
            
            console.log('\n📋 Updated rental_requests table structure:');
            newColumns.forEach(col => {
                console.log(`  - ${col.name}: ${col.type} (${col.notnull ? 'NOT NULL' : 'NULL'})`);
            });
            
            console.log('\n🎉 Database fix completed successfully!');
            console.log('✅ Rental requests should now work without errors.');
            db.close();
        });
    });
}); 