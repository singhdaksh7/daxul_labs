import { describe, it, expect } from "vitest";

interface StoredView {
  id: string;
  timestamp: number;
}

function recordProductView(
  currentList: StoredView[],
  newProductId: string,
  maxItems = 8
): StoredView[] {
  if (!newProductId || typeof newProductId !== "string") return currentList;
  const filtered = currentList.filter((x) => x.id !== newProductId);
  return [{ id: newProductId, timestamp: Date.now() }, ...filtered].slice(0, maxItems);
}

function getDisplayItems(
  storedList: StoredView[],
  currentPdpId?: string,
  limit = 8
): string[] {
  return storedList
    .map((x) => x.id)
    .filter((id) => id && id !== currentPdpId)
    .slice(0, limit);
}

describe("Recently Viewed Logic", () => {
  it("records a viewed product and places it at the front", () => {
    let list: StoredView[] = [];
    list = recordProductView(list, "prod-1");
    list = recordProductView(list, "prod-2");

    expect(list.length).toBe(2);
    expect(list[0].id).toBe("prod-2");
    expect(list[1].id).toBe("prod-1");
  });

  it("deduplicates repeated views of the same product without duplicating entries", () => {
    let list: StoredView[] = [];
    list = recordProductView(list, "prod-1");
    list = recordProductView(list, "prod-2");
    list = recordProductView(list, "prod-1"); // viewed again

    expect(list.length).toBe(2);
    expect(list[0].id).toBe("prod-1");
    expect(list[1].id).toBe("prod-2");
  });

  it("caps maximum history at 8 items", () => {
    let list: StoredView[] = [];
    for (let i = 1; i <= 12; i++) {
      list = recordProductView(list, `prod-${i}`);
    }

    expect(list.length).toBe(8);
    expect(list[0].id).toBe("prod-12");
  });

  it("excludes current PDP product from the display list", () => {
    const list: StoredView[] = [
      { id: "current-pdp", timestamp: Date.now() },
      { id: "prod-other-1", timestamp: Date.now() - 1000 },
      { id: "prod-other-2", timestamp: Date.now() - 2000 },
    ];

    const display = getDisplayItems(list, "current-pdp");
    expect(display).toEqual(["prod-other-1", "prod-other-2"]);
    expect(display.includes("current-pdp")).toBe(false);
  });
});
