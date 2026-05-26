import type { Candidate, Job, MatchResult } from '@talentech/shared';

/**
 * Abstraction over the model invocation used by the matcher.
 *
 * Slice 4 introduces this interface and ships a deterministic
 * `StubAIClient` only. Slice 5 will add an `AzureOpenAIClient` that
 * speaks to Azure OpenAI via LangChain.js — at that point the matcher
 * will use `complete()` to drive a real prompt/parse cycle.
 *
 * The stub bypasses `complete()` entirely (the matcher routes around it
 * when it sees a `StubAIClient`) so the workshop runs with zero external
 * configuration.
 */
export interface AIClient {
  complete(prompt: string): Promise<string>;
}

/**
 * Deterministic fallback client. The matcher detects this concrete type
 * and computes the score directly from the inputs, without going through
 * `complete()` or any prompt building.
 */
export class StubAIClient implements AIClient {
  /**
   * Returns a `MatchResult` derived purely from the structured inputs.
   * Skill comparison is case-insensitive and whitespace-trimmed.
   */
  computeMatch(job: Job, candidate: Candidate): MatchResult {
    const requirements = normalizeList(job.requirements);
    const skills = normalizeList(candidate.skills);

    if (requirements.length === 0) {
      return {
        score: 0,
        reasoning:
          'No requirements were specified for this job, so a meaningful match could not be computed.',
      };
    }

    const skillSet = new Set(skills.map((entry) => entry.normalized));
    const matched: string[] = [];
    const missing: string[] = [];

    for (const requirement of requirements) {
      if (skillSet.has(requirement.normalized)) {
        matched.push(requirement.original);
      } else {
        missing.push(requirement.original);
      }
    }

    const score = Math.round((matched.length / requirements.length) * 100);

    const matchedLine =
      matched.length > 0
        ? `Matched skills: ${matched.join(', ')}.`
        : 'Matched skills: none.';
    const missingLine =
      missing.length > 0
        ? `Missing skills: ${missing.join(', ')}.`
        : 'Missing skills: none.';

    return {
      score,
      reasoning: `${matchedLine} ${missingLine}`,
    };
  }

  /**
   * Provided to satisfy the `AIClient` contract. The stub never reaches
   * here from the matcher — its presence triggers the direct
   * computation path. If a caller invokes `complete()` explicitly,
   * return a deterministic empty JSON object so callers don't crash.
   */
  async complete(_prompt: string): Promise<string> {
    return '{"score":0,"reasoning":"stub"}';
  }
}

type NormalizedEntry = {
  original: string;
  normalized: string;
};

function normalizeList(values: readonly string[]): NormalizedEntry[] {
  const seen = new Set<string>();
  const entries: NormalizedEntry[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    entries.push({ original: trimmed, normalized });
  }
  return entries;
}
