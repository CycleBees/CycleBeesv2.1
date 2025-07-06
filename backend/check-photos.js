const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/cyclebees.db');
const db = new sqlite3.Database(dbPath);

console.log('📸 Checking bicycle photos in database...');

// Check bicycles
db.all('SELECT * FROM bicycles', (err, bicycles) => {
    if (err) {
        console.error('Error fetching bicycles:', err);
        db.close();
        return;
    }
    
    console.log(`\n🚲 Found ${bicycles.length} bicycles:`);
    bicycles.forEach(bike => {
        console.log(`  - ID: ${bike.id}, Name: ${bike.name}`);
    });
    
    // Check photos for each bicycle
    let checkedBicycles = 0;
    bicycles.forEach(bicycle => {
        db.all('SELECT * FROM bicycle_photos WHERE bicycle_id = ? ORDER BY display_order', [bicycle.id], (err, photos) => {
            if (err) {
                console.error(`Error fetching photos for bicycle ${bicycle.id}:`, err);
            }
            
            console.log(`\n📷 Bicycle "${bicycle.name}" (ID: ${bicycle.id}):`);
            if (photos && photos.length > 0) {
                photos.forEach(photo => {
                    console.log(`  - Photo: ${photo.photo_url} (Order: ${photo.display_order})`);
                });
            } else {
                console.log(`  - No photos found`);
            }
            
            checkedBicycles++;
            if (checkedBicycles === bicycles.length) {
                console.log('\n✅ Photo check completed!');
                db.close();
            }
        });
    });
    
    if (bicycles.length === 0) {
        console.log('No bicycles found in database.');
        db.close();
    }
}); 