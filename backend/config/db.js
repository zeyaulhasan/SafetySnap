const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Get the actual value of the environment variable
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safetysnap';

        if (!MONGO_URI) {
            console.error('❌ FATAL ERROR: MONGO_URI is not defined in environment variables.');
            // Exit if the connection string is missing
            process.exit(1);
        }

        // CORRECTED: Removed deprecated options (useNewUrlParser, useUnifiedTopology)
        // Mongoose now automatically handles connection pooling and topology discovery.
        const conn = await mongoose.connect(MONGO_URI);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error connecting to MongoDB: ${error.message}`);
        // Exit process with failure code 1
        process.exit(1);
    }
};

module.exports = connectDB;
