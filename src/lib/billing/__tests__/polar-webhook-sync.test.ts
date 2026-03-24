import { describe, expect, it } from "vitest";
import { parsePolarWebhookPayload } from "../polar-webhook-sync";

describe("parsePolarWebhookPayload", () => {
  it("parses an active subscription created event", () => {
    const payload = {
      type: "subscription.created",
      data: {
        id: "sub_123",
        customer_id: "cus_456",
        status: "active",
        current_period_end: "2024-12-31T23:59:59Z",
        metadata: {
          userId: "user_789",
        },
      },
    };

    const result = parsePolarWebhookPayload(payload);
    expect(result).toEqual({
      userId: "user_789",
      polarCustomerId: "cus_456",
      polarSubscriptionId: "sub_123",
      status: "active",
      currentPeriodEnd: new Date("2024-12-31T23:59:59Z"),
    });
  });

  it("parses a canceled subscription event", () => {
    const payload = {
      type: "subscription.canceled",
      data: {
        id: "sub_123",
        customer_id: "cus_456",
        status: "canceled",
        current_period_end: "2024-12-31T23:59:59Z",
        metadata: {
          userId: "user_789",
        },
      },
    };

    const result = parsePolarWebhookPayload(payload);
    expect(result).toEqual({
      userId: "user_789",
      polarCustomerId: "cus_456",
      polarSubscriptionId: "sub_123",
      status: "inactive",
      currentPeriodEnd: new Date("2024-12-31T23:59:59Z"),
    });
  });

  it("returns null if userId is missing", () => {
    const payload = {
      type: "subscription.created",
      data: {
        id: "sub_123",
        customer_id: "cus_456",
        status: "active",
      },
    };

    const result = parsePolarWebhookPayload(payload);
    expect(result).toBeNull();
  });

  it("handles camelCase keys too (fallback)", () => {
    const payload = {
      type: "subscription.created",
      data: {
        id: "sub_123",
        customerId: "cus_456",
        status: "active",
        currentPeriodEnd: "2024-12-31T23:59:59Z",
        metadata: {
          userId: "user_789",
        },
      },
    };

    const result = parsePolarWebhookPayload(payload);
    expect(result).toEqual({
      userId: "user_789",
      polarCustomerId: "cus_456",
      polarSubscriptionId: "sub_123",
      status: "active",
      currentPeriodEnd: new Date("2024-12-31T23:59:59Z"),
    });
  });

  it("reads userId from nested subscription + customer metadata", () => {
    const payload = {
      type: "subscription.updated",
      data: {
        subscription: {
          id: "sub_nested",
          customer_id: "cus_nested",
          status: "active",
          current_period_end: "2025-01-15T00:00:00Z",
        },
        customer: {
          metadata: {
            userId: "user_nested",
          },
        },
      },
    };

    const result = parsePolarWebhookPayload(payload);
    expect(result).toEqual({
      userId: "user_nested",
      polarCustomerId: "cus_nested",
      polarSubscriptionId: "sub_nested",
      status: "active",
      currentPeriodEnd: new Date("2025-01-15T00:00:00Z"),
    });
  });
});
