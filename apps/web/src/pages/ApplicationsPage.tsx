import { useEffect, useMemo, useState } from 'react';
import type { Application, Candidate, Job } from '@talentech/shared';
import { api, type Api } from '../lib/api.js';
import { MatchPanel, type RunMatchFn } from '../components/MatchPanel.js';

type ApplicationsPageProps = {
  client?: Pick<
    Api,
    'listApplications' | 'listJobs' | 'listCandidates' | 'runMatch'
  >;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const runMatch: RunMatchFn = async (applicationId) => {
    const updated = await client.runMatch(applicationId);
    // Reflect the persisted score back into the page's application list so
    // that collapsing and re-expanding the row keeps the updated values.
    setData((prev) => ({
      ...prev,
      applications: prev.applications.map((a) =>
        a.id === updated.id ? updated : a,
      ),
    }));
    return updated;
  };

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
            const expanded = expandedId === application.id;
            return (
              <li key={application.id} className="job">
                <button
                  type="button"
                  className="application__toggle"
                  aria-expanded={expanded}
                  aria-controls={`match-panel-${application.id}`}
                  onClick={() =>
                    setExpandedId(expanded ? null : application.id)
                  }
                >
                  <span className="job__title">{jobTitle}</span>
                </button>
                <p className="muted">{candidateName}</p>
                <p className="job__description">
                  Status: <span className="tag">{application.status}</span>
                </p>
                {expanded ? (
                  <div id={`match-panel-${application.id}`}>
                    <MatchPanel application={application} runMatch={runMatch} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
