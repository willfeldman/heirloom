import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
async function request(path: string, method = "GET", body?: unknown, cookie = "", origin = base) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(method !== "GET" ? { "Content-Type": "application/json", origin } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}
async function account(name: string) {
  const email = `heirloom-test-${randomUUID()}@example.test`,
    password = `test-only-${randomUUID()}`;
  const { response, data } = await request("/api/auth/sign-up/email", "POST", {
    name,
    email,
    password,
  });
  assert.equal(response.status, 200, JSON.stringify(data));
  const cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  assert(
    cookie.includes("session_token"),
    "Test deployment must have email verification disabled (no Resend key).",
  );
  return { cookie, id: data.user.id, email };
}

test("real auth, collection access, guest submissions, sharing, editing, export, and deletion", async (t) => {
  const owner = await account("Test Owner"),
    outsider = await account("Test Outsider"),
    viewer = await account("Test Viewer");
  let bookId = "",
    storyId = "",
    questionToken = "",
    inviteToken = "";
  await t.test("unauthenticated data and cron requests are rejected", async () => {
    assert.equal((await request("/api/data/state")).response.status, 401);
    assert.equal((await request("/api/cron/reminders")).response.status, 401);
  });
  await t.test(
    "a new collection is private and protected against cross-origin writes",
    async () => {
      const { response, data } = await request(
        "/api/data/books",
        "POST",
        { title: "Integration memories", storyteller: "Test Storyteller" },
        owner.cookie,
      );
      assert.equal(response.status, 201, JSON.stringify(data));
      bookId = data.id;
      assert.equal(
        (await request(`/api/data/state?book=${bookId}`, "GET", undefined, outsider.cookie))
          .response.status,
        404,
      );
      assert.equal(
        (
          await request(
            `/api/data/books/${bookId}`,
            "PATCH",
            { title: "Hijacked" },
            outsider.cookie,
          )
        ).response.status,
        404,
      );
      assert.equal(
        (
          await request(
            `/api/data/books/${bookId}`,
            "PATCH",
            { title: "Forged" },
            owner.cookie,
            "https://evil.example.test",
          )
        ).response.status,
        403,
      );
    },
  );
  await t.test(
    "create, edit and publish a story; outsiders cannot access comments or exports",
    async () => {
      const values = {
        book_id: bookId,
        title: "The test kitchen",
        storyteller: "Test Storyteller",
        body: "We made bread every Sunday.",
        transcript: "We made bread every Sunday.",
        status: "published",
      };
      const created = await request("/api/data/stories", "POST", values, owner.cookie);
      assert.equal(created.response.status, 201, JSON.stringify(created.data));
      storyId = created.data.id;
      assert.equal(
        (
          await request(
            `/api/data/stories/${storyId}`,
            "PATCH",
            { ...values, body: "We made bread every Sunday, together." },
            owner.cookie,
          )
        ).response.status,
        200,
      );
      assert.equal(
        (await request(`/api/data/comments/${storyId}`, "GET", undefined, outsider.cookie)).response
          .status,
        404,
      );
      assert.equal(
        (await request(`/api/data/export/${bookId}`, "GET", undefined, outsider.cookie)).response
          .status,
        404,
      );
    },
  );
  await t.test("personal keys are not returned to clients or other users", async () => {
    const secret = "test-only-not-a-provider-key";
    assert.equal(
      (
        await request(
          "/api/data/settings",
          "PATCH",
          {
            key: secret,
            text_model: "gpt-4.1-mini",
            transcription_model: "gpt-4o-mini-transcribe",
          },
          owner.cookie,
        )
      ).response.status,
      200,
    );
    const own = (await request("/api/data/settings", "GET", undefined, owner.cookie)).data;
    assert(own.has_key);
    assert(!JSON.stringify(own).includes(secret));
    assert.equal(
      (await request("/api/data/settings", "GET", undefined, outsider.cookie)).data.has_key,
      false,
    );
    await request(
      "/api/data/settings",
      "PATCH",
      {
        remove_key: true,
        text_model: "gpt-4.1-mini",
        transcription_model: "gpt-4o-mini-transcribe",
      },
      owner.cookie,
    );
  });
  await t.test("revocable story links grant only explicit public access", async () => {
    const share = await request(
      `/api/data/stories/${storyId}/share`,
      "POST",
      { enabled: true },
      owner.cookie,
    );
    assert.equal(share.response.status, 200);
    const token = share.data.token;
    const shared = await request(`/api/public/story/${token}`);
    assert.equal(shared.response.status, 200);
    assert.equal(shared.data.title, "The test kitchen");
    assert(!("share_token" in shared.data));
    await request(`/api/data/stories/${storyId}/share`, "POST", { enabled: false }, owner.cookie);
    assert.equal((await request(`/api/public/story/${token}`)).response.status, 404);
  });
  await t.test("single-use invitations grant the requested role without escalation", async () => {
    const invite = await request(
      "/api/data/invitations",
      "POST",
      { book_id: bookId, role: "viewer" },
      owner.cookie,
    );
    assert.equal(invite.response.status, 200);
    inviteToken = new URL(invite.data.url).pathname.split("/").at(-1)!;
    assert.equal(
      (await request(`/api/data/invitations/${inviteToken}/accept`, "POST", {}, viewer.cookie))
        .response.status,
      200,
    );
    assert.equal(
      (await request(`/api/data/invitations/${inviteToken}/accept`, "POST", {}, outsider.cookie))
        .response.status,
      404,
    );
    const state = await request(`/api/data/state?book=${bookId}`, "GET", undefined, viewer.cookie);
    assert.equal(state.response.status, 200);
    assert.equal(state.data.book.role, "viewer");
    assert(!("share_token" in state.data.stories[0]));
    assert.equal(
      (await request(`/api/data/stories/${storyId}`, "DELETE", undefined, viewer.cookie)).response
        .status,
      404,
    );
    assert.equal(
      (
        await request(
          "/api/data/invitations",
          "POST",
          { book_id: bookId, role: "editor" },
          viewer.cookie,
        )
      ).response.status,
      404,
    );
    assert.equal(
      (
        await request(
          `/api/data/comments/${storyId}`,
          "POST",
          { body: "A family note." },
          viewer.cookie,
        )
      ).response.status,
      200,
    );
    const comments = (
      await request(`/api/data/comments/${storyId}`, "GET", undefined, owner.cookie)
    ).data;
    assert.equal(comments.length, 1);
  });
  await t.test(
    "guest question links accept one memory, are isolated, and cannot be replayed",
    async () => {
      const question = await request(
        "/api/data/questions",
        "POST",
        { book_id: bookId, text: "What is your earliest memory?" },
        owner.cookie,
      );
      assert.equal(question.response.status, 201);
      const link = await request(
        `/api/data/questions/${question.data.id}/link`,
        "POST",
        {},
        owner.cookie,
      );
      questionToken = new URL(link.data.url).pathname.split("/").at(-1)!;
      const guest = (await request(`/api/public/record/${questionToken}`)).data;
      assert.equal(guest.text, "What is your earliest memory?");
      assert(!("book_id" in guest));
      const view = (
        await request(`/api/data/state?book=${bookId}`, "GET", undefined, viewer.cookie)
      ).data;
      assert(!("token" in view.questions[0]));
      assert.equal(
        (
          await request(
            `/api/data/questions/${question.data.id}/vote`,
            "POST",
            { voted: true },
            viewer.cookie,
          )
        ).response.status,
        200,
      );
      const submission = {
        title: "A guest memory",
        body: "I remember the old apple tree.",
        media_ids: [],
      };
      const responses = await Promise.all([
        request(`/api/public/record/${questionToken}`, "POST", submission),
        request(`/api/public/record/${questionToken}`, "POST", submission),
      ]);
      assert.equal(responses.filter((r) => r.response.status === 200).length, 1);
      assert(responses.some((r) => [404, 409].includes(r.response.status)));
      assert.equal((await request(`/api/public/record/${questionToken}`)).response.status, 404);
    },
  );
  await t.test(
    "exports contain memories, exclude share capabilities, and member revocation takes effect",
    async () => {
      const result = await request(`/api/data/export/${bookId}`, "GET", undefined, owner.cookie);
      assert.equal(result.response.status, 200);
      assert.equal(result.data.format, "heirloom-v1");
      assert.equal(result.data.stories.length, 2);
      assert(result.data.stories.every((s: Record<string, unknown>) => !("share_token" in s)));
      assert.equal(
        (
          await request(
            "/api/data/members",
            "DELETE",
            { book_id: bookId, user_id: viewer.id },
            owner.cookie,
          )
        ).response.status,
        200,
      );
      assert.equal(
        (await request(`/api/data/state?book=${bookId}`, "GET", undefined, viewer.cookie)).response
          .status,
        404,
      );
    },
  );
  await t.test("deleting a collection removes all story and question access", async () => {
    assert.equal(
      (await request(`/api/data/books/${bookId}`, "DELETE", undefined, owner.cookie)).response
        .status,
      200,
    );
    assert.equal(
      (await request(`/api/data/state?book=${bookId}`, "GET", undefined, owner.cookie)).response
        .status,
      404,
    );
    assert.equal(
      (await request(`/api/data/comments/${storyId}`, "GET", undefined, owner.cookie)).response
        .status,
      404,
    );
  });
});
