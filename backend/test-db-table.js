const db = require('./database/connection');

console.log('Testing database connection and contact_settings table...');

// Check if table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='contact_settings'", (err, row) => {
  if (err) {
    console.error('Error checking table:', err);
  } else {
    console.log('Table exists:', !!row);
    
    if (row) {
      // Check table structure
      db.all("PRAGMA table_info(contact_settings)", (err, columns) => {
        if (err) {
          console.error('Error getting table info:', err);
        } else {
          console.log('Table columns:', columns.map(c => c.name));
        }
        
        // Check if there are any records
        db.get("SELECT COUNT(*) as count FROM contact_settings", (err, result) => {
          if (err) {
            console.error('Error counting records:', err);
          } else {
            console.log('Number of records:', result.count);
          }
          
          // Try to insert a test record
          console.log('\nTesting insert...');
          db.run("INSERT INTO contact_settings (type, value, is_active) VALUES (?, ?, ?)", 
            ['phone', '+1234567890', 1], 
            function(err) {
              if (err) {
                console.error('Insert error:', err);
              } else {
                console.log('✅ Insert successful, ID:', this.lastID);
                
                // Clean up
                db.run("DELETE FROM contact_settings WHERE id = ?", [this.lastID], (err) => {
                  if (err) console.error('Cleanup error:', err);
                  else console.log('✅ Cleanup successful');
                  process.exit(0);
                });
              }
            }
          );
        });
      });
    } else {
      console.log('Table does not exist!');
      process.exit(1);
    }
  }
}); 