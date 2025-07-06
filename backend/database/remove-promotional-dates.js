const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = process.env.DB_PATH || path.join(__dirname, 'cyclebees.db');
const db = new sqlite3.Database(dbPath);

async function removePromotionalDates() {
    console.log('🔄 Starting promotional cards date removal migration...\n');

    return new Promise((resolve, reject) => {
        // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
        db.serialize(() => {
            // 1. Create a backup of the current table
            console.log('1. Creating backup of promotional_cards table...');
            db.run(`
                CREATE TABLE IF NOT EXISTS promotional_cards_backup AS 
                SELECT id, title, description, image_url, external_link, display_order, is_active, created_at, updated_at 
                FROM promotional_cards
            `, (err) => {
                if (err) {
                    console.error('❌ Error creating backup:', err.message);
                    reject(err);
                    return;
                }
                console.log('✅ Backup created successfully');

                // 2. Drop the original table
                console.log('\n2. Dropping original promotional_cards table...');
                db.run('DROP TABLE IF EXISTS promotional_cards', (err) => {
                    if (err) {
                        console.error('❌ Error dropping table:', err.message);
                        reject(err);
                        return;
                    }
                    console.log('✅ Original table dropped');

                    // 3. Create new table without date columns
                    console.log('\n3. Creating new promotional_cards table without date columns...');
                    db.run(`
                        CREATE TABLE promotional_cards (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            title VARCHAR(100) NOT NULL,
                            description TEXT,
                            image_url VARCHAR(255),
                            external_link VARCHAR(255),
                            display_order INTEGER DEFAULT 0,
                            is_active BOOLEAN DEFAULT 1,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `, (err) => {
                        if (err) {
                            console.error('❌ Error creating new table:', err.message);
                            reject(err);
                            return;
                        }
                        console.log('✅ New table created successfully');

                        // 4. Copy data from backup to new table
                        console.log('\n4. Copying data from backup to new table...');
                        db.run(`
                            INSERT INTO promotional_cards 
                            (id, title, description, image_url, external_link, display_order, is_active, created_at, updated_at)
                            SELECT id, title, description, image_url, external_link, display_order, is_active, created_at, updated_at
                            FROM promotional_cards_backup
                        `, function(err) {
                            if (err) {
                                console.error('❌ Error copying data:', err.message);
                                reject(err);
                                return;
                            }
                            console.log(`✅ Data copied successfully (${this.changes} records)`);

                            // 5. Drop the backup table
                            console.log('\n5. Cleaning up backup table...');
                            db.run('DROP TABLE promotional_cards_backup', (err) => {
                                if (err) {
                                    console.error('❌ Error dropping backup:', err.message);
                                    reject(err);
                                    return;
                                }
                                console.log('✅ Backup table removed');

                                // 6. Verify the migration
                                console.log('\n6. Verifying migration...');
                                db.get('SELECT COUNT(*) as count FROM promotional_cards', (err, row) => {
                                    if (err) {
                                        console.error('❌ Error verifying migration:', err.message);
                                        reject(err);
                                        return;
                                    }
                                    console.log(`✅ Migration completed successfully!`);
                                    console.log(`📊 Total promotional cards: ${row.count}`);
                                    
                                    // Show table structure
                                    db.all("PRAGMA table_info(promotional_cards)", (err, columns) => {
                                        if (err) {
                                            console.error('❌ Error getting table info:', err.message);
                                        } else {
                                            console.log('\n📋 New table structure:');
                                            columns.forEach(col => {
                                                console.log(`   - ${col.name} (${col.type})`);
                                            });
                                        }
                                        
                                        db.close();
                                        resolve();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

// Run the migration
removePromotionalDates()
    .then(() => {
        console.log('\n🎉 Promotional cards date removal migration completed successfully!');
        console.log('\n📝 Summary:');
        console.log('   - Removed starts_at and ends_at columns');
        console.log('   - All existing data preserved');
        console.log('   - Cards are now managed manually by admin');
        console.log('   - No automatic expiration functionality');
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }); 