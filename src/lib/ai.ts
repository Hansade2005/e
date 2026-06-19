/**
 * A0 LLM client — powers the in-app "Ask Ez" ride assistant.
 *   POST https://api.a0.dev/ai/llm  { messages } -> { completion }
 *
 * Network failures degrade to a helpful canned reply so the assistant stays
 * usable offline and deterministic under E2E.
 */
export type A0Message = { role: 'system' | 'user' | 'assistant'; content: string };

const ENDPOINT = 'https://api.a0.dev/ai/llm';

export async function callA0LLM(messages: A0Message[], timeoutMs = 12000): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`a0 LLM request failed: ${res.status}`);
    const data = (await res.json()) as { completion?: string };
    return data.completion ?? '';
  } finally {
    clearTimeout(id);
  }
}

export const EZ_ASSISTANT_SYSTEM =
  "You are Ez, the in-app assistant for Ez2go — a ride-sharing app where drivers keep 100% of every fare and riders save ~20% vs Uber/Lyft. " +
  "Help riders plan trips, compare ride options (Ez Go, Ez XL, Ez Premium), understand fares and ETAs, find destinations, and use features like scheduling, saved places, the Ez Wallet, promo codes, and safety tools. " +
  "Be warm, concise, and practical — answer in 1-3 short sentences. If asked about anything unrelated to getting around or the app, gently steer back to rides. Never invent exact prices; give ranges and suggest checking the live quote.";

/**
 * Ask the assistant, given prior turns. Falls back to a useful offline reply
 * (rather than an error) when the API is unreachable.
 */
export async function askEz(
  history: { role: 'user' | 'assistant'; content: string }[],
  userText: string,
): Promise<string> {
  const messages: A0Message[] = [
    { role: 'system', content: EZ_ASSISTANT_SYSTEM },
    ...history.slice(-8),
    { role: 'user', content: userText },
  ];
  try {
    const out = await callA0LLM(messages);
    if (out.trim()) return out.trim();
    throw new Error('empty');
  } catch {
    return offlineReply(userText);
  }
}

function offlineReply(text: string): string {
  const t = text.toLowerCase();
  if (/airport|mci/.test(t))
    return 'For the airport, Ez Premium is comfiest for luggage, or Ez Go to save. Pop your terminal into “Where to?” for a live quote.';
  if (/cheap|save|cost|fare|price/.test(t))
    return 'Ez Go is our most affordable option and still ~20% under Uber/Lyft. Add a destination to see the exact fare.';
  if (/schedul|later|book ahead/.test(t))
    return 'Tap the time pill on the home screen to schedule a pickup for later — your fare is quoted at booking.';
  if (/promo|code|wallet|discount/.test(t))
    return 'Open Payment and enter a promo code (try EZ10) to top up your Ez Wallet — credit applies automatically to your next rides.';
  if (/safe|safety|emergency/.test(t))
    return 'During a trip, tap Safety to share your live route or reach emergency services. Every driver is verified.';
  return "I'm here to help with rides — destinations, fares, scheduling, or your wallet. What are you planning?";
}
