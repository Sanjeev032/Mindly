const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const createApolloServer = async (app) => {
    const isProduction = process.env.NODE_ENV === 'production';

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        // Introspection exposes the full schema — enable only in development.
        introspection: !isProduction,
        // Bounded in-memory cache prevents DoS via memory exhaustion.
        // Apollo Server 3 built-in shorthand — no extra packages required.
        cache: 'bounded',
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
