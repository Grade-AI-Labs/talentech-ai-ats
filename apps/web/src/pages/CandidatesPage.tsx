import { useEffect, useMemo, useState } from 'react';
import type { Candidate, CreateCandidateInput } from '@talentech/shared';
import { api, type Api } from '../lib/api.js';

type CandidatesPageProps = {
  client?: Pick<Api, 'listCandidates' | 'createCandidate'>;
};

type FormState = {
  name: string;
  email: string;
  summary: string;
  skills: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  summary: '',
  skills: '',
};

function parseSkills(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function CandidatesPage({
  client = api,
}: CandidatesPageProps): JSX.Element {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client
      .listCandidates()
      .then((result) => {
        if (!cancelled) {
          setCandidates(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load candidates',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const canSubmit = useMemo<boolean>(() => {
    return (
      form.name.trim().length > 0 &&
      form.email.trim().length > 0 &&
      form.summary.trim().length > 0 &&
      parseSkills(form.skills).length > 0 &&
      !submitting
    );
  }, [form, submitting]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    const input: CreateCandidateInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      summary: form.summary.trim(),
      skills: parseSkills(form.skills),
    };
    setSubmitting(true);
    setError(null);
    try {
      const created = await client.createCandidate(input);
      setCandidates((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to create candidate',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page" aria-labelledby="candidates-heading">
      <h2 id="candidates-heading">Candidates</h2>

      {loading ? (
        <p className="muted">Loading candidates…</p>
      ) : candidates.length === 0 ? (
        <p className="muted">No candidates yet. Add one below.</p>
      ) : (
        <ul className="job-list" aria-label="Candidates list">
          {candidates.map((candidate) => (
            <li key={candidate.id} className="job">
              <h3 className="job__title">{candidate.name}</h3>
              <p className="muted">{candidate.email}</p>
              <p className="job__description">{candidate.summary}</p>
              <ul className="job__requirements">
                {candidate.skills.map((skill) => (
                  <li key={skill} className="tag">
                    {skill}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <form className="form card" onSubmit={handleSubmit} aria-label="Add candidate">
        <h3>Add a candidate</h3>
        <label className="form__row">
          <span className="form__label">Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            required
          />
        </label>
        <label className="form__row">
          <span className="form__label">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
            required
          />
        </label>
        <label className="form__row">
          <span className="form__label">Summary</span>
          <textarea
            rows={3}
            value={form.summary}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, summary: event.target.value }))
            }
            required
          />
        </label>
        <label className="form__row">
          <span className="form__label">
            Skills <span className="muted">(comma separated)</span>
          </span>
          <input
            type="text"
            value={form.skills}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, skills: event.target.value }))
            }
            required
          />
        </label>
        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button" disabled={!canSubmit}>
          {submitting ? 'Adding…' : 'Add candidate'}
        </button>
      </form>
    </section>
  );
}
