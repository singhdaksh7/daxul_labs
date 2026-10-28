/**
 * Search V2 Engine utilities:
 * - Sanitizes queries against SQL wildcards and control characters
 * - Computes multi-attribute relevance scores
 */

export function sanitizeSearchQuery(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/[\x00-\x1F\x7F%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export interface SearchCandidate {
  name: string;
  sku?: string | null;
  category: string;
  description?: string | null;
  materials?: string | null;
}

export function computeRelevanceScore(
  item: SearchCandidate,
  normalizedQuery: string
): number {
  const q = normalizedQuery.toLowerCase();
  const name = (item.name || "").toLowerCase();
  const sku = (item.sku || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const mat = (item.materials || "").toLowerCase();

  let score = 0;

  // Exact match
  if (name === q) score += 100;
  else if (sku === q) score += 95;
  // Prefix / starts-with match
  else if (name.startsWith(q)) score += 75;
  else if (name.split(/\s+/).some((w) => w.startsWith(q))) score += 60;
  // Contains in name
  else if (name.includes(q)) score += 40;

  // Category match
  if (cat === q) score += 35;
  else if (cat.includes(q)) score += 20;

  // Materials / Specs match
  if (mat.includes(q)) score += 15;

  // Description match
  if (desc.includes(q)) score += 10;

  return score;
}
