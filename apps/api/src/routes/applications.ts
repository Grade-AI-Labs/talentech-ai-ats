import type { FastifyInstance } from 'fastify';
import type { Application, CreateApplicationInput } from '@talentech/shared';

const createApplicationSchema = {
  type: 'object',
  required: ['jobId', 'candidateId'],
  additionalProperties: false,
  properties: {
    jobId: { type: 'string', minLength: 1 },
    candidateId: { type: 'string', minLength: 1 },
  },
} as const;

const applicationParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
  },
} as const;

export async function applicationsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/applications', async (): Promise<Application[]> => {
    return app.repos.applications.list();
  });

  // Unknown job/candidate references are reported as 400 Bad Request rather
  // than 404. Rationale: the `/applications` collection itself exists, so
  // nothing is "not found"; the request body is semantically invalid (it
  // points at ids the server has no record of). 400 matches the "client sent
  // bad data" intent, and the error body names the offending field so the
  // caller can correct it.
  app.post<{ Body: CreateApplicationInput }>(
    '/applications',
    { schema: { body: createApplicationSchema } },
    async (request, reply) => {
      const { jobId, candidateId } = request.body;
      if (!app.repos.jobs.get(jobId)) {
        return reply.code(400).send({ error: 'Unknown jobId' });
      }
      if (!app.repos.candidates.get(candidateId)) {
        return reply.code(400).send({ error: 'Unknown candidateId' });
      }
      const application = app.repos.applications.create({ jobId, candidateId });
      return reply.code(201).send(application);
    },
  );

  app.get<{ Params: { id: string } }>(
    '/applications/:id',
    { schema: { params: applicationParamsSchema } },
    async (request, reply) => {
      const application = app.repos.applications.get(request.params.id);
      if (!application) {
        return reply.code(404).send({ error: 'Application not found' });
      }
      return application;
    },
  );
}
