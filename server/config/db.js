const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        if (process.env.NODE_ENV === 'production') {
            console.error('CRITICAL: Server shutting down due to DB connection failure in production.');
            process.exit(1);
        } else {
            console.error('Non-critical: Continuing in development mode despite DB connection failure.');
        }
    }
};

module.exports = connectDB;
