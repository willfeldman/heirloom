const githubUrl = "https://github.com/willfeldman/heirloom";
const vercelUrl = "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwillfeldman%2Fheirloom";

function escapeHtml(value) {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
}

function page(request) {
  const headers = request.headers;
  const email = headers.get("oai-authenticated-user-email");
  const nameHeader = headers.get("oai-authenticated-user-full-name");
  const name = nameHeader && headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8"
    ? decodeURIComponent(nameHeader)
    : email;
  const signedIn = Boolean(email || headers.get("oai-authenticated-user-id"));
  const identity = signedIn
    ? `<div class="identity">Signed in${name ? ` as ${escapeHtml(name)}` : " with ChatGPT"}</div><a class="quiet" href="/signout-with-chatgpt?return_to=/">Sign out</a>`
    : `<a class="button primary" href="/signin-with-chatgpt?return_to=/" target="_top">Sign in with ChatGPT</a>`;

  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Heirloom Stories</title><meta name="description" content="An open-source family story archive powered by your own AI keys.">
<style>
*{box-sizing:border-box}body{margin:0;background:#f6f2ea;color:#2d2925;font:16px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1040px;margin:0 auto;padding:28px 24px 72px}.top{display:flex;justify-content:space-between;align-items:center;gap:20px}.brand{font:700 20px Georgia,serif;letter-spacing:.02em}.identity{font-size:13px;color:#6f655d}.quiet{color:#6f655d;font-size:13px}.hero{padding:110px 0 82px;max-width:740px}.eyebrow{color:#b24f2c;text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700}.hero h1{font:700 clamp(48px,8vw,88px)/.98 Georgia,serif;margin:18px 0 24px;letter-spacing:-.045em}.hero p{font-size:20px;color:#625951;max-width:620px}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}.button{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:999px;padding:12px 19px;font-weight:700}.primary{background:#b24f2c;color:#fff}.secondary{border:1px solid #cfc4b6;color:#2d2925;background:#fffaf3}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.card{border-top:1px solid #cfc4b6;padding:18px 4px}.card h2{font:700 21px Georgia,serif;margin:0 0 8px}.card p{color:#6f655d;margin:0}.notice{margin-top:60px;background:#e8dfd2;border-radius:18px;padding:24px}.notice h2{font:700 24px Georgia,serif;margin:0 0 8px}.notice p{margin:0;color:#5f554d}.footer{margin-top:70px;border-top:1px solid #cfc4b6;padding-top:18px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:13px;color:#6f655d}.footer a{color:inherit}@media(max-width:700px){.top{align-items:flex-start}.hero{padding:80px 0 60px}.grid{grid-template-columns:1fr}.hero h1{font-size:58px}}
</style></head><body><main><nav class="top"><div class="brand">Heirloom</div><div>${identity}</div></nav>
<section class="hero"><div class="eyebrow">A private archive for the people you love</div><h1>Keep the stories that make a family.</h1><p>Heirloom is an open-source story recorder and memory book. Sign in with ChatGPT here, then deploy the full app with your own database, storage, and AI credentials.</p><div class="actions"><a class="button primary" href="${vercelUrl}">Deploy the full app</a><a class="button secondary" href="${githubUrl}">View on GitHub</a></div></section>
<section class="grid"><article class="card"><h2>Bring your own keys</h2><p>Use your own OpenAI API key for transcription, prompts, and story polish. Your ChatGPT login identifies your account; it does not expose API billing credentials.</p></article><article class="card"><h2>Open source</h2><p>MIT licensed, self-hostable, and designed for people who want control over their family memories and infrastructure.</p></article><article class="card"><h2>ChatGPT sign-in</h2><p>This hosted entrypoint uses Sites’ dispatcher-owned sign-in flow and only reads the identity headers Sites forwards after authentication.</p></article></section>
<section class="notice"><h2>Ready to make it yours?</h2><p>The GitHub repository includes the complete Next.js app, database schema, email flows, encrypted user keys, and a one-click Vercel deploy button.</p><div class="actions"><a class="button primary" href="${githubUrl}">Open the repository</a></div></section>
<footer class="footer"><span>Heirloom Stories · MIT License</span><a href="${githubUrl}">github.com/willfeldman/heirloom</a></footer></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export default { fetch(request) { return page(request); } };
