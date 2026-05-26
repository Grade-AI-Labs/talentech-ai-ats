import { useEffect, useMemo, useState } from 'react';
import type { CreateJobInput, Job } from '@talentech/shared';
import { api, type Api } from '../lib/api.js';

type JobsPageProps = {
  client?: Pick<Api, 'listJobs' | 'createJob'>;
};

type FormState = {
  title: string;
  description: string;
  requirements: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  requirements: '',
};

function parseRequirements(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function JobsPage({ client = api }: JobsPageProps): JSX.Element {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client
      .listJobs()
      .then((result) => {
        if (!cancelled) {
          setJobs(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load jobs');
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
      form.title.trim().length > 0 &&
      form.description.trim().length > 0 &&
      parseRequirements(form.requirements).length > 0 &&
      !submitting
    );
  }, [form, submitting]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    const input: CreateJobInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      requirements: parseRequirements(form.requirements),
    };
    setSubmitting(true);
    setError(null);
    try {
      const created = await client.createJob(input);
      setJobs((prev) => [...prev, created]);
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page" aria-labelledby="jobs-heading">
      <h2 id="jobs-heading">Jobs</h2>

      {loading ? (
        <p className="muted">Loading jobs…</p>
      ) : jobs.length === 0 ? (
        <p className="muted">No jobs yet. Add one below.</p>
      ) : (
        <ul className="job-list" aria-label="Jobs list">
          {jobs.map((job) => (
            <li key={job.id} className="job">
              <h3 className="job__title">{job.title}</h3>
              <p className="job__description">{job.description}</p>
              <ul className="job__requirements">
                {job.requirements.map((req) => (
                  <li key={req} className="tag">
                    {req}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <form className="form card" onSubmit={handleSubmit} aria-label="Add job">
        <h3>Add a job</h3>
        <label className="form__row">
          <span className="form__label">Title</span>
          <input
            type="text"
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            required
          />
        </label>
        <label className="form__row">
          <span className="form__label">Description</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            required
          />
        </label>
        <label className="form__row">
          <span className="form__label">
            Requirements <span className="muted">(comma separated)</span>
          </span>
          <input
            type="text"
            value={form.requirements}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, requirements: event.target.value }))
            }
            required
          />
        </label>
        {error && <p className="form__error" role="alert">{error}</p>}
        <button type="submit" className="button" disabled={!canSubmit}>
          {submitting ? 'Adding…' : 'Add job'}
        </button>
      </form>
    </section>
  );
}
