const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const createApolloServer = async (app) => {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: process.env.NODE_ENV !== 'production',
        context: ({ req }) => {
            const auth = req.headers.authorization || '';
            if (auth.startsWith('Bearer ')) {
                try {
                    const token = auth.substring(7);
                    const user = jwt.verify(token, JWT_SECRET);
                    return { user };
                } catch (err) {
                    return {};
                }
            }
            return {};
        }
    });

    await server.start();
    server.applyMiddleware({ app });
    return server;
};

module.exports = createApolloServer;
