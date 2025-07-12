const db = require('./database/connection');

console.log('Fixing contact_settings table structure...');

// First, let's see what the current table looks like
db.all("PRAGMA table_info(contact_settings)", (err, columns) => {
  if (err) {
    console.error('Error getting table info:', err);
    return;
  }
  
  console.log('Current table columns:', columns.map(c => c.name));
  
  // Check if we need to fix the column names
  const hasContactType = columns.some(c => c.name === 'contact_type');
  const hasContactValue = columns.some(c => c.name === 'contact_value');
  const hasType = columns.some(c => c.name === 'type');
  const hasValue = columns.some(c => c.name === 'value');
  
  if (hasContactType && hasContactValue && !hasType && !hasValue) {
    console.log('Table has old column names. Fixing...');
    
    // Create a new table with correct structure
    db.serialize(() => {
      // Create new table with correct structure
      db.run(`
        CREATE TABLE contact_settings_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('phone', 'email', 'link')),
          value TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating new table:', err);
          return;
        }
        
        console.log('✅ New table created');
        
        // Copy data from old table to new table
        db.run(`
          INSERT INTO contact_settings_new (id, type, value, is_active, created_at, updated_at)
          SELECT id, contact_type, contact_value, is_active, created_at, updated_at
          FROM contact_settings
        `, (err) => {
          if (err) {
            console.error('Error copying data:', err);
            return;
          }
          
          console.log('✅ Data copied to new table');
          
          // Drop old table
          db.run('DROP TABLE contact_settings', (err) => {
            if (err) {
              console.error('Error dropping old table:', err);
              return;
            }
            
            console.log('✅ Old table dropped');
            
            // Rename new table
            db.run('ALTER TABLE contact_settings_new RENAME TO contact_settings', (err) => {
              if (err) {
                console.error('Error renaming table:', err);
                return;
              }
              
              console.log('✅ Table renamed successfully');
              
              // Verify the new structure
              db.all("PRAGMA table_info(contact_settings)", (err, newColumns) => {
                if (err) {
                  console.error('Error getting new table info:', err);
                } else {
                  console.log('✅ New table columns:', newColumns.map(c => c.name));
                }
                
                process.exit(0);
              });
            });
          });
        });
      });
    });
  } else if (hasType && hasValue) {
    console.log('✅ Table already has correct structure');
    process.exit(0);
  } else {
    console.log('❌ Unexpected table structure');
    process.exit(1);
  }
}); 