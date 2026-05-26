import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Application } from '@talentech/shared';
import { buildServer } from '../../src/server.js';

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
