const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const createApolloServer = require('./graphql/apolloServer');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
    next();
});

// Setup Apollo Server (GraphQL)
createApolloServer(app).then(() => {
    console.log('🚀 Apollo Server Ready at /graphql');
}).catch(err => {
    console.error('Failed to start Apollo Server', err);
});

// Global Error Handling
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥');
    console.error(err);
});

app.get('/', (req, res) => {
    res.send('AI Career Coach API (SQL + GraphQL) is running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
