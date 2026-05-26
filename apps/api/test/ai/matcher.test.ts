import { describe, expect, it } from 'vitest';
import type { Candidate, Job } from '@talentech/shared';
import { StubAIClient } from '../../src/ai/client.js';
import { matchCandidateToJob } from '../../src/ai/matcher.js';

function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    title: 'Senior Backend Engineer',
    description: 'Backend role',
    requirements: ['TypeScript', 'Node.js', 'PostgreSQL', 'REST APIs'],
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    ...overrides,
  };
}

function buildCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'candidate-1',
    name: 'Maya Patel',
    email: 'maya.patel@example.com',
    summary: 'Backend engineer.',
    skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    ...overrides,
  };
}

describe('matchCandidateToJob with StubAIClient', () => {
  it('returns a non-zero score and lists matched skills when there is overlap', async () => {
    const client = new StubAIClient();
    const job = buildJob({
      requirements: ['TypeScript', 'Node.js', 'PostgreSQL', 'REST APIs'],
    });
    const candidate = buildCandidate({
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
    });

    const result = await matchCandidateToJob(job, candidate, client);

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reasoning).toMatch(/TypeScript/i);
    expect(result.reasoning).toMatch(/Node\.js/i);
    expect(result.reasoning).toMatch(/PostgreSQL/i);
  });

  it('mentions missing skills in the reasoning', async () => {
    const client = new StubAIClient();
    const job = buildJob({
      requirements: ['TypeScript', 'Node.js', 'PostgreSQL', 'REST APIs'],
    });
    const candidate = buildCandidate({
      skills: ['TypeScript', 'Node.js'],
    });

    const result = await matchCandidateToJob(job, candidate, client);

    expect(result.reasoning).toMatch(/PostgreSQL/i);
    expect(result.reasoning).toMatch(/REST APIs/i);
  });

  it('returns a zero score when there is no skill overlap', async () => {
    const client = new StubAIClient();
    const job = buildJob({ requirements: ['React', 'CSS', 'Accessibility'] });
    const candidate = buildCandidate({
      skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
    });

    const result = await matchCandidateToJob(job, candidate, client);

    expect(result.score).toBe(0);
  });

  it('matches case-insensitively', async () => {
    const client = new StubAIClient();
    const job = buildJob({ requirements: ['TypeScript', 'NODE.JS'] });
    const candidate = buildCandidate({ skills: ['typescript', 'node.js'] });

    const result = await matchCandidateToJob(job, candidate, client);

    expect(result.score).toBe(100);
  });

  it('is deterministic: identical inputs produce identical scores across runs', async () => {
    const client = new StubAIClient();
    const job = buildJob();
    const candidate = buildCandidate();

    const first = await matchCandidateToJob(job, candidate, client);
    const second = await matchCandidateToJob(job, candidate, client);
    const third = await matchCandidateToJob(job, candidate, client);

    expect(second.score).toBe(first.score);
    expect(third.score).toBe(first.score);
    expect(second.reasoning).toBe(first.reasoning);
    expect(third.reasoning).toBe(first.reasoning);
  });

  it('returns a 0 score when the job has no requirements (no division by zero)', async () => {
    const client = new StubAIClient();
    const job = buildJob({ requirements: [] });
    const candidate = buildCandidate({ skills: ['TypeScript'] });

    const result = await matchCandidateToJob(job, candidate, client);

    expect(result.score).toBe(0);
    expect(result.reasoning).toBeTypeOf('string');
  });
});
