/**
 * Typed error thrown by the matcher when the AI integration fails
 * (network error, auth failure, malformed model output, etc.).
 *
 * Introduced in slice 4 alongside the `StubAIClient` — the stub itself
 * never throws this, but the type is in place so slice 5's
 * `AzureOpenAIClient` can wrap LangChain / Azure failures consistently
 * and the `/ai/match` route can map them to a 502 response.
 *
 * Uses the standard `ErrorOptions.cause` mechanism so the original
 * error chain is preserved for logging.
 */
export class MatchError extends Error {
  override readonly name = 'MatchError';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
