import { prisma } from "@/lib/db";

export interface StoredCartLineConfig {
  productId: string;
  quantity: number;
  variantSelections?: { groupId: string; variantId: string }[];
  customizations?: Record<string, string>;
}

export function generateLineKey(line: StoredCartLineConfig): string {
  const vars = (line.variantSelections || [])
    .map((v) => `${v.groupId}:${v.variantId}`)
    .sort()
    .join("|");
  const cust = Object.keys(line.customizations || {})
    .sort()
    .map((k) => `${k}=${(line.customizations || {})[k]}`)
    .join("|");
  return `${line.productId}#${vars}#${cust}`;
}

/**
 * Merges guest local cart configurations with user's saved DB cart configurations.
 * Deduplicates identical line items by summing quantities.
 */
export function mergeCartConfigs(
  dbLines: StoredCartLineConfig[],
  guestLines: StoredCartLineConfig[]
): StoredCartLineConfig[] {
  const map = new Map<string, StoredCartLineConfig>();

  for (const line of dbLines) {
    if (!line?.productId) continue;
    const key = generateLineKey(line);
    map.set(key, { ...line, quantity: Math.max(1, line.quantity || 1) });
  }

  for (const line of guestLines) {
    if (!line?.productId) continue;
    const key = generateLineKey(line);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += Math.max(1, line.quantity || 1);
    } else {
      map.set(key, { ...line, quantity: Math.max(1, line.quantity || 1) });
    }
  }

  return Array.from(map.values());
}
