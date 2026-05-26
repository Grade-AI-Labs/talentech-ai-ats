import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Application, Candidate, Job } from '@talentech/shared';
import { buildServer } from '../../src/server.js';

describe('applications routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildServer({ seed: true });
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists the seeded applications on GET /applications', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/applications',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Application[];
    expect(body).toHaveLength(2);
    for (const application of body) {
      expect(application.id).toBeTypeOf('string');
      expect(application.jobId).toBeTypeOf('string');
      expect(application.candidateId).toBeTypeOf('string');
      expect(application.status).toBe('new');
      expect(application.createdAt).toBeTypeOf('string');
    }
  });

  it('creates an application on POST /applications and returns it', async () => {
    const jobs = (await app.inject({ method: 'GET', url: '/jobs' })).json() as Job[];
    const candidates = (
      await app.inject({ method: 'GET', url: '/candidates' })
    ).json() as Candidate[];
    const job = jobs[0]!;
    const candidate = candidates[0]!;

    const response = await app.inject({
      method: 'POST',
      url: '/applications',
      payload: { jobId: job.id, candidateId: candidate.id },
    });

    expect(response.statusCode).toBe(201);
    const created = response.json() as Application;
    expect(created.id).toBeTypeOf('string');
    expect(created.jobId).toBe(job.id);
    expect(created.candidateId).toBe(candidate.id);
    expect(created.status).toBe('new');
    expect(created.createdAt).toBeTypeOf('string');

    const list = (
      await app.inject({ method: 'GET', url: '/applications' })
    ).json() as Application[];
    expect(list.find((a) => a.id === created.id)).toBeDefined();
  });

  it('rejects POST /applications with missing fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/applications',
      payload: { jobId: 'something' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects POST /applications referencing an unknown jobId with a 400 and clear error', async () => {
    const candidates = (
      await app.inject({ method: 'GET', url: '/candidates' })
    ).json() as Candidate[];
    const candidate = candidates[0]!;

    const response = await app.inject({
      method: 'POST',
      url: '/applications',
      payload: { jobId: 'no-such-job', candidateId: candidate.id },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Unknown jobId' });
  });

  it('rejects POST /applications referencing an unknown candidateId with a 400 and clear error', async () => {
    const jobs = (await app.inject({ method: 'GET', url: '/jobs' })).json() as Job[];
    const job = jobs[0]!;

    const response = await app.inject({
      method: 'POST',
      url: '/applications',
      payload: { jobId: job.id, candidateId: 'no-such-candidate' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Unknown candidateId' });
  });

  it('returns 404 for GET /applications/:id when the application is unknown', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/applications/does-not-exist',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Application not found' });
  });

  it('returns the application for GET /applications/:id when it exists', async () => {
    const list = (
      await app.inject({ method: 'GET', url: '/applications' })
    ).json() as Application[];
    const [first] = list;
    expect(first).toBeDefined();

    const response = await app.inject({
      method: 'GET',
      url: `/applications/${first!.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(first);
  });
});
