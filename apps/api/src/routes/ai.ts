import type { FastifyInstance } from 'fastify';
import type { Application } from '@talentech/shared';
import { matchCandidateToJob } from '../ai/matcher.js';
import { MatchError } from '../ai/errors.js';

const matchBodySchema = {
  type: 'object',
  required: ['applicationId'],
  additionalProperties: false,
  properties: {
    applicationId: { type: 'string', minLength: 1 },
  },
} as const;

type MatchBody = {
  applicationId: string;
};

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: MatchBody }>(
    '/ai/match',
    { schema: { body: matchBodySchema } },
    async (request, reply) => {
      const { applicationId } = request.body;

      const application = app.repos.applications.get(applicationId);
      if (!application) {
        return reply.code(404).send({ error: 'Application not found' });
      }

      const job = app.repos.jobs.get(application.jobId);
      if (!job) {
        return reply.code(404).send({ error: 'Job not found' });
      }

      const candidate = app.repos.candidates.get(application.candidateId);
      if (!candidate) {
        return reply.code(404).send({ error: 'Candidate not found' });
      }

      try {
        const result = await matchCandidateToJob(job, candidate, app.aiClient);
        const updated = app.repos.applications.update(applicationId, {
          matchScore: result.score,
          matchReasoning: result.reasoning,
        });
        // The earlier `.get()` succeeded and nothing concurrent removes
        // applications, so `update` returns the record. Cast through
        // `Application` to keep the return type narrow.
        return updated as Application;
      } catch (error) {
        if (error instanceof MatchError) {
          return reply
            .code(502)
            .send({ error: `AI match failed: ${error.message}` });
        }
        throw error;
      }
    },
  );
}
