import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { Application, Candidate, Job } from '@talentech/shared';
import { ApplicationsPage } from '../src/pages/ApplicationsPage.js';

function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    title: 'Seed Job',
    description: 'Seeded job',
    requirements: ['TypeScript'],
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    ...overrides,
  };
}

function buildCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'candidate-1',
    name: 'Seed Candidate',
    email: 'seed@example.com',
    summary: 'A seeded candidate.',
    skills: ['TypeScript'],
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    ...overrides,
  };
}

function buildApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'application-1',
    jobId: 'job-1',
    candidateId: 'candidate-1',
    status: 'new',
    createdAt: new Date('2026-01-02T00:00:00Z').toISOString(),
    ...overrides,
  };
}

describe('ApplicationsPage', () => {
  it('renders each application joined with job title and candidate name (not raw ids)', async () => {
    const jobs: Job[] = [
      buildJob({ id: 'job-a', title: 'Senior Backend Engineer' }),
      buildJob({ id: 'job-b', title: 'Frontend Engineer' }),
    ];
    const candidates: Candidate[] = [
      buildCandidate({ id: 'cand-a', name: 'Maya Patel' }),
      buildCandidate({ id: 'cand-b', name: 'Jonas Lindberg' }),
    ];
    const applications: Application[] = [
      buildApplication({ id: 'app-1', jobId: 'job-a', candidateId: 'cand-a' }),
      buildApplication({ id: 'app-2', jobId: 'job-b', candidateId: 'cand-b' }),
    ];
    const client = {
      listApplications: vi.fn().mockResolvedValue(applications),
      listJobs: vi.fn().mockResolvedValue(jobs),
      listCandidates: vi.fn().mockResolvedValue(candidates),
    };

    render(<ApplicationsPage client={client} />);

    expect(
      await screen.findByText('Senior Backend Engineer'),
    ).toBeInTheDocument();
    expect(screen.getByText('Maya Patel')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Jonas Lindberg')).toBeInTheDocument();

    // Raw ids must not leak into the rendered output for joined fields.
    expect(screen.queryByText('job-a')).not.toBeInTheDocument();
    expect(screen.queryByText('cand-a')).not.toBeInTheDocument();
  });

  it('shows a fallback label when a referenced job or candidate is missing', async () => {
    const applications: Application[] = [
      buildApplication({
        id: 'app-orphan',
        jobId: 'missing-job',
        candidateId: 'missing-candidate',
      }),
    ];
    const client = {
      listApplications: vi.fn().mockResolvedValue(applications),
      listJobs: vi.fn().mockResolvedValue([]),
      listCandidates: vi.fn().mockResolvedValue([]),
    };

    render(<ApplicationsPage client={client} />);

    await waitFor(() => expect(client.listApplications).toHaveBeenCalled());
    expect(await screen.findAllByText(/unknown/i)).not.toHaveLength(0);
  });

  it('renders an empty-state message when there are no applications', async () => {
    const client = {
      listApplications: vi.fn().mockResolvedValue([]),
      listJobs: vi.fn().mockResolvedValue([]),
      listCandidates: vi.fn().mockResolvedValue([]),
    };

    render(<ApplicationsPage client={client} />);

    expect(await screen.findByText(/no applications yet/i)).toBeInTheDocument();
  });
});
