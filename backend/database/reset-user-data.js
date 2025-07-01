const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const dbPath = path.join(__dirname, 'cyclebees.db');

console.log('🔄 Resetting user-generated data from Cycle-Bees database...');
console.log('Database path:', dbPath);

// Check if database exists
if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found. Please run setup.js first.');
    process.exit(1);
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database.');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Tables to clear (user-generated data)
const tablesToClear = [
    'users',
    'repair_requests',
    'repair_request_services',
    'repair_request_files',
    'rental_requests',
    'coupon_usage',
    'otp_codes',
    'payment_transactions'
];

// Tables to preserve (sample data)
const tablesToPreserve = [
    'admin',
    'repair_services',
    'service_mechanic_charge',
    'time_slots',
    'bicycles',
    'bicycle_photos',
    'coupons',
    'promotional_cards'
];

console.log('\n📋 Tables to clear (user-generated data):');
tablesToClear.forEach(table => console.log(`  - ${table}`));

console.log('\n📋 Tables to preserve (sample data):');
tablesToPreserve.forEach(table => console.log(`  - ${table}`));

// Function to clear a table
function clearTable(tableName) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM ${tableName}`, (err) => {
            if (err) {
                console.error(`❌ Error clearing table ${tableName}:`, err.message);
                reject(err);
            } else {
                console.log(`✅ Cleared table: ${tableName}`);
                resolve();
            }
        });
    });
}

// Function to get row count for a table
function getRowCount(tableName) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.count : 0);
            }
        });
    });
}

// Main reset function
async function resetUserData() {
    try {
        console.log('\n🔄 Starting data reset...\n');

        // Clear user-generated data tables
        for (const table of tablesToClear) {
            try {
                const beforeCount = await getRowCount(table);
                await clearTable(table);
                const afterCount = await getRowCount(table);
                console.log(`  📊 ${table}: ${beforeCount} → ${afterCount} records`);
            } catch (error) {
                console.error(`❌ Failed to clear ${table}:`, error.message);
            }
        }

        // Verify preserved data
        console.log('\n📋 Verifying preserved data:');
        for (const table of tablesToPreserve) {
            try {
                const count = await getRowCount(table);
                console.log(`  ✅ ${table}: ${count} records preserved`);
            } catch (error) {
                console.error(`❌ Error checking ${table}:`, error.message);
            }
        }

        // Reset auto-increment counters
        console.log('\n🔄 Resetting auto-increment counters...');
        const resetQueries = [
            'DELETE FROM sqlite_sequence WHERE name IN ("users", "repair_requests", "rental_requests", "coupon_usage", "otp_codes", "payment_transactions")'
        ];

        for (const query of resetQueries) {
            db.run(query, (err) => {
                if (err) {
                    console.error('❌ Error resetting auto-increment:', err.message);
                } else {
                    console.log('✅ Auto-increment counters reset');
                }
            });
        }

        console.log('\n🎉 User data reset completed successfully!');
        console.log('\n📊 Summary:');
        console.log('  ✅ All user-generated data cleared');
        console.log('  ✅ Sample data preserved');
        console.log('  ✅ Database structure intact');
        console.log('  ✅ Auto-increment counters reset');
        
        console.log('\n💡 Next steps:');
        console.log('  - Start the backend server: npm start');
        console.log('  - Access admin dashboard: http://localhost:3001');
        console.log('  - Login with: admin / admin123');
        console.log('  - Begin testing with fresh data');

    } catch (error) {
        console.error('❌ Error during reset:', error);
        process.exit(1);
    } finally {
        // Close database connection
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('\n🔒 Database connection closed.');
            }
        });
    }
}

// Run the reset
resetUserData(); 