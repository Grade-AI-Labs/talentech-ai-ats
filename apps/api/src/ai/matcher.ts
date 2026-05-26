import type { Candidate, Job, MatchResult } from '@talentech/shared';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { StubAIClient, type AIClient } from './client.js';
import { MatchError } from './errors.js';

/**
 * Zod schema for the matcher's structured output. Kept narrow: the LLM
 * must return exactly these two fields. `StructuredOutputParser` enforces
 * the shape and emits format instructions that match this schema.
 */
const matchResultSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe('Match strength between the candidate and the job, 0 to 100.'),
  reasoning: z
    .string()
    .min(1)
    .describe('Short, human-readable explanation of the score.'),
});

const matchResultParser = StructuredOutputParser.fromZodSchema(matchResultSchema);

/**
 * System message defines the matcher's role and the JSON output contract.
 * `{format_instructions}` is replaced by `ChatPromptTemplate` with the
 * parser's auto-generated instructions, which include the JSON schema
 * the model must follow.
 *
 * The human message embeds the structured inputs as JSON. We do not
 * paraphrase the records — the model sees the exact fields stored in the
 * repos, which makes the output easier to reason about during reviews.
 */
const SYSTEM_TEMPLATE = [
  'You are an applicant-tracking matcher. You receive a job and a candidate as JSON and produce a structured score.',
  '',
  'Rules:',
  '- score is an integer from 0 to 100. 0 means no useful overlap, 100 means a strong match across every requirement.',
  '- reasoning is a short, factual explanation referencing the job requirements and the candidate skills/summary.',
  '- Output JSON only — no prose, no markdown outside the JSON contract below.',
  '',
  '{format_instructions}',
].join('\n');

const HUMAN_TEMPLATE = [
  'Score this candidate against the job below.',
  '',
  'JOB:',
  '{job}',
  '',
  'CANDIDATE:',
  '{candidate}',
].join('\n');

const matchPrompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_TEMPLATE],
  ['human', HUMAN_TEMPLATE],
]);

/**
 * Compute a `MatchResult` for a job/candidate pair.
 *
 * `StubAIClient` is detected by type and routed through a deterministic
 * computation that bypasses the LangChain prompt/parser machinery
 * entirely. This keeps the workshop runnable without any external model
 * access and makes stub results reproducible.
 *
 * For every other `AIClient` (notably `AzureOpenAIClient`), the matcher:
 *   1. Renders a `ChatPromptTemplate` (system role + JSON output contract,
 *      human message containing job + candidate as JSON).
 *   2. Calls `client.complete(prompt)` to get the model's raw text.
 *   3. Parses the output with `StructuredOutputParser` over a zod schema.
 *
 * Any failure along that path (network, auth, malformed JSON, schema
 * mismatch) is caught and rewrapped as `MatchError`, which the
 * `/ai/match` route maps to a 502 response.
 */
export async function matchCandidateToJob(
  job: Job,
  candidate: Candidate,
  client: AIClient,
): Promise<MatchResult> {
  if (client instanceof StubAIClient) {
    return client.computeMatch(job, candidate);
  }

  let prompt: string;
  try {
    const formatted = await matchPrompt.formatMessages({
      format_instructions: matchResultParser.getFormatInstructions(),
      job: JSON.stringify(job, null, 2),
      candidate: JSON.stringify(candidate, null, 2),
    });
    // Flatten the rendered messages into a single text prompt for the
    // `AIClient.complete(prompt: string)` boundary. Each message is
    // prefixed with its role so the model sees the system/human split.
    prompt = formatted
      .map((message) => {
        const role = message.getType().toUpperCase();
        const content =
          typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content);
        return `${role}:\n${content}`;
      })
      .join('\n\n');
  } catch (error) {
    throw new MatchError('Failed to build the match prompt.', { cause: error });
  }

  let raw: string;
  try {
    raw = await client.complete(prompt);
  } catch (error) {
    throw new MatchError(
      'AI client failed to complete the match prompt.',
      { cause: error },
    );
  }

  try {
    const parsed = await matchResultParser.parse(raw);
    return {
      score: parsed.score,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    throw new MatchError(
      'Failed to parse the AI match response into a MatchResult.',
      { cause: error },
    );
  }
}
