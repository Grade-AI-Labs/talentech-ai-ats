import { useEffect, useMemo, useState } from 'react';
import type { Application, Candidate, Job } from '@talentech/shared';
import { api, type Api } from '../lib/api.js';

type ApplicationsPageProps = {
  client?: Pick<Api, 'listApplications' | 'listJobs' | 'listCandidates'>;
};

type LoadedData = {
  applications: Application[];
  jobs: Job[];
  candidates: Candidate[];
};

const EMPTY_DATA: LoadedData = {
  applications: [],
  jobs: [],
  candidates: [],
};

export function ApplicationsPage({
  client = api,
}: ApplicationsPageProps): JSX.Element {
  const [data, setData] = useState<LoadedData>(EMPTY_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      client.listApplications(),
      client.listJobs(),
      client.listCandidates(),
    ])
      .then(([applications, jobs, candidates]) => {
        if (!cancelled) {
          setData({ applications, jobs, candidates });
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load applications',
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

  const jobsById = useMemo<Map<string, Job>>(() => {
    return new Map(data.jobs.map((job) => [job.id, job]));
  }, [data.jobs]);

  const candidatesById = useMemo<Map<string, Candidate>>(() => {
    return new Map(
      data.candidates.map((candidate) => [candidate.id, candidate]),
    );
  }, [data.candidates]);

  return (
    <section className="page" aria-labelledby="applications-heading">
      <h2 id="applications-heading">Applications</h2>

      {loading ? (
        <p className="muted">Loading applications…</p>
      ) : error ? (
        <p className="form__error" role="alert">
          {error}
        </p>
      ) : data.applications.length === 0 ? (
        <p className="muted">No applications yet.</p>
      ) : (
        <ul className="job-list" aria-label="Applications list">
          {data.applications.map((application) => {
            const job = jobsById.get(application.jobId);
            const candidate = candidatesById.get(application.candidateId);
            const jobTitle = job?.title ?? 'Unknown job';
            const candidateName = candidate?.name ?? 'Unknown candidate';
            return (
              <li key={application.id} className="job">
                <h3 className="job__title">{jobTitle}</h3>
                <p className="muted">{candidateName}</p>
                <p className="job__description">
                  Status: <span className="tag">{application.status}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
