import { randomUUID } from 'node:crypto';
import type { Job, CreateJobInput } from '@talentech/shared';

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

export type Repos = {
  jobs: JobsRepo;
};

export function createRepos(): Repos {
  return {
    jobs: new JobsRepo(),
  };
}
