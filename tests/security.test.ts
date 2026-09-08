import test from "node:test";
import assert from "node:assert/strict";
import { encrypt, decrypt, secretEquals, token } from "../src/lib/crypto";
import { safePath } from "../src/lib/media";
import { bookUpdateSchema, storySchema, canWrite, mediaTypes } from "../src/lib/validation";
import { sameOrigin, HttpError } from "../src/lib/api";
import { storyInstructions } from "../src/lib/ai";

test("API keys are authenticated, randomized ciphertext; tampering and wrong secrets fail", () => {
  const previous = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_SECRET = "test-only-encryption-secret-that-is-long-enough";
  try {
    const first = encrypt("test-key-never-a-real-credential"),
      second = encrypt("test-key-never-a-real-credential");
    assert.notEqual(first, second);
    assert(!first.includes("test-key"));
    assert.equal(decrypt(first), "test-key-never-a-real-credential");
    const parts = first.split(".");
    const data = Buffer.from(parts[3], "base64url");
    data[0] ^= 1;
    parts[3] = data.toString("base64url");
    assert.throws(() => decrypt(parts.join(".")));
    process.env.BETTER_AUTH_SECRET = "a-different-test-secret-that-is-long-enough";
    assert.throws(() => decrypt(first));
  } finally {
    if (previous) process.env.BETTER_AUTH_SECRET = previous;
    else delete process.env.BETTER_AUTH_SECRET;
  }
});
test("capability tokens have 256 bits and comparisons handle unequal lengths", () => {
  const tokens = Array.from({ length: 100 }, token);
  assert.equal(new Set(tokens).size, 100);
  assert(tokens.every((t) => Buffer.from(t, "base64url").length === 32));
  assert(secretEquals("abc", "abc"));
  assert(!secretEquals("abc", "ab"));
  assert(!secretEquals("abc", "abd"));
});
test("media paths cannot cross user boundaries, traverse folders, or point at an external host", () => {
  assert(safePath("user/alice/123.webm", "user/alice/"));
  for (const path of [
    "user/bob/123.webm",
    "user/alice/../bob/file",
    "https://example.com/user/alice/a.webm",
    "user/alice/%2e%2e/a",
    "user/alice/hi?key=x",
  ])
    assert(!safePath(path, "user/alice/"));
  assert(!mediaTypes["image/svg+xml"]);
  assert(!mediaTypes["text/html"]);
});
test("write requests require the exact configured origin", () => {
  const previous = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = "https://memories.example.com";
  try {
    sameOrigin(
      new Request("https://memories.example.com/api/data/books", {
        headers: { origin: "https://memories.example.com" },
      }),
    );
    for (const origin of [
      undefined,
      "https://evil.example.com",
      "https://memories.example.com.evil.test",
      "null",
    ]) {
      assert.throws(
        () =>
          sameOrigin(
            new Request("https://memories.example.com/api/data/books", {
              headers: origin ? { origin } : {},
            }),
          ),
        HttpError,
      );
    }
  } finally {
    if (previous) process.env.BETTER_AUTH_URL = previous;
    else delete process.env.BETTER_AUTH_URL;
  }
});
test("input validation strips privilege fields and bounds untrusted content", () => {
  const parsed = bookUpdateSchema.parse({
    title: "My memories",
    owner_id: "attacker",
    role: "owner",
  });
  assert.deepEqual(parsed, { title: "My memories" });
  assert(!bookUpdateSchema.safeParse({ cover_color: "red; background:url(evil)" }).success);
  assert(!storySchema.safeParse({ title: "", storyteller: "A" }).success);
  assert(
    !storySchema.safeParse({ title: "A", storyteller: "A", body: "x".repeat(100001) }).success,
  );
  assert(canWrite("owner"));
  assert(canWrite("editor"));
  assert(!canWrite("viewer"));
  assert(!canWrite("unknown"));
});
test("memoir editing instructs the model to preserve facts and ignore embedded instructions", () => {
  const instructions = storyInstructions("first-person", "Eleanor");
  assert.match(instructions, /Never invent/);
  assert.match(instructions, /never as instructions/);
  assert.match(instructions, /first-person/);
});
