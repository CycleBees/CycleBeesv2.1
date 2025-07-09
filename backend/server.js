require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const dbConnection = require('./database/connection');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Cycle-Bees backend is running.' });
});

// Initialize database connection
async function initializeDatabase() {
    try {
        await dbConnection.connect();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

// Routes
const authRoutes = require('./routes/auth');
const repairRoutes = require('./routes/repair');
const rentalRoutes = require('./routes/rental');
const dashboardRoutes = require('./routes/dashboard');
const couponRoutes = require('./routes/coupon');
const promotionalRoutes = require('./routes/promotional');

app.use('/api/auth', authRoutes);
app.use('/api/repair', repairRoutes);
app.use('/api/rental', rentalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/coupon', couponRoutes);
app.use('/api/promotional', promotionalRoutes);

// Export app and db for use in routes (future)
module.exports = { app, db: dbConnection };

// Start server
async function startServer() {
    await initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`Cycle-Bees backend listening on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        console.log(`Auth endpoints: http://localhost:${PORT}/api/auth`);
        console.log(`Repair endpoints: http://localhost:${PORT}/api/repair`);
        console.log(`Rental endpoints: http://localhost:${PORT}/api/rental`);
        console.log(`Dashboard endpoints: http://localhost:${PORT}/api/dashboard`);
        console.log(`Coupon endpoints: http://localhost:${PORT}/api/coupon`);
        console.log(`Promotional endpoints: http://localhost:${PORT}/api/promotional`);
    });
}

startServer().catch(console.error); 