import type { FastifyInstance } from 'fastify';
import type { Candidate, CreateCandidateInput } from '@talentech/shared';

const createCandidateSchema = {
  type: 'object',
  required: ['name', 'email', 'summary', 'skills'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', minLength: 1 },
    summary: { type: 'string', minLength: 1 },
    skills: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
  },
} as const;

const candidateParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
  },
} as const;

export async function candidatesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/candidates', async (): Promise<Candidate[]> => {
    return app.repos.candidates.list();
  });

  app.post<{ Body: CreateCandidateInput }>(
    '/candidates',
    { schema: { body: createCandidateSchema } },
    async (request, reply) => {
      const candidate = app.repos.candidates.create(request.body);
      return reply.code(201).send(candidate);
    },
  );

  app.get<{ Params: { id: string } }>(
    '/candidates/:id',
    { schema: { params: candidateParamsSchema } },
    async (request, reply) => {
      const candidate = app.repos.candidates.get(request.params.id);
      if (!candidate) {
        return reply.code(404).send({ error: 'Candidate not found' });
      }
      return candidate;
    },
  );
}
