const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'cyclebees.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding address field to repair_requests table...');

// Add address column to repair_requests table
db.run('ALTER TABLE repair_requests ADD COLUMN address TEXT', (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Address column already exists in repair_requests table.');
        } else {
            console.error('Error adding address column to repair_requests table:', err);
        }
    } else {
        console.log('Successfully added address column to repair_requests table.');
    }
    
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
    });
}); 