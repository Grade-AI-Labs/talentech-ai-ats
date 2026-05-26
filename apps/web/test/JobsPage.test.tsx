import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CreateJobInput, Job } from '@talentech/shared';
import { JobsPage } from '../src/pages/JobsPage.js';

function buildJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    title: 'Seed Job',
    description: 'A seeded job',
    requirements: ['TypeScript'],
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    ...overrides,
  };
}

describe('JobsPage', () => {
  it('renders jobs returned by the api client', async () => {
    const seeded: Job[] = [
      buildJob({ id: 'a', title: 'Backend Engineer' }),
      buildJob({ id: 'b', title: 'Frontend Engineer' }),
    ];
    const client = {
      listJobs: vi.fn().mockResolvedValue(seeded),
      createJob: vi.fn(),
    };

    render(<JobsPage client={client} />);

    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(client.listJobs).toHaveBeenCalledTimes(1);
  });

  it('adds a job submitted through the form to the list', async () => {
    const user = userEvent.setup();
    const created = buildJob({
      id: 'created-1',
      title: 'New Role',
      description: 'A brand new role',
      requirements: ['React', 'TypeScript'],
    });
    const client = {
      listJobs: vi.fn().mockResolvedValue([]),
      createJob: vi.fn(async (input: CreateJobInput) => {
        expect(input).toEqual({
          title: 'New Role',
          description: 'A brand new role',
          requirements: ['React', 'TypeScript'],
        });
        return created;
      }),
    };

    render(<JobsPage client={client} />);
    await waitFor(() => expect(client.listJobs).toHaveBeenCalled());

    await user.type(screen.getByLabelText(/title/i), 'New Role');
    await user.type(
      screen.getByLabelText(/description/i),
      'A brand new role',
    );
    await user.type(
      screen.getByLabelText(/requirements/i),
      'React, TypeScript',
    );
    await user.click(screen.getByRole('button', { name: /add job/i }));

    expect(await screen.findByText('New Role')).toBeInTheDocument();
    expect(client.createJob).toHaveBeenCalledTimes(1);
  });
});
