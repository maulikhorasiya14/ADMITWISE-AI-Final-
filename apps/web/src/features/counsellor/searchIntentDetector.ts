/**
 * Determines whether a counsellor question needs a web search to supplement
 * the database evidence. Uses fast pattern-based detection — no LLM call.
 */

// Keywords that strongly suggest real-time or external information
const REAL_TIME_PATTERNS = [
  /\b(latest|current|recent|2026|2027|this year|new)\b/i,
  /\bnirf\b/i,
  /\bnews\b/i,
  /\b(reddit|quora|youtube|review)\b/i,
  /\branking\b/i,
  /\brecruiter(s)?\b/i,
  /\b(hiring|package|salary) in \d{4}/i
];

// Phrases that signal data the DB almost certainly lacks
const GAP_PATTERNS = [
  /\b(startup|company|firm)\b.{0,30}\b(visit|hire|recruit)\b/i,
  /\b(hostel|mess) (food|quality|condition)/i,
  /\b(life|experience) after\b/i
];

export type SearchIntent = {
  needsSearch: boolean;
  searchQuery: string;
};

/**
 * Build an optimised Tavily query from the student's question.
 * Strips internal jargon and adds useful context.
 */
function buildSearchQuery(question: string): string {
  return question
    .replace(/\bmy (rank|college|option|profile)\b/gi, "")
    .replace(/\b(safe|smart|ambitious)\b/gi, "")
    .replace(/\badmitwise\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/**
 * Returns whether the question warrants a web search and the query to use.
 * groundingRecordCount: how many DB records were already matched — if very few
 * records matched, we widen to web search automatically.
 */
export function detectSearchIntent(
  question: string,
  groundingRecordCount: number
): SearchIntent {
  // If we found plenty of DB evidence, only search for clear real-time signals
  if (groundingRecordCount >= 5) {
    const needsSearch =
      REAL_TIME_PATTERNS.some((p) => p.test(question)) ||
      GAP_PATTERNS.some((p) => p.test(question));
    return { needsSearch, searchQuery: buildSearchQuery(question) };
  }

  // Sparse DB evidence — search for anything that looks like a factual question
  const looksFactual = /\b(what|how|where|when|is|are|does|can|which)\b/i.test(question);
  return {
    needsSearch: looksFactual,
    searchQuery: buildSearchQuery(question)
  };
}
