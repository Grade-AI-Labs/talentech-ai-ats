import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Job } from '@talentech/shared';
import { buildServer } from '../../src/server.js';

describe('jobs routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildServer({ seed: true });
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists the seeded jobs on GET /jobs', async () => {
    const response = await app.inject({ method: 'GET', url: '/jobs' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Job[];
    expect(body).toHaveLength(2);
    expect(body.map((job) => job.title)).toEqual(
      expect.arrayContaining(['Senior Backend Engineer', 'Frontend Engineer']),
    );
    for (const job of body) {
      expect(job.id).toBeTypeOf('string');
      expect(job.createdAt).toBeTypeOf('string');
    }
  });

  it('creates a job on POST /jobs and returns it', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/jobs',
      payload: {
        title: 'Staff Platform Engineer',
        description: 'Lead platform initiatives across the ATS stack.',
        requirements: ['Kubernetes', 'TypeScript'],
      },
    });

    expect(response.statusCode).toBe(201);
    const created = response.json() as Job;
    expect(created.id).toBeTypeOf('string');
    expect(created.title).toBe('Staff Platform Engineer');
    expect(created.requirements).toEqual(['Kubernetes', 'TypeScript']);

    const list = await app.inject({ method: 'GET', url: '/jobs' });
    const jobs = list.json() as Job[];
    expect(jobs.find((job) => job.id === created.id)).toBeDefined();
  });

  it('rejects POST /jobs with missing fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/jobs',
      payload: { title: 'Incomplete' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 404 for GET /jobs/:id when the job is unknown', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/jobs/does-not-exist',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Job not found' });
  });

  it('returns the job for GET /jobs/:id when it exists', async () => {
    const list = await app.inject({ method: 'GET', url: '/jobs' });
    const [first] = list.json() as Job[];
    expect(first).toBeDefined();

    const response = await app.inject({
      method: 'GET',
      url: `/jobs/${first!.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(first);
  });
});
