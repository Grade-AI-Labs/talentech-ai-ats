import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Application } from '@talentech/shared';
import { buildServer } from '../../src/server.js';
import type { AIClient } from '../../src/ai/client.js';

describe('POST /ai/match', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildServer({ seed: true });
  });

  afterEach(async () => {
    await app.close();
  });

  async function firstApplicationId(): Promise<string> {
    const list = (
      await app.inject({ method: 'GET', url: '/applications' })
    ).json() as Application[];
    const [first] = list;
    expect(first).toBeDefined();
    return first!.id;
  }

  it('returns the updated application with matchScore (0-100) and matchReasoning', async () => {
    const applicationId = await firstApplicationId();

    const response = await app.inject({
      method: 'POST',
      url: '/ai/match',
      payload: { applicationId },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Application;
    expect(body.id).toBe(applicationId);
    expect(typeof body.matchScore).toBe('number');
    expect(body.matchScore).toBeGreaterThanOrEqual(0);
    expect(body.matchScore).toBeLessThanOrEqual(100);
    expect(typeof body.matchReasoning).toBe('string');
    expect((body.matchReasoning ?? '').length).toBeGreaterThan(0);
  });

  it('persists the score so a subsequent GET /applications/:id reflects it', async () => {
    const applicationId = await firstApplicationId();

    const matchResponse = await app.inject({
      method: 'POST',
      url: '/ai/match',
      payload: { applicationId },
    });
    expect(matchResponse.statusCode).toBe(200);
    const matched = matchResponse.json() as Application;

    const getResponse = await app.inject({
      method: 'GET',
      url: `/applications/${applicationId}`,
    });
    expect(getResponse.statusCode).toBe(200);
    const fetched = getResponse.json() as Application;

    expect(fetched.matchScore).toBe(matched.matchScore);
    expect(fetched.matchReasoning).toBe(matched.matchReasoning);
  });

  it('returns 404 when the applicationId is unknown', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/ai/match',
      payload: { applicationId: 'no-such-application' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Application not found' });
  });

  it('rejects POST /ai/match with missing applicationId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/ai/match',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('is deterministic across runs for the same application', async () => {
    const applicationId = await firstApplicationId();

    const first = (
      await app.inject({
        method: 'POST',
        url: '/ai/match',
        payload: { applicationId },
      })
    ).json() as Application;

    const second = (
      await app.inject({
        method: 'POST',
        url: '/ai/match',
        payload: { applicationId },
      })
    ).json() as Application;

    expect(second.matchScore).toBe(first.matchScore);
    expect(second.matchReasoning).toBe(first.matchReasoning);
  });
});

describe('POST /ai/match with a non-stub AI client', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  async function firstApplicationId(): Promise<string> {
    const list = (
      await app.inject({ method: 'GET', url: '/applications' })
    ).json() as Application[];
    const [first] = list;
    expect(first).toBeDefined();
    return first!.id;
  }

  it('returns 200 with the model-derived score when the fake client returns valid JSON', async () => {
    class FakeAIClient implements AIClient {
      async complete(_prompt: string): Promise<string> {
        return JSON.stringify({
          score: 81,
          reasoning: 'Backend-leaning fit with minor cloud gaps.',
        });
      }
    }
    app = await buildServer({ seed: true, aiClient: new FakeAIClient() });

    const applicationId = await firstApplicationId();

    const response = await app.inject({
      method: 'POST',
      url: '/ai/match',
      payload: { applicationId },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Application;
    expect(body.matchScore).toBe(81);
    expect(body.matchReasoning).toBe('Backend-leaning fit with minor cloud gaps.');
  });

  it('maps a MatchError (parse failure) to a 502 response', async () => {
    class GarbledClient implements AIClient {
      async complete(_prompt: string): Promise<string> {
        return 'definitely not JSON';
      }
    }
    app = await buildServer({ seed: true, aiClient: new GarbledClient() });

    const applicationId = await firstApplicationId();

    const response = await app.inject({
      method: 'POST',
      url: '/ai/match',
      payload: { applicationId },
    });

    expect(response.statusCode).toBe(502);
    const body = response.json() as { error: string };
    expect(body.error).toMatch(/AI match failed/i);
  });

  it('maps a MatchError (client failure) to a 502 response', async () => {
    class FailingClient implements AIClient {
      async complete(_prompt: string): Promise<string> {
        throw new Error('upstream unavailable');
      }
    }
    app = await buildServer({ seed: true, aiClient: new FailingClient() });

    const applicationId = await firstApplicationId();

    const response = await app.inject({
      method: 'POST',
      url: '/ai/match',
      payload: { applicationId },
    });

    expect(response.statusCode).toBe(502);
    const body = response.json() as { error: string };
    expect(body.error).toMatch(/AI match failed/i);
  });
});
