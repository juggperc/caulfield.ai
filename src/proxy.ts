import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limit map for API edge cases. 
// For a high-traffic production app, use Redis/Vercel KV instead.
const ipRateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);

  if (!record || now > record.expiresAt) {
    ipRateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

// Clean up expired entries periodically to prevent memory leaks in long-running processes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRateLimitMap.entries()) {
    if (now > record.expiresAt) {
      ipRateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref?.();

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith("/api/chat") || pathname.startsWith("/api/research")) {
    // Identify by IP as a basic defense mechanism
    // Note: NextRequest.ip is available in Vercel, but often untyped or missing in local node standard requests
    const ip =
      (request as any).ip ??
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1";
    
    if (!checkRateLimit(ip)) {
      console.warn(`[rate-limit] Blocked request from ${ip} to ${pathname}`);
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later.", code: "RATE_LIMITED" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/chat", "/api/research"],
};
