const sqlite3 = require('sqlite3').verbose();

console.log('🧪 Testing Address Field Verification\n');

const db = new sqlite3.Database('./database/cyclebees.db');

// Test repair requests with address
db.all(`
  SELECT 
    rr.id,
    u.full_name as user_name,
    rr.address,
    rr.contact_number,
    rr.alternate_number,
    rr.email
  FROM repair_requests rr
  LEFT JOIN users u ON rr.user_id = u.id
  LIMIT 3
`, [], (err, rows) => {
  if (err) {
    console.error('❌ Error fetching repair requests:', err);
  } else {
    console.log('🔧 Repair Requests with Address:');
    if (rows.length === 0) {
      console.log('   No repair requests found');
    } else {
      rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ID: ${row.id}, Customer: ${row.user_name}`);
        console.log(`      Address: ${row.address || 'NULL/Not provided'}`);
        console.log(`      Phone: ${row.contact_number}`);
        console.log(`      Alternate: ${row.alternate_number || 'NULL'}`);
        console.log(`      Email: ${row.email || 'NULL'}`);
        console.log('');
      });
    }
  }

  // Test rental requests with address
  db.all(`
    SELECT 
      rr.id,
      u.full_name as user_name,
      rr.delivery_address,
      rr.contact_number,
      rr.alternate_number
    FROM rental_requests rr
    LEFT JOIN users u ON rr.user_id = u.id
    LIMIT 3
  `, [], (err, rentalRows) => {
    if (err) {
      console.error('❌ Error fetching rental requests:', err);
    } else {
      console.log('🚲 Rental Requests with Address:');
      if (rentalRows.length === 0) {
        console.log('   No rental requests found');
      } else {
        rentalRows.forEach((row, index) => {
          console.log(`   ${index + 1}. ID: ${row.id}, Customer: ${row.user_name}`);
          console.log(`      Delivery Address: ${row.delivery_address || 'NULL/Not provided'}`);
          console.log(`      Phone: ${row.contact_number}`);
          console.log(`      Alternate: ${row.alternate_number || 'NULL'}`);
          console.log('');
        });
      }
    }

    console.log('✅ Address field verification completed');
    db.close();
  });
}); 