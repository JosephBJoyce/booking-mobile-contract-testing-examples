require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const { typeDefs } = require('./schema');
const { resolvers } = require('./resolvers');

async function createApp() {
  const app = express();

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  app.use(cors());
  app.use(bodyParser.json());

  app.get('/health', (req, res) =>
    res.json({ status: 'ok', service: 'booking-attractions-api' })
  );

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const authHeader = req.headers['authorization'] || '';
        const identityToken = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : null;
        return { identityToken };
      },
    })
  );

  return app;
}

async function startServer() {
  const app = await createApp();
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`Attractions API listening on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
}

if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = { createApp };
