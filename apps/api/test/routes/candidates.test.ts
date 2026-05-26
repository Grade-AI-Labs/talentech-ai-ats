import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Candidate } from '@talentech/shared';
import { buildServer } from '../../src/server.js';

describe('candidates routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildServer({ seed: true });
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists the seeded candidates on GET /candidates', async () => {
    const response = await app.inject({ method: 'GET', url: '/candidates' });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Candidate[];
    expect(body).toHaveLength(3);
    for (const candidate of body) {
      expect(candidate.id).toBeTypeOf('string');
      expect(candidate.createdAt).toBeTypeOf('string');
      expect(candidate.name.length).toBeGreaterThan(0);
      expect(candidate.email).toMatch(/@/);
      expect(Array.isArray(candidate.skills)).toBe(true);
    }
  });

  it('creates a candidate on POST /candidates and returns it', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/candidates',
      payload: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        summary: 'Pioneering analyst and engineer.',
        skills: ['Analysis', 'Mathematics'],
      },
    });

    expect(response.statusCode).toBe(201);
    const created = response.json() as Candidate;
    expect(created.id).toBeTypeOf('string');
    expect(created.name).toBe('Ada Lovelace');
    expect(created.email).toBe('ada@example.com');
    expect(created.summary).toBe('Pioneering analyst and engineer.');
    expect(created.skills).toEqual(['Analysis', 'Mathematics']);
    expect(created.createdAt).toBeTypeOf('string');

    const list = await app.inject({ method: 'GET', url: '/candidates' });
    const candidates = list.json() as Candidate[];
    expect(candidates.find((candidate) => candidate.id === created.id)).toBeDefined();
  });

  it('rejects POST /candidates with missing fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/candidates',
      payload: { name: 'Incomplete' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 404 for GET /candidates/:id when the candidate is unknown', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/candidates/does-not-exist',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Candidate not found' });
  });

  it('returns the candidate for GET /candidates/:id when it exists', async () => {
    const list = await app.inject({ method: 'GET', url: '/candidates' });
    const [first] = list.json() as Candidate[];
    expect(first).toBeDefined();

    const response = await app.inject({
      method: 'GET',
      url: `/candidates/${first!.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(first);
  });

  it('returns the candidate created via POST when fetched by id', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/candidates',
      payload: {
        name: 'Grace Hopper',
        email: 'grace@example.com',
        summary: 'Compiler trailblazer.',
        skills: ['COBOL', 'Compilers'],
      },
    });
    expect(created.statusCode).toBe(201);
    const candidate = created.json() as Candidate;

    const fetched = await app.inject({
      method: 'GET',
      url: `/candidates/${candidate.id}`,
    });

    expect(fetched.statusCode).toBe(200);
    expect(fetched.json()).toEqual(candidate);
  });
});
