// Suppress deprecation warnings
process.noDeprecation = true;

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// NOTE: Load dotenv immediately to make environment variables available.
require('dotenv').config();

const helmet = require('helmet');

// Ensure required environment variables are set
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'FRONTEND_URL'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

const connectDB = require('./config/db');
const rateLimit = require('./middleware/rateLimit');

// Import routes
const authRoutes = require('./routes/auth');
const imagesRoutes = require('./routes/images');
const analyticsRoutes = require('./routes/analytics');
const liveRoutes = require('./routes/live');

// NOTE: Firebase auth has been removed. JWT-based auth is used instead.

// Initialize express app
const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply body parsing middleware only to routes that need it
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
// Apply rate limiting to images and analytics routes as per hackathon requirements
app.use('/api/images', rateLimit, imagesRoutes);
app.use('/api/analytics', rateLimit, analyticsRoutes);
app.use('/api/live', rateLimit, liveRoutes);

// Simple health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'SafetySnap API is running' });
});

// Get supported labels
app.get('/api/labels', (req, res) => {
    res.status(200).json(['helmet', 'vest']);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;
    res.status(500).json({ message: 'Something went wrong!', error: errorMessage });
});

// --- CRITICAL FIX: Define and call an async function to control startup order ---
const startServer = async () => {
    try {
        // 1. AWAIT the database connection. This pauses execution until MongoDB connects.
        await connectDB();

        // 2. Start server ONLY after the database is connected.
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        // If connectDB throws an error and exits, this error is for logging any other start-up issue.
        console.error('Server failed to start due to a core error.');
    }
};

startServer(); // Execute the new startup function
