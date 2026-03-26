const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const createApolloServer = require('./server/graphql/apolloServer');

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

createApolloServer(app).then(() => {
    console.log('🚀 Apollo Server Ready at /graphql');
}).catch(err => {
    console.error('Failed to start Apollo Server', err);
});

app.get('/', (req, res) => {
    res.send('AI Career Coach API is running from ROOT');
});

const PORT = 5001; // DIFFERENT PORT

app.listen(PORT, () => {
    console.log('Server running on port', PORT);
});
