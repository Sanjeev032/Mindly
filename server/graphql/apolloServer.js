const { ApolloServer } = require('apollo-server-express');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');
const jwt = require('jsonwebtoken');

const createApolloServer = async (app) => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // Get the user from the JWT token
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');
      
      if (token) {
        try {
          const user = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
          return { user };
        } catch (err) {
          console.error('Invalid token');
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
