import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkChatQuota } from "../quota";

// Mock the DB layer so we can run these isolated
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  isDbConfigured: vi.fn().mockReturnValue(true),
}));

import { db } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double for chained query builder
const mockDb = db as any;

describe("Quota Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks to pass ensureUsageRow
    mockDb.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn() }) });
    mockDb.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });
  });

  it("allows chat when free limit is 0 but not exceeded", async () => {
    // Return free usage of 0
    mockDb.select.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ userId: "user_1", freeQueriesUsed: 0, paidQueriesUsed: 0 }]) }) }) });
    // Return no sub
    mockDb.select.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) });

    const result = await checkChatQuota("user_1");
    expect(result).toEqual({ ok: true });
  });

  it("denies chat when free limit is exceeded (5 queries) and no active sub", async () => {
    // Return free usage of 5
    mockDb.select.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ userId: "user_1", freeQueriesUsed: 5, paidQueriesUsed: 0 }]) }) }) });
    // Return no sub
    mockDb.select.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) });

    const result = await checkChatQuota("user_1");
    expect(result).toEqual({
      ok: false,
      reason: "no_credits",
      message: "Free queries used. Subscribe ($20/mo for 100 queries) to continue.",
      freeRemaining: 0,
      paidRemaining: 0,
    });
  });

  it("allows chat when free limit is exceeded but user has active sub within limit", async () => {
    // Return free usage of 5, paid usage of 50 (limit is 100)
    mockDb.select.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ userId: "user_1", freeQueriesUsed: 5, paidQueriesUsed: 50 }]) }) }) });
    // Return active sub
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    mockDb.select.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ userId: "user_1", status: "active", currentPeriodEnd: futureDate }]) }) }) });

    const result = await checkChatQuota("user_1");
    expect(result).toEqual({ ok: true });
  });

  it("allows chat when billable is false regardless of limits", async () => {
    // Early return — must not queue select mocks or they leak to the next test.
    const result = await checkChatQuota("user_1", { billable: false });
    expect(result).toEqual({ ok: true });
  });

  it("denies chat when paid limit is exceeded (100 queries)", async () => {
    // Return paid usage of 100
    mockDb.select.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ userId: "user_1", freeQueriesUsed: 5, paidQueriesUsed: 100 }]) }) }) });
    // Return active sub
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    mockDb.select.mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ userId: "user_1", status: "active", currentPeriodEnd: futureDate }]) }) }) });

    const result = await checkChatQuota("user_1");
    expect(result).toEqual({
      ok: false,
      reason: "no_credits",
      message: "Monthly query limit reached. Renew or wait for the next billing period.",
      freeRemaining: 0, // Since free is already 5
      paidRemaining: 0,
    });
  });
});
