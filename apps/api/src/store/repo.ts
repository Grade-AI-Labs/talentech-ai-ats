import { randomUUID } from 'node:crypto';
import type {
  Candidate,
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

export type Repos = {
  jobs: JobsRepo;
  candidates: CandidatesRepo;
};

export function createRepos(): Repos {
  return {
    jobs: new JobsRepo(),
    candidates: new CandidatesRepo(),
  };
}
