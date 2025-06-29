const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'cyclebees.db');
const schemaPath = path.join(__dirname, 'schema.sql');

console.log('Setting up Cycle-Bees database...');
console.log('Database path:', dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');

db.serialize(() => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // Execute schema
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error executing schema:', err.message);
            process.exit(1);
        }
        console.log('Database schema created successfully.');
        
        // Insert default data
        insertDefaultData();
    });
});

async function insertDefaultData() {
    try {
        // Insert default admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        db.run(
            'INSERT OR IGNORE INTO admin (username, password_hash) VALUES (?, ?)',
            ['admin', adminPassword],
            (err) => {
                if (err) {
                    console.error('Error inserting admin:', err.message);
                } else {
                    console.log('Default admin user created (username: admin, password: admin123)');
                }
            }
        );

        // Insert default service mechanic charge
        db.run(
            'INSERT OR IGNORE INTO service_mechanic_charge (amount) VALUES (?)',
            [200.00],
            (err) => {
                if (err) {
                    console.error('Error inserting service mechanic charge:', err.message);
                } else {
                    console.log('Default service mechanic charge set to ₹200');
                }
            }
        );

        // Insert default time slots
        const timeSlots = [
            { start: '06:00', end: '08:00' },
            { start: '08:00', end: '10:00' },
            { start: '10:00', end: '12:00' },
            { start: '12:00', end: '14:00' },
            { start: '14:00', end: '16:00' },
            { start: '16:00', end: '18:00' },
            { start: '18:00', end: '20:00' },
            { start: '20:00', end: '22:00' }
        ];

        timeSlots.forEach((slot, index) => {
            db.run(
                'INSERT OR IGNORE INTO time_slots (start_time, end_time) VALUES (?, ?)',
                [slot.start, slot.end],
                (err) => {
                    if (err) {
                        console.error(`Error inserting time slot ${index + 1}:`, err.message);
                    }
                }
            );
        });
        console.log('Default time slots created');

        // Insert sample repair services
        const repairServices = [
            {
                name: 'Tire Puncture Repair',
                description: 'Fix punctured tires and replace tubes if needed',
                special_instructions: 'Please specify tire size if known',
                price: 150.00
            },
            {
                name: 'Brake Adjustment',
                description: 'Adjust and align brake pads for optimal performance',
                special_instructions: 'Check brake cable condition',
                price: 200.00
            },
            {
                name: 'Chain Lubrication',
                description: 'Clean and lubricate bicycle chain',
                special_instructions: 'Remove excess oil after lubrication',
                price: 100.00
            },
            {
                name: 'Gear Adjustment',
                description: 'Adjust derailleur and gear shifting',
                special_instructions: 'Test all gears after adjustment',
                price: 250.00
            },
            {
                name: 'Full Service',
                description: 'Complete bicycle maintenance and tune-up',
                special_instructions: 'Includes safety check and minor repairs',
                price: 500.00
            }
        ];

        repairServices.forEach((service, index) => {
            db.run(
                'INSERT OR IGNORE INTO repair_services (name, description, special_instructions, price) VALUES (?, ?, ?, ?)',
                [service.name, service.description, service.special_instructions, service.price],
                (err) => {
                    if (err) {
                        console.error(`Error inserting repair service ${index + 1}:`, err.message);
                    }
                }
            );
        });
        console.log('Sample repair services created');

        // Insert sample bicycles
        const bicycles = [
            {
                name: 'Mountain Bike Pro',
                model: 'MTB-2024',
                description: 'Professional mountain bike for off-road adventures',
                special_instructions: 'Suitable for rough terrain',
                daily_rate: 300.00,
                weekly_rate: 1500.00,
                delivery_charge: 100.00,
                specifications: JSON.stringify({
                    frame: 'Aluminum',
                    wheels: '26 inch',
                    gears: '21-speed',
                    brakes: 'Disc brakes',
                    suspension: 'Front suspension'
                })
            },
            {
                name: 'City Cruiser',
                model: 'CC-2024',
                description: 'Comfortable city bike for daily commuting',
                special_instructions: 'Perfect for urban riding',
                daily_rate: 200.00,
                weekly_rate: 1000.00,
                delivery_charge: 80.00,
                specifications: JSON.stringify({
                    frame: 'Steel',
                    wheels: '28 inch',
                    gears: '7-speed',
                    brakes: 'V-brakes',
                    suspension: 'Rigid'
                })
            },
            {
                name: 'Road Bike Elite',
                model: 'RB-2024',
                description: 'High-performance road bike for speed',
                special_instructions: 'Designed for smooth roads',
                daily_rate: 400.00,
                weekly_rate: 2000.00,
                delivery_charge: 120.00,
                specifications: JSON.stringify({
                    frame: 'Carbon fiber',
                    wheels: '700c',
                    gears: '18-speed',
                    brakes: 'Rim brakes',
                    suspension: 'Rigid'
                })
            }
        ];

        bicycles.forEach((bicycle, index) => {
            db.run(
                'INSERT OR IGNORE INTO bicycles (name, model, description, special_instructions, daily_rate, weekly_rate, delivery_charge, specifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [bicycle.name, bicycle.model, bicycle.description, bicycle.special_instructions, bicycle.daily_rate, bicycle.weekly_rate, bicycle.delivery_charge, bicycle.specifications],
                (err) => {
                    if (err) {
                        console.error(`Error inserting bicycle ${index + 1}:`, err.message);
                    }
                }
            );
        });
        console.log('Sample bicycles created');

        // Insert sample coupons
        const coupons = [
            {
                code: 'WELCOME10',
                description: 'Welcome discount for new users',
                discount_type: 'percentage',
                discount_value: 10.00,
                min_amount: 500.00,
                max_discount: 200.00,
                applicable_items: JSON.stringify(['repair_services', 'service_mechanic_charge', 'bicycle_rental', 'delivery_charge']),
                usage_limit: 1,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
            },
            {
                code: 'FIRST50',
                description: 'First repair discount',
                discount_type: 'fixed',
                discount_value: 50.00,
                min_amount: 200.00,
                applicable_items: JSON.stringify(['repair_services']),
                usage_limit: 1,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
            }
        ];

        coupons.forEach((coupon, index) => {
            db.run(
                'INSERT OR IGNORE INTO coupons (code, description, discount_type, discount_value, min_amount, max_discount, applicable_items, usage_limit, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [coupon.code, coupon.description, coupon.discount_type, coupon.discount_value, coupon.min_amount, coupon.max_discount, coupon.applicable_items, coupon.usage_limit, coupon.expires_at],
                (err) => {
                    if (err) {
                        console.error(`Error inserting coupon ${index + 1}:`, err.message);
                    }
                }
            );
        });
        console.log('Sample coupons created');

        // Insert sample promotional cards
        const promotionalCards = [
            {
                title: 'Welcome to Cycle-Bees',
                description: 'Your trusted partner for bicycle repair and rental services',
                display_order: 1
            },
            {
                title: 'Special Offer',
                description: 'Get 10% off on your first repair service',
                display_order: 2
            },
            {
                title: 'Weekend Rental',
                description: 'Rent a bicycle for the weekend and explore the city',
                display_order: 3
            }
        ];

        promotionalCards.forEach((card, index) => {
            db.run(
                'INSERT OR IGNORE INTO promotional_cards (title, description, display_order) VALUES (?, ?, ?)',
                [card.title, card.description, card.display_order],
                (err) => {
                    if (err) {
                        console.error(`Error inserting promotional card ${index + 1}:`, err.message);
                    }
                }
            );
        });
        console.log('Sample promotional cards created');

        console.log('\n✅ Database setup completed successfully!');
        console.log('\nDefault credentials:');
        console.log('- Admin: admin / admin123');
        console.log('- Sample data: repair services, bicycles, coupons, and promotional cards');
        
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed.');
            }
        });

    } catch (error) {
        console.error('Error in insertDefaultData:', error);
        process.exit(1);
    }
} 