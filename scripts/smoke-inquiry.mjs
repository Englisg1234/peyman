// Inquiry backend smoke test (end to end, no real Supabase needed).
//
//   npm run build && npm run smoke:inquiry
//
// 1. Starts a local stand-in for Supabase PostgREST (and the notification
//    webhook) that records requests and enforces the same contract the real
//    project does: POST /rest/v1/inquiries with `apikey`, JSON body and
//    `Prefer: return=minimal`, answering 201.
// 2. Starts `next start` on SMOKE_PORT (default 3190) with SUPABASE_URL
//    pointing at the stand-in and INQUIRY_WEBHOOK_URL at its /hook route.
// 3. Submits the real /contact form in Chromium, then checks the success
//    state, the stored row, the webhook call and that no secret reached the
//    browser. A second run with the stand-in returning 500 checks the
//    server-error state. Exits non-zero on any failure.
import { spawn } from "node:child_process";
import http from "node:http";
import { chromium } from "@playwright/test";

const APP_PORT = Number(process.env.SMOKE_PORT ?? 3190);
const MOCK_PORT = APP_PORT + 1;
const KEY = "smoke-anon-key";
const received = { rows: [], hooks: [] };
let failWith = 0;

const mock = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.url === "/rest/v1/inquiries" && req.method === "POST") {
      if (failWith) return res.writeHead(failWith).end();
      const ok = req.headers.apikey === KEY && req.headers.prefer === "return=minimal" && req.headers["content-type"]?.includes("application/json");
      if (!ok) return res.writeHead(401).end();
      received.rows.push(JSON.parse(body));
      return res.writeHead(201).end();
    }
    if (req.url === "/hook" && req.method === "POST") {
      received.hooks.push({ secret: req.headers["x-webhook-secret"], body: JSON.parse(body) });
      return res.writeHead(204).end();
    }
    res.writeHead(404).end();
  });
});

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};
const pass = (msg) => console.log(`✓ ${msg}`);

await new Promise((r) => mock.listen(MOCK_PORT, "127.0.0.1", r));
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(APP_PORT)], {
  env: {
    ...process.env,
    SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
    SUPABASE_ANON_KEY: KEY,
    INQUIRY_WEBHOOK_URL: `http://127.0.0.1:${MOCK_PORT}/hook`,
    INQUIRY_WEBHOOK_SECRET: "smoke-secret",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
app.stderr.on("data", (d) => process.stderr.write(d));
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("next start did not become ready")), 60_000);
  app.stdout.on("data", (d) => {
    if (/Ready|started server/i.test(String(d))) {
      clearTimeout(t);
      resolve();
    }
  });
});

const browser = await chromium.launch();
async function submit(page) {
  await page.goto(`http://127.0.0.1:${APP_PORT}/contact?interest=legal-transactional`, { waitUntil: "networkidle" });
  await page.fill("#inquiry-name", "Asha Rao");
  await page.fill("#inquiry-company", "Example Labs");
  await page.fill("#inquiry-email", "Asha@Example.com");
  await page.fill("#inquiry-message", "We are negotiating a term sheet and need support.");
  await page.waitForTimeout(2700); // past the minimum fill time
  await page.getByRole("button", { name: "Send inquiry" }).click();
}

try {
  const page = await browser.newPage();
  const html = [];
  page.on("response", async (r) => {
    if (r.request().resourceType() === "document" || r.url().endsWith(".js")) html.push(await r.text().catch(() => ""));
  });
  await submit(page);
  await page.locator('.form-status[data-kind="success"]').waitFor({ timeout: 15_000 });
  pass("success state shown");
  await page.waitForTimeout(500); // the webhook runs after the response
  const row = received.rows[0];
  if (row?.email === "asha@example.com" && row.interest === "legal-transactional" && row.source_path === "/contact" && !("status" in row)) {
    pass("row stored with normalised email, interest and source; status left to the database default");
  } else fail(`unexpected stored row: ${JSON.stringify(row)}`);
  if (received.hooks[0]?.secret === "smoke-secret" && received.hooks[0].body.type === "inquiry.created") pass("notification webhook called with secret");
  else fail(`webhook not called as expected: ${JSON.stringify(received.hooks)}`);
  if (html.some((t) => t.includes(KEY) || t.includes("smoke-secret"))) fail("a server secret reached the browser");
  else pass("no key or secret in any HTML or JS sent to the browser");

  failWith = 500;
  const page2 = await browser.newPage();
  await submit(page2);
  await page2.locator('.form-status[data-kind="error"]').waitFor({ timeout: 15_000 });
  if ((await page2.locator("#inquiry-name").inputValue()) === "Asha Rao") pass("storage failure shows the error state and keeps the values");
  else fail("values were lost after a storage failure");
  if (received.rows.length === 1) pass("nothing stored on failure");
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
  app.kill();
  mock.close();
}
