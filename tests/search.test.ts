import { describe, it, expect } from "vitest";
import { sanitizeSearchQuery, computeRelevanceScore } from "@/lib/searchEngine";

describe("Search V2 — Query Sanitization & Relevance", () => {
  it("sanitizes queries, strips SQL wildcards and control characters", () => {
    expect(sanitizeSearchQuery("  lithophane%_lamp  ")).toBe("lithophane lamp");
    expect(sanitizeSearchQuery("SELECT * FROM users;")).toBe("SELECT * FROM users;");
    expect(sanitizeSearchQuery("hello\x00world\x1F")).toBe("hello world");
    expect(sanitizeSearchQuery("   ")).toBe("");
  });

  it("truncates queries longer than maximum allowed length", () => {
    const longStr = "a".repeat(150);
    const sanitized = sanitizeSearchQuery(longStr);
    expect(sanitized.length).toBeLessThanOrEqual(80);
  });

  it("computes relevance score prioritizing exact matches and SKU", () => {
    const itemA = {
      name: "Lithophane Shadow Lamp",
      sku: "LMP-001",
      category: "Shadow Objects",
      materials: "PLA+",
      description: "Organic biopolymer",
    };

    const itemB = {
      name: "Desk Planter",
      sku: "DSK-002",
      category: "Desk Objects",
      materials: "Recycled PLA",
      description: "Features subtle shadow projection",
    };

    const scoreExact = computeRelevanceScore(itemA, "Lithophane Shadow Lamp");
    const scoreSku = computeRelevanceScore(itemA, "LMP-001");
    const scorePartial = computeRelevanceScore(itemA, "Litho");
    const scoreDesc = computeRelevanceScore(itemB, "shadow");

    expect(scoreExact).toBeGreaterThan(scorePartial);
    expect(scoreSku).toBeGreaterThan(scorePartial);
    expect(scorePartial).toBeGreaterThan(scoreDesc);
  });

  it("matches category when query is part of category", () => {
    const item = {
      name: "Miniature Ganesha",
      sku: "DEV-01",
      category: "Devotional",
      materials: "White Marble PLA",
      description: "Fine detail sculpture",
    };

    const score = computeRelevanceScore(item, "Devotional");
    expect(score).toBeGreaterThanOrEqual(35);
  });
});
