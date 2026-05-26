import type {
  Application,
  Candidate,
  CreateApplicationInput,
  CreateCandidateInput,
  CreateJobInput,
  Job,
} from '@talentech/shared';

const baseUrl: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { error?: string };
      detail = body.error ?? '';
    } catch {
      // ignore parse errors
    }
    throw new Error(
      detail
        ? `Request failed (${response.status}): ${detail}`
        : `Request failed (${response.status})`,
    );
  }
  return (await response.json()) as T;
}

export const api = {
  listJobs(): Promise<Job[]> {
    return request<Job[]>('/jobs');
  },
  createJob(input: CreateJobInput): Promise<Job> {
    return request<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  getJob(id: string): Promise<Job> {
    return request<Job>(`/jobs/${encodeURIComponent(id)}`);
  },
  listCandidates(): Promise<Candidate[]> {
    return request<Candidate[]>('/candidates');
  },
  createCandidate(input: CreateCandidateInput): Promise<Candidate> {
    return request<Candidate>('/candidates', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  getCandidate(id: string): Promise<Candidate> {
    return request<Candidate>(`/candidates/${encodeURIComponent(id)}`);
  },
  listApplications(): Promise<Application[]> {
    return request<Application[]>('/applications');
  },
  createApplication(input: CreateApplicationInput): Promise<Application> {
    return request<Application>('/applications', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  getApplication(id: string): Promise<Application> {
    return request<Application>(`/applications/${encodeURIComponent(id)}`);
  },
};

export type Api = typeof api;
