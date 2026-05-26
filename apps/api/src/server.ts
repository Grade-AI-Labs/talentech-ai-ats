import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { createRepos, type Repos } from './store/repo.js';
import { seed } from './store/seed.js';
import { jobsRoutes } from './routes/jobs.js';
import { candidatesRoutes } from './routes/candidates.js';
import { applicationsRoutes } from './routes/applications.js';
import { aiRoutes } from './routes/ai.js';
import {
  AzureOpenAIClient,
  StubAIClient,
  type AIClient,
} from './ai/client.js';

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
   * AI client override. When omitted, the server selects the client from
   * environment variables (see {@link selectAIClient}) — `AzureOpenAIClient`
   * if all four `AZURE_OPENAI_*` vars are set, otherwise `StubAIClient`.
   * Tests can pass an explicit client to bypass that selection.
   */
  aiClient?: AIClient;
  /**
   * Environment source for client selection. Defaults to `process.env`.
   * Exposed so tests can inject a known map without touching the real
   * process environment.
   */
  env?: NodeJS.ProcessEnv;
};

/**
 * Env-driven AI client selection.
 *
 * Returns `AzureOpenAIClient` only when ALL of the following are set
 * (non-empty after trimming):
 *   - `AZURE_OPENAI_API_KEY`
 *   - `AZURE_OPENAI_ENDPOINT` or `AZURE_OPENAI_API_INSTANCE_NAME`
 *   - `AZURE_OPENAI_DEPLOYMENT_NAME`
 *   - `AZURE_OPENAI_API_VERSION`
 *
 * Otherwise returns `StubAIClient`. This keeps the workshop runnable
 * with zero configuration: `docker compose up` works on a fresh clone.
 */
export function selectAIClient(env: NodeJS.ProcessEnv): AIClient {
  const apiKey = trimToValue(env['AZURE_OPENAI_API_KEY']);
  const endpoint = trimToValue(env['AZURE_OPENAI_ENDPOINT']);
  const instanceName = trimToValue(env['AZURE_OPENAI_API_INSTANCE_NAME']);
  const deploymentName = trimToValue(env['AZURE_OPENAI_DEPLOYMENT_NAME']);
  const apiVersion = trimToValue(env['AZURE_OPENAI_API_VERSION']);

  const hasHost = endpoint !== undefined || instanceName !== undefined;
  if (apiKey && hasHost && deploymentName && apiVersion) {
    return new AzureOpenAIClient({
      apiKey,
      deploymentName,
      apiVersion,
      ...(endpoint ? { endpoint } : {}),
      ...(instanceName ? { instanceName } : {}),
    });
  }

  return new StubAIClient();
}

function trimToValue(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function buildServer(
  options: BuildServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });

  await app.register(cors, {
    origin: 'http://localhost:5173',
  });

  const repos = options.repos ?? createRepos();
  app.decorate('repos', repos);

  const aiClient: AIClient =
    options.aiClient ?? selectAIClient(options.env ?? process.env);
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
