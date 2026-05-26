import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Application } from '@talentech/shared';
import { MatchPanel } from '../src/components/MatchPanel.js';

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

describe('MatchPanel', () => {
  it('renders an empty state when there is no score yet', () => {
    const application = buildApplication();
    const runMatch = vi.fn();

    render(<MatchPanel application={application} runMatch={runMatch} />);

    expect(screen.getByText(/no match score yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /run ai match/i }),
    ).toBeInTheDocument();
  });

  it('renders the current score and reasoning when present', () => {
    const application = buildApplication({
      matchScore: 75,
      matchReasoning: 'Matched skills: TypeScript, Node.js. Missing skills: PostgreSQL.',
    });
    const runMatch = vi.fn();

    render(<MatchPanel application={application} runMatch={runMatch} />);

    expect(screen.getByText(/75/)).toBeInTheDocument();
    expect(
      screen.getByText(/Matched skills: TypeScript, Node\.js/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Missing skills: PostgreSQL/)).toBeInTheDocument();
  });

  it('calls runMatch with the application id on click and re-renders with the result', async () => {
    const application = buildApplication();
    const updated: Application = buildApplication({
      matchScore: 50,
      matchReasoning:
        'Matched skills: TypeScript. Missing skills: PostgreSQL, REST APIs.',
    });
    const runMatch = vi.fn().mockResolvedValue(updated);

    render(<MatchPanel application={application} runMatch={runMatch} />);

    const button = screen.getByRole('button', { name: /run ai match/i });
    await userEvent.click(button);

    expect(runMatch).toHaveBeenCalledWith(application.id);
    await waitFor(() => {
      expect(screen.getByText(/50/)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Matched skills: TypeScript\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Missing skills: PostgreSQL, REST APIs\./),
    ).toBeInTheDocument();
  });

  it('shows an error message when runMatch rejects and leaves the previous state', async () => {
    const application = buildApplication({
      matchScore: 30,
      matchReasoning: 'Matched skills: TypeScript. Missing skills: Go.',
    });
    const runMatch = vi.fn().mockRejectedValue(new Error('Network down'));

    render(<MatchPanel application={application} runMatch={runMatch} />);

    const button = screen.getByRole('button', { name: /run ai match/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/network down/i);
    });

    // Previous score is preserved.
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it('disables the button while a match is in flight', async () => {
    const application = buildApplication();
    let resolveFn: ((value: Application) => void) | undefined;
    const runMatch = vi.fn().mockImplementation(
      () =>
        new Promise<Application>((resolve) => {
          resolveFn = resolve;
        }),
    );

    render(<MatchPanel application={application} runMatch={runMatch} />);

    const button = screen.getByRole('button', { name: /run ai match/i });
    await userEvent.click(button);
    expect(button).toBeDisabled();

    resolveFn?.(buildApplication({ matchScore: 10, matchReasoning: 'r' }));
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
