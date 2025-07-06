const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/cyclebees.db');
const db = new sqlite3.Database(dbPath);

console.log('📸 Adding sample photos to bicycles...');

// Sample photo URLs (placeholder images)
const samplePhotos = [
    'uploads/bicycles/sample-mountain-bike-1.jpg',
    'uploads/bicycles/sample-city-bike-1.jpg',
    'uploads/bicycles/sample-road-bike-1.jpg',
    'uploads/bicycles/sample-mountain-bike-2.jpg',
    'uploads/bicycles/sample-city-bike-2.jpg'
];

// Add photos to first 3 bicycles (IDs 1, 2, 3)
const bicyclesToUpdate = [
    { id: 1, name: 'Mountain Bike Pro', photos: [samplePhotos[0], samplePhotos[3]] },
    { id: 2, name: 'City Cruiser', photos: [samplePhotos[1], samplePhotos[4]] },
    { id: 3, name: 'Road Bike Elite', photos: [samplePhotos[2]] }
];

let completed = 0;

bicyclesToUpdate.forEach(bicycle => {
    console.log(`\n🚲 Adding photos to "${bicycle.name}" (ID: ${bicycle.id})...`);
    
    // Delete existing photos for this bicycle
    db.run('DELETE FROM bicycle_photos WHERE bicycle_id = ?', [bicycle.id], (err) => {
        if (err) {
            console.error(`Error deleting existing photos for bicycle ${bicycle.id}:`, err);
        }
        
        // Add new photos
        let photosAdded = 0;
        bicycle.photos.forEach((photoUrl, index) => {
            db.run(
                'INSERT INTO bicycle_photos (bicycle_id, photo_url, display_order) VALUES (?, ?, ?)',
                [bicycle.id, photoUrl, index + 1],
                (err) => {
                    if (err) {
                        console.error(`Error adding photo ${index + 1} for bicycle ${bicycle.id}:`, err);
                    } else {
                        console.log(`  ✅ Added photo: ${photoUrl}`);
                    }
                    
                    photosAdded++;
                    if (photosAdded === bicycle.photos.length) {
                        completed++;
                        console.log(`✅ Completed adding ${bicycle.photos.length} photos to "${bicycle.name}"`);
                        
                        if (completed === bicyclesToUpdate.length) {
                            console.log('\n🎉 Sample photos added successfully!');
                            console.log('📱 Mobile app should now display bicycle photos.');
                            db.close();
                        }
                    }
                }
            );
        });
    });
}); 