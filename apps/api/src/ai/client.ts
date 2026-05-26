import type { Candidate, Job, MatchResult } from '@talentech/shared';
import { AzureChatOpenAI } from '@langchain/openai';

/**
 * Abstraction over the model invocation used by the matcher.
 *
 * One method, `complete(prompt)`, returns the raw text the model
 * produced for a fully-rendered prompt. The matcher owns prompt
 * construction and output parsing — clients are intentionally thin.
 *
 * Two implementations ship in this app:
 * - `AzureOpenAIClient` — talks to an Azure OpenAI deployment (serving
 *   `gpt-4.1-mini`) via LangChain.js's `AzureChatOpenAI`.
 * - `StubAIClient` — deterministic fallback so `docker compose up`
 *   works without any Azure configuration.
 *
 * The stub bypasses `complete()` entirely — the matcher detects the
 * concrete `StubAIClient` type and computes the score directly from the
 * structured inputs.
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

/**
 * Configuration for `AzureOpenAIClient`. Mirrors the environment-variable
 * surface documented in `.env.example`. `endpoint` corresponds to
 * `AZURE_OPENAI_ENDPOINT` — when set, it takes precedence over
 * `instanceName` (the legacy `AZURE_OPENAI_API_INSTANCE_NAME` form).
 */
export type AzureOpenAIClientConfig = {
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
  endpoint?: string;
  instanceName?: string;
  /** Optional override; defaults to a low value for deterministic match scoring. */
  temperature?: number;
};

/**
 * Azure OpenAI client backed by LangChain.js's `AzureChatOpenAI`.
 *
 * The class is intentionally tiny: it owns the `AzureChatOpenAI`
 * instance and exposes the `AIClient.complete(prompt)` boundary. All
 * prompt construction and output parsing live in the matcher — this
 * keeps the LangChain dependency at one place and makes the I/O surface
 * trivially fakeable in tests.
 *
 * Selection is environment-driven: `buildServer()` constructs this
 * client only when all four `AZURE_OPENAI_*` variables are set;
 * otherwise it falls back to `StubAIClient`.
 */
export class AzureOpenAIClient implements AIClient {
  private readonly model: AzureChatOpenAI;

  constructor(config: AzureOpenAIClientConfig) {
    if (!config.endpoint && !config.instanceName) {
      throw new Error(
        'AzureOpenAIClient requires either an endpoint or an instance name.',
      );
    }
    this.model = new AzureChatOpenAI({
      azureOpenAIApiKey: config.apiKey,
      azureOpenAIApiDeploymentName: config.deploymentName,
      azureOpenAIApiVersion: config.apiVersion,
      ...(config.endpoint
        ? { azureOpenAIBasePath: config.endpoint }
        : { azureOpenAIApiInstanceName: config.instanceName }),
      temperature: config.temperature ?? 0,
    });
  }

  /**
   * Send a single prompt to the configured Azure OpenAI deployment and
   * return the model's text output. The matcher handles prompt
   * formatting (via `ChatPromptTemplate`) and output parsing (via
   * `StructuredOutputParser`) — this method is intentionally a passthrough
   * to the underlying `AzureChatOpenAI.invoke()`.
   *
   * Errors from `AzureChatOpenAI` (network, auth) bubble up to the
   * matcher, which rewraps them as `MatchError`.
   */
  async complete(prompt: string): Promise<string> {
    const message = await this.model.invoke(prompt);
    const content = message.content;
    if (typeof content === 'string') {
      return content;
    }
    // `content` can be an array of content parts for multimodal models.
    // The matcher only ever sends text prompts; concatenate text parts
    // defensively and ignore non-text blocks.
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') {
            return part;
          }
          if (
            part &&
            typeof part === 'object' &&
            'text' in part &&
            typeof (part as { text: unknown }).text === 'string'
          ) {
            return (part as { text: string }).text;
          }
          return '';
        })
        .join('');
    }
    return String(content);
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
