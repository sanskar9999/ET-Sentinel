/**
 * Direct Groq API caller — browser-side, for prototype hackathon speed.
 * Bypasses the WorldMonitor server-side RPC for Story Arc predictions.
 * 
 * In production, this would route through the existing summarization service,
 * but for the hackathon prototype we call Groq directly for lower latency.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

// API key injected via Vite env (only for hackathon prototype)
function getApiKey(): string {
  // Try Vite env first, then fallback to hardcoded for prototype
  return (import.meta as any).env?.VITE_GROQ_API_KEY
    || (import.meta as any).env?.GROQ_API_KEY
    || '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';
}

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call Groq API directly from the browser.
 * Returns parsed JSON if the response contains a JSON block, otherwise raw text.
 */
export async function callGroq(
  messages: GroqMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  } = {}
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Groq API key not configured');
  }

  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
    top_p: 1,
    reasoning_effort: 'medium',
  };

  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Groq API error ${response.status}: ${errorText}`);
  }

  const data: GroqResponse = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Call Groq and parse the response as JSON.
 * Handles markdown code blocks and extracts JSON from the response.
 */
export async function callGroqJSON<T = unknown>(
  messages: GroqMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<T> {
  const raw = await callGroq(messages, { ...options, jsonMode: true });
  
  // Try direct parse first
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try extracting JSON from markdown code block
    const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonMatch?.[1]) {
      return JSON.parse(jsonMatch[1]) as T;
    }
    
    // Try finding first { ... } or [ ... ] block
    const braceMatch = raw.match(/(\{[\s\S]*\})/);
    if (braceMatch?.[1]) {
      return JSON.parse(braceMatch[1]) as T;
    }
    
    throw new Error(`Failed to parse Groq response as JSON: ${raw.slice(0, 200)}`);
  }
}
