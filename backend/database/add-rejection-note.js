const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'cyclebees.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding rejection_note field to rental_requests table...');

// Check if rejection_note column already exists
db.get("PRAGMA table_info(rental_requests)", (err, rows) => {
    if (err) {
        console.error('Error checking table structure:', err);
        db.close();
        return;
    }
    
    db.all("PRAGMA table_info(rental_requests)", (err, columns) => {
        if (err) {
            console.error('Error getting columns:', err);
            db.close();
            return;
        }
        
        const hasRejectionNote = columns.some(col => col.name === 'rejection_note');
        
        if (hasRejectionNote) {
            console.log('✅ rejection_note column already exists');
            db.close();
            return;
        }
        
        // Add rejection_note column
        db.run('ALTER TABLE rental_requests ADD COLUMN rejection_note TEXT', (err) => {
            if (err) {
                console.error('Error adding rejection_note column:', err);
            } else {
                console.log('✅ rejection_note column added successfully');
            }
            
            // Update status constraint to include 'rejected'
            db.run("PRAGMA foreign_keys=off", (err) => {
                if (err) {
                    console.error('Error disabling foreign keys:', err);
                }
                
                // Create new table with updated constraint
                db.run(`
                    CREATE TABLE rental_requests_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        bicycle_id INTEGER NOT NULL,
                        contact_number VARCHAR(15) NOT NULL,
                        alternate_number VARCHAR(15),
                        email VARCHAR(100),
                        delivery_address TEXT NOT NULL,
                        special_instructions TEXT,
                        duration_type TEXT NOT NULL CHECK (duration_type IN ('daily', 'weekly')),
                        duration_count INTEGER NOT NULL,
                        total_amount DECIMAL(10,2) NOT NULL,
                        payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'offline')),
                        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'waiting_payment', 'arranging_delivery', 'active_rental', 'completed', 'expired', 'rejected')),
                        rejection_note TEXT,
                        expires_at DATETIME NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (bicycle_id) REFERENCES bicycles(id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating new table:', err);
                        db.close();
                        return;
                    }
                    
                    // Copy data from old table to new table
                    db.run('INSERT INTO rental_requests_new SELECT * FROM rental_requests', (err) => {
                        if (err) {
                            console.error('Error copying data:', err);
                            db.close();
                            return;
                        }
                        
                        // Drop old table and rename new table
                        db.run('DROP TABLE rental_requests', (err) => {
                            if (err) {
                                console.error('Error dropping old table:', err);
                                db.close();
                                return;
                            }
                            
                            db.run('ALTER TABLE rental_requests_new RENAME TO rental_requests', (err) => {
                                if (err) {
                                    console.error('Error renaming table:', err);
                                } else {
                                    console.log('✅ Status constraint updated to include "rejected"');
                                }
                                
                                db.run("PRAGMA foreign_keys=on", (err) => {
                                    if (err) {
                                        console.error('Error re-enabling foreign keys:', err);
                                    }
                                    console.log('✅ Migration completed successfully');
                                    db.close();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}); 