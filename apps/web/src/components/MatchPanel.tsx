import { useState } from 'react';
import type { Application } from '@talentech/shared';

export type RunMatchFn = (applicationId: string) => Promise<Application>;

export type MatchPanelProps = {
  application: Application;
  runMatch: RunMatchFn;
};

export function MatchPanel({
  application,
  runMatch,
}: MatchPanelProps): JSX.Element {
  // The panel owns the post-match application state so a successful
  // re-match updates the UI without requiring the parent to refetch.
  const [current, setCurrent] = useState<Application>(application);
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    setRunning(true);
    setError(null);
    try {
      const updated = await runMatch(current.id);
      setCurrent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run AI match');
    } finally {
      setRunning(false);
    }
  }

  const hasScore = typeof current.matchScore === 'number';

  return (
    <div className="match-panel" aria-label="AI match panel">
      {hasScore ? (
        <div className="match-panel__result">
          <p className="match-panel__score">
            <span className="match-panel__score-label">Match score: </span>
            <strong>{current.matchScore}</strong>
            <span className="muted"> / 100</span>
          </p>
          {current.matchReasoning ? (
            <p className="match-panel__reasoning">{current.matchReasoning}</p>
          ) : null}
        </div>
      ) : (
        <p className="muted">No match score yet.</p>
      )}

      <button
        type="button"
        className="button"
        onClick={() => {
          void handleClick();
        }}
        disabled={running}
      >
        {running ? 'Running…' : 'Run AI match'}
      </button>

      {error ? (
        <p className="form__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
