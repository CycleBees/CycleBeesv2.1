const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'cyclebees.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Create contact_settings table
const createContactSettingsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS contact_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('phone', 'email', 'link')),
      value TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('Error creating contact_settings table:', err.message);
    } else {
      console.log('✅ contact_settings table created successfully');
      
      // Insert sample data
      insertSampleData();
    }
  });
};

// Insert sample contact settings
const insertSampleData = () => {
  const sampleData = [
    {
      type: 'phone',
      value: '+1234567890',
      is_active: 1
    }
  ];

  const sql = `
    INSERT INTO contact_settings (type, value, is_active) 
    VALUES (?, ?, ?)
  `;

  db.run(sql, [sampleData[0].type, sampleData[0].value, sampleData[0].is_active], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        console.log('ℹ️  Sample contact settings already exist');
      } else {
        console.error('Error inserting sample data:', err.message);
      }
    } else {
      console.log('✅ Sample contact settings inserted successfully');
    }
    
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed');
        console.log('🎉 Contact settings migration completed successfully!');
      }
    });
  });
};

// Run migration
console.log('🚀 Starting contact settings migration...');
createContactSettingsTable(); 