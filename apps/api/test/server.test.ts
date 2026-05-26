import { describe, expect, it } from 'vitest';
import {
  AzureOpenAIClient,
  StubAIClient,
} from '../src/ai/client.js';
import { selectAIClient } from '../src/server.js';

const FULL_ENV: NodeJS.ProcessEnv = {
  AZURE_OPENAI_API_KEY: 'test-key',
  AZURE_OPENAI_ENDPOINT: 'https://example.openai.azure.com',
  AZURE_OPENAI_DEPLOYMENT_NAME: 'gpt-4-1-mini',
  AZURE_OPENAI_API_VERSION: '2024-10-21',
};

describe('selectAIClient (env-driven AI client selection)', () => {
  it('returns AzureOpenAIClient when all four Azure env vars are set with endpoint', () => {
    const client = selectAIClient({ ...FULL_ENV });
    expect(client).toBeInstanceOf(AzureOpenAIClient);
  });

  it('returns AzureOpenAIClient when instance name is used instead of endpoint', () => {
    const client = selectAIClient({
      AZURE_OPENAI_API_KEY: 'test-key',
      AZURE_OPENAI_API_INSTANCE_NAME: 'my-instance',
      AZURE_OPENAI_DEPLOYMENT_NAME: 'gpt-4-1-mini',
      AZURE_OPENAI_API_VERSION: '2024-10-21',
    });
    expect(client).toBeInstanceOf(AzureOpenAIClient);
  });

  it('falls back to StubAIClient when no Azure env vars are set', () => {
    const client = selectAIClient({});
    expect(client).toBeInstanceOf(StubAIClient);
  });

  it('falls back to StubAIClient when AZURE_OPENAI_API_KEY is missing', () => {
    const env = { ...FULL_ENV };
    delete env['AZURE_OPENAI_API_KEY'];
    const client = selectAIClient(env);
    expect(client).toBeInstanceOf(StubAIClient);
  });

  it('falls back to StubAIClient when AZURE_OPENAI_DEPLOYMENT_NAME is missing', () => {
    const env = { ...FULL_ENV };
    delete env['AZURE_OPENAI_DEPLOYMENT_NAME'];
    const client = selectAIClient(env);
    expect(client).toBeInstanceOf(StubAIClient);
  });

  it('falls back to StubAIClient when AZURE_OPENAI_API_VERSION is missing', () => {
    const env = { ...FULL_ENV };
    delete env['AZURE_OPENAI_API_VERSION'];
    const client = selectAIClient(env);
    expect(client).toBeInstanceOf(StubAIClient);
  });

  it('falls back to StubAIClient when both endpoint and instance name are missing', () => {
    const env = { ...FULL_ENV };
    delete env['AZURE_OPENAI_ENDPOINT'];
    const client = selectAIClient(env);
    expect(client).toBeInstanceOf(StubAIClient);
  });

  it('treats whitespace-only values as missing', () => {
    const client = selectAIClient({
      AZURE_OPENAI_API_KEY: '   ',
      AZURE_OPENAI_ENDPOINT: 'https://example.openai.azure.com',
      AZURE_OPENAI_DEPLOYMENT_NAME: 'gpt-4-1-mini',
      AZURE_OPENAI_API_VERSION: '2024-10-21',
    });
    expect(client).toBeInstanceOf(StubAIClient);
  });
});
