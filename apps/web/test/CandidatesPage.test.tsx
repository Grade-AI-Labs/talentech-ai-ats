import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Candidate, CreateCandidateInput } from '@talentech/shared';
import { CandidatesPage } from '../src/pages/CandidatesPage.js';

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

describe('CandidatesPage', () => {
  it('renders candidates returned by the api client', async () => {
    const seeded: Candidate[] = [
      buildCandidate({ id: 'a', name: 'Maya Patel' }),
      buildCandidate({ id: 'b', name: 'Jonas Lindberg' }),
    ];
    const client = {
      listCandidates: vi.fn().mockResolvedValue(seeded),
      createCandidate: vi.fn(),
    };

    render(<CandidatesPage client={client} />);

    expect(await screen.findByText('Maya Patel')).toBeInTheDocument();
    expect(screen.getByText('Jonas Lindberg')).toBeInTheDocument();
    expect(client.listCandidates).toHaveBeenCalledTimes(1);
  });

  it('adds a candidate submitted through the form to the list', async () => {
    const user = userEvent.setup();
    const created = buildCandidate({
      id: 'created-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      summary: 'Pioneering analyst.',
      skills: ['Analysis', 'Mathematics'],
    });
    const client = {
      listCandidates: vi.fn().mockResolvedValue([]),
      createCandidate: vi.fn(async (input: CreateCandidateInput) => {
        expect(input).toEqual({
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          summary: 'Pioneering analyst.',
          skills: ['Analysis', 'Mathematics'],
        });
        return created;
      }),
    };

    render(<CandidatesPage client={client} />);
    await waitFor(() => expect(client.listCandidates).toHaveBeenCalled());

    await user.type(screen.getByLabelText(/name/i), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/summary/i), 'Pioneering analyst.');
    await user.type(
      screen.getByLabelText(/skills/i),
      'Analysis, Mathematics',
    );
    await user.click(screen.getByRole('button', { name: /add candidate/i }));

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(client.createCandidate).toHaveBeenCalledTimes(1);
  });
});
