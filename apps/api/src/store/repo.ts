import { randomUUID } from 'node:crypto';
import type {
  Application,
  ApplicationStatus,
  Candidate,
  CreateApplicationInput,
  CreateCandidateInput,
  CreateJobInput,
  Job,
} from '@talentech/shared';

export class JobsRepo {
  private readonly jobs = new Map<string, Job>();

  list(): Job[] {
    return Array.from(this.jobs.values());
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  create(input: CreateJobInput): Job {
    const job: Job = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      requirements: input.requirements,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(job.id, job);
    return job;
  }
}

export class CandidatesRepo {
  private readonly candidates = new Map<string, Candidate>();

  list(): Candidate[] {
    return Array.from(this.candidates.values());
  }

  get(id: string): Candidate | undefined {
    return this.candidates.get(id);
  }

  create(input: CreateCandidateInput): Candidate {
    const candidate: Candidate = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      summary: input.summary,
      skills: input.skills,
      createdAt: new Date().toISOString(),
    };
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }
}

export class ApplicationsRepo {
  private readonly applications = new Map<string, Application>();

  list(): Application[] {
    return Array.from(this.applications.values());
  }

  get(id: string): Application | undefined {
    return this.applications.get(id);
  }

  create(input: CreateApplicationInput): Application {
    const application: Application = {
      id: randomUUID(),
      jobId: input.jobId,
      candidateId: input.candidateId,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    this.applications.set(application.id, application);
    return application;
  }

  update(
    id: string,
    patch: Partial<Pick<Application, 'status' | 'matchScore' | 'matchReasoning'>>,
  ): Application | undefined {
    const existing = this.applications.get(id);
    if (!existing) {
      return undefined;
    }
    const updated: Application = {
      ...existing,
      ...(patch.status !== undefined ? { status: patch.status as ApplicationStatus } : {}),
      ...(patch.matchScore !== undefined ? { matchScore: patch.matchScore } : {}),
      ...(patch.matchReasoning !== undefined
        ? { matchReasoning: patch.matchReasoning }
        : {}),
    };
    this.applications.set(id, updated);
    return updated;
  }
}

export type Repos = {
  jobs: JobsRepo;
  candidates: CandidatesRepo;
  applications: ApplicationsRepo;
};

export function createRepos(): Repos {
  return {
    jobs: new JobsRepo(),
    candidates: new CandidatesRepo(),
    applications: new ApplicationsRepo(),
  };
}
