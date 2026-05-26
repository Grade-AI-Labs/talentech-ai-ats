import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { createRepos, type Repos } from './store/repo.js';
import { seed } from './store/seed.js';
import { jobsRoutes } from './routes/jobs.js';
import { candidatesRoutes } from './routes/candidates.js';
import { applicationsRoutes } from './routes/applications.js';
import { aiRoutes } from './routes/ai.js';
import { StubAIClient, type AIClient } from './ai/client.js';

declare module 'fastify' {
  interface FastifyInstance {
    repos: Repos;
    aiClient: AIClient;
  }
}

export type BuildServerOptions = {
  repos?: Repos;
  seed?: boolean;
  logger?: boolean;
  /**
   * AI client override for tests. Defaults to `StubAIClient` in this
   * slice. Slice 5 will introduce env-based selection between
   * `StubAIClient` and `AzureOpenAIClient`.
   */
  aiClient?: AIClient;
};

export async function buildServer(
  options: BuildServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });

  await app.register(cors, {
    origin: 'http://localhost:5173',
  });

  const repos = options.repos ?? createRepos();
  app.decorate('repos', repos);

  const aiClient: AIClient = options.aiClient ?? new StubAIClient();
  app.decorate('aiClient', aiClient);

  if (options.seed ?? true) {
    seed(repos);
  }

  await app.register(jobsRoutes);
  await app.register(candidatesRoutes);
  await app.register(applicationsRoutes);
  await app.register(aiRoutes);

  return app;
}
