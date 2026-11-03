import "server-only";

// Minimal Gemini client over the Interactions API (REST): one stateless call that returns JSON
// matching a schema. The key stays on the server (GEMINI_API_KEY, never NEXT_PUBLIC_*); the model
// can be overridden with GEMINI_MODEL. Older models and the generateContent endpoint are closed to
// new keys, so this uses /v1beta/interactions.
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";
// Tried in order: when one is overloaded (503/429, which doesn't use quota), the next is tried.
const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
const TIMEOUT_MS = 45_000;

// Standard JSON Schema subset used for structured output.
export type JsonSchema =
  | { type: "string" | "number" | "integer" | "boolean"; description?: string }
  | { type: "array"; items: JsonSchema; description?: string }
  | { type: "object"; properties: Record<string, JsonSchema>; required?: string[]; description?: string };

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly kind: "not_configured" | "unavailable" | "bad_response",
    readonly overloaded = false,
  ) {
    super(message);
  }
}

type Interaction = {
  steps?: { type?: string; content?: { type?: string; text?: string }[] }[];
};

// Sends one self-contained input (instructions, history and the new message in one text) and
// parses the model's JSON output. store: false keeps nothing on Google's side between calls.
export async function generateJson(options: { input: string; schema: JsonSchema }): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY is not set", "not_configured");

  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : DEFAULT_MODELS;
  let lastError: GeminiError | null = null;
  for (const model of models) {
    try {
      return await callModel(key, model, options);
    } catch (error) {
      if (!(error instanceof GeminiError) || !error.overloaded) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new GeminiError("no model available", "unavailable");
}

async function callModel(key: string, model: string, options: { input: string; schema: JsonSchema }): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key, "Api-Revision": API_REVISION },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model,
        input: options.input,
        store: false,
        response_format: { type: "text", mime_type: "application/json", schema: options.schema },
      }),
    });
  } catch (error) {
    throw new GeminiError(`request failed: ${String(error)}`, "unavailable");
  }
  if (!response.ok) {
    const overloaded = response.status === 503 || response.status === 429;
    throw new GeminiError(`${model} HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`, "unavailable", overloaded);
  }

  const body = (await response.json()) as Interaction;
  // The answer is the text of the model_output step (a "thought" step may come first).
  const text =
    body.steps
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("") ?? "";
  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError("response is not JSON", "bad_response");
  }
}
