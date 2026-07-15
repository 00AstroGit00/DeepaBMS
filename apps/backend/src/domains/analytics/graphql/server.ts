import { ApolloServer } from '@apollo/server';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { Express } from 'express';
import { expressMiddleware } from '@apollo/server/express4';
import { authenticate } from '../../../middleware/auth';
import depthLimit from 'graphql-depth-limit';
import { createComplexityRule, simpleEstimator } from 'graphql-query-complexity';

const GRAPHQL_MAX_DEPTH = parseInt(process.env.GRAPHQL_MAX_DEPTH || '7', 10);
const GRAPHQL_MAX_COMPLEXITY = parseInt(process.env.GRAPHQL_MAX_COMPLEXITY || '1000', 10);

export async function setupGraphQL(app: Express): Promise<void> {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production',
    validationRules: [
      depthLimit(GRAPHQL_MAX_DEPTH),
      createComplexityRule({
        estimators: [simpleEstimator({ defaultComplexity: 1 })],
        maximumComplexity: GRAPHQL_MAX_COMPLEXITY,
        onComplete: (complexity: number) => {
          console.log(`[GraphQL] Query complexity: ${complexity}`);
        },
      }) as any,
    ],
  });

  await server.start();

  app.use(
    '/api/graphql',
    authenticate,
    expressMiddleware(server, {
      context: async ({ req }) => ({
        user: (req as any).user,
        tenant: req.tenant,
      }),
    }),
  );
  console.log(
    '[GraphQL] Analytics Gateway mounted successfully under /api/graphql',
  );
}
