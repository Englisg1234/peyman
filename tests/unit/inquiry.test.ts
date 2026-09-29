// Inquiry contract: validation, sanitising, rate limiting, storage and
// notification (Supabase REST and webhook are exercised with a fake fetch).
import { describe, expect, it, vi } from "vitest";
import { clean, readInquiry, validateInquiry } from "@/lib/inquiry";
import { notifyInquiry, saveInquiry, storeConfig } from "@/lib/inquiry-store";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const valid = {
  name: "Asha Rao",
  company: "Example Labs",
  email: "asha@example.com",
  interest: "capital-structuring",
  message: "We are preparing for a seed round.",
};

describe("validateInquiry", () => {
  it("accepts a complete inquiry", () => {
    expect(validateInquiry(valid)).toEqual({});
  });

  it("reports every missing field", () => {
    const e = validateInquiry({ name: "", company: "", email: "", interest: "", message: "" });
    expect(Object.keys(e).sort()).toEqual(["company", "email", "interest", "message", "name"]);
  });

  it("rejects malformed email, unknown interest and short message", () => {
    const e = validateInquiry({ ...valid, email: "asha@", interest: "crypto", message: "hi" });
    expect(Object.keys(e).sort()).toEqual(["email", "interest", "message"]);
  });

  it("enforces maximum lengths", () => {
    const e = validateInquiry({ ...valid, name: "x".repeat(121), message: "y".repeat(4001) });
    expect(Object.keys(e).sort()).toEqual(["message", "name"]);
  });
});

describe("clean / readInquiry", () => {
  it("strips control characters and collapses whitespace", () => {
    expect(clean("  A\u0000sha   Rao \n")).toBe("Asha Rao");
    expect(clean("line one\n\n\n\nline   two", true)).toBe("line one\n\nline two");
    expect(clean(42)).toBe("");
  });

  it("lower-cases email and reads by key", () => {
    const data = new Map(Object.entries({ ...valid, email: " Asha@Example.COM " }));
    expect(readInquiry((k) => data.get(k)).email).toBe("asha@example.com");
  });
});

describe("rate limiter", () => {
  it("allows `limit` hits per window, then blocks until the window passes", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect([rl.hit("a", 0), rl.hit("a", 10), rl.hit("a", 20)]).toEqual([true, true, false]);
    expect(rl.hit("b", 20)).toBe(true);
    expect(rl.hit("a", 1000)).toBe(true);
  });

  it("reads the first forwarded address", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
    expect(clientKey(h)).toBe("203.0.113.5");
    expect(clientKey(new Headers())).toBe("unknown");
  });
});

describe("Supabase store", () => {
  it("accepts https anywhere and plain http only on loopback", () => {
    expect(storeConfig({ SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_ANON_KEY: "k" })?.url).toBe("http://127.0.0.1:54321");
    expect(storeConfig({ SUPABASE_URL: "http://localhost:54321", SUPABASE_ANON_KEY: "k" })).not.toBeNull();
    expect(storeConfig({ SUPABASE_URL: "http://x.supabase.co", SUPABASE_ANON_KEY: "k" })).toBeNull();
    expect(storeConfig({ SUPABASE_URL: "http://127.0.0.1.evil.com", SUPABASE_ANON_KEY: "k" })).toBeNull();
  });

  it("is unconfigured without URL and key, and never reads a service-role key", () => {
    expect(storeConfig({})).toBeNull();
    expect(storeConfig({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "secret" })).toBeNull();
    expect(storeConfig({ SUPABASE_URL: "https://x.supabase.co/", SUPABASE_ANON_KEY: "eyJabc" })).toEqual({
      url: "https://x.supabase.co",
      key: "eyJabc",
    });
  });

  it("POSTs a minimal insert to /rest/v1/inquiries", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    const res = await saveInquiry({ ...valid, interest: "capital-structuring", sourcePath: "/contact" }, { url: "https://x.supabase.co", key: "eyJabc" }, fetchMock);
    expect(res).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://x.supabase.co/rest/v1/inquiries");
    const headers = init.headers as Record<string, string>;
    expect(headers.Prefer).toBe("return=minimal");
    expect(headers.Authorization).toBe("Bearer eyJabc");
    expect(JSON.parse(init.body as string)).toMatchObject({ email: "asha@example.com", source_path: "/contact" });
  });

  it("omits Authorization for publishable keys and maps failures", async () => {
    const rejected = vi.fn(async () => new Response("no", { status: 401 }));
    const cfg = { url: "https://x.supabase.co", key: "sb_publishable_abc" };
    expect(await saveInquiry({ ...valid, interest: "general", sourcePath: "/contact" }, cfg, rejected)).toEqual({ ok: false, reason: "rejected" });
    const headers = (rejected.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    const broken = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await saveInquiry({ ...valid, interest: "general", sourcePath: "/contact" }, cfg, broken)).toEqual({ ok: false, reason: "network" });
    expect(await saveInquiry({ ...valid, interest: "general", sourcePath: "/contact" }, null)).toEqual({ ok: false, reason: "not-configured" });
  });

  it("notifies the webhook only when configured, and swallows failures", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("down");
    });
    await notifyInquiry({ ...valid, interest: "general" }, {}, fetchMock);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(notifyInquiry({ ...valid, interest: "general" }, { INQUIRY_WEBHOOK_URL: "https://hooks.example.com/x", INQUIRY_WEBHOOK_SECRET: "s" }, fetchMock)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
