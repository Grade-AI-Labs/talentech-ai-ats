import type { Candidate, Job, MatchResult } from '@talentech/shared';
import { StubAIClient, type AIClient } from './client.js';
import { MatchError } from './errors.js';

/**
 * Compute a `MatchResult` for a job/candidate pair.
 *
 * For the deterministic `StubAIClient`, the score is derived directly
 * from the structured inputs — no prompt is constructed and `complete()`
 * is not invoked. This keeps the workshop runnable without any external
 * model access and makes the result reproducible.
 *
 * Slice 5 will extend this function with a LangChain prompt + parser
 * path that uses `client.complete()` when a real `AzureOpenAIClient`
 * is provided. Errors from that path will be wrapped in `MatchError`.
 */
export async function matchCandidateToJob(
  job: Job,
  candidate: Candidate,
  client: AIClient,
): Promise<MatchResult> {
  if (client instanceof StubAIClient) {
    return client.computeMatch(job, candidate);
  }

  // No non-stub path exists yet — guard against accidental use of an
  // unimplemented client by failing fast with a typed error.
  throw new MatchError(
    'Only StubAIClient is supported in this slice; real model clients land in slice 5.',
  );
}
