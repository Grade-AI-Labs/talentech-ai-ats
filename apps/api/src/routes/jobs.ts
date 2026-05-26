import type { FastifyInstance } from 'fastify';
import type { CreateJobInput, Job } from '@talentech/shared';

const createJobSchema = {
  type: 'object',
  required: ['title', 'description', 'requirements'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    requirements: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
  },
} as const;

const jobParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
  },
} as const;

export async function jobsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/jobs', async (): Promise<Job[]> => {
    return app.repos.jobs.list();
  });

  app.post<{ Body: CreateJobInput }>(
    '/jobs',
    { schema: { body: createJobSchema } },
    async (request, reply) => {
      const job = app.repos.jobs.create(request.body);
      return reply.code(201).send(job);
    },
  );

  app.get<{ Params: { id: string } }>(
    '/jobs/:id',
    { schema: { params: jobParamsSchema } },
    async (request, reply) => {
      const job = app.repos.jobs.get(request.params.id);
      if (!job) {
        return reply.code(404).send({ error: 'Job not found' });
      }
      return job;
    },
  );
}
