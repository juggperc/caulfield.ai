import { describe, expect, it, beforeEach, afterAll, vi } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { POST } from "../route";
import * as syncMod from "@/lib/billing/polar-webhook-sync";

// Mock the sync module so we don't hit the DB
vi.mock("@/lib/billing/polar-webhook-sync", () => ({
  applyPolarWebhookPayload: vi.fn().mockResolvedValue({ applied: true }),
}));

describe("Polar Webhook Route", () => {
  const secret = "whsec_testsecret1234567890";
  const rawSecretBytes = Buffer.from(secret.slice(6), "base64");

  beforeEach(() => {
    process.env.POLAR_WEBHOOK_SECRET = secret;
    vi.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.POLAR_WEBHOOK_SECRET;
  });

  it("rejects when signature headers are missing", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/polar", {
      method: "POST",
      body: JSON.stringify({ type: "test" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    
    const json = await res.json();
    expect(json.error).toBe("Missing webhook signature headers");
  });

  it("rejects when timestamp is too old", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/polar", {
      method: "POST",
      body: JSON.stringify({ type: "test" }),
      headers: {
        "webhook-id": "123",
        "webhook-timestamp": "10000", // 1970
        "webhook-signature": "v1,fake",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    
    const json = await res.json();
    expect(json.error).toBe("Webhook timestamp too old or invalid");
  });

  it("verifies a valid standard webhook signature", async () => {
    const body = JSON.stringify({ type: "subscription.created", data: { id: "123" } });
    const id = "webhook_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    const signPayload = `${id}.${timestamp}.${body}`;
    const sig = createHmac("sha256", rawSecretBytes)
      .update(signPayload)
      .digest("base64");

    const req = new NextRequest("http://localhost/api/webhooks/polar", {
      method: "POST",
      body,
      headers: {
        "webhook-id": id,
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${sig}`,
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    
    expect(syncMod.applyPolarWebhookPayload).toHaveBeenCalled();
  });

  it("rejects an invalid signature", async () => {
    const body = JSON.stringify({ type: "subscription.created", data: { id: "123" } });
    const id = "webhook_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const req = new NextRequest("http://localhost/api/webhooks/polar", {
      method: "POST",
      body,
      headers: {
        "webhook-id": id,
        "webhook-timestamp": timestamp,
        "webhook-signature": "v1,invalidbase64sig",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    
    const json = await res.json();
    expect(json.error).toBe("Bad signature");
  });
});
