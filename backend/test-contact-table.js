const db = require('./database/setup');

console.log('Checking if contact_settings table exists...');

db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='contact_settings'", (err, row) => {
  if (err) {
    console.error('Error checking table:', err);
  } else {
    console.log('Table exists:', !!row);
    
    if (row) {
      // Test inserting a record
      console.log('Testing insert...');
      db.run("INSERT INTO contact_settings (type, value, is_active) VALUES (?, ?, ?)", 
        ['phone', '+1234567890', 1], 
        function(err) {
          if (err) {
            console.error('Insert error:', err);
          } else {
            console.log('Insert successful, ID:', this.lastID);
            
            // Test selecting the record
            db.get("SELECT * FROM contact_settings WHERE id = ?", [this.lastID], (err, row) => {
              if (err) {
                console.error('Select error:', err);
              } else {
                console.log('Selected record:', row);
              }
              
              // Clean up
              db.run("DELETE FROM contact_settings WHERE id = ?", [this.lastID], (err) => {
                if (err) console.error('Cleanup error:', err);
                else console.log('Cleanup successful');
                process.exit(0);
              });
            });
          }
        }
      );
    } else {
      console.log('Table does not exist. Creating it...');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS contact_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('phone', 'email', 'link')),
          value TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      db.run(createTableSQL, (err) => {
        if (err) {
          console.error('Create table error:', err);
        } else {
          console.log('Table created successfully');
        }
        process.exit(0);
      });
    }
  }
}); 