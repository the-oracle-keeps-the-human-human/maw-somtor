/**
 * maw somtor chronicle — TDD unit tests (mock, no integration)
 */

const CHRONICLE_URL = "https://oracle-chronicle.laris.workers.dev/api/record";
const FEED_URL = "https://oracle-chronicle.laris.workers.dev/api/oracle/somtor/feed";

// Mock fetch
const mockResponses: Record<string, any> = {};
const fetchCalls: { url: string; opts: any }[] = [];

function mockFetch(url: string, opts?: any): Promise<any> {
  fetchCalls.push({ url, opts });
  const body = mockResponses[url] ?? { ok: true, ts: "2026-06-07T09:00:00Z", oracle: "somtor" };
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
}

// Unit under test
function buildRecordPayload(oracle: string, type: string, channel: string, content: string): object {
  return {
    oracle,
    type,
    data: { channel, content, ts: new Date().toISOString() },
  };
}

function validatePayload(payload: any): { valid: boolean; error?: string } {
  if (!payload.oracle) return { valid: false, error: "missing oracle" };
  if (!payload.type) return { valid: false, error: "missing type" };
  if (!payload.data) return { valid: false, error: "missing data" };
  if (!payload.data.channel) return { valid: false, error: "missing data.channel" };
  if (!payload.data.content) return { valid: false, error: "missing data.content" };
  return { valid: true };
}

// Tests
let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

console.log("🐝 maw somtor chronicle — unit tests\n");

// Test 1: payload structure
console.log("📋 buildRecordPayload");
const p1 = buildRecordPayload("somtor", "discord_message", "workshop", "hello") as any;
assert("has oracle field", p1.oracle === "somtor");
assert("has type field", p1.type === "discord_message");
assert("has data.channel", p1.data.channel === "workshop");
assert("has data.content", p1.data.content === "hello");
assert("has data.ts (ISO string)", typeof p1.data.ts === "string" && p1.data.ts.includes("T"));

// Test 2: validation
console.log("\n📋 validatePayload");
assert("valid payload passes", validatePayload(p1).valid === true);
assert("missing oracle fails", validatePayload({ type: "x", data: {} }).valid === false);
assert("missing type fails", validatePayload({ oracle: "x", data: {} }).valid === false);
assert("missing data fails", validatePayload({ oracle: "x", type: "x" }).valid === false);
assert("missing channel fails", validatePayload({ oracle: "x", type: "x", data: { content: "y" } }).valid === false);
assert("missing content fails", validatePayload({ oracle: "x", type: "x", data: { channel: "y" } }).valid === false);

// Test 3: mock fetch call
console.log("\n📋 mockFetch POST");
fetchCalls.length = 0;
mockFetch(CHRONICLE_URL, { method: "POST", body: JSON.stringify(p1) }).then(r => r.json()).then(d => {
  assert("fetch called with correct URL", fetchCalls[0].url === CHRONICLE_URL);
  assert("response has ok:true", d.ok === true);
  assert("response has oracle", d.oracle === "somtor");

  // Test 4: feed mock
  console.log("\n📋 mockFetch GET feed");
  mockResponses[FEED_URL] = { events: [{ oracle: "somtor", type: "hello", ts: "2026-06-07T09:00:00Z" }] };
  fetchCalls.length = 0;
  mockFetch(FEED_URL).then(r => r.json()).then(feed => {
    assert("feed has events array", Array.isArray(feed.events));
    assert("feed event has oracle", feed.events[0].oracle === "somtor");

    console.log(`\n────────────────────────`);
    console.log(`✅ ${passed} passed · ❌ ${failed} failed`);
    if (failed > 0) process.exit(1);
  });
});
