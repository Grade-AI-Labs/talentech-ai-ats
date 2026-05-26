import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { createRepos, type Repos } from './store/repo.js';
import { seed } from './store/seed.js';
import { jobsRoutes } from './routes/jobs.js';
import { candidatesRoutes } from './routes/candidates.js';

declare module 'fastify' {
  interface FastifyInstance {
    repos: Repos;
  }
}

export type BuildServerOptions = {
  repos?: Repos;
  seed?: boolean;
  logger?: boolean;
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

  if (options.seed ?? true) {
    seed(repos);
  }

  await app.register(jobsRoutes);
  await app.register(candidatesRoutes);

  return app;
}
